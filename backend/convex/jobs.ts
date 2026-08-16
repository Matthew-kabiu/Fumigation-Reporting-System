import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertBranchAccess, requireAssignedTechnician, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { canTransition, validSchedule } from "./lib/jobPolicy";

const jobSummary = v.object({
  id: v.id("jobs"),
  customerName: v.string(),
  siteName: v.string(),
  siteAddress: v.string(),
  serviceType: v.string(),
  targetPest: v.string(),
  status: v.string(),
  scheduledStart: v.number(),
  scheduledEnd: v.number(),
  revision: v.number(),
});

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    siteId: v.id("sites"),
    assignedTechnicianId: v.optional(v.id("users")),
    checklistTemplateId: v.id("checklistTemplates"),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    serviceType: v.string(),
    targetPest: v.string(),
    instructions: v.optional(v.string()),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager", "operations"]);
    const serviceType = args.serviceType.trim();
    const targetPest = args.targetPest.trim();
    if (!validSchedule(args.scheduledStart, args.scheduledEnd)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Job end must be after its start" });
    }
    if (!serviceType || serviceType.length > 120 || !targetPest || targetPest.length > 120 || (args.instructions?.length ?? 0) > 5000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Enter valid job details" });
    const [customer, site, checklist] = await Promise.all([
      ctx.db.get(args.customerId),
      ctx.db.get(args.siteId),
      ctx.db.get(args.checklistTemplateId),
    ]);
    if (!customer || customer.branchId !== args.branchId || customer.status !== "active" || customer.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    if (!site || site.branchId !== args.branchId || site.customerId !== customer._id || site.status !== "active" || site.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Site not found" });
    if (!checklist?.active) throw new ConvexError({ code: "NOT_FOUND", message: "Checklist not found" });
    if (args.assignedTechnicianId) {
      const technician = await ctx.db.get(args.assignedTechnicianId);
      if (!technician || technician.status !== "active" || technician.role !== "technician") throw new ConvexError({ code: "VALIDATION_ERROR", message: "Assigned technician is unavailable" });
      await assertBranchAccess(ctx, technician, args.branchId, ["technician"]);
    }

    const settings = await ctx.db.query("companySettings").withIndex("by_key", (q) => q.eq("key", "singleton")).unique();

    const now = Date.now();
    const status = args.assignedTechnicianId ? "assigned" : "scheduled";
    const jobId = await ctx.db.insert("jobs", {
      ...args,
      approvalPolicy: settings?.approvalPolicy ?? "manager_required",
      serviceType,
      targetPest,
      instructions: args.instructions?.trim(),
      status,
      snapshot: {
        customerName: customer.name,
        siteName: site.name,
        siteAddress: site.address,
        checklistVersion: checklist.version,
        checklistItems: checklist.items,
      },
      revision: 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, { entityType: "job", entityId: jobId, action: "job.created", actorId: user._id, branchId: args.branchId, metadata: { status } });
    return jobId;
  },
});

export const listAssigned = query({
  args: { from: v.number(), to: v.number(), limit: v.optional(v.number()) },
  returns: v.array(jobSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "technician" && user.role !== "company_admin") throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
    const rows = await ctx.db
      .query("jobs")
      .withIndex("by_technician_scheduledStart", (q) => q.eq("assignedTechnicianId", user._id).gte("scheduledStart", args.from).lte("scheduledStart", args.to))
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100));
    const memberships = user.role === "company_admin" ? null : await ctx.db.query("memberships").withIndex("by_user_branch", (q) => q.eq("userId", user._id)).take(100);
    const allowedBranches = new Set(memberships?.filter((membership) => membership.role === "technician").map((membership) => String(membership.branchId)));
    return rows.filter((job) => user.role === "company_admin" || allowedBranches.has(String(job.branchId))).map((job) => ({ id: job._id, customerName: job.snapshot.customerName, siteName: job.snapshot.siteName, siteAddress: job.snapshot.siteAddress, serviceType: job.serviceType, targetPest: job.targetPest, status: job.status, scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd, revision: job.revision }));
  },
});

export const listForBranch = query({
  args: { branchId: v.id("branches"), from: v.number(), to: v.number(), limit: v.optional(v.number()) },
  returns: v.array(jobSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager", "operations", "auditor"]);
    const rows = await ctx.db
      .query("jobs")
      .withIndex("by_branch_scheduledStart", (q) => q.eq("branchId", args.branchId).gte("scheduledStart", args.from).lte("scheduledStart", args.to))
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100));
    return rows.map((job) => ({ id: job._id, customerName: job.snapshot.customerName, siteName: job.snapshot.siteName, siteAddress: job.snapshot.siteAddress, serviceType: job.serviceType, targetPest: job.targetPest, status: job.status, scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd, revision: job.revision }));
  },
});

export const getFieldSnapshot = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "cancelled") return null;
    if (job.assignedTechnicianId === user._id) await requireAssignedTechnician(ctx, user, job);
    else await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations"]);
    return {
      id: job._id,
      branchId: job.branchId,
      status: job.status,
      scheduledStart: job.scheduledStart,
      scheduledEnd: job.scheduledEnd,
      serviceType: job.serviceType,
      targetPest: job.targetPest,
      instructions: job.instructions,
      approvalPolicy: job.approvalPolicy,
      snapshot: job.snapshot,
      revision: job.revision,
    };
  },
});

