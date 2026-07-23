import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ShieldCheck, ShieldX, RefreshCw, MapPin, Ruler } from "lucide-react";
import { toast } from "sonner";
import { AccuracyBadge } from "../components/AccuracyBadge";
import type { LocationDoc } from "../lib/locations";
import type { Id } from "../../convex/_generated/dataModel";

const STATUS_ORDER: Record<string, number> = {
  mismatch: 0,
  not_found: 1,
  error: 2,
  close: 3,
  verified: 4,
  pending: 5,
};

function summarize(locations: LocationDoc[]) {
  let verified = 0;
  let close = 0;
  let mismatch = 0;
  let other = 0; // not_found / error
  let pending = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let distSum = 0;
  let distCount = 0;

  for (const l of locations) {
    const v = l.verification;
    if (!v) {
      pending += 1;
      continue;
    }
    if (v.status === "verified") verified += 1;
    else if (v.status === "close") close += 1;
    else if (v.status === "mismatch") mismatch += 1;
    else other += 1;

    if (v.status === "verified" || v.status === "close" || v.status === "mismatch") {
      scoreSum += v.score;
      scoreCount += 1;
    }
    if (v.distanceMeters != null) {
      distSum += v.distanceMeters;
      distCount += 1;
    }
  }

  return {
    total: locations.length,
    verified,
    close,
    mismatch,
    other,
    pending,
    checked: scoreCount,
    avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : 0,
    avgDistance: distCount ? Math.round(distSum / distCount) : null,
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof ShieldCheck;
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

export function AccuracyPage() {
  const locations = useQuery(api.locations.listLocations);
  const reverify = useMutation(api.verify.reverify);

  const stats = useMemo(
    () => (locations ? summarize(locations) : null),
    [locations]
  );

  // Worst / most-actionable first so reviewers see problems at the top.
  const ranked = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => {
      const sa = STATUS_ORDER[a.verification?.status ?? "pending"] ?? 5;
      const sb = STATUS_ORDER[b.verification?.status ?? "pending"] ?? 5;
      if (sa !== sb) return sa - sb;
      return (a.verification?.score ?? 0) - (b.verification?.score ?? 0);
    });
  }, [locations]);

  const handleRecheck = async (id: Id<"locations">) => {
    try {
      await reverify({ locationId: id });
      toast.success("Re-checking against OpenStreetMap…");
    } catch {
      toast.error("Couldn't start re-check");
    }
  };

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl h-28 animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const bars = [
    { label: "Verified", count: stats.verified, color: "#10b981" },
    { label: "Close", count: stats.close, color: "#f59e0b" },
    { label: "Mismatch", count: stats.mismatch, color: "#ef4444" },
    { label: "Not found", count: stats.other, color: "#64748b" },
    { label: "Pending", count: stats.pending, color: "#334155" },
  ];
  const maxBar = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-blue-500 p-2.5 rounded-xl">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Accuracy Analysis
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            How well each submitted name matches OpenStreetMap
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldCheck}
          label="Avg. accuracy"
          value={stats.checked ? `${stats.avgScore}%` : "—"}
          hint={`${stats.checked} of ${stats.total} checked`}
          accent="bg-emerald-500/70"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified"
          value={stats.verified}
          hint="score ≥ 75%"
          accent="bg-emerald-500/70"
        />
        <StatCard
          icon={ShieldX}
          label="Mismatches"
          value={stats.mismatch}
          hint="need review"
          accent="bg-red-500/70"
        />
        <StatCard
          icon={Ruler}
          label="Avg. distance"
          value={stats.avgDistance != null ? `${stats.avgDistance} m` : "—"}
          hint="name vs coordinates"
          accent="bg-blue-500/70"
        />
      </div>

      {/* Status distribution */}
      <div className="glass-panel rounded-2xl p-5 text-white">
        <h2 className="font-semibold mb-4">Status breakdown</h2>
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-sm text-white/70 w-24 shrink-0">{b.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(b.count / maxBar) * 100}%`,
                    backgroundColor: b.color,
                  }}
                />
              </div>
              <span className="text-sm text-white/50 tabular-nums w-8 text-right">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review table */}
      <div className="glass-panel rounded-2xl p-5 text-white">
        <h2 className="font-semibold mb-4">Review · lowest accuracy first</h2>
        <div className="space-y-2">
          {ranked.map((loc) => (
            <div
              key={loc._id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{loc.name}</p>
                <p className="text-xs text-white/50 truncate flex items-center gap-2 mt-0.5">
                  {loc.verification?.matchedName ? (
                    <span className="truncate">
                      OSM: {loc.verification.matchedName}
                    </span>
                  ) : (
                    <span className="italic">no OSM match</span>
                  )}
                  {loc.verification?.distanceMeters != null && (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3" />
                      {loc.verification.distanceMeters} m
                    </span>
                  )}
                </p>
              </div>
              <AccuracyBadge verification={loc.verification} />
              <button
                onClick={() => handleRecheck(loc._id)}
                className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                title="Re-check against OpenStreetMap"
                aria-label="Re-check"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          ))}
          {ranked.length === 0 && (
            <p className="text-white/40 text-sm text-center py-6">
              No submissions to analyse yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
