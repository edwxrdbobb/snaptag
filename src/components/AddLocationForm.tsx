import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Camera, MapPin, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddLocationForm() {
    const createLocation = useMutation(api.locations.createLocation);
    const generateUploadUrl = useMutation(api.locations.generateUploadUrl);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        locationName: "",
        yourName: "",
        category: "",
        description: "",
        latitude: "",
        longitude: "",
    });

    const categories = [
        { value: "restaurant", label: "Restaurant" },
        { value: "hotel", label: "Hotel" },
        { value: "attraction", label: "Attraction" },
        { value: "shopping", label: "Shopping" },
        { value: "other", label: "Other" },
    ];

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        toast.info("Getting current location...");

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

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
                console.error("Error getting location:", error);
                let errorMessage = "Unable to retrieve your location";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                }
                toast.error(errorMessage);
            },
            options
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImage) {
            toast.error("Please select an image");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload image
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": selectedImage.type },
                body: selectedImage,
            });

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`);
            }

            const { storageId } = await result.json();

            // 2. Create location
            await createLocation({
                name: formData.locationName,
                description: formData.description,
                category: formData.category,
                address: "Address placeholder",
                coordinates: {
                    lat: parseFloat(formData.latitude),
                    lng: parseFloat(formData.longitude),
                },
                images: [storageId],
                userName: formData.yourName,
            });

            toast.success("Location added successfully!");

            // Reset form
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

        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Failed to add location. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto glass-panel text-white p-8 rounded-3xl shadow-2xl font-sans animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl font-semibold mb-6 text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-200">New Snaptag</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Image */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium ml-1 text-white/80">Location Image</label>
                    <div
                        className="border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all duration-300 relative h-56 group overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                            />
                        ) : (
                            <div className="text-center space-y-2">
                                <div className="bg-slate-700 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                                    <Upload className="w-6 h-6 text-slate-300" />
                                </div>
                                <span className="text-sm text-slate-400">Choose a photo</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                        />
                        <input
                            type="file"
                            ref={cameraInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                        />
                    </div>

                    <button
                        type="button"
                        className="glass-button w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white/90 hover:text-white"
                        onClick={() => {
                            // Try camera first, fallback handled by browser or user choice if camera not available/supported
                            if (cameraInputRef.current) {
                                cameraInputRef.current.click();
                            }
                        }}
                    >
                        <Camera className="w-4 h-4" />
                        Take a photo
                    </button>
                </div>

                {/* Location Name */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold ml-1 text-white/80">Location Name</label>
                    <input
                        type="text"
                        name="locationName"
                        value={formData.locationName}
                        onChange={handleInputChange}
                        placeholder="Enter location name"
                        className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                        required
                    />
                </div>

                {/* Your Name (Optional) */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold ml-1 text-white/80">Your Name (Optional)</label>
                    <input
                        type="text"
                        name="yourName"
                        value={formData.yourName}
                        onChange={handleInputChange}
                        placeholder="Enter your name"
                        className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                    />
                </div>

                {/* Category */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold ml-1 text-white/80">Category</label>
                    {isCustomCategory ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                placeholder="Enter custom category"
                                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setIsCustomCategory(false)}
                                className="text-sm text-blue-300 hover:text-blue-200 ml-1"
                            >
                                Back to selection
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full glass-input rounded-xl px-4 py-3 text-sm appearance-none"
                                    required
                                >
                                    <option value="" disabled className="bg-slate-900 text-gray-400">Select a category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.value} value={cat.value} className="bg-slate-900">{cat.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white/50">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomCategory(true);
                                    setFormData(prev => ({ ...prev, category: "" }));
                                }}
                                className="glass-button w-full text-left px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white mt-2 flex items-center gap-2"
                            >
                                <span className="text-lg leading-none">+</span> Add custom category
                            </button>
                        </>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold ml-1 text-white/80">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe this location..."
                        rows={4}
                        className="w-full glass-input rounded-xl px-4 py-3 text-sm resize-none"
                        required
                    />
                </div>

                {/* Latitude & Longitude */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <label className="block text-sm font-bold ml-1 text-white/80">Latitude</label>
                        <input
                            type="number"
                            name="latitude"
                            value={formData.latitude}
                            onChange={handleInputChange}
                            step="any"
                            placeholder="Latitude"
                            className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                            required
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-bold ml-1 text-white/80">Longitude</label>
                        <input
                            type="number"
                            name="longitude"
                            value={formData.longitude}
                            onChange={handleInputChange}
                            step="any"
                            placeholder="Longitude"
                            className="w-full glass-input rounded-xl px-4 py-3 text-sm"
                            required
                        />
                    </div>
                </div>

                {/* Location Info */}
                <div className="text-xs text-white/50 ml-1">
                    You can enter coordinates manually (e.g., lat: 37.7749, lng: -122.4194 for San Francisco)
                </div>

                {/* Get Current Location Button */}
                <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="glass-button w-full font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-white transition-all hover:scale-[1.02] active:scale-95"
                >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Get Current Location
                </button>

                {/* Note */}
                <p className="text-xs text-slate-400">
                    Note: Location services require permission and HTTPS. If unavailable, please enter coordinates manually.
                </p>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit Location"
                    )}
                </button>
            </form>
        </div>
    );
}
