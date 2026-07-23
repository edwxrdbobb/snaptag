import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    locations: defineTable({
        name: v.string(),
        description: v.string(),
        category: v.string(),
        address: v.string(),
        coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        images: v.array(v.id("_storage")),
        userName: v.optional(v.string()),
        // Admin-assigned relevance rating (1-5 stars). Powers the leaderboard.
        rating: v.optional(v.number()),
    }),
});
