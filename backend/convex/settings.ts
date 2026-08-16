import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

const approvalPolicy = v.union(v.literal("manager_required"), v.literal("manager_and_customer"), v.literal("technician_direct"));

export const get = query({
  args: {},
  returns: v.object({ approvalPolicy }),
  handler: async (ctx) => {
    await requireUser(ctx);
    const settings = await ctx.db.query("companySettings").withIndex("by_key", (q) => q.eq("key", "singleton")).unique();
    return { approvalPolicy: settings?.approvalPolicy ?? "manager_required" };
  },
});

export const update = mutation({
  args: { approvalPolicy },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    assertRole(user, ["company_admin"]);
    const existing = await ctx.db.query("companySettings").withIndex("by_key", (q) => q.eq("key", "singleton")).unique();
    const now = Date.now();
    if (existing) await ctx.db.patch(existing._id, { approvalPolicy: args.approvalPolicy, updatedBy: user._id, updatedAt: now });
    else await ctx.db.insert("companySettings", { key: "singleton", approvalPolicy: args.approvalPolicy, updatedBy: user._id, updatedAt: now });
    await writeAudit(ctx, { entityType: "companySettings", entityId: "singleton", action: "settings.updated", actorId: user._id, metadata: { approvalPolicy: args.approvalPolicy } });
    return null;
  },
});
