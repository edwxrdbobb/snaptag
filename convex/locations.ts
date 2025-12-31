import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
