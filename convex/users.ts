import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// NOTE: This is lightweight username/password auth for the mobile app — salted
// SHA-256, not bcrypt. Fine for a community tagging app; not for sensitive data.

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function randomHex(bytes: number): string {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toHex(digest);
}

// Public profile info for the signed-in user (never returns salt/hash).
export const getProfile = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;
        return {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            deviceName: user.deviceName,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        };
    },
});

// Update editable profile fields (currently just the display name).
export const updateProfile = mutation({
    args: {
        userId: v.id("users"),
        displayName: v.string(),
    },
    handler: async (ctx, args) => {
        const name = args.displayName.trim();
        if (name.length < 2) {
            throw new Error("Name must be at least 2 characters");
        }
        await ctx.db.patch(args.userId, { displayName: name });
        return { displayName: name };
    },
});

// Sign in if the account exists (password must match), otherwise create it.
export const signInOrUp = mutation({
    args: {
        username: v.string(),
        password: v.string(),
        deviceName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const displayName = args.username.trim();
        const username = displayName.toLowerCase();

        if (username.length < 3) {
            throw new Error("Username must be at least 3 characters");
        }
        if (args.password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }

        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", username))
            .first();

        if (existing) {
            const hash = await hashPassword(args.password, existing.salt);
            if (hash !== existing.passwordHash) {
                throw new Error("Incorrect password");
            }
            await ctx.db.patch(existing._id, {
                lastLoginAt: Date.now(),
                ...(args.deviceName ? { deviceName: args.deviceName } : {}),
            });
            return {
                userId: existing._id,
                username: existing.username,
                displayName: existing.displayName,
                created: false,
            };
        }

        const salt = randomHex(16);
        const passwordHash = await hashPassword(args.password, salt);
        const userId = await ctx.db.insert("users", {
            username,
            displayName,
            salt,
            passwordHash,
            deviceName: args.deviceName,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
        });

        return { userId, username, displayName, created: true };
    },
});
