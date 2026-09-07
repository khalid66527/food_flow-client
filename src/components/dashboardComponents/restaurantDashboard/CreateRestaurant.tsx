"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  MapPin,
  Clock,
  DollarSign,
  Tag,
  Image as ImageIcon,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
  ShieldCheck,
  Plus,
  X,
  Eye,
  ChevronDown,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import AOS from "aos";
import { IRestaurant, RestaurantFormData } from "@/lib/api/restaurant";
import { BANGLADESH_LOCATIONS } from "@/data/bangladeshLocations";
import {
  createRestaurantProfile,
  updateRestaurantProfile,
} from "@/lib/actions/restaurant";

interface CreateRestaurantProps {
  initialData?: Partial<IRestaurant> | null;
  userEmail?: string;
  userName?: string;
  userId?: string;
  isEditMode?: boolean;
  onSuccess?: (restaurant: IRestaurant) => void;
  onCancel?: () => void;
}

const PRESET_CUISINES = [
  "Biryani",
  "Fast Food",
  "Burgers",
  "Pizza",
  "Traditional Bengali",
  "Italian",
  "Chinese",
  "Indian",
  "Dessert & Bakery",
  "Beverages & Coffee",
  "BBQ & Grill",
  "Seafood",
  "Mexican",
  "Thai",
  "Healthy & Salads",
];

const PRESET_LOGOS = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80",
];

const PRESET_BANNERS = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
];