export const start = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.assignedTechnicianId !== user._id) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await requireAssignedTechnician(ctx, user, job);
    if (!canTransition("start", job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job cannot be started from its current status" });
    await ctx.db.patch(job._id, { status: "in_progress", revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.started", actorId: user._id, branchId: job.branchId });
    return null;
  },
});

export const getForStaff = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations", "technician", "auditor"]);
    if (user.role !== "company_admin") {
      const membership = await ctx.db.query("memberships").withIndex("by_user_branch", (q) => q.eq("userId", user._id).eq("branchId", job.branchId)).unique();
      if (membership?.role === "technician" && job.assignedTechnicianId !== user._id) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    }
    const [customer, site, technician, submissions, reports] = await Promise.all([
      ctx.db.get(job.customerId), ctx.db.get(job.siteId), job.assignedTechnicianId ? ctx.db.get(job.assignedTechnicianId) : null,
      ctx.db.query("fieldSubmissions").withIndex("by_job_submittedAt", (q) => q.eq("jobId", job._id)).order("desc").take(20),
      ctx.db.query("reports").withIndex("by_job_version", (q) => q.eq("jobId", job._id)).order("desc").take(20),
    ]);
    return { ...job, customer: customer && { id: customer._id, name: customer.name }, site: site && { id: site._id, name: site.name, address: site.address }, technician: technician && { id: technician._id, name: technician.name }, submissions: submissions.map((s) => ({ id: s._id, submittedAt: s.submittedAt, submittedBy: s.submittedBy, jobRevision: s.jobRevision })), reports: reports.map((r) => ({ id: r._id, reportNumber: r.reportNumber, version: r.version, status: r.status })) };
  },
});

async function requireTechnicianForBranch(ctx: MutationCtx, branchId: Id<"branches">, technicianId: Id<"users">) {
  const technician = await ctx.db.get(technicianId);
  if (!technician || technician.status !== "active" || technician.role !== "technician") throw new ConvexError({ code: "VALIDATION_ERROR", message: "Assigned technician is unavailable" });
  await assertBranchAccess(ctx, technician, branchId, ["technician"]);
}

export const assign = mutation({
  args: { jobId: v.id("jobs"), technicianId: v.id("users") }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations"]);
    if (!canTransition("assign", job.status)) throw new ConvexError({ code: "CONFLICT", message: "Job cannot be assigned" });
    await requireTechnicianForBranch(ctx, job.branchId, args.technicianId);
    await ctx.db.patch(job._id, { assignedTechnicianId: args.technicianId, status: "assigned", rejectionReason: undefined, revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.assigned", actorId: user._id, branchId: job.branchId, metadata: { technicianId: args.technicianId } }); return null;
  },
});

export const reschedule = mutation({
  args: { jobId: v.id("jobs"), scheduledStart: v.number(), scheduledEnd: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations"]);
    if (!canTransition("reschedule", job.status) || !validSchedule(args.scheduledStart, args.scheduledEnd)) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Job cannot be rescheduled to that time" });
    await ctx.db.patch(job._id, { scheduledStart: args.scheduledStart, scheduledEnd: args.scheduledEnd, revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.rescheduled", actorId: user._id, branchId: job.branchId }); return null;
  },
});

export const cancel = mutation({
  args: { jobId: v.id("jobs"), reason: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const job = await ctx.db.get(args.jobId); const reason = args.reason.trim();
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations"]);
    if (!canTransition("cancel", job.status) || reason.length < 3 || reason.length > 500) throw new ConvexError({ code: "VALIDATION_ERROR", message: "A valid cancellation reason is required" });
    const now = Date.now(); await ctx.db.patch(job._id, { status: "cancelled", cancellationReason: reason, cancelledAt: now, revision: job.revision + 1, updatedAt: now });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.cancelled", actorId: user._id, branchId: job.branchId, metadata: { reason } }); return null;
  },
});

export const reject = mutation({
  args: { jobId: v.id("jobs"), reason: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const job = await ctx.db.get(args.jobId); const reason = args.reason.trim();
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["manager"]);
    if (!canTransition("reject", job.status) || reason.length < 3 || reason.length > 1000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "A valid rejection reason is required" });
    await ctx.db.patch(job._id, { status: "rejected", rejectionReason: reason, revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.rejected", actorId: user._id, branchId: job.branchId, metadata: { reason } }); return null;
  },
});

export const close = mutation({
  args: { jobId: v.id("jobs") }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx); const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
    await assertBranchAccess(ctx, user, job.branchId, ["manager", "operations"]);
    if (!canTransition("close", job.status) || (job.approvalPolicy === "manager_and_customer" && job.status !== "accepted")) throw new ConvexError({ code: "CONFLICT", message: "Job cannot be closed" });
    await ctx.db.patch(job._id, { status: "closed", revision: job.revision + 1, updatedAt: Date.now() });
    await writeAudit(ctx, { entityType: "job", entityId: job._id, action: "job.closed", actorId: user._id, branchId: job.branchId }); return null;
  },
});
