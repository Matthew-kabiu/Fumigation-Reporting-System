import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

export const create = mutation({
  args: { name: v.string(), code: v.string() },
  returns: v.id("branches"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    assertRole(user, ["company_admin"]);
    const name = args.name.trim();
    const code = args.code.trim().toUpperCase();
    if (name.length < 2 || code.length < 2 || code.length > 12) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Enter a valid branch name and code" });
    }
    const duplicate = await ctx.db.query("branches").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (duplicate) throw new ConvexError({ code: "CONFLICT", message: "Branch code already exists" });

    const now = Date.now();
    const branchId = await ctx.db.insert("branches", { name, code, active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("memberships", { userId: user._id, branchId, role: "company_admin", createdAt: now });
    await writeAudit(ctx, { entityType: "branch", entityId: branchId, action: "branch.created", actorId: user._id, branchId });
    return branchId;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(v.object({ id: v.id("branches"), name: v.string(), code: v.string() })),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role === "company_admin") {
      const branches = await ctx.db.query("branches").withIndex("by_active_name", (q) => q.eq("active", true)).take(100);
      return branches.map((branch) => ({ id: branch._id, name: branch.name, code: branch.code }));
    }

    const memberships = await ctx.db.query("memberships").withIndex("by_user_branch", (q) => q.eq("userId", user._id)).take(100);
    const branches = await Promise.all(memberships.map((membership) => ctx.db.get(membership.branchId)));
    return branches.filter((branch) => branch?.active).map((branch) => ({ id: branch!._id, name: branch!.name, code: branch!.code }));
  },
});
