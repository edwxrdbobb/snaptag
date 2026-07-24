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
        // Image references. Cloudinary secure URLs going forward; legacy rows may
        // still hold Convex `_storage` IDs until migrated (both are plain strings).
        images: v.array(v.string()),
        userName: v.optional(v.string()),
        // Admin-assigned relevance rating (1-5 stars). Powers the leaderboard.
        rating: v.optional(v.number()),
        // The signed-in mobile user who submitted this (if any).
        userId: v.optional(v.id("users")),
        // Device / client metadata captured at submission time.
        metadata: v.optional(
            v.object({
                deviceName: v.optional(v.string()),
                deviceModel: v.optional(v.string()),
                brand: v.optional(v.string()),
                os: v.optional(v.string()),
                osVersion: v.optional(v.string()),
                appVersion: v.optional(v.string()),
                platform: v.optional(v.string()),
                submittedAt: v.optional(v.number()),
            })
        ),
    }),

    // Shared category list, so new/custom categories propagate to every client
    // (web + mobile) without an app update.
    categories: defineTable({
        key: v.string(), // lowercased dedupe key
        value: v.string(), // value stored on locations
        label: v.string(), // display label
        createdAt: v.number(),
    }).index("by_key", ["key"]),

    // Mobile app accounts (simple username + password).
    users: defineTable({
        username: v.string(), // lowercased, unique
        displayName: v.string(),
        salt: v.string(),
        passwordHash: v.string(),
        deviceName: v.optional(v.string()),
        createdAt: v.number(),
        lastLoginAt: v.optional(v.number()),
    }).index("by_username", ["username"]),

    // Background OpenStreetMap (Nominatim) check of whether the submitted name
    // matches the submitted coordinates. One row per location (upserted).
    verifications: defineTable({
        locationId: v.id("locations"),
        // "verified" | "close" | "mismatch" | "not_found" | "error" | "pending"
        status: v.string(),
        score: v.number(), // 0-100 accuracy
        inputName: v.string(),
        // Best matching place name found on OSM (forward or reverse).
        matchedName: v.optional(v.string()),
        osmDisplayName: v.optional(v.string()),
        nameSimilarity: v.number(), // 0-1
        // Distance between the typed name's OSM location and the submitted point.
        distanceMeters: v.optional(v.number()),
        checkedAt: v.number(),
    }).index("by_location", ["locationId"]),
});
