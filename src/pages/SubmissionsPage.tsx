import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MapPin, Trash2, Pencil, Copy, User, Search, ImageOff, Tag } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "../components/StarRating";
import { AccuracyBadge } from "../components/AccuracyBadge";
import { EditLocationModal } from "../components/EditLocationModal";
import type { LocationDoc } from "../lib/locations";
import type { Id } from "../../convex/_generated/dataModel";

export function SubmissionsPage() {
  const locations = useQuery(api.locations.listLocations);
  const setRating = useMutation(api.locations.setRating);
  const deleteLocation = useMutation(api.locations.deleteLocation);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LocationDoc | null>(null);

  const filtered = useMemo(() => {
    if (!locations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        (l.userName ?? "").toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
    );
  }, [locations, search]);

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

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Submissions
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {locations === undefined
              ? "Loading…"
              : `${locations.length} location${locations.length === 1 ? "" : "s"} tagged`}
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, category, person…"
            className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm w-full sm:w-72"
          />
        </div>
      </header>

      {locations === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-panel rounded-2xl h-80 animate-pulse bg-white/5"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-white/50">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          {locations.length === 0
            ? "No submissions yet. Add your first location!"
            : "No submissions match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((loc) => (
            <div
              key={loc._id}
              className="glass-panel rounded-2xl overflow-hidden text-white flex flex-col group"
            >
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
                  <h3 className="font-semibold text-base leading-tight">
                    {loc.name}
                  </h3>
                  <p className="text-sm text-white/60 mt-1 line-clamp-2">
                    {loc.description}
                  </p>
                  <div className="mt-2">
                    <AccuracyBadge verification={loc.verification} />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-white/50 mt-auto">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {loc.userName?.trim() || "Anonymous"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {loc.coordinates.lat.toFixed(4)},{" "}
                    {loc.coordinates.lng.toFixed(4)}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyCoords(loc.coordinates.lat, loc.coordinates.lng)
                    }
                    className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                    aria-label="Copy coordinates"
                    title="Copy coordinates"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <StarRating
                    value={loc.rating ?? 0}
                    onChange={(r) => handleRate(loc._id, r)}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(loc)}
                      className="text-white/40 hover:text-blue-300 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
                      aria-label="Edit submission"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(loc._id, loc.name)}
                      className="text-white/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                      aria-label="Delete submission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditLocationModal
          location={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
