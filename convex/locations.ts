import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
        images: v.array(v.id("_storage")),
        userName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // For now, allow anonymous creation or simplified flow
        const locationId = await ctx.db.insert("locations", {
            name: args.name,
            description: args.description,
            category: args.category,
            address: args.address,
            coordinates: args.coordinates,
            images: args.images,
            userName: args.userName,
        });
        return locationId;
    },
});

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
                    loc.images.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...loc,
                    imageUrls: imageUrls.filter((url): url is string => url !== null),
                };
            })
        );
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

export const deleteLocation = mutation({
    args: { id: v.id("locations") },
    handler: async (ctx, args) => {
        const loc = await ctx.db.get(args.id);
        if (loc) {
            // Clean up stored images so we don't leak orphaned files.
            await Promise.all(loc.images.map((imageId) => ctx.storage.delete(imageId)));
        }
        await ctx.db.delete(args.id);
    },
});
