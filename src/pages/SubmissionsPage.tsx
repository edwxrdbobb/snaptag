import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  MapPin,
  Trash2,
  Pencil,
  Copy,
  User,
  Search,
  ImageOff,
  Tag,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "../components/StarRating";
import { AccuracyBadge } from "../components/AccuracyBadge";
import { EditLocationModal } from "../components/EditLocationModal";
import { usePersistedState } from "../hooks/usePersistedState";
import type { LocationDoc } from "../lib/locations";
import type { Id } from "../../convex/_generated/dataModel";

type StatusFilter = "all" | "verified" | "close" | "mismatch" | "unchecked";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All accuracy" },
  { value: "verified", label: "Verified" },
  { value: "close", label: "Close" },
  { value: "mismatch", label: "Mismatch" },
  { value: "unchecked", label: "Unchecked" },
];

const selectClass =
  "glass-input rounded-xl px-3 py-2.5 text-sm text-white bg-slate-950/40 appearance-none cursor-pointer";

export function SubmissionsPage() {
  const locations = useQuery(api.locations.listLocations);
  const categories = useQuery(api.categories.listCategories) ?? [];
  const setRating = useMutation(api.locations.setRating);
  const deleteLocation = useMutation(api.locations.deleteLocation);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = usePersistedState<"grid" | "list">(
    "snaptag.submissionsView",
    "grid"
  );
  const [editing, setEditing] = useState<LocationDoc | null>(null);

  const filtered = useMemo(() => {
    if (!locations) return [];
    const q = search.trim().toLowerCase();
    return locations.filter((l) => {
      if (
        q &&
        !(
          l.name.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.userName ?? "").toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
        )
      )
        return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (statusFilter !== "all") {
        const s = l.verification?.status;
        if (statusFilter === "unchecked") {
          if (s && s !== "not_found" && s !== "error") return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [locations, search, categoryFilter, statusFilter]);

  const handleRate = async (id: Id<"locations">, rating: number) => {
    try {
      await setRating({ id, rating });
      toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to save rating");
    }
  };

  const handleCopyCoords = async (lat: number, lng: number) => {
    const text = `${lat}, ${lng}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${text}`);
    } catch {
      toast.error("Couldn't copy coordinates");
    }
  };

  const handleDelete = async (id: Id<"locations">, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteLocation({ id });
      toast.success("Submission deleted");
    } catch {
      toast.error("Failed to delete submission");
    }
  };

  const activeFilters =
    search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all";

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Submission Locations
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {locations === undefined
                ? "Loading…"
                : `${filtered.length}${
                    activeFilters ? ` of ${locations.length}` : ""
                  } location${filtered.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-colors ${
                view === "grid"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white"
              }`}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg transition-colors ${
                view === "list"
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white"
              }`}
              aria-label="List view"
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, person…"
              className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm w-full"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all" className="bg-slate-900">
              All categories
            </option>
            {categories.map((c) => (
              <option key={c.value} value={c.value} className="bg-slate-900">
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {locations === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl h-80 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-white/50">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          {locations.length === 0
            ? "No submissions yet. Add your first location!"
            : "No locations match your filters."}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((loc) => (
            <GridCard
              key={loc._id}
              loc={loc}
              onRate={handleRate}
              onCopy={handleCopyCoords}
              onEdit={() => setEditing(loc)}
              onDelete={() => handleDelete(loc._id, loc.name)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((loc) => (
            <ListRow
              key={loc._id}
              loc={loc}
              onRate={handleRate}
              onCopy={handleCopyCoords}
              onEdit={() => setEditing(loc)}
              onDelete={() => handleDelete(loc._id, loc.name)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditLocationModal location={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

type CardProps = {
  loc: LocationDoc;
  onRate: (id: Id<"locations">, r: number) => void;
  onCopy: (lat: number, lng: number) => void;
  onEdit: () => void;
  onDelete: () => void;
};

function CoordCopy({ loc, onCopy }: { loc: LocationDoc; onCopy: CardProps["onCopy"] }) {
  return (
    <>
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {loc.coordinates.lat.toFixed(4)}, {loc.coordinates.lng.toFixed(4)}
      </span>
      <button
        onClick={() => onCopy(loc.coordinates.lat, loc.coordinates.lng)}
        className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
        aria-label="Copy coordinates"
        title="Copy coordinates"
      >
        <Copy className="w-3 h-3" />
      </button>
    </>
  );
}

function RowActions({ loc, onRate, onEdit, onDelete }: Omit<CardProps, "onCopy">) {
  return (
    <>
      <StarRating value={loc.rating ?? 0} onChange={(r) => onRate(loc._id, r)} />
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="text-white/40 hover:text-blue-300 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
          aria-label="Edit submission"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-white/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
          aria-label="Delete submission"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

function GridCard({ loc, onRate, onCopy, onEdit, onDelete }: CardProps) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden text-white flex flex-col group">
      <div className="h-44 bg-black/40 relative overflow-hidden">
        {loc.imageUrls[0] ? (
          <img
            src={loc.imageUrls[0]}
            alt={loc.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full flex items-center gap-1 capitalize">
          <Tag className="w-3 h-3" />
          {loc.category}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-base leading-tight">{loc.name}</h3>
          <p className="text-sm text-white/60 mt-1 line-clamp-2">{loc.description}</p>
          <div className="mt-2">
            <AccuracyBadge verification={loc.verification} />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/50 mt-auto">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {loc.userName?.trim() || "Anonymous"}
          </span>
          <CoordCopy loc={loc} onCopy={onCopy} />
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <RowActions loc={loc} onRate={onRate} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

function ListRow({ loc, onRate, onCopy, onEdit, onDelete }: CardProps) {
  return (
    <div className="glass-panel rounded-2xl text-white flex items-center gap-4 p-3">
      <div className="w-20 h-20 rounded-xl bg-black/40 overflow-hidden shrink-0 relative">
        {loc.imageUrls[0] ? (
          <img src={loc.imageUrls[0]} alt={loc.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <ImageOff className="w-6 h-6" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-base leading-tight truncate">{loc.name}</h3>
          <span className="bg-white/10 text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 capitalize shrink-0">
            <Tag className="w-3 h-3" />
            {loc.category}
          </span>
          <AccuracyBadge verification={loc.verification} />
        </div>
        <p className="text-sm text-white/50 mt-1 line-clamp-1">{loc.description}</p>
        <div className="flex items-center gap-3 text-xs text-white/50 mt-1.5">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {loc.userName?.trim() || "Anonymous"}
          </span>
          <CoordCopy loc={loc} onCopy={onCopy} />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <RowActions loc={loc} onRate={onRate} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
