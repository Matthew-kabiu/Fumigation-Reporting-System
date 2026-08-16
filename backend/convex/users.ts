import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBranchAccess, assertRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

export const syncCurrent = mutation({
  args: {},
  returns: v.object({ id: v.id("users"), role: v.string(), status: v.string() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
      .unique();
    const now = Date.now();
    const name = identity.name?.trim() || "Fumivanta user";
    const email = identity.email?.trim().toLowerCase();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, updatedAt: now });
      return { id: existing._id, role: existing.role, status: existing.status };
    }

    const firstUser = (await ctx.db.query("users").take(1)).length === 0;
    const role = firstUser ? "company_admin" : "technician";
    const status = firstUser ? "active" : "pending";
    const id = await ctx.db.insert("users", {
      clerkSubject: identity.subject,
      name,
      email,
      role,
      status,
      createdAt: now,
      updatedAt: now,
    });
    return { id, role, status };
  },
});

export const current = query({
  args: {},
  returns: v.object({
    id: v.id("users"),
    name: v.string(),
    role: v.string(),
    status: v.string(),
  }),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return { id: user._id, name: user.name, role: user.role, status: user.status };
  },
});

export const activate = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("company_admin"),
      v.literal("manager"),
      v.literal("operations"),
      v.literal("technician"),
      v.literal("customer"),
      v.literal("auditor"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    assertRole(actor, ["company_admin"]);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    await ctx.db.patch(target._id, { role: args.role, status: "active", updatedAt: Date.now() });
    await writeAudit(ctx, {
      entityType: "user",
      entityId: target._id,
      action: "user.activated",
      actorId: actor._id,
      metadata: { role: args.role },
    });
    return null;
  },
});

export const listAccounts = query({
  args: {},
  returns: v.array(v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.string(),
    status: v.string(),
  })),
  handler: async (ctx) => {
    const actor = await requireUser(ctx);
    assertRole(actor, ["company_admin"]);
    const users = await ctx.db.query("users").take(250);
    return users
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }));
  },
});

const accountRole = v.union(
  v.literal("company_admin"),
  v.literal("manager"),
  v.literal("operations"),
  v.literal("technician"),
  v.literal("customer"),
  v.literal("auditor"),
);

async function isLastActiveCompanyAdmin(ctx: { db: { query: (table: "users") => { take: (n: number) => Promise<Array<{ _id: string; role: string; status: string }>> } } }, targetId: string) {
  const users = await ctx.db.query("users").take(250);
  const activeAdmins = users.filter((user) => user.role === "company_admin" && user.status === "active");
  return activeAdmins.length === 1 && activeAdmins[0]._id === targetId;
}

export const updateRole = mutation({
  args: { userId: v.id("users"), role: accountRole },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    assertRole(actor, ["company_admin"]);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    if (target.status !== "active") throw new ConvexError({ code: "VALIDATION_ERROR", message: "Only active accounts can change role" });
    if (target.role === "company_admin" && args.role !== "company_admin" && await isLastActiveCompanyAdmin(ctx, target._id)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "You cannot demote the last company administrator" });
    }
    await ctx.db.patch(target._id, { role: args.role, updatedAt: Date.now() });
    await writeAudit(ctx, {
      entityType: "user",
      entityId: target._id,
      action: "user.role_changed",
      actorId: actor._id,
      metadata: { role: args.role },
    });
    return null;
  },
});

export const setStatus = mutation({
  args: { userId: v.id("users"), status: v.union(v.literal("active"), v.literal("disabled")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    assertRole(actor, ["company_admin"]);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    if (args.status === "disabled") {
      if (target._id === actor._id) throw new ConvexError({ code: "VALIDATION_ERROR", message: "You cannot disable your own account" });
      if (await isLastActiveCompanyAdmin(ctx, target._id)) {
        throw new ConvexError({ code: "VALIDATION_ERROR", message: "You cannot disable the last company administrator" });
      }
    }
    await ctx.db.patch(target._id, { status: args.status, updatedAt: Date.now() });
    await writeAudit(ctx, {
      entityType: "user",
      entityId: target._id,
      action: args.status === "disabled" ? "user.disabled" : "user.enabled",
      actorId: actor._id,
    });
    return null;
  },
});

export const listCustomerAccounts = query({
  args: { branchId: v.id("branches") },
  returns: v.array(v.object({ id: v.id("users"), name: v.string(), email: v.optional(v.string()) })),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    await assertBranchAccess(ctx, actor, args.branchId, ["manager", "operations"]);
    const users = await ctx.db.query("users").take(250);
    return users
      .filter((user) => user.role === "customer" && user.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) => ({ id: user._id, name: user.name, email: user.email }));
  },
});

const membershipRole = v.union(
  v.literal("manager"),
  v.literal("operations"),
  v.literal("technician"),
  v.literal("auditor"),
);

export const listForBranch = query({
  args: { branchId: v.id("branches") },
  returns: v.array(v.object({
    id: v.id("users"), name: v.string(), email: v.optional(v.string()),
    role: v.string(), status: v.string(), membershipRole: membershipRole,
  })),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    await assertBranchAccess(ctx, actor, args.branchId, ["manager", "operations"]);
    const memberships = await ctx.db.query("memberships").withIndex("by_branch_user", (q) => q.eq("branchId", args.branchId)).take(250);
    const rows = await Promise.all(memberships.map(async (membership) => ({ membership, user: await ctx.db.get(membership.userId) })));
    return rows
      .filter((row) => row.user && row.membership.role !== "company_admin" && row.membership.role !== "customer")
      .map(({ membership, user }) => ({ id: user!._id, name: user!.name, email: user!.email, role: user!.role, status: user!.status, membershipRole: membership.role as "manager" | "operations" | "technician" | "auditor" }));
  },
});

export const setBranchMembership = mutation({
  args: { branchId: v.id("branches"), userId: v.id("users"), role: v.union(membershipRole, v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    assertRole(actor, ["company_admin"]);
    const [branch, target, existing] = await Promise.all([
      ctx.db.get(args.branchId),
      ctx.db.get(args.userId),
      ctx.db.query("memberships").withIndex("by_user_branch", (q) => q.eq("userId", args.userId).eq("branchId", args.branchId)).unique(),
    ]);
    if (!branch?.active || !target || target.status !== "active" || target.role === "customer") throw new ConvexError({ code: "VALIDATION_ERROR", message: "Branch member is unavailable" });
    if (args.role === null) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
    } else {
      await ctx.db.insert("memberships", { userId: target._id, branchId: branch._id, role: args.role, createdAt: Date.now() });
    }
    await writeAudit(ctx, { entityType: "membership", entityId: `${args.branchId}:${args.userId}`, action: args.role ? "membership.set" : "membership.removed", actorId: actor._id, branchId: args.branchId, metadata: { role: args.role } });
    return null;
  },
});
