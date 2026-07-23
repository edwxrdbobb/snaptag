import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

// A single location row as returned by the `listLocations` query (with imageUrls).
export type LocationDoc = FunctionReturnType<
  typeof api.locations.listLocations
>[number];

export type LeaderboardEntry = {
  userName: string;
  submissions: number;
  ratedSubmissions: number;
  totalStars: number;
  averageStars: number;
};

const ANONYMOUS = "Anonymous";

// Aggregate submissions per contributor and rank by total stars, then average,
// then submission count. Unrated submissions still count toward "submissions".
export function buildLeaderboard(locations: LocationDoc[]): LeaderboardEntry[] {
  const byUser = new Map<string, LeaderboardEntry>();

  for (const loc of locations) {
    const name = loc.userName?.trim() || ANONYMOUS;
    const entry =
      byUser.get(name) ??
      {
        userName: name,
        submissions: 0,
        ratedSubmissions: 0,
        totalStars: 0,
        averageStars: 0,
      };

    entry.submissions += 1;
    if (typeof loc.rating === "number" && loc.rating > 0) {
      entry.ratedSubmissions += 1;
      entry.totalStars += loc.rating;
    }
    byUser.set(name, entry);
  }

  const entries = Array.from(byUser.values()).map((e) => ({
    ...e,
    averageStars: e.ratedSubmissions > 0 ? e.totalStars / e.ratedSubmissions : 0,
  }));

  entries.sort(
    (a, b) =>
      b.totalStars - a.totalStars ||
      b.averageStars - a.averageStars ||
      b.submissions - a.submissions
  );

  return entries;
}
