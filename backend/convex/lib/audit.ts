import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function writeAudit(
  ctx: MutationCtx,
  event: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: Id<"users">;
    branchId?: Id<"branches">;
    metadata?: unknown;
  },
) {
  await ctx.db.insert("auditEvents", { ...event, createdAt: Date.now() });
}
