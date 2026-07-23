import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Loader2 } from "lucide-react";
import type { LocationDoc } from "../lib/locations";

type Verification = LocationDoc["verification"];

const STYLES: Record<
  string,
  { label: string; className: string; icon: typeof ShieldCheck }
> = {
  verified: {
    label: "Verified",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    icon: ShieldCheck,
  },
  close: {
    label: "Close",
    className: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    icon: ShieldAlert,
  },
  mismatch: {
    label: "Mismatch",
    className: "bg-red-500/20 text-red-300 border-red-400/30",
    icon: ShieldX,
  },
  not_found: {
    label: "Not found",
    className: "bg-slate-500/20 text-slate-300 border-slate-400/30",
    icon: ShieldQuestion,
  },
  error: {
    label: "Check failed",
    className: "bg-slate-500/20 text-slate-400 border-slate-400/20",
    icon: ShieldQuestion,
  },
};

export function AccuracyBadge({ verification }: { verification: Verification }) {
  if (!verification) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border bg-white/5 text-white/50 border-white/10"
        title="OpenStreetMap check is running in the background"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Verifying…
      </span>
    );
  }

  const style = STYLES[verification.status] ?? STYLES.error;
  const Icon = style.icon;
  const showScore =
    verification.status === "verified" ||
    verification.status === "close" ||
    verification.status === "mismatch";

  const title = [
    verification.matchedName ? `OSM: ${verification.matchedName}` : null,
    verification.distanceMeters != null
      ? `${verification.distanceMeters} m from submitted point`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${style.className}`}
      title={title || style.label}
    >
      <Icon className="w-3 h-3" />
      {style.label}
      {showScore && (
        <span className="font-semibold tabular-nums">{verification.score}%</span>
      )}
    </span>
  );
}
