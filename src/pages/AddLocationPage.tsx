import { useLocation, useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { AddLocationForm } from "../components/AddLocationForm";

type CoordState = { lat?: number; lng?: number } | null;

export function AddLocationPage() {
  const navigate = useNavigate();
  const state = useLocation().state as CoordState;
  const initialCoordinates =
    state && typeof state.lat === "number" && typeof state.lng === "number"
      ? { lat: state.lat, lng: state.lng }
      : undefined;

  return (
    <div className="max-w-md mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5 rounded-xl">
          <PlusCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Add Location
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            {initialCoordinates
              ? "Coordinates prefilled from the map"
              : "Tag a new place in Freetown"}
          </p>
        </div>
      </header>

      <AddLocationForm
        initialCoordinates={initialCoordinates}
        onCreated={() => navigate("/")}
      />
    </div>
  );
}
