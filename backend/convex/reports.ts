import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { assertBranchAccess, assertCustomerAccess, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { createReport } from "./lib/reports";
import { canTransition } from "./lib/jobPolicy";

export const approve = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.id("reports"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["company_admin", "manager"]);
    if (!canTransition("approve", job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job is not awaiting review" });
    const submission = await ctx.db.query("fieldSubmissions").withIndex("by_job_submittedAt", (q) => q.eq("jobId", job._id)).order("desc").first();
    if (!submission) throw new ConvexError({ code: "CONFLICT", message: "Job has no field submission" });
    const reportId = await createReport(ctx, job, submission, user._id);
    await ctx.db.patch(job._id, { status: "approved", revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "report", entityId: reportId, action: "report.approved", actorId: user._id, branchId: job.branchId });
    return reportId;
  },
});

export const deliver = mutation({
  args: { reportId: v.id("reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError({ code: "NOT_FOUND", message: "Report not found" });
    const job = await ctx.db.get(report.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["company_admin", "manager", "operations"]);
    if (report.status !== "approved") throw new ConvexError({ code: "CONFLICT", message: "Report has already been delivered" });
    const now = Date.now();
    await ctx.db.patch(report._id, { status: "delivered", deliveredAt: now });
    await ctx.db.patch(job._id, { status: "delivered", revision: job.revision + 1, updatedAt: now });
    await writeAudit(ctx, { entityType: "report", entityId: report._id, action: "report.delivered", actorId: user._id, branchId: job.branchId });
    return null;
  },
});

export const listForCustomerPortal = query({
  args: { customerId: v.id("customers"), limit: v.optional(v.number()) },
  returns: v.array(v.object({ id: v.id("reports"), reportNumber: v.string(), status: v.string(), approvedAt: v.number(), siteName: v.string(), serviceType: v.string() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertCustomerAccess(ctx, user, args.customerId);
    const rows = await ctx.db.query("reports").withIndex("by_customer_approvedAt", (q) => q.eq("customerId", args.customerId)).order("desc").take(Math.min(Math.max(args.limit ?? 50, 1), 100));
    return rows.filter((report) => report.status !== "approved").map((report) => ({ id: report._id, reportNumber: report.reportNumber, status: report.status, approvedAt: report.approvedAt, siteName: report.snapshot.siteName, serviceType: report.snapshot.serviceType }));
  },
});

const reportSummary = v.object({ id: v.id("reports"), reportNumber: v.string(), status: v.string(), version: v.number(), approvedAt: v.number(), siteName: v.string(), serviceType: v.string() });

export const listForBranch = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  returns: v.array(reportSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["manager", "operations", "auditor"]);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const indexed = await ctx.db.query("reports").withIndex("by_branch_approvedAt", (q) => q.eq("branchId", args.branchId)).order("desc").take(limit);
    // Reports created before branchId was introduced remain visible during the safe schema transition.
    const legacyCandidates = indexed.length < limit ? (await ctx.db.query("reports").take(250)).filter((report) => report.branchId === undefined) : [];
    const legacy = (await Promise.all(legacyCandidates.map(async (report) => ({ report, job: await ctx.db.get(report.jobId) })))).filter((row) => row.job?.branchId === args.branchId).map((row) => row.report);
    return [...indexed, ...legacy].sort((a, b) => b.approvedAt - a.approvedAt).slice(0, limit).map((report) => ({ id: report._id, reportNumber: report.reportNumber, status: report.status, version: report.version, approvedAt: report.approvedAt, siteName: report.snapshot.siteName, serviceType: report.snapshot.serviceType }));
  },
});

async function reportDetail(ctx: QueryCtx, report: Doc<"reports">) {
  const evidence = report.snapshot.evidence ?? [];
  const withUrls = await Promise.all(evidence.map(async (file: typeof evidence[number]) => ({ ...file, url: await ctx.storage.getUrl(file.storageId) })));
  return { id: report._id, reportNumber: report.reportNumber, jobId: report.jobId, version: report.version, status: report.status, approvedAt: report.approvedAt, deliveredAt: report.deliveredAt, acceptedAt: report.acceptedAt, snapshot: { ...report.snapshot, evidence: withUrls } };
}

export const getForStaff = query({
  args: { reportId: v.id("reports") }, returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const report = await ctx.db.get(args.reportId);
    if (!report) return null;
    const job = await ctx.db.get(report.jobId); if (!job) return null;
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations", "auditor"]);
    return await reportDetail(ctx, report);
  },
});

export const listMine = query({
  args: { limit: v.optional(v.number()) }, returns: v.array(reportSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "customer") throw new ConvexError({ code: "FORBIDDEN", message: "Customer access required" });
    const links = await ctx.db.query("customerUsers").withIndex("by_user_customer", (q) => q.eq("userId", user._id)).take(100);
    const grouped = await Promise.all(links.map((link) => ctx.db.query("reports").withIndex("by_customer_approvedAt", (q) => q.eq("customerId", link.customerId)).order("desc").take(100)));
    return grouped.flat().filter((report) => report.status !== "approved").sort((a, b) => b.approvedAt - a.approvedAt).slice(0, Math.min(Math.max(args.limit ?? 50, 1), 100)).map((report) => ({ id: report._id, reportNumber: report.reportNumber, status: report.status, version: report.version, approvedAt: report.approvedAt, siteName: report.snapshot.siteName, serviceType: report.snapshot.serviceType }));
  },
});

export const getMine = query({
  args: { reportId: v.id("reports") }, returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const report = await ctx.db.get(args.reportId);
    if (!report || report.status === "approved") return null;
    await assertCustomerAccess(ctx, user, report.customerId);
    return await reportDetail(ctx, report);
  },
});

export const accept = mutation({
  args: { reportId: v.id("reports"), signerName: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError({ code: "NOT_FOUND", message: "Report not found" });
    await assertCustomerAccess(ctx, user, report.customerId);
    if (report.status !== "delivered") throw new ConvexError({ code: "CONFLICT", message: "Report is not awaiting acceptance" });
    if (!args.signerName.trim() || args.signature.length < 20 || args.signature.length > 200_000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "A valid acceptance signature is required" });
    const existing = await ctx.db.query("reportAcceptances").withIndex("by_report", (q) => q.eq("reportId", report._id)).unique();
    if (existing) return null;
    const now = Date.now();
    await ctx.db.insert("reportAcceptances", { reportId: report._id, acceptedBy: user._id, signerName: args.signerName.trim(), signature: args.signature, acceptedAt: now });
    await ctx.db.patch(report._id, { status: "accepted", acceptedAt: now });
    const job = await ctx.db.get(report.jobId);
    if (job) await ctx.db.patch(job._id, { status: "accepted", revision: job.revision + 1, updatedAt: now });
    await writeAudit(ctx, { entityType: "report", entityId: report._id, action: "report.accepted", actorId: user._id, branchId: job?.branchId });
    return null;
  },
});
