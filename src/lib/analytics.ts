import type { LocationDoc } from "./locations";

export type CategoryStat = { category: string; count: number };
export type DayStat = { label: string; count: number };
export type RatingBucket = { stars: number; count: number };

export type Analytics = {
  total: number;
  contributors: number;
  rated: number;
  unrated: number;
  averageRating: number;
  withImages: number;
  categories: CategoryStat[];
  ratingBuckets: RatingBucket[];
  perDay: DayStat[];
  topContributor: { name: string; count: number } | null;
};

const ANONYMOUS = "Anonymous";

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Compute every dashboard metric from the raw submissions in one pass-ish.
export function buildAnalytics(locations: LocationDoc[]): Analytics {
  const total = locations.length;

  const userCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const ratingCounts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);

  let ratedTotal = 0;
  let ratedSum = 0;
  let withImages = 0;

  for (const loc of locations) {
    const user = loc.userName?.trim() || ANONYMOUS;
    userCounts.set(user, (userCounts.get(user) ?? 0) + 1);

    const cat = loc.category?.trim() || "other";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);

    if (typeof loc.rating === "number" && loc.rating >= 1 && loc.rating <= 5) {
      const rounded = Math.round(loc.rating);
      ratingCounts.set(rounded, (ratingCounts.get(rounded) ?? 0) + 1);
      ratedTotal += 1;
      ratedSum += loc.rating;
    }

    if (loc.imageUrls[0]) withImages += 1;
  }

  const categories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const ratingBuckets: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratingCounts.get(stars) ?? 0,
  }));

  // Submissions over the last 14 days.
  const today = startOfDay(Date.now());
  const perDay: DayStat[] = [];
  const dayCounts = new Map<number, number>();
  for (const loc of locations) {
    const day = startOfDay(loc._creationTime);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  for (let i = 13; i >= 0; i--) {
    const day = today - i * 86_400_000;
    const label = new Date(day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    perDay.push({ label, count: dayCounts.get(day) ?? 0 });
  }

  let topContributor: Analytics["topContributor"] = null;
  for (const [name, count] of userCounts.entries()) {
    if (!topContributor || count > topContributor.count) {
      topContributor = { name, count };
    }
  }

  return {
    total,
    contributors: userCounts.size,
    rated: ratedTotal,
    unrated: total - ratedTotal,
    averageRating: ratedTotal > 0 ? ratedSum / ratedTotal : 0,
    withImages,
    categories,
    ratingBuckets,
    perDay,
    topContributor,
  };
}
