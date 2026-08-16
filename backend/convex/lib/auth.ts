import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AppRole =
  | "company_admin"
  | "manager"
  | "operations"
  | "technician"
  | "customer"
  | "auditor";

type DbCtx = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

export async function requireUser(ctx: DbCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
    .unique();

  if (!user || user.status !== "active") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Your account is awaiting access" });
  }

  return user;
}

export function assertRole(user: { role: AppRole }, roles: readonly AppRole[]) {
  if (!roles.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
  }
}

export async function assertBranchAccess(
  ctx: DbCtx,
  user: { _id: Id<"users">; role: AppRole },
  branchId: Id<"branches">,
  roles?: readonly AppRole[],
) {
  if (user.role === "company_admin") return;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_branch", (q) => q.eq("userId", user._id).eq("branchId", branchId))
    .unique();

  if (!membership) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Resource not found" });
  }
  if (roles && !roles.includes(membership.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return membership;
}

export async function assertCustomerAccess(
  ctx: DbCtx,
  user: { _id: Id<"users">; role: AppRole },
  customerId: Id<"customers">,
) {
  if (user.role !== "customer") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Customer access required" });
  }

  const link = await ctx.db
    .query("customerUsers")
    .withIndex("by_user_customer", (q) => q.eq("userId", user._id).eq("customerId", customerId))
    .unique();

  if (!link) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Resource not found" });
  }
}

export async function requireAssignedTechnician(
  ctx: DbCtx,
  user: { _id: Id<"users">; role: AppRole },
  job: { assignedTechnicianId?: Id<"users">; branchId: Id<"branches"> },
) {
  if (job.assignedTechnicianId !== user._id) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Job not found" });
  }
  await assertBranchAccess(ctx, user, job.branchId, ["technician"]);
}
