import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBranchAccess, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.string(),
    address: v.string(),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    accessNotes: v.optional(v.string()),
    riskNotes: v.optional(v.string()),
  },
  returns: v.id("sites"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.deletedAt !== undefined) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    }
    await assertBranchAccess(ctx, user, customer.branchId, ["company_admin", "manager", "operations"]);
    const name = args.name.trim();
    const address = args.address.trim();
    if (name.length < 2 || address.length < 5) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Enter a valid site name and address" });
    }

    const now = Date.now();
    const siteId = await ctx.db.insert("sites", {
      customerId: customer._id,
      branchId: customer.branchId,
      name,
      address,
      contactName: args.contactName?.trim(),
      contactPhone: args.contactPhone?.trim(),
      accessNotes: args.accessNotes?.trim(),
      riskNotes: args.riskNotes?.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, { entityType: "site", entityId: siteId, action: "site.created", actorId: user._id, branchId: customer.branchId });
    return siteId;
  },
});

export const listForCustomer = query({
  args: { customerId: v.id("customers") },
  returns: v.array(v.object({ id: v.id("sites"), name: v.string(), address: v.string() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found" });
    await assertBranchAccess(ctx, user, customer.branchId, ["company_admin", "manager", "operations", "technician", "auditor"]);
    const sites = await ctx.db.query("sites").withIndex("by_customer_status", (q) => q.eq("customerId", args.customerId).eq("status", "active")).take(100);
    return sites.filter((site) => site.deletedAt === undefined).map((site) => ({ id: site._id, name: site.name, address: site.address }));
  },
});
