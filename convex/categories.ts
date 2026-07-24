import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

const PRESETS = [
    { value: "restaurant", label: "Restaurant" },
    { value: "hotel", label: "Hotel" },
    { value: "attraction", label: "Attraction" },
    { value: "shopping", label: "Shopping" },
    { value: "other", label: "Other" },
];

// Idempotently add a category (dedup case-insensitively). Called whenever a
// location is created/edited, so custom categories are captured automatically.
export async function registerCategory(ctx: MutationCtx, raw: string) {
    const value = raw.trim();
    if (!value) return;
    const key = value.toLowerCase();
    const existing = await ctx.db
        .query("categories")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
    if (existing) return;
    await ctx.db.insert("categories", {
        key,
        value,
        label: value,
        createdAt: Date.now(),
    });
}

// All categories in insertion order (presets first, then custom as added).
export const listCategories = query({
    args: {},
    handler: async (ctx) => {
        const categories = await ctx.db.query("categories").collect();
        return categories
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((c) => ({ value: c.value, label: c.label }));
    },
});

// Explicitly add a category (e.g. from the "Add custom category" flow).
export const addCategory = mutation({
    args: { value: v.string() },
    handler: (ctx, args) => registerCategory(ctx, args.value),
});

// One-off: seed the default presets and any categories already used by
// existing locations. Run with `npx convex run categories:seed`.
export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        for (const preset of PRESETS) {
            const existing = await ctx.db
                .query("categories")
                .withIndex("by_key", (q) => q.eq("key", preset.value))
                .first();
            if (!existing) {
                await ctx.db.insert("categories", {
                    key: preset.value,
                    value: preset.value,
                    label: preset.label,
                    createdAt: Date.now(),
                });
            }
        }

        const locations = await ctx.db.query("locations").collect();
        for (const loc of locations) {
            await registerCategory(ctx, loc.category ?? "");
        }

        const all = await ctx.db.query("categories").collect();
        return { total: all.length };
    },
});
