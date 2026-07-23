import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { X, Loader2, MapPin, Camera } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { LocationDoc } from "../lib/locations";
import { uploadToCloudinary } from "../lib/cloudinary";

const CATEGORY_PRESETS = [
  "restaurant",
  "hotel",
  "attraction",
  "shopping",
  "other",
];

export function EditLocationModal({
  location,
  onClose,
}: {
  location: LocationDoc;
  onClose: () => void;
}) {
  const updateLocation = useMutation(api.locations.updateLocation);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: location.name,
    userName: location.userName ?? "",
    category: location.category,
    description: location.description,
    latitude: location.coordinates.lat.toString(),
    longitude: location.coordinates.lng.toString(),
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Coordinates must be valid numbers");
      return;
    }
    setSaving(true);
    try {
      // If a new photo was chosen, upload it to Cloudinary and swap the URL.
      let images: string[] | undefined;
      if (newImage) {
        images = [await uploadToCloudinary(newImage)];
      }

      await updateLocation({
        id: location._id,
        name: form.name,
        description: form.description,
        category: form.category,
        coordinates: { lat, lng },
        userName: form.userName || undefined,
        images,
      });
      toast.success("Submission updated");
      onClose();
    } catch {
      toast.error("Failed to update submission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass-panel text-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 sticky top-0">
          <h2 className="text-xl font-semibold tracking-tight">Edit submission</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80 ml-1">
              Photo
            </label>
            <div
              className="relative h-40 rounded-xl overflow-hidden border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer group bg-black/30 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl || location.imageUrls[0] ? (
                <img
                  src={previewUrl ?? location.imageUrls[0]}
                  alt={location.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm text-white/40">No photo</span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="flex items-center gap-2 text-sm font-medium text-white bg-black/60 px-3 py-1.5 rounded-lg">
                  <Camera className="w-4 h-4" /> Change photo
                </span>
              </div>
              {newImage && (
                <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80 ml-1">
              Location Name
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80 ml-1">
              Contributor
            </label>
            <input
              value={form.userName}
              onChange={(e) => set("userName", e.target.value)}
              placeholder="Anonymous"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80 ml-1">
              Category
            </label>
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              list="category-presets"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              required
            />
            <datalist id="category-presets">
              {CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80 ml-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80 ml-1">
                Latitude
              </label>
              <input
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
                inputMode="decimal"
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80 ml-1">
                Longitude
              </label>
              <input
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
                inputMode="decimal"
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass-button py-3 rounded-xl text-sm font-medium text-white/90"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" /> Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
