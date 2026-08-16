import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBranchAccess, assertRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";

export const createProduct = mutation({
  args: { name: v.string(), activeIngredient: v.string(), unit: v.string(), safetyNotes: v.optional(v.string()) },
  returns: v.id("chemicalProducts"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    assertRole(user, ["company_admin", "manager"]);
    const name = args.name.trim();
    const activeIngredient = args.activeIngredient.trim();
    const unit = args.unit.trim();
    if (!name || !activeIngredient || !unit) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Product, active ingredient, and unit are required" });
    const now = Date.now();
    const productId = await ctx.db.insert("chemicalProducts", { name, activeIngredient, unit, safetyNotes: args.safetyNotes?.trim(), active: true, createdAt: now, updatedAt: now });
    await writeAudit(ctx, { entityType: "chemicalProduct", entityId: productId, action: "product.created", actorId: user._id });
    return productId;
  },
});

export const adjustStock = mutation({
  args: { branchId: v.id("branches"), productId: v.id("chemicalProducts"), quantityDelta: v.number(), note: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager"]);
    if (!Number.isFinite(args.quantityDelta) || args.quantityDelta === 0 || Math.abs(args.quantityDelta) > 1_000_000 || args.note.trim().length < 3 || args.note.trim().length > 1000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Adjustment and reason must be valid" });
    const product = await ctx.db.get(args.productId);
    if (!product?.active) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });

    const balance = await ctx.db.query("stockBalances").withIndex("by_branch_product", (q) => q.eq("branchId", args.branchId).eq("productId", args.productId)).unique();
    const next = (balance?.quantity ?? 0) + args.quantityDelta;
    if (next < 0) throw new ConvexError({ code: "CONFLICT", message: "Adjustment would create negative stock" });
    const now = Date.now();
    if (balance) await ctx.db.patch(balance._id, { quantity: next, updatedAt: now });
    else await ctx.db.insert("stockBalances", { branchId: args.branchId, productId: args.productId, quantity: next, updatedAt: now });
    await ctx.db.insert("stockLedger", { branchId: args.branchId, productId: args.productId, type: "adjustment", quantityDelta: args.quantityDelta, balanceAfter: next, note: args.note.trim(), actorId: user._id, createdAt: now });
    await writeAudit(ctx, { entityType: "stock", entityId: `${args.branchId}:${args.productId}`, action: "stock.adjusted", actorId: user._id, branchId: args.branchId, metadata: { quantityDelta: args.quantityDelta } });
    return next;
  },
});

export const receiveStock = mutation({
  args: { branchId: v.id("branches"), productId: v.id("chemicalProducts"), quantity: v.number(), note: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["manager", "operations"]);
    if (!Number.isFinite(args.quantity) || args.quantity <= 0 || args.quantity > 1_000_000) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Receipt quantity must be positive" });
    const product = await ctx.db.get(args.productId); if (!product?.active) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
    const balance = await ctx.db.query("stockBalances").withIndex("by_branch_product", (q) => q.eq("branchId", args.branchId).eq("productId", args.productId)).unique();
    const next = (balance?.quantity ?? 0) + args.quantity; const now = Date.now();
    if (balance) await ctx.db.patch(balance._id, { quantity: next, updatedAt: now }); else await ctx.db.insert("stockBalances", { branchId: args.branchId, productId: args.productId, quantity: next, updatedAt: now });
    await ctx.db.insert("stockLedger", { branchId: args.branchId, productId: args.productId, type: "receipt", quantityDelta: args.quantity, balanceAfter: next, note: args.note?.trim(), actorId: user._id, createdAt: now });
    await writeAudit(ctx, { entityType: "stock", entityId: `${args.branchId}:${args.productId}`, action: "stock.received", actorId: user._id, branchId: args.branchId, metadata: { quantity: args.quantity } }); return next;
  },
});

export const listProducts = query({
  args: { activeOnly: v.optional(v.boolean()) },
  returns: v.array(v.object({ id: v.id("chemicalProducts"), name: v.string(), activeIngredient: v.string(), unit: v.string(), safetyNotes: v.optional(v.string()), active: v.boolean() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "customer") throw new ConvexError({ code: "FORBIDDEN", message: "Staff access required" });
    const rows = args.activeOnly === false ? await ctx.db.query("chemicalProducts").take(250) : await ctx.db.query("chemicalProducts").withIndex("by_active_name", (q) => q.eq("active", true)).take(250);
    return rows.map((product) => ({ id: product._id, name: product.name, activeIngredient: product.activeIngredient, unit: product.unit, safetyNotes: product.safetyNotes, active: product.active }));
  },
});

export const listForBranch = query({
  args: { branchId: v.id("branches") },
  returns: v.array(v.object({ productId: v.id("chemicalProducts"), name: v.string(), activeIngredient: v.string(), unit: v.string(), quantity: v.number() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await assertBranchAccess(ctx, user, args.branchId, ["company_admin", "manager", "operations", "technician", "auditor"]);
    const balances = await ctx.db.query("stockBalances").withIndex("by_branch_updatedAt", (q) => q.eq("branchId", args.branchId)).take(200);
    const rows = await Promise.all(balances.map(async (balance) => ({ balance, product: await ctx.db.get(balance.productId) })));
    return rows.filter((row) => row.product?.active).map(({ balance, product }) => ({ productId: product!._id, name: product!.name, activeIngredient: product!.activeIngredient, unit: product!.unit, quantity: balance.quantity }));
  },
});
