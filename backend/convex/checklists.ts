import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

const item = v.object({
  key: v.string(),
  label: v.string(),
  required: v.boolean(),
  evidence: v.union(v.literal("none"), v.literal("before_photo"), v.literal("after_photo")),
});

export const createVersion = mutation({
  args: { name: v.string(), items: v.array(item) },
  returns: v.id("checklistTemplates"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    assertRole(user, ["company_admin", "manager"]);
    if (!args.name.trim() || args.items.length === 0 || args.items.length > 50) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Checklist name and 1 to 50 items are required" });
    }
    const keys = new Set(args.items.map((entry) => entry.key.trim()));
    if (keys.size !== args.items.length || [...keys].some((key) => !key)) {
      throw new ConvexError({ code: "VALIDATION_ERROR", message: "Checklist item keys must be unique" });
    }
    const latest = await ctx.db.query("checklistTemplates").withIndex("by_active_version", (q) => q.eq("active", true)).order("desc").first();
    if (latest) await ctx.db.patch(latest._id, { active: false });
    const checklistId = await ctx.db.insert("checklistTemplates", {
      name: args.name.trim(),
      version: (latest?.version ?? 0) + 1,
      active: true,
      items: args.items.map((entry) => ({ ...entry, key: entry.key.trim(), label: entry.label.trim() })),
      createdAt: Date.now(),
    });
    await writeAudit(ctx, { entityType: "checklist", entityId: checklistId, action: "checklist.created", actorId: user._id });
    return checklistId;
  },
});

export const active = query({
  args: {},
  returns: v.union(v.null(), v.object({ id: v.id("checklistTemplates"), name: v.string(), version: v.number(), items: v.array(item) })),
  handler: async (ctx) => {
    await requireUser(ctx);
    const checklist = await ctx.db.query("checklistTemplates").withIndex("by_active_version", (q) => q.eq("active", true)).order("desc").first();
    return checklist ? { id: checklist._id, name: checklist.name, version: checklist.version, items: checklist.items } : null;
  },
});
