import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBranchAccess, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

export const create = mutation({
  args: {
    branchId: v.id("branches"),
    name: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager", "operations"]);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 120) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Customer name must be 2 to 120 characters" });
    }

    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      branchId: args.branchId,
      name,
      contactName: args.contactName?.trim(),
      contactEmail: args.contactEmail?.trim().toLowerCase(),
      contactPhone: args.contactPhone?.trim(),
      notes: args.notes?.trim(),
      status: "active",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, { entityType: "customer", entityId: customerId, action: "customer.created", actorId: user._id, branchId: args.branchId });
    return customerId;
  },
});

export const listForBranch = query({
  args: { branchId: v.id("branches"), limit: v.optional(v.number()) },
  returns: v.array(v.object({ id: v.id("customers"), name: v.string(), contactName: v.optional(v.string()), status: v.string() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager", "operations", "technician", "auditor"]);
    const rows = await ctx.db
      .query("customers")
      .withIndex("by_branch_status_name", (q) => q.eq("branchId", args.branchId).eq("status", "active"))
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100));
    return rows.filter((row) => row.deletedAt === undefined).map((row) => ({ id: row._id, name: row.name, contactName: row.contactName, status: row.status }));
  },
});

export const setUserAccess = mutation({
  args: { customerId: v.id("customers"), userId: v.id("users"), linked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    const [customer, target, existing] = await Promise.all([
      ctx.db.get(args.customerId), ctx.db.get(args.userId),
      ctx.db.query("customerUsers").withIndex("by_user_customer", (q) => q.eq("userId", args.userId).eq("customerId", args.customerId)).unique(),
    ]);
    if (!customer || customer.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    await assertBranchAccess(ctx, actor, customer.branchId, ["manager", "operations"]);
    if (!target || target.status !== "active" || target.role !== "customer") throw new ConvexError({ code: "VALIDATION_ERROR", message: "Customer user is unavailable" });
    if (args.linked && !existing) await ctx.db.insert("customerUsers", { customerId: customer._id, userId: target._id, createdAt: Date.now() });
    if (!args.linked && existing) await ctx.db.delete(existing._id);
    await writeAudit(ctx, { entityType: "customerUser", entityId: `${customer._id}:${target._id}`, action: args.linked ? "customer_user.linked" : "customer_user.unlinked", actorId: actor._id, branchId: customer.branchId });
    return null;
  },
});

export const listUsers = query({
  args: { customerId: v.id("customers") },
  returns: v.array(v.object({ id: v.id("users"), name: v.string(), email: v.optional(v.string()) })),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx); const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    await assertBranchAccess(ctx, actor, customer.branchId, ["manager", "operations"]);
    const links = await ctx.db.query("customerUsers").withIndex("by_customer_user", (q) => q.eq("customerId", customer._id)).take(100);
    const users = await Promise.all(links.map((link) => ctx.db.get(link.userId)));
    return users.filter((user) => user?.status === "active" && user.role === "customer").map((user) => ({ id: user!._id, name: user!.name, email: user!.email }));
  },
});
