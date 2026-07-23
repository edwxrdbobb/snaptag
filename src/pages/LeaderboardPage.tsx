import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Trophy, Star, MapPin, Medal } from "lucide-react";
import { buildLeaderboard } from "../lib/locations";

const RANK_STYLES = [
  "from-amber-400/30 to-amber-600/10 border-amber-400/40",
  "from-slate-300/20 to-slate-500/10 border-slate-300/30",
  "from-orange-500/20 to-orange-700/10 border-orange-500/30",
];

export function LeaderboardPage() {
  const locations = useQuery(api.locations.listLocations);
  const entries = useMemo(
    () => (locations ? buildLeaderboard(locations) : []),
    [locations]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 rounded-xl">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Leaderboard
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            Ranked by total stars earned across submissions
          </p>
        </div>
      </header>

      {locations === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl h-20 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-white/50">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No submissions to rank yet.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div
              key={entry.userName}
              className={`glass-panel rounded-2xl p-4 flex items-center gap-4 text-white border ${
                i < 3
                  ? `bg-gradient-to-r ${RANK_STYLES[i]}`
                  : "border-white/10"
              }`}
            >
              <div className="w-10 flex justify-center shrink-0">
                {i < 3 ? (
                  <Medal
                    className={`w-7 h-7 ${
                      i === 0
                        ? "text-amber-400"
                        : i === 1
                          ? "text-slate-300"
                          : "text-orange-400"
                    }`}
                  />
                ) : (
                  <span className="text-lg font-bold text-white/40">{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{entry.userName}</p>
                <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {entry.submissions} submission
                    {entry.submissions === 1 ? "" : "s"}
                  </span>
                  {entry.ratedSubmissions > 0 && (
                    <span>avg {entry.averageStars.toFixed(1)} ★</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-xl font-bold tabular-nums">
                  {entry.totalStars}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
