"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  ShieldAlert,
  Share2,
  ExternalLink,
  Check,
  Plus,
  X,
  Image as ImageIcon,
  Utensils,
  Volume2,
  Zap,
  Power,
  RotateCcw,
  CheckSquare,
  Square,
  Flame,
  Percent,
  Truck,
  Layers,
  ChefHat,
  ShoppingBag,
  Sliders,
  Compass,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa6";
import { toast } from "react-toastify";
import AOS from "aos";
import { useSession } from "@/lib/auth-client";
import {
  IRestaurant,
  getMyRestaurantProfile,
  TOpeningHours,
  TOpeningHoursDay,
} from "@/lib/api/restaurant";
import {
  updateRestaurantProfile,
  toggleRestaurantStatus,
} from "@/lib/actions/restaurant";
import { BANGLADESH_LOCATIONS } from "@/data/bangladeshLocations";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

type TabKey =
  | "operations"
  | "delivery"
  | "menu_kitchen"
  | "schedule"
  | "profile"
  | "location"
  | "notifications"
  | "danger";

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
  "Street Food",
  "Steakhouse",
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

const DAYS_OF_WEEK: { key: keyof TOpeningHours; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function RestaurantSettings() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [activeTab, setActiveTab] = useState<TabKey>("operations");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customCuisine, setCustomCuisine] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Notification / Sound test state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [emailReviewAlerts, setEmailReviewAlerts] = useState(true);
  const [orderBufferMinutes, setOrderBufferMinutes] = useState(20);

  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  // Form State
  const [formData, setFormData] = useState({
    restaurantName: "",
    tagline: "",
    description: "",
    cuisineTypes: [] as string[],
    logo: "",
    bannerImage: "",
    contactNumber: "",
    contactEmail: "",
    website: "",
    // Location
    division: "Dhaka",
    district: "Dhaka",
    street: "",
    city: "Dhaka",
    state: "",
    postalCode: "1205",
    country: "Bangladesh",
    fullAddress: "",
    area: "Dhanmondi",
    // Schedule
    generalOpenTime: "09:00 AM",
    generalCloseTime: "10:00 PM",
    openingHours: {
      monday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      tuesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      wednesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      thursday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      friday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      saturday: { open: "10:00 AM", close: "11:00 PM", isOpen: true },
      sunday: { open: "10:00 AM", close: "11:00 PM", isOpen: true },
    } as TOpeningHours,
    // Pricing & Logistics
    minOrderAmount: 0,
    deliveryFee: 50,
    freeDeliveryThreshold: 500,
    estimatedDeliveryTime: "25-40 mins",
    costForTwo: 500,
    priceRange: "$$",
    discountOffer: "",
    deliveryRadius: 10,
    // Features & Badges
    hasDelivery: true,
    hasTakeaway: true,
    hasDineIn: false,
    isPureVeg: false,
    isHalal: true,
    freeDelivery: false,
    isOpen: true,
    // Social Links
    facebook: "",
    instagram: "",
    twitter: "",
  });

  const [restaurantProfile, setRestaurantProfile] = useState<IRestaurant | null>(
    null
  );

  // Sound Synthesizer Chime for Live Audio Preview
  const playTestChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      toast.success("🔔 New order audio alert played!");
    } catch {
      toast.info("Notification chime simulated.");
    }
  };

  // Fetch restaurant data
  const loadRestaurantData = useCallback(async () => {
    setInitialLoading(true);
    try {
      const email =
        user?.email ||
        (typeof window !== "undefined"
          ? localStorage.getItem("restaurant_owner_email") || ""
          : "");

      const res = await getMyRestaurantProfile(email, user?.id);
      if (res.success && res.data) {
        const rest = res.data;
        setRestaurantProfile(rest);

        const defaultHours: TOpeningHours = {
          monday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          tuesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          wednesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          thursday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          friday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          saturday: { open: "10:00 AM", close: "11:00 PM", isOpen: true },
          sunday: { open: "10:00 AM", close: "11:00 PM", isOpen: true },
        };

        const mergedHours = { ...defaultHours, ...(rest.openingHours || {}) };

        setFormData({
          restaurantName: rest.restaurantName || rest.name || "",
          tagline: rest.tagline || "",
          description: rest.description || "",
          cuisineTypes: rest.cuisineTypes || rest.cuisines || [],
          logo: rest.logo || "",
          bannerImage: rest.bannerImage || "",
          contactNumber: rest.contactNumber || "",
          contactEmail: rest.contactEmail || user?.email || "",
          website: rest.website || "",
          // Address
          division: rest.address?.division || "Dhaka",
          district: rest.address?.district || "Dhaka",
          street: rest.address?.street || "",
          city: rest.address?.city || "Dhaka",
          state: rest.address?.state || "",
          postalCode: rest.address?.postalCode || "1205",
          country: rest.address?.country || "Bangladesh",
          fullAddress: rest.address?.fullAddress || "",
          area: rest.address?.area || "Dhanmondi",
          // Schedule
          generalOpenTime: rest.generalOpenTime || "09:00 AM",
          generalCloseTime: rest.generalCloseTime || "10:00 PM",
          openingHours: mergedHours,
          // Pricing & Logistics
          minOrderAmount:
            Number(rest.pricing?.minOrderAmount || rest.minOrderAmount) || 0,
          deliveryFee:
            Number(rest.pricing?.deliveryFee || rest.deliveryFee) || 50,
          freeDeliveryThreshold:
            Number(rest.pricing?.freeDeliveryThreshold) || 500,
          estimatedDeliveryTime:
            rest.pricing?.estimatedDeliveryTime || "25-40 mins",
          costForTwo: Number(rest.pricing?.costForTwo) || 500,
          priceRange: rest.pricing?.priceRange || rest.priceRange || "$$",
          discountOffer: rest.discountOffer || "",
          deliveryRadius: Number(rest.pricing?.deliveryRadius) || 10,
          // Features
          hasDelivery: rest.features?.hasDelivery ?? true,
          hasTakeaway: rest.features?.hasTakeaway ?? true,
          hasDineIn: rest.features?.hasDineIn ?? false,
          isPureVeg: rest.features?.isPureVeg ?? false,
          isHalal: rest.features?.isHalal ?? true,
          freeDelivery: rest.features?.freeDelivery ?? false,
          isOpen: rest.isOpen ?? true,
          // Social
          facebook: rest.socialLinks?.facebook || "",
          instagram: rest.socialLinks?.instagram || "",
          twitter: rest.socialLinks?.twitter || "",
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "foodflow_restaurant_data",
            JSON.stringify(rest)
          );
          if (rest.ownerEmail) {
            localStorage.setItem("restaurant_owner_email", rest.ownerEmail);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load restaurant profile:", err);
      toast.error("Could not load current settings.");
    } finally {
      setInitialLoading(false);
      setIsDirty(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadRestaurantData();
  }, [loadRestaurantData]);

  useEffect(() => {
    AOS.refresh();
  }, [activeTab]);

  const handleInputChange = (
    field: string,
    value: string | number | boolean | string[] | TOpeningHours
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleToggleCuisine = (cuisine: string) => {
    const exists = formData.cuisineTypes.includes(cuisine);
    const updated = exists
      ? formData.cuisineTypes.filter((c) => c !== cuisine)
      : [...formData.cuisineTypes, cuisine];
    handleInputChange("cuisineTypes", updated);
  };

  const handleAddCustomCuisine = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCuisine.trim();
    if (trimmed && !formData.cuisineTypes.includes(trimmed)) {
      handleInputChange("cuisineTypes", [...formData.cuisineTypes, trimmed]);
      setCustomCuisine("");
    }
  };

  const handleDayHourChange = (
    day: keyof TOpeningHours,
    field: keyof TOpeningHoursDay,
    value: string | boolean
  ) => {
    const currentDay = formData.openingHours[day] || {
      open: "09:00 AM",
      close: "10:00 PM",
      isOpen: true,
    };
    const updatedDay: TOpeningHoursDay = {
      ...currentDay,
      [field]: value,
    };
    const updatedHours: TOpeningHours = {
      ...formData.openingHours,
      [day]: updatedDay,
    };
    handleInputChange("openingHours", updatedHours);
  };

  const handleCopyMondayToAll = () => {
    const monday = formData.openingHours.monday || {
      open: "09:00 AM",
      close: "10:00 PM",
      isOpen: true,
    };
    const newHours: TOpeningHours = {};
    DAYS_OF_WEEK.forEach(({ key }) => {
      newHours[key] = { ...monday };
    });
    handleInputChange("openingHours", newHours);
    toast.success("Applied Monday hours to all 7 days!");
  };

  const handleQuickToggleOpen = async () => {
    const targetEmail =
      user?.email ||
      restaurantProfile?.ownerEmail ||
      (typeof window !== "undefined"
        ? localStorage.getItem("restaurant_owner_email") || ""
        : "");

    if (!targetEmail) {
      toast.error("Restaurant owner email not found.");
      return;
    }

    setStatusToggling(true);
    const nextStatus = !formData.isOpen;
    try {
      const res = await toggleRestaurantStatus(targetEmail, nextStatus);
      if (res.success) {
        setFormData((prev) => ({ ...prev, isOpen: nextStatus }));
        toast.success(
          `Restaurant is now marked as ${
            nextStatus ? "OPEN for orders 🟢" : "CLOSED for orders 🔴"
          }`
        );
        window.dispatchEvent(new Event("restaurantStatusChanged"));
      } else {
        toast.error(res.message || "Failed to update restaurant status.");
      }
    } catch {
      toast.error("Network error while updating store status.");
    } finally {
      setStatusToggling(false);
    }
  };

  const handleCopyStoreLink = () => {
    const idOrSlug = restaurantProfile?.slug || restaurantProfile?._id || "";
    if (!idOrSlug) {
      toast.info("Save your profile to generate your public link.");
      return;
    }
    const storeUrl = `${window.location.origin}/restaurant/${idOrSlug}`;
    navigator.clipboard.writeText(storeUrl);
    setCopiedLink(true);
    toast.success("Storefront link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveAllSettings = async () => {
    if (!formData.restaurantName.trim()) {
      toast.error("Restaurant Name cannot be empty.");
      setActiveTab("profile");
      return;
    }

    const targetEmail =
      user?.email ||
      restaurantProfile?.ownerEmail ||
      (typeof window !== "undefined"
        ? localStorage.getItem("restaurant_owner_email") || ""
        : "");

    if (!targetEmail) {
      toast.error("User email is required to update settings.");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<IRestaurant> = {
        restaurantName: formData.restaurantName.trim(),
        name: formData.restaurantName.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        cuisineTypes: formData.cuisineTypes,
        cuisines: formData.cuisineTypes,
        logo: formData.logo.trim(),
        bannerImage: formData.bannerImage.trim() || formData.logo.trim(),
        contactNumber: formData.contactNumber.trim(),
        contactEmail: formData.contactEmail.trim() || targetEmail,
        website: formData.website.trim(),
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          division: formData.division.trim(),
          district: formData.district.trim(),
          area: formData.area.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim(),
          fullAddress:
            formData.fullAddress.trim() ||
            `${formData.street}, ${formData.area}, ${formData.city}, ${formData.country}`,
        },
        generalOpenTime: formData.generalOpenTime,
        generalCloseTime: formData.generalCloseTime,
        openingHours: formData.openingHours,
        pricing: {
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          deliveryFee: Number(formData.deliveryFee) || 0,
          freeDeliveryThreshold: Number(formData.freeDeliveryThreshold) || 500,
          estimatedDeliveryTime: formData.estimatedDeliveryTime || "25-40 mins",
          costForTwo: Number(formData.costForTwo) || 500,
          priceRange: formData.priceRange || "$$",
          deliveryRadius: Number(formData.deliveryRadius) || 10,
        },
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        deliveryFee: Number(formData.deliveryFee) || 0,
        priceRange: formData.priceRange || "$$",
        features: {
          hasDelivery: formData.hasDelivery,
          hasTakeaway: formData.hasTakeaway,
          hasDineIn: formData.hasDineIn,
          isPureVeg: formData.isPureVeg,
          isHalal: formData.isHalal,
          freeDelivery: formData.deliveryFee === 0 || formData.freeDelivery,
          openNow: formData.isOpen,
        },
        isOpen: formData.isOpen,
        socialLinks: {
          facebook: formData.facebook.trim(),
          instagram: formData.instagram.trim(),
          twitter: formData.twitter.trim(),
          website: formData.website.trim(),
        },
        discountOffer: formData.discountOffer.trim(),
      };

      const res = await updateRestaurantProfile(targetEmail, payload);

      if (res.success && res.data) {
        setRestaurantProfile(res.data);
        setIsDirty(false);
        toast.success("✨ All Restaurant Dashboard settings saved!");
        localStorage.setItem(
          "foodflow_restaurant_data",
          JSON.stringify(res.data)
        );
        window.dispatchEvent(new Event("restaurantStatusChanged"));
      } else {
        toast.error(res.message || "Failed to update restaurant settings.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentDivisionObj = BANGLADESH_LOCATIONS.find(
    (d) => d.division.toLowerCase() === formData.division.toLowerCase()
  );
  const districtOptions = currentDivisionObj?.districts || [];
  const currentDistrictObj = districtOptions.find(
    (d) => d.name.toLowerCase() === formData.district.toLowerCase()
  );
  const postalCodeOptions = currentDistrictObj?.postalCodes || [];

  if (sessionLoading || initialLoading) {
    return (
      <div className="min-h-[550px] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 font-semibold text-sm">
          Loading restaurant controls...
        </p>
      </div>
    );
  }

  const status = (restaurantProfile?.status || "active").toLowerCase();
  const isActive = status === "active" || status === "approved";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 text-gray-800 font-sans">
      {/* ========================================================================= */}
      {/* 🌟 1. HERO HEADER WITH FOODFLOW BRAND THEME */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 md:p-8 shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/50 shadow-lg shrink-0 bg-white/20">
              {formData.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.logo}
                  alt={formData.restaurantName || "Logo"}
                  className="w-full h-full object-cover bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Store className="w-8 h-8" />
                </div>
              )}
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                  formData.isOpen ? "bg-emerald-400" : "bg-rose-500"
                }`}
                title={formData.isOpen ? "Accepting Orders" : "Closed"}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  {formData.restaurantName || "Restaurant Settings"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs border border-white/30">
                  {status}
                </span>
                {formData.isOpen ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Accepting Orders
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                    Paused / Closed
                  </span>
                )}
              </div>
              <p className="text-white/90 text-sm max-w-xl line-clamp-1 font-medium">
                {formData.tagline ||
                  "Manage live store status, delivery rates, menu policies & dashboard preferences."}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Live Store Status Button */}
            <button
              onClick={handleQuickToggleOpen}
              disabled={statusToggling}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                formData.isOpen
                  ? "bg-white/20 hover:bg-white/30 text-white border border-white/40"
                  : "bg-white text-[#FF6B35] hover:bg-gray-100 shadow-lg font-black"
              }`}
            >
              {statusToggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span>{formData.isOpen ? "Store: OPEN" : "Store: CLOSED"}</span>
            </button>

            {/* Share / Public Store Link */}
            {restaurantProfile && (
              <button
                onClick={handleCopyStoreLink}
                className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs md:text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                title="Copy storefront link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Share</span>
              </button>
            )}

            {/* Primary Save Button */}
            <button
              onClick={handleSaveAllSettings}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-white text-[#FF6B35] hover:bg-orange-50 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-black/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#FF6B35]" />
              ) : (
                <Save className="w-4 h-4 text-[#FF6B35]" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Unsaved indicator banner */}
        {isDirty && (
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-200" />
              You have unsaved changes. Click &quot;Save Changes&quot; to apply to your live dashboard.
            </span>
            <button
              onClick={handleSaveAllSettings}
              disabled={saving}
              className="underline font-bold hover:text-amber-200"
            >
              Save Now
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🧭 2. CONTROL HUB NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { key: "operations", label: "Live Operations & Promos", icon: Zap },
          { key: "delivery", label: "Delivery & Pricing", icon: Truck },
          { key: "menu_kitchen", label: "Menu & Kitchen Policies", icon: ChefHat },
          { key: "schedule", label: "Operating Hours", icon: Clock },
          { key: "profile", label: "Profile & Identity", icon: Store },
          { key: "location", label: "Location & Address", icon: MapPin },
          { key: "notifications", label: "Order Alerts & Sound", icon: Bell },
          { key: "danger", label: "Danger & Security", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-[#FF6B35] to-[#FF7843] text-white shadow-md shadow-orange-500/25"
                  : "bg-white hover:bg-orange-50/60 text-gray-700 hover:text-[#FF6B35] border border-gray-200/80 shadow-2xs"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-white" : "text-gray-500"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ⚡ TAB 1: LIVE OPERATIONS & PROMOS (CONTROLS OVERVIEW & LIVE STATUS) */}
      {/* ========================================================================= */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900">
                    Live Operations & Status
                  </h2>
                  <p className="text-gray-500 text-xs md:text-sm font-medium">
                    Controls whether customers can place orders and how your storefront is announced.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              {/* Live Status Switch Card */}
              <div
                onClick={handleQuickToggleOpen}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  formData.isOpen
                    ? "bg-emerald-50/60 border-emerald-300"
                    : "bg-rose-50/60 border-rose-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                      formData.isOpen ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      {formData.isOpen
                        ? "Restaurant is Online (Accepting Orders)"
                        : "Restaurant is Closed / Paused"}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formData.isOpen
                        ? "Customers can browse menus and checkout in real time."
                        : "Storefront is visible but order checkout is temporarily disabled."}
                    </p>
                  </div>
                </div>

                <div
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                    formData.isOpen
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {formData.isOpen ? "Online" : "Paused"}
                </div>
              </div>

              {/* Promotional Discount Offer Banner */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#FF6B35]" />
                  Promotional Banner & Discount Announcement
                </label>
                <input
                  type="text"
                  value={formData.discountOffer}
                  onChange={(e) =>
                    handleInputChange("discountOffer", e.target.value)
                  }
                  placeholder="e.g. 🔥 20% OFF on all Platters! Use code: FOODFLOW20"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm text-gray-900 font-medium transition"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Displayed as a prominent highlight badge on your store card and overview dashboard.
                </p>
              </div>

              {/* Service Capabilities */}
              <div className="pt-2">
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  Service Fulfillment Channels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "hasDelivery",
                      label: "Home Delivery",
                      desc: "Riders deliver to customer door",
                      value: formData.hasDelivery,
                    },
                    {
                      id: "hasTakeaway",
                      label: "Takeaway / Pickup",
                      desc: "Customer counter pickups",
                      value: formData.hasTakeaway,
                    },
                    {
                      id: "hasDineIn",
                      label: "Dine-In Seating",
                      desc: "On-premise tables available",
                      value: formData.hasDineIn,
                    },
                  ].map((chan) => (
                    <div
                      key={chan.id}
                      onClick={() =>
                        handleInputChange(
                          chan.id,
                          !formData[chan.id as keyof typeof formData]
                        )
                      }
                      className={`p-4 rounded-2xl border cursor-pointer select-none transition ${
                        chan.value
                          ? "bg-orange-50/70 border-orange-300 text-gray-900 shadow-2xs"
                          : "bg-gray-50/80 border-gray-200 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-sm text-gray-900">
                          {chan.label}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center ${
                            chan.value
                              ? "bg-[#FF6B35] text-white"
                              : "bg-gray-300"
                          }`}
                        >
                          {chan.value && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">
                        {chan.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Quick Status Preview Card */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FF6B35]" />
                Storefront Preview
              </h3>

              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                <div className="h-24 bg-gradient-to-r from-orange-400 to-amber-500 relative">
                  {formData.bannerImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.bannerImage}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {formData.discountOffer && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FF6B35] text-white text-[10px] font-black uppercase shadow-xs">
                      PROMO
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-gray-900 truncate">
                      {formData.restaurantName || "Store Name"}
                    </h4>
                    <span className="text-xs font-bold text-amber-500">
                      ★ {restaurantProfile?.rating ? Number(restaurantProfile.rating).toFixed(1) : "5.0"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {formData.tagline || "Fresh & delicious food prepared daily"}
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-gray-600 font-medium">
                    <span>⏱ {formData.estimatedDeliveryTime}</span>
                    <span>•</span>
                    <span>🛵 ৳{formData.deliveryFee} Fee</span>
                    <span>•</span>
                    <span>Min ৳{formData.minOrderAmount}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-xs text-gray-700 space-y-1">
                <p className="font-bold text-[#FF6B35]">🚀 Live Synchronization</p>
                <p className="text-[11px] text-gray-600">
                  Changes made here update your Restaurant Overview, Delivery page, and public store cards immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚚 TAB 2: DELIVERY & PRICING (CONTROLS /delivery & CHECKOUT CALCULATIONS) */}
      {/* ========================================================================= */}
      {activeTab === "delivery" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Delivery Fees & Order Thresholds
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Configures rider delivery rates, minimum order amounts, and delivery ranges.
                </p>
              </div>
              <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Minimum Order Value */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Minimum Order Value (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      handleInputChange("minOrderAmount", Number(e.target.value) || 0)
                    }
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-extrabold text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cart total must meet this amount before a customer can place an order.
                </p>
              </div>

              {/* Standard Base Delivery Fee */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Standard Delivery Fee (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.deliveryFee}
                    onChange={(e) =>
                      handleInputChange("deliveryFee", Number(e.target.value) || 0)
                    }
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-extrabold text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Charged to customer for delivery logistics. Set 0 for free delivery.
                </p>
              </div>

              {/* Free Delivery Threshold */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Free Delivery Over Amount (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.freeDeliveryThreshold}
                    onChange={(e) =>
                      handleInputChange(
                        "freeDeliveryThreshold",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-extrabold text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Orders equal or above this amount automatically get free delivery.
                </p>
              </div>

              {/* Estimated Delivery Time */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Estimated Delivery Duration
                </label>
                <input
                  type="text"
                  value={formData.estimatedDeliveryTime}
                  onChange={(e) =>
                    handleInputChange("estimatedDeliveryTime", e.target.value)
                  }
                  placeholder="e.g. 25-40 mins"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-bold text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Shown in customer search lists and live order tracking screen.
                </p>
              </div>

              {/* Maximum Delivery Radius */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Maximum Delivery Radius (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.deliveryRadius}
                    onChange={(e) =>
                      handleInputChange("deliveryRadius", Number(e.target.value) || 10)
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-bold text-gray-900"
                  />
                  <span className="absolute right-4 top-3 text-gray-400 font-bold text-xs">
                    KM
                  </span>
                </div>
              </div>

              {/* Free Delivery Promo Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">
                    Always Free Delivery
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Waive all delivery fees for customers unconditionally.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.freeDelivery || formData.deliveryFee === 0}
                  onChange={(e) => {
                    handleInputChange("freeDelivery", e.target.checked);
                    if (e.target.checked) handleInputChange("deliveryFee", 0);
                  }}
                  className="w-5 h-5 accent-[#FF6B35] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🍳 TAB 3: MENU & KITCHEN POLICIES (CONTROLS /menu & /orders) */}
      {/* ========================================================================= */}
      {activeTab === "menu_kitchen" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Kitchen, Dining & Dietary Badges
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Defines food categories, dietary certifications, and preparation time limits.
                </p>
              </div>
              <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                <ChefHat className="w-5 h-5" />
              </div>
            </div>

            {/* Average Cost for Two & Price Tier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Average Cost for Two People (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.costForTwo}
                    onChange={(e) =>
                      handleInputChange("costForTwo", Number(e.target.value) || 0)
                    }
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-extrabold text-gray-900"
                  />
                </div>
              </div>

              {/* Price Tier Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Price Tier Classification
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { tier: "$", label: "Budget" },
                    { tier: "$$", label: "Moderate" },
                    { tier: "$$$", label: "Premium" },
                    { tier: "$$$$", label: "Luxury" },
                  ].map(({ tier, label }) => (
                    <button
                      type="button"
                      key={tier}
                      onClick={() => handleInputChange("priceRange", tier)}
                      className={`p-2.5 rounded-2xl border text-center transition ${
                        formData.priceRange === tier
                          ? "bg-gradient-to-r from-[#FF6B35] to-[#FF7843] text-white font-extrabold shadow-md shadow-orange-500/20"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 font-bold"
                      }`}
                    >
                      <div className="text-sm">{tier}</div>
                      <div className="text-[10px] opacity-80">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Halal & Veg Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => handleInputChange("isHalal", !formData.isHalal)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  formData.isHalal
                    ? "bg-emerald-50/70 border-emerald-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    100% Halal Certified Kitchen
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Displays verified Halal icon across food and store listings.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    formData.isHalal
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-300"
                  }`}
                >
                  {formData.isHalal && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div
                onClick={() => handleInputChange("isPureVeg", !formData.isPureVeg)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  formData.isPureVeg
                    ? "bg-emerald-50/70 border-emerald-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Pure Vegetarian Kitchen
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Marks your store as 100% Pure Veg for vegetarian customers.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    formData.isPureVeg
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-300"
                  }`}
                >
                  {formData.isPureVeg && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Cuisine Categories */}
            <div className="pt-2">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Cuisine Specialties & Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_CUISINES.map((cuisine) => {
                  const isSelected = formData.cuisineTypes.includes(cuisine);
                  return (
                    <button
                      type="button"
                      key={cuisine}
                      onClick={() => handleToggleCuisine(cuisine)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                        isSelected
                          ? "bg-gradient-to-r from-[#FF6B35] to-[#FF7843] text-white shadow-xs"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {cuisine}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Creator */}
              <form onSubmit={handleAddCustomCuisine} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={customCuisine}
                  onChange={(e) => setCustomCuisine(e.target.value)}
                  placeholder="Add custom category..."
                  className="flex-1 px-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF6B35] hover:bg-[#ff571c] text-white text-xs font-extrabold rounded-xl flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⏰ TAB 4: OPERATING HOURS & SCHEDULE */}
      {/* ========================================================================= */}
      {activeTab === "schedule" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Weekly Operating Schedule
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Timings when your kitchen accepts online orders automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyMondayToAll}
                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold rounded-2xl border border-orange-200 flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Copy Monday Hours to All Days
              </button>
            </div>

            {/* General Open/Close Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  General Default Opening Time
                </label>
                <input
                  type="text"
                  value={formData.generalOpenTime}
                  onChange={(e) =>
                    handleInputChange("generalOpenTime", e.target.value)
                  }
                  placeholder="09:00 AM"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  General Default Closing Time
                </label>
                <input
                  type="text"
                  value={formData.generalCloseTime}
                  onChange={(e) =>
                    handleInputChange("generalCloseTime", e.target.value)
                  }
                  placeholder="10:00 PM"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold"
                />
              </div>
            </div>

            {/* 7 Days Schedule List */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-900">
                Day-by-Day Granular Timings
              </h3>

              {DAYS_OF_WEEK.map(({ key, label }) => {
                const daySchedule = formData.openingHours[key] || {
                  open: "09:00 AM",
                  close: "10:00 PM",
                  isOpen: true,
                };

                return (
                  <div
                    key={key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                      daySchedule.isOpen
                        ? "bg-white border-gray-200 shadow-2xs"
                        : "bg-gray-50/80 border-gray-200/60 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleDayHourChange(
                            key,
                            "isOpen",
                            !daySchedule.isOpen
                          )
                        }
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition ${
                          daySchedule.isOpen
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {daySchedule.isOpen ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-bold text-sm text-gray-800 min-w-[95px]">
                        {label}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          daySchedule.isOpen
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {daySchedule.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>

                    {daySchedule.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={daySchedule.open}
                          onChange={(e) =>
                            handleDayHourChange(key, "open", e.target.value)
                          }
                          placeholder="09:00 AM"
                          className="w-28 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-center font-bold focus:border-[#FF6B35] outline-none"
                        />
                        <span className="text-xs text-gray-400 font-bold">to</span>
                        <input
                          type="text"
                          value={daySchedule.close}
                          onChange={(e) =>
                            handleDayHourChange(key, "close", e.target.value)
                          }
                          placeholder="10:00 PM"
                          className="w-28 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-center font-bold focus:border-[#FF6B35] outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400 italic">
                        Not accepting orders on this day
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏪 TAB 5: PROFILE & BRANDING (CONTROLS /profile & SIDEBAR AVATAR) */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900">
                    Brand & Contact Details
                  </h2>
                  <p className="text-gray-500 text-xs md:text-sm font-medium">
                    Visible on invoices, customer receipts, and restaurant profile header.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              {/* Restaurant Name */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Restaurant / Kitchen Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.restaurantName}
                  onChange={(e) =>
                    handleInputChange("restaurantName", e.target.value)
                  }
                  placeholder="e.g. Sultan's Dine, Kacchi Bhai..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm text-gray-900 font-bold"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Catchy Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange("tagline", e.target.value)}
                  placeholder="e.g. Authentic Bengali Taste & Heritage"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Detailed Kitchen Story / Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your hygiene standards, ingredient selection, and culinary specialty..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-sm text-gray-900"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Official Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        handleInputChange("contactNumber", e.target.value)
                      }
                      placeholder="+880 1712 345678"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Official Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        handleInputChange("contactEmail", e.target.value)
                      }
                      placeholder="orders@restaurant.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Logos & Cover Banners */}
          <div className="space-y-6">
            {/* Logo Settings */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                Store Logo Image
              </h3>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center relative shrink-0">
                  {formData.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.logo}
                      alt="Logo Preview"
                      className="w-full h-full object-cover bg-white"
                    />
                  ) : (
                    <Store className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Square PNG/JPG icon recommended.
                  </p>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => handleInputChange("logo", "")}
                      className="text-xs text-rose-500 hover:underline font-bold"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>

              <input
                type="url"
                value={formData.logo}
                onChange={(e) => handleInputChange("logo", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none font-mono"
              />

              {/* Logo Presets */}
              <div>
                <p className="text-[11px] font-bold text-gray-500 mb-2">Preset icons:</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_LOGOS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInputChange("logo", url)}
                      className={`h-12 rounded-xl overflow-hidden border-2 transition ${
                        formData.logo === url
                          ? "border-[#FF6B35] shadow-md scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Preset"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Banner Cover Settings */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                Cover Banner
              </h3>

              <div className="w-full h-28 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 relative flex items-center justify-center">
                {formData.bannerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.bannerImage}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400 font-medium">
                    No banner set
                  </span>
                )}
              </div>

              <input
                type="url"
                value={formData.bannerImage}
                onChange={(e) =>
                  handleInputChange("bannerImage", e.target.value)
                }
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none font-mono"
              />

              <div>
                <p className="text-[11px] font-bold text-gray-500 mb-2">Preset banners:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_BANNERS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInputChange("bannerImage", url)}
                      className={`h-14 rounded-xl overflow-hidden border-2 transition ${
                        formData.bannerImage === url
                          ? "border-[#FF6B35] shadow-md scale-102"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Preset"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📍 TAB 6: LOCATION & ADDRESS */}
      {/* ========================================================================= */}
      {activeTab === "location" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Kitchen Location & Geographic Coordinates
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Used by riders and delivery routing algorithms to calculate accurate travel paths.
                </p>
              </div>
              <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                <MapPin className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Division */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Division
                </label>
                <select
                  value={formData.division}
                  onChange={(e) => {
                    const newDiv = e.target.value;
                    const divObj = BANGLADESH_LOCATIONS.find(
                      (d) => d.division.toLowerCase() === newDiv.toLowerCase()
                    );
                    const firstDist = divObj?.districts[0]?.name || "";
                    setFormData((prev) => ({
                      ...prev,
                      division: newDiv,
                      district: firstDist,
                      city: firstDist,
                    }));
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold bg-white"
                >
                  {BANGLADESH_LOCATIONS.map((loc) => (
                    <option key={loc.division} value={loc.division}>
                      {loc.division}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  District / City
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      district: newDist,
                      city: newDist,
                    }));
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold bg-white"
                >
                  {districtOptions.map((dist) => (
                    <option key={dist.name} value={dist.name}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area / Neighborhood */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Area / Neighborhood
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => handleInputChange("area", e.target.value)}
                  placeholder="e.g. Dhanmondi, Gulshan 2, Banani, Mirpur 10"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-medium"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Postal / ZIP Code
                </label>
                {postalCodeOptions.length > 0 ? (
                  <select
                    value={formData.postalCode}
                    onChange={(e) =>
                      handleInputChange("postalCode", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold bg-white"
                  >
                    {postalCodeOptions.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      handleInputChange("postalCode", e.target.value)
                    }
                    placeholder="e.g. 1205"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-bold"
                  />
                )}
              </div>

              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Street / Road / Landmark
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleInputChange("street", e.target.value)}
                  placeholder="e.g. House #14, Road #27, Block A"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900 font-medium"
                />
              </div>

              {/* Full Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Full Formatted Address
                </label>
                <textarea
                  rows={2}
                  value={formData.fullAddress}
                  onChange={(e) =>
                    handleInputChange("fullAddress", e.target.value)
                  }
                  placeholder="Complete address printed on receipts..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔔 TAB 7: NOTIFICATIONS & AUDIO (CONTROLS /orders AUDIO ALERTS) */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Live Order Notifications & Sound Chimes
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Configures real-time audio bells and workflow automation for incoming orders.
                </p>
              </div>
              <div className="p-3 bg-orange-50 text-[#FF6B35] rounded-2xl">
                <Bell className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4">
              {/* Sound Notifications */}
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-100 text-[#FF6B35] rounded-2xl">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">
                      Live New Order Audio Alert
                    </h4>
                    <p className="text-xs text-gray-500">
                      Plays a crisp alert chime whenever an order is submitted by a customer.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={playTestChime}
                    className="px-3.5 py-1.5 bg-white hover:bg-orange-50 text-[#FF6B35] text-xs font-black rounded-xl border border-orange-200 shadow-2xs transition"
                  >
                    Test Sound 🔔
                  </button>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#FF6B35] rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Auto Accept Orders */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">
                      Auto-Accept Online Orders
                    </h4>
                    <p className="text-xs text-gray-500">
                      Immediately transition orders into &quot;Preparing&quot; state upon receipt.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoAcceptOrders}
                  onChange={(e) => setAutoAcceptOrders(e.target.checked)}
                  className="w-5 h-5 accent-[#FF6B35] rounded cursor-pointer"
                />
              </div>

              {/* Email Alerts on Reviews */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">
                      Customer Review Email Notifications
                    </h4>
                    <p className="text-xs text-gray-500">
                      Send instantaneous emails when customers leave new ratings or feedback.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailReviewAlerts}
                  onChange={(e) => setEmailReviewAlerts(e.target.checked)}
                  className="w-5 h-5 accent-[#FF6B35] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ TAB 8: DANGER ZONE */}
      {/* ========================================================================= */}
      {activeTab === "danger" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-rose-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100">
              <div>
                <h2 className="text-xl font-black text-rose-600">
                  Danger & Account Management
                </h2>
                <p className="text-gray-500 text-xs md:text-sm font-medium">
                  Operations that temporarily suspend or permanently remove your restaurant account.
                </p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            {/* Vacation / Pause Mode */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900">
                  Temporary Vacation / Pause Mode
                </h4>
                <p className="text-xs text-gray-600 mt-1 max-w-lg">
                  Hides your restaurant from active customer browsing without deleting any menu items or order records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickToggleOpen}
                disabled={statusToggling}
                className={`px-4 py-2.5 text-xs font-bold rounded-2xl border transition shadow-xs self-start sm:self-auto ${
                  formData.isOpen
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                }`}
              >
                {formData.isOpen ? "Pause Operations" : "Resume Operations"}
              </button>
            </div>

            {/* Permanent Profile Deletion */}
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-red-900">
                  Delete Restaurant Profile
                </h4>
                <p className="text-xs text-red-700 mt-1 max-w-lg">
                  Permanently deletes your restaurant record, catalog linkages, and public store URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-2xl border border-red-800 shadow-xs transition self-start sm:self-auto"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛑 DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-200 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900">
                Are you absolutely sure?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                To confirm permanent deletion, type your restaurant name:{" "}
                <span className="font-bold text-gray-900">{formData.restaurantName}</span>
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type restaurant name exactly..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-bold"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteConfirmText.trim().toLowerCase() !==
                  formData.restaurantName.trim().toLowerCase()
                }
                onClick={async () => {
                  if (!restaurantProfile?._id) return;
                  try {
                    const { deleteRestaurantProfile } = await import(
                      "@/lib/actions/restaurant"
                    );
                    const res = await deleteRestaurantProfile(
                      restaurantProfile._id,
                      user?.email
                    );
                    if (res.success) {
                      toast.success("Restaurant profile deleted.");
                      localStorage.removeItem("foodflow_has_restaurant");
                      localStorage.removeItem("foodflow_restaurant_data");
                      router.push("/dashboard/restaurant/create-restaurant");
                    } else {
                      toast.error(res.message || "Failed to delete profile.");
                    }
                  } catch {
                    toast.error("Error deleting restaurant profile.");
                  } finally {
                    setShowDeleteModal(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black rounded-xl transition shadow-md"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 BOTTOM FLOATING SAVE BAR */}
      {/* ========================================================================= */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-auto z-40 bg-gradient-to-r from-gray-900 to-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm text-orange-400 font-bold">
            <Sparkles className="w-4 h-4 animate-spin text-[#FF6B35]" />
            <span>Unsaved Changes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadRestaurantData();
                setIsDirty(false);
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white font-bold"
            >
              Discard
            </button>
            <button
              onClick={handleSaveAllSettings}
              disabled={saving}
              className="px-5 py-2 bg-[#FF6B35] hover:bg-[#ff5518] text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition active:scale-95"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
