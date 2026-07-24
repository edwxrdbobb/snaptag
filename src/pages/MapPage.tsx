import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  Map as MapIcon,
  User,
  Tag,
  Plus,
  Move,
  Lock,
  Search,
  Undo2,
  Redo2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "../components/StarRating";
import { usePersistedState } from "../hooks/usePersistedState";
import type { LocationDoc } from "../lib/locations";
import type { Id } from "../../convex/_generated/dataModel";

type CoordMove = {
  id: Id<"locations">;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

type StatusFilter = "all" | "verified" | "close" | "mismatch" | "unchecked";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All accuracy" },
  { value: "verified", label: "Verified" },
  { value: "close", label: "Close" },
  { value: "mismatch", label: "Mismatch" },
  { value: "unchecked", label: "Unchecked" },
];

// Freetown, Sierra Leone.
const FREETOWN: [number, number] = [8.4657, -13.2317];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const MAP_STYLES = [
  { id: "streets-v12", label: "Streets" },
  { id: "satellite-streets-v12", label: "Satellite" },
  { id: "dark-v11", label: "Dark" },
] as const;

type MapStyleId = (typeof MAP_STYLES)[number]["id"];

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  hotel: "#3b82f6",
  attraction: "#a855f7",
  shopping: "#ec4899",
  other: "#10b981",
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "snaptag-pin",
    html: `<svg width="30" height="42" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 22 12 22s12-13.6 12-22C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

// Fix Leaflet sizing (the flex/vh container isn't measured yet at init, which
// leaves gray tiles) and fit the map to all markers whenever the data changes.
function MapController({ locations }: { locations: LocationDoc[] }) {
  const map = useMap();

  useEffect(() => {
    // Re-measure once layout settles, then again on any container resize.
    const fit = () => {
      map.invalidateSize();
      if (locations.length > 0) {
        const bounds = L.latLngBounds(
          locations.map(
            (l) => [l.coordinates.lat, l.coordinates.lng] as [number, number]
          )
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    };

    const timer = setTimeout(fit, 150);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fit);
    };
  }, [locations, map]);

  return null;
}

function ClickToTag({
  onPick,
}: {
  onPick: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

export function MapPage() {
  const locations = useQuery(api.locations.listLocations);
  const categories = useQuery(api.categories.listCategories) ?? [];
  const setRating = useMutation(api.locations.setRating);
  const setCoordinates = useMutation(api.locations.setCoordinates);
  const navigate = useNavigate();
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
  // Pins individually unlocked for dragging via their popup toggle.
  const [unlocked, setUnlocked] = useState<Set<Id<"locations">>>(() => new Set());
  // Whether the Option/Alt key is currently held (temporary drag override).
  const [altPressed, setAltPressed] = useState(false);
  // A dragged-but-not-yet-saved position awaiting confirmation.
  const [pendingMove, setPendingMove] = useState<{
    id: Id<"locations">;
    name: string;
    from: { lat: number; lng: number };
    lat: number;
    lng: number;
  } | null>(null);
  const [undoStack, setUndoStack] = useState<CoordMove[]>([]);
  const [redoStack, setRedoStack] = useState<CoordMove[]>([]);
  // Search + filters.
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Remember the chosen map style across navigation and reloads.
  const [savedStyle, setMapStyle] = usePersistedState<MapStyleId>(
    "snaptag.mapStyle",
    "streets-v12"
  );
  // Guard against a stale/invalid cached value if the style list ever changes.
  const mapStyle = MAP_STYLES.some((s) => s.id === savedStyle)
    ? savedStyle
    : "streets-v12";

  const points = useMemo(
    () => (locations ?? []).filter((l) => l.imageUrls !== undefined),
    [locations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((l) => {
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
  }, [points, search, categoryFilter, statusFilter]);

  // Hold Option/Alt to temporarily make any pin draggable.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setAltPressed(false);
    };
    const reset = () => setAltPressed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);

  const toggleUnlock = (id: Id<"locations">) =>
    setUnlocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRate = async (id: Id<"locations">, rating: number) => {
    try {
      await setRating({ id, rating });
      toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to save rating");
    }
  };

  // Save the pending drag once the user confirms it.
  const confirmMove = async () => {
    if (!pendingMove) return;
    const move: CoordMove = {
      id: pendingMove.id,
      from: pendingMove.from,
      to: { lat: pendingMove.lat, lng: pendingMove.lng },
    };
    try {
      await setCoordinates({ id: move.id, lat: move.to.lat, lng: move.to.lng });
      setUndoStack((s) => [...s, move]);
      setRedoStack([]);
      setPendingMove(null);
      toast.success("Position updated");
    } catch {
      toast.error("Failed to update position");
    }
  };

  const cancelMove = () => setPendingMove(null);

  const undo = async () => {
    const move = undoStack[undoStack.length - 1];
    if (!move) return;
    try {
      await setCoordinates({ id: move.id, lat: move.from.lat, lng: move.from.lng });
      setUndoStack((s) => s.slice(0, -1));
      setRedoStack((s) => [...s, move]);
      toast.success("Move undone");
    } catch {
      toast.error("Undo failed");
    }
  };

  const redo = async () => {
    const move = redoStack[redoStack.length - 1];
    if (!move) return;
    try {
      await setCoordinates({ id: move.id, lat: move.to.lat, lng: move.to.lng });
      setRedoStack((s) => s.slice(0, -1));
      setUndoStack((s) => [...s, move]);
      toast.success("Move redone");
    } catch {
      toast.error("Redo failed");
    }
  };

  const activeFilters =
    search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all";

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5 rounded-xl">
            <MapIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Map</h1>
            <p className="text-sm text-white/50 mt-0.5">
              {filtered.length}
              {activeFilters ? ` of ${points.length}` : ""} location
              {filtered.length === 1 ? "" : "s"} · click the map to tag a new one
            </p>
          </div>

          {/* Undo / redo */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo move"
              aria-label="Undo move"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo move"
              aria-label="Redo move"
            >
              <Redo2 className="w-4 h-4" />
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
            className="glass-input rounded-xl px-3 py-2.5 text-sm text-white bg-slate-950/40 appearance-none cursor-pointer"
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
            className="glass-input rounded-xl px-3 py-2.5 text-sm text-white bg-slate-950/40 appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="glass-panel rounded-2xl overflow-hidden relative" style={{ height: "75vh" }}>
        {MAPBOX_TOKEN && (
          <div className="absolute top-3 right-3 z-[1000] flex gap-1 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
            {MAP_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setMapStyle(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  mapStyle === s.id
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {altPressed && !pendingMove && (
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
            <Move className="w-3.5 h-3.5" /> Option held — drag any pin to move it
          </div>
        )}
        {/* Confirm bar for an unsaved dragged position. */}
        {pendingMove && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl">
            <span className="text-sm text-white/80">
              Move <span className="font-semibold text-white">{pendingMove.name}</span> here?
            </span>
            <button
              onClick={confirmMove}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
            <button
              onClick={cancelMove}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
        <MapContainer
          center={FREETOWN}
          zoom={15}
          maxZoom={20}
          scrollWheelZoom
          className="w-full"
          style={{ height: "100%", width: "100%" }}
        >
          {MAPBOX_TOKEN ? (
            <TileLayer
              key={mapStyle}
              attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={`https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              // Upscale past this instead of requesting tiles that don't exist
              // (which would show gray).
              maxNativeZoom={18}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={20}
              maxNativeZoom={19}
            />
          )}

          <MapController locations={filtered} />
          <ClickToTag onPick={setPending} />

          {filtered.map((loc) => {
            const isDraggable = altPressed || unlocked.has(loc._id);
            const isPending = pendingMove?.id === loc._id;
            const position: [number, number] = isPending
              ? [pendingMove.lat, pendingMove.lng]
              : [loc.coordinates.lat, loc.coordinates.lng];
            return (
            <Marker
              key={loc._id}
              position={position}
              icon={pinIcon(
                isPending
                  ? "#f59e0b"
                  : CATEGORY_COLORS[loc.category] ?? CATEGORY_COLORS.other
              )}
              draggable={isDraggable}
              autoPan
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  setPendingMove({
                    id: loc._id,
                    name: loc.name,
                    from: {
                      lat: loc.coordinates.lat,
                      lng: loc.coordinates.lng,
                    },
                    lat,
                    lng,
                  });
                },
              }}
            >
              <Popup minWidth={220} maxWidth={260}>
                <div className="space-y-2">
                  {loc.imageUrls[0] && (
                    <img
                      src={loc.imageUrls[0]}
                      alt={loc.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base leading-tight">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Tag className="w-3 h-3" /> {loc.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {loc.userName?.trim() || "Anonymous"}
                      </span>
                    </p>
                  </div>
                  {loc.description && (
                    <p className="text-sm text-slate-600">{loc.description}</p>
                  )}
                  <StarRating
                    value={loc.rating ?? 0}
                    size={18}
                    onChange={(r) => handleRate(loc._id, r)}
                  />
                  <button
                    onClick={() => toggleUnlock(loc._id)}
                    className={`w-full mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors ${
                      unlocked.has(loc._id)
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    }`}
                  >
                    {unlocked.has(loc._id) ? (
                      <Move className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    {unlocked.has(loc._id) ? "Draggable — drag, then confirm" : "Enable dragging"}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    or hold ⌥ Option and drag
                  </p>
                </div>
              </Popup>
            </Marker>
            );
          })}

          {pending && (
            <Marker
              position={[pending.lat, pending.lng]}
              icon={pinIcon("#22d3ee")}
            >
              <Popup minWidth={200}>
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium text-slate-900">
                    Tag a location here?
                  </p>
                  <p className="text-xs text-slate-500">
                    {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
                  </p>
                  <button
                    onClick={() =>
                      navigate("/add", {
                        state: { lat: pending.lat, lng: pending.lng },
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add here
                  </button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
