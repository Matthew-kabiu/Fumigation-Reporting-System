import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAssignedTechnician, requireUser } from "./lib/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024;
const kind = v.union(v.literal("before"), v.literal("after"), v.literal("other"));

function validSubmissionKey(value: string) {
  return value.length >= 20 && value.length <= 100 && /^[A-Za-z0-9_-]+$/.test(value);
}

export const generateUploadUrl = mutation({
  args: { jobId: v.id("jobs"), submissionKey: v.string(), kind, mimeType: v.string(), size: v.number() },
  returns: v.object({ uploadUrl: v.string(), uploadKey: v.string() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await requireAssignedTechnician(ctx, user, job);
    if (!["assigned", "in_progress", "rejected"].includes(job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job is not accepting evidence" });
    if (!validSubmissionKey(args.submissionKey) || !allowedTypes.has(args.mimeType) || !Number.isInteger(args.size) || args.size <= 0 || args.size > maxSize) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Evidence must be a JPEG, PNG, or WebP image up to 10 MB" });
    }
    const existing = await ctx.db.query("evidenceFiles").withIndex("by_job_createdAt", (q) => q.eq("jobId", job._id)).take(20);
    if (existing.length >= 20) throw new ConvexError({ code: "VALIDATION_ERROR", message: "A job can contain up to 20 evidence images" });
    const uploadKey = crypto.randomUUID();
    const now = Date.now();
    await ctx.db.insert("evidenceUploadIntents", { uploadKey, jobId: job._id, branchId: job.branchId, submissionKey: args.submissionKey, kind: args.kind, mimeType: args.mimeType, size: args.size, ownedBy: user._id, createdAt: now, expiresAt: now + 15 * 60_000 });
    return { uploadUrl: await ctx.storage.generateUploadUrl(), uploadKey };
  },
});

export const saveMetadata = mutation({
  args: { uploadKey: v.string(), storageId: v.id("_storage") },
  returns: v.id("evidenceFiles"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const intent = await ctx.db.query("evidenceUploadIntents").withIndex("by_uploadKey", (q) => q.eq("uploadKey", args.uploadKey)).unique();
    if (!intent || intent.ownedBy !== user._id) throw new ConvexError({ code: "NOT_FOUND", message: "Upload intent not found" });
    if (intent.consumedAt !== undefined) {
      const existing = intent.storageId === args.storageId
        ? await ctx.db.query("evidenceFiles").withIndex("by_storageId", (q) => q.eq("storageId", args.storageId)).unique()
        : null;
      if (existing?.uploadedBy === user._id && existing.jobId === intent.jobId) return existing._id;
      throw new ConvexError({ code: "CONFLICT", message: "Upload intent is no longer valid" });
    }
    if (intent.expiresAt < Date.now()) throw new ConvexError({ code: "CONFLICT", message: "Upload intent is no longer valid" });
    const job = await ctx.db.get(intent.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await requireAssignedTechnician(ctx, user, job);
    if (!["assigned", "in_progress", "rejected"].includes(job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job is not accepting evidence" });
    const [metadata, claimed, evidence] = await Promise.all([
      ctx.storage.getMetadata(args.storageId),
      ctx.db.query("evidenceFiles").withIndex("by_storageId", (q) => q.eq("storageId", args.storageId)).unique(),
      ctx.db.query("evidenceFiles").withIndex("by_job_createdAt", (q) => q.eq("jobId", job._id)).take(20),
    ]);
    if (!metadata || claimed) throw new ConvexError({ code: "CONFLICT", message: "Storage object is unavailable" });
    if (metadata.contentType !== intent.mimeType || metadata.size !== intent.size || !allowedTypes.has(metadata.contentType ?? "") || metadata.size <= 0 || metadata.size > maxSize) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Uploaded evidence does not match its upload intent" });
    }
    if (evidence.length >= 20) throw new ConvexError({ code: "VALIDATION_ERROR", message: "A job can contain up to 20 evidence images" });
    const now = Date.now();
    const evidenceId = await ctx.db.insert("evidenceFiles", { jobId: intent.jobId, submissionKey: intent.submissionKey, storageId: args.storageId, kind: intent.kind, mimeType: metadata.contentType, size: metadata.size, uploadedBy: user._id, createdAt: now });
    await ctx.db.patch(intent._id, { consumedAt: now, storageId: args.storageId });
    return evidenceId;
  },
});