export default function CreateRestaurant({
  initialData,
  userEmail = "",
  userName = "",
  userId = "",
  isEditMode = false,
  onSuccess,
  onCancel,
}: CreateRestaurantProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "location" | "operations" | "social">("general");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customCuisine, setCustomCuisine] = useState("");

  useEffect(() => {
    AOS.refresh();
  }, [activeTab]);

  const [formData, setFormData] = useState<RestaurantFormData>({
    restaurantName: initialData?.restaurantName || "",
    tagline: initialData?.tagline || "",
    description: initialData?.description || "",
    cuisineTypes: initialData?.cuisineTypes && initialData.cuisineTypes.length > 0
      ? initialData.cuisineTypes
      : ["Biryani", "Fast Food"],
    logo: initialData?.logo || PRESET_LOGOS[0],
    bannerImage: initialData?.bannerImage || PRESET_BANNERS[0],
    contactNumber: initialData?.contactNumber || "",
    contactEmail: initialData?.contactEmail || userEmail || "",
    website: initialData?.website || initialData?.socialLinks?.website || "",
    street: initialData?.address?.street || "",
    city: initialData?.address?.city || "Dhaka",
    state: initialData?.address?.state || "",
    postalCode: initialData?.address?.postalCode || "",
    country: initialData?.address?.country || "Bangladesh",
    generalOpenTime: initialData?.generalOpenTime || "09:00 AM",
    generalCloseTime: initialData?.generalCloseTime || "10:30 PM",
    minOrderAmount: initialData?.pricing?.minOrderAmount ?? 150,
    deliveryFee: initialData?.pricing?.deliveryFee ?? 40,
    estimatedDeliveryTime: initialData?.pricing?.estimatedDeliveryTime || "25-35 mins",
    costForTwo: initialData?.pricing?.costForTwo ?? 450,
    hasDelivery: initialData?.features?.hasDelivery ?? true,
    hasTakeaway: initialData?.features?.hasTakeaway ?? true,
    hasDineIn: initialData?.features?.hasDineIn ?? true,
    isPureVeg: initialData?.features?.isPureVeg ?? false,
    isHalal: initialData?.features?.isHalal ?? true,
    facebook: initialData?.socialLinks?.facebook || "",
    instagram: initialData?.socialLinks?.instagram || "",
    twitter: initialData?.socialLinks?.twitter || "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Bangladesh Administrative Hierarchy Cascading logic
  const selectedDivisionObj = BANGLADESH_LOCATIONS.find(
    (loc) => loc.division.toLowerCase() === (formData.city || "").trim().toLowerCase()
  );
  const availableDistricts = selectedDivisionObj ? selectedDivisionObj.districts : [];

  const selectedDistrictObj = availableDistricts.find(
    (d) => d.name.toLowerCase() === (formData.state || "").trim().toLowerCase()
  );
  const availablePostalCodes = selectedDistrictObj ? selectedDistrictObj.postalCodes : [];

  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      city: val,
      state: "",
      postalCode: "",
    }));
  };

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state: val,
      postalCode: "",
    }));
  };

  const handlePostalCodeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      postalCode: val,
    }));
  };

  const handleCheckboxChange = (name: keyof RestaurantFormData) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCuisine = (cuisine: string) => {
    setFormData((prev) => {
      const exists = prev.cuisineTypes.includes(cuisine);
      if (exists) {
        if (prev.cuisineTypes.length === 1) return prev;
        return {
          ...prev,
          cuisineTypes: prev.cuisineTypes.filter((c) => c !== cuisine),
        };
      } else {
        return { ...prev, cuisineTypes: [...prev.cuisineTypes, cuisine] };
      }
    });
  };

  const addCustomCuisine = () => {
    const trimmed = customCuisine.trim();
    if (trimmed && !formData.cuisineTypes.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        cuisineTypes: [...prev.cuisineTypes, trimmed],
      }));
      setCustomCuisine("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!formData.restaurantName.trim()) {
      setActiveTab("general");
      setErrorMsg("Please enter your Restaurant Name.");
      return;
    }

    if (!formData.description.trim()) {
      setActiveTab("general");
      setErrorMsg("Please provide a short description for your restaurant.");
      return;
    }

    if (formData.cuisineTypes.length === 0) {
      setActiveTab("general");
      setErrorMsg("Please select at least one cuisine type.");
      return;
    }

    if (!formData.contactNumber.trim()) {
      setActiveTab("location");
      setErrorMsg("Please enter a valid contact phone number.");
      return;
    }

    if (!formData.street.trim() || !formData.city.trim()) {
      setActiveTab("location");
      setErrorMsg("Please enter street address and city.");
      return;
    }

    const payload: Partial<IRestaurant> = {
      ownerId: userId || initialData?.ownerId,
      ownerEmail: userEmail || formData.contactEmail,
      ownerName: userName || initialData?.ownerName,
      restaurantName: formData.restaurantName.trim(),
      tagline: formData.tagline.trim(),
      description: formData.description.trim(),
      cuisineTypes: formData.cuisineTypes,
      logo: formData.logo.trim() || PRESET_LOGOS[0],
      bannerImage: formData.bannerImage.trim() || PRESET_BANNERS[0],
      contactNumber: formData.contactNumber.trim(),
      contactEmail: formData.contactEmail.trim() || userEmail,
      website: formData.website.trim(),
      address: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim() || "Bangladesh",
        fullAddress: `${formData.street.trim()}, ${formData.city.trim()}`,
      },
      generalOpenTime: formData.generalOpenTime,
      generalCloseTime: formData.generalCloseTime,
      pricing: {
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        deliveryFee: Number(formData.deliveryFee) || 0,
        estimatedDeliveryTime: formData.estimatedDeliveryTime || "30-45 mins",
        costForTwo: Number(formData.costForTwo) || 300,
      },
      features: {
        hasDelivery: formData.hasDelivery,
        hasTakeaway: formData.hasTakeaway,
        hasDineIn: formData.hasDineIn,
        isPureVeg: formData.isPureVeg,
        isHalal: formData.isHalal,
      },
      socialLinks: {
        facebook: formData.facebook.trim(),
        instagram: formData.instagram.trim(),
        twitter: formData.twitter.trim(),
        website: formData.website.trim(),
      },
      isOpen: initialData?.isOpen ?? true,
      status: initialData?.status || (isEditMode ? "active" : "pending"),
    };

    setLoading(true);

    try {
      let res;
      if (isEditMode && initialData?.ownerEmail) {
        res = await updateRestaurantProfile(initialData.ownerEmail, payload);
      } else {
        res = await createRestaurantProfile(payload);
      }

      if (res.success && res.data) {
        if (typeof window !== "undefined") {
          localStorage.setItem("foodflow_has_restaurant", "true");
          localStorage.setItem("foodflow_restaurant_data", JSON.stringify(res.data));
          if (res.data.ownerEmail) {
            localStorage.setItem("restaurant_owner_email", res.data.ownerEmail);
          }
          window.dispatchEvent(new Event("restaurantStatusChanged"));
        }
        if (onSuccess) {
          onSuccess(res.data);
        } else {
          router.push("/dashboard/restaurant/profile");
          router.refresh();
        }
      } else {
        setErrorMsg(res.message || "Failed to save restaurant details. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto" data-aos="fade-up">
      {/* Header card with AOS */}
      <div
        data-aos="zoom-in"
        data-aos-duration="600"
        className="bg-gradient-to-r from-orange-500 via-[#FF6B35] to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 mb-8 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEditMode ? "Update Restaurant Profile" : "Partner Onboarding"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isEditMode ? "Edit Your Restaurant Profile" : "Setup Your Restaurant on FoodFlow"}
            </h1>
            <p className="text-orange-100 text-sm max-w-xl">
              {isEditMode
                ? "Update your restaurant branding, contact details, timings, and delivery configurations."
                : "Fill out the complete details below to publish your restaurant on the platform and start receiving orders."}
            </p>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="self-start md:self-center px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition backdrop-blur-md border border-white/20 cursor-pointer"
            >
              Cancel &amp; View Profile
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-8 space-y-6" data-aos="fade-right" data-aos-delay="100">
          {/* Navigation Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-sm overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "general"
                  ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>General Info</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("location")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "location"
                  ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Location &amp; Contact</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "operations"
                  ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Operations &amp; Fees</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("social")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "social"
                  ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Socials &amp; Extra</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
            {/* TAB 1: General Info */}
            {activeTab === "general" && (
              <div className="space-y-6" data-aos="fade-in">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-[#FF6B35]" />
                    <span>Restaurant Identity &amp; Branding</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    How customers will see and identify your store on the FoodFlow platform.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Restaurant Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="restaurantName"
                      value={formData.restaurantName}
                      onChange={handleInputChange}
                      placeholder="e.g. Royal Sultan Biryani &amp; Grill"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Tagline / Catchphrase
                    </label>
                    <input
                      type="text"
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleInputChange}
                      placeholder="e.g. Authentic Dum Biryani &amp; Mughlai Delicacies"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      About Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your special dishes, fresh ingredients, dining story and specialty..."
                      required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition resize-none"
                    />
                  </div>

                  {/* Cuisines selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Cuisine Types <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs text-gray-400">
                        {formData.cuisineTypes.length} selected
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESET_CUISINES.map((cuisine) => {
                        const isSelected = formData.cuisineTypes.includes(cuisine);
                        return (
                          <button
                            type="button"
                            key={cuisine}
                            onClick={() => toggleCuisine(cuisine)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                              isSelected
                                ? "bg-orange-50 border-[#FF6B35] text-[#FF6B35] shadow-xs"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {cuisine}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add custom cuisine */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCuisine}
                        onChange={(e) => setCustomCuisine(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomCuisine();
                          }
                        }}
                        placeholder="Add other cuisine tag (press Enter)"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#FF6B35] outline-none"
                      />
                      <button
                        type="button"
                        onClick={addCustomCuisine}
                        className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Logo and Banner URLs with presets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Logo Image URL
                      </label>
                      <input
                        type="url"
                        name="logo"
                        value={formData.logo}
                        onChange={handleInputChange}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-medium transition"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Presets:</span>
                        <div className="flex gap-1.5">
                          {PRESET_LOGOS.map((url, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setFormData((p) => ({ ...p, logo: url }))}
                              className="w-7 h-7 rounded-lg overflow-hidden border border-gray-200 hover:scale-105 transition cursor-pointer"
                            >
                              <img src={url} alt={`logo ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Banner / Cover Image URL
                      </label>
                      <input
                        type="url"
                        name="bannerImage"
                        value={formData.bannerImage}
                        onChange={handleInputChange}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-medium transition"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Presets:</span>
                        <div className="flex gap-1.5">
                          {PRESET_BANNERS.map((url, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setFormData((p) => ({ ...p, bannerImage: url }))}
                              className="w-9 h-6 rounded-md overflow-hidden border border-gray-200 hover:scale-105 transition cursor-pointer"
                            >
                              <img src={url} alt={`banner ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
                  >
                    <span>Next: Location &amp; Contact</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Location & Contact */}
            {activeTab === "location" && (
              <div className="space-y-6" data-aos="fade-in">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#FF6B35]" />
                    <span>Restaurant Location &amp; Direct Contacts</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Used for riders to pick up orders and customers to discover your outlet.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        placeholder="+880 1712-345678"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Store Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        placeholder="manager@restaurant.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Street Address &amp; House/Road No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="e.g. House 42, Road 11, Block D, Banani"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      City / Area <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleCitySelect}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Select City / Division</option>
                        {BANGLADESH_LOCATIONS.map((loc) => (
                          <option key={loc.division} value={loc.division}>
                            {loc.division}
                          </option>
                        ))}
                        {formData.city &&
                          !BANGLADESH_LOCATIONS.some(
                            (loc) =>
                              loc.division.toLowerCase() ===
                              formData.city.toLowerCase()
                          ) && (
                            <option value={formData.city}>
                              {formData.city}
                            </option>
                          )}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      State / Division
                    </label>
                    <div className="relative">
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleStateSelect}
                        disabled={!formData.city}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition appearance-none cursor-pointer pr-10 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {formData.city
                            ? "Select District / Zila"
                            : "Select City / Area first"}
                        </option>
                        {availableDistricts.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                        {formData.state &&
                          !availableDistricts.some(
                            (d) =>
                              d.name.toLowerCase() ===
                              formData.state.toLowerCase()
                          ) && (
                            <option value={formData.state}>
                              {formData.state}
                            </option>
                          )}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Postal Code / Zip
                    </label>
                    <div className="relative">
                      <select
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handlePostalCodeSelect}
                        disabled={!formData.state}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition appearance-none cursor-pointer pr-10 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {formData.state
                            ? "Select Postal Code / Zip"
                            : "Select State / Division first"}
                        </option>
                        {availablePostalCodes.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                        {formData.postalCode &&
                          !availablePostalCodes.some(
                            (p) => p.code === formData.postalCode
                          ) && (
                            <option value={formData.postalCode}>
                              {formData.postalCode}
                            </option>
                          )}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country || "Bangladesh"}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-gray-100/90 border border-gray-200 text-gray-600 outline-none text-sm font-medium transition cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Back: General
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("operations")}
                    className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
                  >
                    <span>Next: Operations &amp; Pricing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Operations & Pricing */}
            {activeTab === "operations" && (
              <div className="space-y-6" data-aos="fade-in">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#FF6B35]" />
                    <span>Operating Hours &amp; Delivery Pricing</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure your delivery fees, delivery times and order thresholds.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Opening Time
                    </label>
                    <input
                      type="text"
                      name="generalOpenTime"
                      value={formData.generalOpenTime}
                      onChange={handleInputChange}
                      placeholder="09:00 AM"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Closing Time
                    </label>
                    <input
                      type="text"
                      name="generalCloseTime"
                      value={formData.generalCloseTime}
                      onChange={handleInputChange}
                      placeholder="10:30 PM"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Min Order Amount (Tk)
                    </label>
                    <input
                      type="number"
                      name="minOrderAmount"
                      value={formData.minOrderAmount}
                      onChange={handleInputChange}
                      placeholder="150"
                      min={0}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Delivery Fee (Tk)
                    </label>
                    <input
                      type="number"
                      name="deliveryFee"
                      value={formData.deliveryFee}
                      onChange={handleInputChange}
                      placeholder="40"
                      min={0}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Estimated Delivery Time
                    </label>
                    <input
                      type="text"
                      name="estimatedDeliveryTime"
                      value={formData.estimatedDeliveryTime}
                      onChange={handleInputChange}
                      placeholder="25-35 mins"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Average Cost for Two (Tk)
                    </label>
                    <input
                      type="number"
                      name="costForTwo"
                      value={formData.costForTwo}
                      onChange={handleInputChange}
                      placeholder="450"
                      min={0}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                    />
                  </div>
                </div>

                {/* Features checkboxes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Store Services &amp; Highlights
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                      <input
                        type="checkbox"
                        checked={formData.hasDelivery}
                        onChange={() => handleCheckboxChange("hasDelivery")}
                        className="w-4 h-4 accent-[#FF6B35] rounded"
                      />
                      <span className="text-xs font-semibold text-gray-800">Home Delivery</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                      <input
                        type="checkbox"
                        checked={formData.hasTakeaway}
                        onChange={() => handleCheckboxChange("hasTakeaway")}
                        className="w-4 h-4 accent-[#FF6B35] rounded"
                      />
                      <span className="text-xs font-semibold text-gray-800">Takeaway Pickup</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                      <input
                        type="checkbox"
                        checked={formData.hasDineIn}
                        onChange={() => handleCheckboxChange("hasDineIn")}
                        className="w-4 h-4 accent-[#FF6B35] rounded"
                      />
                      <span className="text-xs font-semibold text-gray-800">Dine-in Available</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                      <input
                        type="checkbox"
                        checked={formData.isHalal}
                        onChange={() => handleCheckboxChange("isHalal")}
                        className="w-4 h-4 accent-[#FF6B35] rounded"
                      />
                      <span className="text-xs font-semibold text-gray-800">100% Halal</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition">
                      <input
                        type="checkbox"
                        checked={formData.isPureVeg}
                        onChange={() => handleCheckboxChange("isPureVeg")}
                        className="w-4 h-4 accent-[#FF6B35] rounded"
                      />
                      <span className="text-xs font-semibold text-gray-800">Pure Veg Menu</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Back: Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("social")}
                    className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
                  >
                    <span>Next: Social Links</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Socials & Extras */}
            {activeTab === "social" && (
              <div className="space-y-6" data-aos="fade-in">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#FF6B35]" />
                    <span>Social Media Presence &amp; Website</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Connect your restaurant’s official social pages and website.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Website URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://www.yourrestaurant.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Facebook Page URL
                    </label>
                    <div className="relative">
                      <FaFacebookF className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                      <input
                        type="url"
                        name="facebook"
                        value={formData.facebook}
                        onChange={handleInputChange}
                        placeholder="https://facebook.com/yourrestaurant"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Instagram Profile URL
                    </label>
                    <div className="relative">
                      <FaInstagram className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-600" />
                      <input
                        type="url"
                        name="instagram"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        placeholder="https://instagram.com/yourrestaurant"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Twitter / X Handle
                    </label>
                    <div className="relative">
                      <FaTwitter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500" />
                      <input
                        type="url"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder="https://twitter.com/yourrestaurant"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("operations")}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Back: Operations
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] hover:opacity-95 text-white text-sm font-black flex items-center gap-2 shadow-lg shadow-[#FF6B35]/30 transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isEditMode ? "Save Changes" : "Create Restaurant Profile"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Live Preview Card (4 Cols) with AOS */}
        <div className="lg:col-span-4 space-y-4" data-aos="fade-left" data-aos-delay="200">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              <Eye className="w-4 h-4 text-[#FF6B35]" />
              <span>Live Card Preview</span>
            </div>

            {/* Restaurant Preview Card */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
              {/* Banner */}
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                <img
                  src={formData.bannerImage || PRESET_BANNERS[0]}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute("src", PRESET_BANNERS[0]);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Open Now</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 relative pt-0">
                {/* Avatar */}
                <div className="-mt-9 mb-3 flex items-end justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg border-2 border-white overflow-hidden">
                    <img
                      src={formData.logo || PRESET_LOGOS[0]}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute("src", PRESET_LOGOS[0]);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200/60">
                    <span>★ 4.8</span>
                    <span className="text-[10px] text-amber-600 font-normal">(New)</span>
                  </div>
                </div>

                {/* Name and Tagline */}
                <h3 className="font-extrabold text-gray-900 text-lg leading-snug">
                  {formData.restaurantName || "Your Restaurant Name"}
                </h3>
                <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                  {formData.tagline || "Your restaurant tagline goes here"}
                </p>

                {/* Cuisines */}
                <div className="flex flex-wrap gap-1.5 my-3">
                  {formData.cuisineTypes.slice(0, 3).map((cuisine) => (
                    <span
                      key={cuisine}
                      className="px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6B35] font-semibold text-[10px]"
                    >
                      {cuisine}
                    </span>
                  ))}
                  {formData.cuisineTypes.length > 3 && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-semibold text-[10px]">
                      +{formData.cuisineTypes.length - 3} more
                    </span>
                  )}
                </div>

                {/* Delivery details pills */}
                <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 block font-medium">Delivery</span>
                    <span className="font-bold text-gray-800">{formData.estimatedDeliveryTime || "30m"}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 block font-medium">Min Order</span>
                    <span className="font-bold text-gray-800">Tk {formData.minOrderAmount || 0}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 block font-medium">Fee</span>
                    <span className="font-bold text-[#FF6B35]">Tk {formData.deliveryFee || 0}</span>
                  </div>
                </div>

                {/* Location text */}
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {formData.street ? `${formData.street}, ${formData.city}` : "Your store address, City"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick helper tip */}
            <div
              data-aos="fade-up"
              data-aos-delay="300"
              className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-800 text-xs space-y-1 mt-4"
            >
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Tip for high conversions</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Add appetizing high-res photos and clear cuisine tags to help customers find you easily in search filters!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
