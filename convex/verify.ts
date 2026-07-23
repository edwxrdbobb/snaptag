import { v } from "convex/values";
import {
    internalAction,
    internalMutation,
    internalQuery,
    mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Snaptag/1.0 (Freetown location tagging; verification bot)";

// --- geo + string helpers ---------------------------------------------------

function haversineMeters(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array<number>(n + 1);
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

// 0..1 similarity combining edit distance, token overlap, and substring match.
function nameSimilarity(input: string, candidate: string): number {
    const a = normalize(input);
    const b = normalize(candidate);
    if (!a || !b) return 0;

    const dist = levenshtein(a, b);
    const editRatio = 1 - dist / Math.max(a.length, b.length);

    const at = new Set(a.split(" "));
    const bt = new Set(b.split(" "));
    let overlap = 0;
    for (const t of at) if (bt.has(t)) overlap++;
    const jaccard = overlap / new Set([...at, ...bt]).size;

    const substring = b.includes(a) || a.includes(b) ? 0.85 : 0;

    return Math.max(editRatio, jaccard, substring);
}

// Meters -> 0..1, where <=100m is a perfect proximity match and >=2km is 0.
function proximityScore(meters: number): number {
    if (meters <= 100) return 1;
    if (meters >= 2000) return 0;
    return 1 - (meters - 100) / 1900;
}

// --- Nominatim -------------------------------------------------------------

type OsmResult = {
    lat: string;
    lon: string;
    name?: string;
    display_name?: string;
};

async function osmSearch(name: string): Promise<OsmResult | null> {
    const url =
        `${NOMINATIM}/search?format=jsonv2&limit=1&addressdetails=1` +
        `&countrycodes=sl&q=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`search ${res.status}`);
    const data = (await res.json()) as OsmResult[];
    return data[0] ?? null;
}

async function osmReverse(lat: number, lng: number): Promise<OsmResult | null> {
    const url =
        `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1` +
        `&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`reverse ${res.status}`);
    const data = (await res.json()) as OsmResult & { error?: string };
    if (!data || data.error) return null;
    return data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- internal db access ----------------------------------------------------

export const getLocation = internalQuery({
    args: { id: v.id("locations") },
    handler: (ctx, args) => ctx.db.get(args.id),
});

export const saveVerification = internalMutation({
    args: {
        locationId: v.id("locations"),
        status: v.string(),
        score: v.number(),
        inputName: v.string(),
        matchedName: v.optional(v.string()),
        osmDisplayName: v.optional(v.string()),
        nameSimilarity: v.number(),
        distanceMeters: v.optional(v.number()),
        checkedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("verifications")
            .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, args);
        } else {
            await ctx.db.insert("verifications", args);
        }
    },
});

// --- the background job ------------------------------------------------------

export const verifyLocation = internalAction({
    args: { locationId: v.id("locations") },
    handler: async (ctx, { locationId }) => {
        const loc = await ctx.runQuery(internal.verify.getLocation, {
            id: locationId,
        });
        if (!loc) return;

        const submitted = { lat: loc.coordinates.lat, lng: loc.coordinates.lng };

        try {
            const forward = await osmSearch(loc.name);
            await sleep(1100); // respect Nominatim's ~1 req/sec policy
            const reverse = await osmReverse(submitted.lat, submitted.lng);

            let proximity = 0;
            let distanceMeters: number | undefined;
            let fwdSim = 0;
            if (forward) {
                const found = {
                    lat: parseFloat(forward.lat),
                    lng: parseFloat(forward.lon),
                };
                distanceMeters = Math.round(haversineMeters(submitted, found));
                proximity = proximityScore(distanceMeters);
                fwdSim = nameSimilarity(
                    loc.name,
                    forward.name || forward.display_name || ""
                );
            }

            const revName = reverse?.name || reverse?.display_name || "";
            const revSim = reverse ? nameSimilarity(loc.name, revName) : 0;

            const bestSim = Math.max(fwdSim, revSim);
            let score: number;
            if (forward) {
                score = Math.round(100 * (0.6 * proximity + 0.4 * bestSim));
            } else {
                // No place found by name — rely on how well the coordinates'
                // actual place name matches the input.
                score = Math.round(100 * revSim);
            }

            let status: string;
            if (!forward && !reverse) status = "not_found";
            else if (score >= 75) status = "verified";
            else if (score >= 45) status = "close";
            else status = "mismatch";

            await ctx.runMutation(internal.verify.saveVerification, {
                locationId,
                status,
                score,
                inputName: loc.name,
                matchedName:
                    (proximity >= revSim ? forward?.name : reverse?.name) ??
                    forward?.name ??
                    reverse?.name,
                osmDisplayName: forward?.display_name ?? reverse?.display_name,
                nameSimilarity: Number(bestSim.toFixed(3)),
                distanceMeters,
                checkedAt: Date.now(),
            });
        } catch {
            await ctx.runMutation(internal.verify.saveVerification, {
                locationId,
                status: "error",
                score: 0,
                inputName: loc.name,
                nameSimilarity: 0,
                checkedAt: Date.now(),
            });
        }
    },
});

// Re-run the OpenStreetMap check for a single location (dashboard button).
export const reverify = mutation({
    args: { locationId: v.id("locations") },
    handler: async (ctx, args) => {
        await ctx.scheduler.runAfter(0, internal.verify.verifyLocation, {
            locationId: args.locationId,
        });
    },
});

// One-off: (re)verify every existing location, staggered to stay under the
// Nominatim rate limit. Run with `npx convex run verify:backfill`.
export const backfill = mutation({
    args: {},
    handler: async (ctx) => {
        const locations = await ctx.db.query("locations").collect();
        for (let i = 0; i < locations.length; i++) {
            await ctx.scheduler.runAfter(
                i * 2500,
                internal.verify.verifyLocation,
                { locationId: locations[i]._id }
            );
        }
        return { scheduled: locations.length };
    },
});
