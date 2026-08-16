import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAssignedTechnician, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { createReport } from "./lib/reports";
import { validateSubmission } from "./lib/submissionValidation";

const usage = v.object({
  productId: v.id("chemicalProducts"),
  quantity: v.number(),
  batchNumber: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
});

export const submit = mutation({
  args: {
    jobId: v.id("jobs"),
    submissionKey: v.string(),
    jobRevision: v.number(),
    actualStart: v.number(),
    actualEnd: v.number(),
    method: v.string(),
    treatedAreas: v.array(v.string()),
    dosage: v.string(),
    durationMinutes: v.number(),
    observations: v.optional(v.string()),
    chemicalUsage: v.array(usage),
    checklistAnswers: v.array(v.object({ key: v.string(), completed: v.boolean(), note: v.optional(v.string()) })),
    technicianSignature: v.string(),
    technicianSignerName: v.string(),
    customerSignature: v.optional(v.string()),
    customerSignerName: v.optional(v.string()),
    representativeAbsentReason: v.optional(v.string()),
    location: v.object({
      status: v.union(v.literal("captured"), v.literal("denied"), v.literal("unavailable"), v.literal("unsupported")),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      accuracy: v.optional(v.number()),
    }),
  },
  returns: v.object({ submissionId: v.id("fieldSubmissions"), reportId: v.optional(v.id("reports")), duplicated: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.query("fieldSubmissions").withIndex("by_submissionKey", (q) => q.eq("submissionKey", args.submissionKey)).unique();
    if (existing) {
      if (existing.jobId !== args.jobId || existing.submittedBy !== user._id) throw new ConvexError({ code: "CONFLICT", message: "Submission key is already in use" });
      const reports = await ctx.db.query("reports").withIndex("by_job_version", (q) => q.eq("jobId", args.jobId)).take(100);
      const report = reports.find((row) => row.fieldSubmissionId === existing._id);
      return { submissionId: existing._id, reportId: report?._id, duplicated: true };
    }

    const job = await ctx.db.get(args.jobId);
    if (!job || job.assignedTechnicianId !== user._id) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await requireAssignedTechnician(ctx, user, job);
    if (!["assigned", "in_progress", "rejected"].includes(job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job can no longer be submitted" });
    if (args.jobRevision !== job.revision) throw new ConvexError({ code: "CONFLICT", message: "Job changed since this submission was prepared; refresh and retry" });
    if (args.submissionKey.length < 20 || args.submissionKey.length > 100 || !/^[A-Za-z0-9_-]+$/.test(args.submissionKey)) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Invalid submission key" });
    if (args.chemicalUsage.length === 0 || args.chemicalUsage.length > 50 || args.checklistAnswers.length > 100 || (args.observations?.length ?? 0) > 10_000 || (args.representativeAbsentReason?.length ?? 0) > 1000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Submission exceeds allowed limits" });
    if (args.actualStart > Date.now() + 60 * 60_000 || args.actualStart < job.scheduledStart - 30 * 24 * 60 * 60_000 || args.actualEnd > Date.now() + 60 * 60_000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Treatment timestamps are outside the allowed range" });
    if (args.checklistAnswers.some((answer) => (answer.note?.length ?? 0) > 1000)) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Checklist note is too long" });
    const answers = new Map(args.checklistAnswers.map((answer) => [answer.key, answer]));
    const evidence = await ctx.db.query("evidenceFiles").withIndex("by_submissionKey", (q) => q.eq("submissionKey", args.submissionKey)).take(20);
    const validationError = validateSubmission({
      actualStart: args.actualStart,
      actualEnd: args.actualEnd,
      durationMinutes: args.durationMinutes,
      method: args.method,
      dosage: args.dosage,
      treatedAreas: args.treatedAreas,
      chemicalQuantities: args.chemicalUsage.map((entry) => entry.quantity),
      technicianSignerName: args.technicianSignerName,
      technicianSignatureLength: args.technicianSignature.length,
      hasCustomerSignature: Boolean(args.customerSignature),
      customerSignerName: args.customerSignerName,
      customerSignatureLength: args.customerSignature?.length,
      representativeAbsentReason: args.representativeAbsentReason,
      checklist: job.snapshot.checklistItems,
      completedKeys: new Set([...answers].filter(([, answer]) => answer.completed).map(([key]) => key)),
      evidenceKinds: new Set(evidence.filter((file) => file.jobId === job._id && file.uploadedBy === user._id).map((file) => file.kind)),
      answerKeys: args.checklistAnswers.map((answer) => answer.key),
      location: args.location,
    });
    if (validationError) throw new ConvexError({ code: "VALIDATION_ERROR", message: validationError });

    if (evidence.some((file) => file.jobId !== job._id || file.uploadedBy !== user._id)) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Evidence does not belong to this submission" });
    const aggregated = new Map<string, { productId: typeof args.chemicalUsage[number]["productId"]; quantity: number }>();
    for (const entry of args.chemicalUsage) {
      const key = String(entry.productId);
      const current = aggregated.get(key);
      if (entry.batchNumber && entry.batchNumber.trim().length > 100) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Chemical batch number is invalid" });
      aggregated.set(key, { productId: entry.productId, quantity: (current?.quantity ?? 0) + entry.quantity });
    }
    const products = new Map<string, Doc<"chemicalProducts">>();
    for (const entry of aggregated.values()) {
      const product = await ctx.db.get(entry.productId);
      if (!product?.active) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Chemical product is unavailable" });
      products.set(String(product._id), product);
    }
    const canonicalUsage = args.chemicalUsage.map((entry) => {
      const product = products.get(String(entry.productId));
      if (!product) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Chemical product is unavailable" });
      return { productId: entry.productId, productName: product.name, activeIngredient: product.activeIngredient, quantity: entry.quantity, unit: product.unit, batchNumber: entry.batchNumber?.trim(), expiresAt: entry.expiresAt };
    });
    const now = Date.now();
    for (const entry of aggregated.values()) {
      const balance = await ctx.db.query("stockBalances").withIndex("by_branch_product", (q) => q.eq("branchId", job.branchId).eq("productId", entry.productId)).unique();
      const next = (balance?.quantity ?? 0) - entry.quantity;
      if (!balance || next < 0) throw new ConvexError({ code: "CONFLICT", message: "Insufficient chemical stock; your submission remains queued" });
      await ctx.db.patch(balance._id, { quantity: next, updatedAt: now });
      await ctx.db.insert("stockLedger", { branchId: job.branchId, productId: entry.productId, jobId: job._id, submissionKey: args.submissionKey, type: "consumption", quantityDelta: -entry.quantity, balanceAfter: next, actorId: user._id, createdAt: now });
    }

    const submissionId = await ctx.db.insert("fieldSubmissions", { ...args, method: args.method.trim(), dosage: args.dosage.trim(), treatedAreas: args.treatedAreas.map((area) => area.trim()), observations: args.observations?.trim(), technicianSignerName: args.technicianSignerName.trim(), customerSignerName: args.customerSignerName?.trim(), representativeAbsentReason: args.representativeAbsentReason?.trim(), chemicalUsage: canonicalUsage, submittedBy: user._id, submittedAt: now });
    const submission = await ctx.db.get(submissionId);
    if (!submission) throw new Error("Submission insert failed");
    const direct = job.approvalPolicy === "technician_direct";
    await ctx.db.patch(job._id, { status: direct ? "approved" : "under_review", rejectionReason: undefined, revision: job.revision + 1, updatedAt: now });
    let reportId;
    if (direct) reportId = await createReport(ctx, job, submission, user._id);
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: direct ? "job.auto_approved" : "job.submitted", actorId: user._id, branchId: job.branchId, metadata: { submissionId, offlineRevision: args.jobRevision, serverRevision: job.revision } });
    return { submissionId, reportId, duplicated: false };
  },
});
