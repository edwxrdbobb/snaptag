import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Map as MapIcon, User, Tag, Plus } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "../components/StarRating";
import type { LocationDoc } from "../lib/locations";
import type { Id } from "../../convex/_generated/dataModel";

// Freetown, Sierra Leone.
const FREETOWN: [number, number] = [8.4657, -13.2317];

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

// Fit the map to all markers whenever the data changes.
function FitBounds({ locations }: { locations: LocationDoc[] }) {
  const map = useMap();
  useMemo(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(
      locations.map((l) => [l.coordinates.lat, l.coordinates.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
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
  const setRating = useMutation(api.locations.setRating);
  const navigate = useNavigate();
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);

  const points = useMemo(
    () => (locations ?? []).filter((l) => l.imageUrls !== undefined),
    [locations]
  );

  const handleRate = async (id: Id<"locations">, rating: number) => {
    try {
      await setRating({ id, rating });
      toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to save rating");
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-4 flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5 rounded-xl">
          <MapIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Map</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {points.length} location{points.length === 1 ? "" : "s"} · click the map
            to tag a new one
          </p>
        </div>
      </header>

      <div className="glass-panel rounded-2xl overflow-hidden flex-1 min-h-[70vh] relative">
        <MapContainer
          center={FREETOWN}
          zoom={13}
          scrollWheelZoom
          className="w-full h-full"
          style={{ minHeight: "70vh" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds locations={points} />
          <ClickToTag onPick={setPending} />

          {points.map((loc) => (
            <Marker
              key={loc._id}
              position={[loc.coordinates.lat, loc.coordinates.lng]}
              icon={pinIcon(CATEGORY_COLORS[loc.category] ?? CATEGORY_COLORS.other)}
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
                </div>
              </Popup>
            </Marker>
          ))}

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
