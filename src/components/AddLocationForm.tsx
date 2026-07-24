import { useState, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    Camera,
    MapPin,
    Upload,
    Loader2,
    Image as ImageIcon,
    Tag,
    Navigation,
    User,
    LocateFixed,
    CheckCircle2,
    Plus,
    Utensils,
    BedDouble,
    ShoppingBag,
    MoreHorizontal,
    type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "../lib/cloudinary";

type AddLocationFormProps = {
    initialCoordinates?: { lat: number; lng: number };
    onCreated?: () => void;
};

// Icons for the well-known presets; custom categories fall back to a tag icon.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
    restaurant: Utensils,
    hotel: BedDouble,
    attraction: Camera,
    shopping: ShoppingBag,
    other: MoreHorizontal,
};

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 mb-4">
            <Icon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-white/60">
                {children}
            </span>
        </div>
    );
}

const cardClass =
    "bg-white/[0.06] border border-white/10 rounded-[28px] p-6 shadow-2xl";
const inputRowClass =
    "flex items-center gap-2.5 bg-slate-950/55 border border-white/10 rounded-2xl px-3.5 focus-within:border-white/25 transition-colors";
const inputClass =
    "flex-1 bg-transparent py-3 text-sm text-white placeholder-white/40 outline-none";
const fieldLabelClass = "block text-[13px] font-bold text-white/60 mb-2 ml-0.5";

export function AddLocationForm({ initialCoordinates, onCreated }: AddLocationFormProps = {}) {
    const createLocation = useMutation(api.locations.createLocation);
    const categories = useQuery(api.categories.listCategories) ?? [];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    const [formData, setFormData] = useState({
        locationName: "",
        yourName: "",
        category: "",
        description: "",
        latitude: initialCoordinates ? initialCoordinates.lat.toString() : "",
        longitude: initialCoordinates ? initialCoordinates.lng.toString() : "",
    });

    const set = (name: keyof typeof formData, value: string) =>
        setFormData((prev) => ({ ...prev, [name]: value }));

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        toast.info("Getting current location...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData((prev) => ({
                    ...prev,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString(),
                }));
                toast.success("Location found");
            },
            (error) => {
                let errorMessage = "Unable to retrieve your location";
                if (error.code === error.PERMISSION_DENIED)
                    errorMessage = "Location permission denied.";
                else if (error.code === error.POSITION_UNAVAILABLE)
                    errorMessage = "Location information is unavailable.";
                else if (error.code === error.TIMEOUT)
                    errorMessage = "The request to get your location timed out.";
                toast.error(errorMessage);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImage) return toast.error("Please add a photo");
        if (!formData.locationName.trim()) return toast.error("Please enter a location name");
        if (!formData.category.trim()) return toast.error("Please choose a category");
        if (!formData.latitude.trim() || !formData.longitude.trim())
            return toast.error("Please provide coordinates");

        setIsSubmitting(true);
        try {
            const imageUrl = await uploadToCloudinary(selectedImage);
            await createLocation({
                name: formData.locationName,
                description: formData.description,
                category: formData.category,
                address: "Address placeholder",
                coordinates: {
                    lat: parseFloat(formData.latitude),
                    lng: parseFloat(formData.longitude),
                },
                images: [imageUrl],
                userName: formData.yourName,
            });

            toast.success("Location added successfully!");
            setFormData({
                locationName: "",
                yourName: "",
                category: "",
                description: "",
                latitude: "",
                longitude: "",
            });
            setSelectedImage(null);
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            onCreated?.();
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Failed to add location. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasCoords = !!formData.latitude && !!formData.longitude;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500">
            {/* Photo */}
            <div className={cardClass}>
                <SectionLabel icon={ImageIcon}>Photo</SectionLabel>
                <div
                    className="relative h-52 rounded-2xl overflow-hidden bg-slate-950/55 border border-white/10 flex items-center justify-center cursor-pointer group mb-3"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {previewUrl ? (
                        <>
                            <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-xs text-white font-medium">
                                <ImageIcon className="w-3.5 h-3.5" /> Change
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2.5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-sm text-white/60">Choose from library</span>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                    <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
                </div>
                <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-white/[0.06] border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <Camera className="w-4.5 h-4.5" /> Take a photo
                </button>
            </div>

            {/* Details */}
            <div className={cardClass}>
                <SectionLabel icon={Tag}>Details</SectionLabel>

                <label className={fieldLabelClass}>Location name</label>
                <div className={inputRowClass}>
                    <MapPin className="w-4.5 h-4.5 text-white/40" />
                    <input
                        value={formData.locationName}
                        onChange={(e) => set("locationName", e.target.value)}
                        placeholder="e.g. Lumley Beach"
                        className={inputClass}
                    />
                </div>

                <label className={`${fieldLabelClass} mt-4`}>Your name (optional)</label>
                <div className={inputRowClass}>
                    <User className="w-4.5 h-4.5 text-white/40" />
                    <input
                        value={formData.yourName}
                        onChange={(e) => set("yourName", e.target.value)}
                        placeholder="Who's tagging this?"
                        className={inputClass}
                    />
                </div>

                <label className={`${fieldLabelClass} mt-4`}>Category</label>
                {isCustomCategory ? (
                    <>
                        <div className={inputRowClass}>
                            <Tag className="w-4.5 h-4.5 text-white/40" />
                            <input
                                value={formData.category}
                                onChange={(e) => set("category", e.target.value)}
                                placeholder="Enter a category"
                                className={inputClass}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => { setIsCustomCategory(false); set("category", ""); }}
                            className="text-[13px] text-blue-300 hover:text-blue-200 mt-2 ml-0.5"
                        >
                            Back to presets
                        </button>
                    </>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => {
                            const active = formData.category === cat.value;
                            const Icon = CATEGORY_ICONS[cat.value] ?? Tag;
                            return (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => set("category", cat.value)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[13px] font-semibold transition-all ${
                                        active
                                            ? "bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : "bg-slate-950/55 border border-white/10 text-white/60 hover:text-white hover:border-white/25"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {cat.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => { setIsCustomCategory(true); set("category", ""); }}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[13px] font-semibold bg-slate-950/55 border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Custom
                        </button>
                    </div>
                )}

                <label className={`${fieldLabelClass} mt-4`}>Description</label>
                <div className={`${inputRowClass} items-start`}>
                    <textarea
                        value={formData.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Describe this place…"
                        rows={3}
                        className={`${inputClass} resize-none pt-3`}
                    />
                </div>
            </div>

            {/* Coordinates */}
            <div className={cardClass}>
                <SectionLabel icon={Navigation}>Coordinates</SectionLabel>

                <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors mb-4"
                >
                    <LocateFixed className="w-4.5 h-4.5 text-emerald-400" />
                    {hasCoords ? "Update current location" : "Use my current location"}
                    {hasCoords && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />}
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={fieldLabelClass}>Latitude</label>
                        <div className={inputRowClass}>
                            <input
                                type="number"
                                step="any"
                                value={formData.latitude}
                                onChange={(e) => set("latitude", e.target.value)}
                                placeholder="8.4657"
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={fieldLabelClass}>Longitude</label>
                        <div className={inputRowClass}>
                            <input
                                type="number"
                                step="any"
                                value={formData.longitude}
                                onChange={(e) => set("longitude", e.target.value)}
                                placeholder="-13.2317"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-white/40 mt-3 ml-0.5">
                    Freetown example — lat: 8.4657, lng: -13.2317
                </p>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-400 hover:to-emerald-400 text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-5 h-5" /> Submit location
                    </>
                )}
            </button>
        </form>
    );
}
