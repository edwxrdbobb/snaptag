import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  BarChart3,
  MapPin,
  Users,
  Star,
  Image as ImageIcon,
  Crown,
  TrendingUp,
  Tag,
} from "lucide-react";
import { buildAnalytics } from "../lib/analytics";

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  hotel: "#3b82f6",
  attraction: "#a855f7",
  shopping: "#ec4899",
  other: "#10b981",
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof MapPin;
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{label}</span>
        <div className={`p-2 rounded-xl ${accent}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold mt-3 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

export function InsightsPage() {
  const locations = useQuery(api.locations.listLocations);
  const stats = useMemo(
    () => (locations ? buildAnalytics(locations) : null),
    [locations]
  );

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl h-28 animate-pulse bg-white/5" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl h-64 animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const maxCategory = Math.max(1, ...stats.categories.map((c) => c.count));
  const maxRating = Math.max(1, ...stats.ratingBuckets.map((r) => r.count));
  const maxDay = Math.max(1, ...stats.perDay.map((d) => d.count));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5 rounded-xl">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Insights</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Overview of every tagged location
          </p>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MapPin}
          label="Submissions"
          value={stats.total}
          accent="bg-blue-500/70"
        />
        <StatCard
          icon={Users}
          label="Contributors"
          value={stats.contributors}
          accent="bg-emerald-500/70"
        />
        <StatCard
          icon={Star}
          label="Avg. rating"
          value={stats.averageRating ? stats.averageRating.toFixed(1) : "—"}
          hint={`${stats.rated} rated · ${stats.unrated} unrated`}
          accent="bg-amber-500/70"
        />
        <StatCard
          icon={ImageIcon}
          label="With photos"
          value={stats.withImages}
          hint={`${Math.round((stats.withImages / (stats.total || 1)) * 100)}% of total`}
          accent="bg-purple-500/70"
        />
      </div>

      {stats.total === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-white/50">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No data yet. Add your first location to see insights.
        </div>
      ) : (
        <>
          {/* Activity + Top contributor */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl p-5 text-white lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="font-semibold">Activity · last 14 days</h2>
              </div>
              <div className="flex items-end gap-1.5 h-40">
                {stats.perDay.map((d) => (
                  <div
                    key={d.label}
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-emerald-400 rounded-t-md min-h-[2px] transition-all group-hover:opacity-80 relative"
                        style={{ height: `${(d.count / maxDay) * 100}%` }}
                        title={`${d.count} on ${d.label}`}
                      >
                        {d.count > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/70">
                            {d.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-white/40 rotate-45 origin-left whitespace-nowrap h-3">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 text-white flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold">Top contributor</h2>
              </div>
              {stats.topContributor ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl font-bold">
                    {stats.topContributor.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-lg">{stats.topContributor.name}</p>
                  <p className="text-sm text-white/50">
                    {stats.topContributor.count} submission
                    {stats.topContributor.count === 1 ? "" : "s"}
                  </p>
                  <Link
                    to="/leaderboard"
                    className="text-xs text-blue-300 hover:text-blue-200 mt-1"
                  >
                    View leaderboard →
                  </Link>
                </div>
              ) : (
                <p className="text-white/40 text-sm">No contributors yet</p>
              )}
            </div>
          </div>

          {/* Category breakdown + rating distribution */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-panel rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold">By category</h2>
              </div>
              <div className="space-y-3">
                {stats.categories.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-white/80">{c.category}</span>
                      <span className="text-white/50 tabular-nums">{c.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(c.count / maxCategory) * 100}%`,
                          backgroundColor:
                            CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.other,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold">Rating distribution</h2>
              </div>
              <div className="space-y-3">
                {stats.ratingBuckets.map((r) => (
                  <div key={r.stars} className="flex items-center gap-3">
                    <span className="text-sm text-white/70 w-10 flex items-center gap-1">
                      {r.stars}
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${(r.count / maxRating) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/50 tabular-nums w-6 text-right">
                      {r.count}
                    </span>
                  </div>
                ))}
                {stats.unrated > 0 && (
                  <p className="text-xs text-white/40 pt-1">
                    {stats.unrated} submission{stats.unrated === 1 ? "" : "s"} not yet
                    rated
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
