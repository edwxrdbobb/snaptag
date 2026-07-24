import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { registerCategory } from "./categories";
import type { Id } from "./_generated/dataModel";

// Images are Cloudinary secure URLs (start with http). Legacy rows may still
// hold a Convex `_storage` id, which we resolve to a URL on read until migrated.
async function resolveImageUrl(
    ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
    image: string
): Promise<string | null> {
    if (image.startsWith("http")) return image;
    return ctx.storage.getUrl(image as Id<"_storage">);
}

export const createLocation = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        category: v.string(),
        address: v.string(),
        coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        // Cloudinary secure URLs.
        images: v.array(v.string()),
        userName: v.optional(v.string()),
        userId: v.optional(v.id("users")),
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
    },
    handler: async (ctx, args) => {
        const locationId = await ctx.db.insert("locations", {
            name: args.name,
            description: args.description,
            category: args.category,
            address: args.address,
            coordinates: args.coordinates,
            images: args.images,
            userName: args.userName,
            userId: args.userId,
            metadata: args.metadata,
        });
        // Register the category so it's available to every client next time.
        await registerCategory(ctx, args.category);
        // Verify the name against OpenStreetMap in the background.
        await ctx.scheduler.runAfter(0, internal.verify.verifyLocation, {
            locationId,
        });
        return locationId;
    },
});

// Retained for backward compatibility; new uploads go directly to Cloudinary.
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// List every submission, newest first, with resolved image URLs for display.
export const listLocations = query({
    args: {},
    handler: async (ctx) => {
        const locations = await ctx.db.query("locations").order("desc").collect();
        return await Promise.all(
            locations.map(async (loc) => {
                const imageUrls = await Promise.all(
                    loc.images.map((image) => resolveImageUrl(ctx, image))
                );
                const verification = await ctx.db
                    .query("verifications")
                    .withIndex("by_location", (q) => q.eq("locationId", loc._id))
                    .first();
                return {
                    ...loc,
                    imageUrls: imageUrls.filter((url): url is string => url !== null),
                    verification: verification
                        ? {
                              status: verification.status,
                              score: verification.score,
                              matchedName: verification.matchedName,
                              osmDisplayName: verification.osmDisplayName,
                              distanceMeters: verification.distanceMeters,
                          }
                        : null,
                };
            })
        );
    },
});

// Move a pin to new coordinates (used by "Suggest best position" on the map)
// and re-run the OpenStreetMap accuracy check for the new spot.
export const setCoordinates = mutation({
    args: {
        id: v.id("locations"),
        lat: v.number(),
        lng: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            coordinates: { lat: args.lat, lng: args.lng },
        });
        await ctx.scheduler.runAfter(0, internal.verify.verifyLocation, {
            locationId: args.id,
        });
    },
});

// Admin sets the relevance rating (1-5) that feeds the leaderboard.
export const setRating = mutation({
    args: {
        id: v.id("locations"),
        rating: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { rating: args.rating });
    },
});

// Overwrite a submission's image list. Used by the Cloudinary migration.
export const setImages = mutation({
    args: {
        id: v.id("locations"),
        images: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { images: args.images });
    },
});

export const deleteLocation = mutation({
    args: { id: v.id("locations") },
    handler: async (ctx, args) => {
        const loc = await ctx.db.get(args.id);
        if (loc) {
            // Clean up any legacy Convex-stored files (Cloudinary URLs are skipped).
            await Promise.all(
                loc.images
                    .filter((image) => !image.startsWith("http"))
                    .map((image) => ctx.storage.delete(image as Id<"_storage">))
            );
        }
        await ctx.db.delete(args.id);
    },
});

// Edit an existing submission's details. If `images` is provided, it replaces
// the current photos (and cleans up any legacy Convex-stored files).
export const updateLocation = mutation({
    args: {
        id: v.id("locations"),
        name: v.string(),
        description: v.string(),
        category: v.string(),
        coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        userName: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, images, ...fields } = args;

        const existing = await ctx.db.get(id);
        const nameOrCoordsChanged =
            !!existing &&
            (existing.name !== fields.name ||
                existing.coordinates.lat !== fields.coordinates.lat ||
                existing.coordinates.lng !== fields.coordinates.lng);

        if (images !== undefined) {
            if (existing) {
                const keep = new Set(images);
                await Promise.all(
                    existing.images
                        .filter((image) => !keep.has(image) && !image.startsWith("http"))
                        .map((image) => ctx.storage.delete(image as Id<"_storage">))
                );
            }
            await ctx.db.patch(id, { ...fields, images });
        } else {
            await ctx.db.patch(id, fields);
        }

        // Capture the category in case it's a new custom one.
        await registerCategory(ctx, fields.category);

        // Re-verify against OpenStreetMap if the name or coordinates changed.
        if (nameOrCoordsChanged) {
            await ctx.scheduler.runAfter(0, internal.verify.verifyLocation, {
                locationId: id,
            });
        }
    },
});
