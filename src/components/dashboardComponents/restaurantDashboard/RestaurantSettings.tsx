"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Store,
  Clock,
  DollarSign,
  MapPin,
  Bell,
  Share2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Power,
  Volume2,
  VolumeX,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  Utensils,
  Truck,
  ShoppingBag,
  Info,
  Navigation,
  Check,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa6";
import { useSession } from "@/lib/auth-client";
import { IRestaurant, getMyRestaurantProfile } from "@/lib/api/restaurant";
import { updateRestaurantProfile, toggleRestaurantStatus } from "@/lib/actions/restaurant";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import Link from "next/link";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_CUISINES = [
  "Fast Food",
  "Burger",
  "Pizza",
  "Biryani",
  "Traditional Bengali",
  "Chinese",
  "Indian",
  "Pasta",
  "Dessert",
  "Beverages",
  "BBQ & Grill",
  "Healthy & Salad",
];

export default function RestaurantSettings() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [activeTab, setActiveTab] = useState<
    "general" | "timing" | "pricing" | "location" | "notifications" | "marketing"
  >("general");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form states
  const [generalData, setGeneralData] = useState({
    restaurantName: "",
    tagline: "",
    description: "",
    logo: "",
    bannerImage: "",
    contactEmail: "",
    contactNumber: "",
    website: "",
    cuisines: [] as string[],
    newCuisineInput: "",
  });

  const [timingData, setTimingData] = useState({
    isOpen: true,
    generalOpenTime: "09:00 AM",
    generalCloseTime: "10:00 PM",
    autoAcceptOrders: true,
    avgPrepTime: "20-30 mins",
    weeklySchedule: {
      monday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      tuesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      wednesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      thursday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
      friday: { open: "09:00 AM", close: "11:00 PM", isOpen: true },
      saturday: { open: "09:00 AM", close: "11:00 PM", isOpen: true },
      sunday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
    } as Record<string, { open: string; close: string; isOpen: boolean }>,
  });

  const [pricingData, setPricingData] = useState({
    minOrderAmount: 100,
    deliveryFee: 40,
    freeDelivery: false,
    freeDeliveryThreshold: 500,
    deliveryTimeMin: 20,
    deliveryTimeMax: 40,
    costForTwo: 350,
    priceRange: "$$",
    hasDelivery: true,
    hasTakeaway: true,
    hasDineIn: false,
    isPureVeg: false,
    isHalal: true,
  });

  const [locationData, setLocationData] = useState({
    street: "",
    area: "",
    city: "Dhaka",
    division: "Dhaka",
    postalCode: "",
    latitude: 23.8103,
    longitude: 90.4125,
    deliveryRadiusKm: 5,
  });

  const [notificationData, setNotificationData] = useState({
    soundAlerts: true,
    soundVolume: 80,
    emailAlerts: true,
    smsAlerts: false,
    dailySummary: true,
  });

  const [marketingData, setMarketingData] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    discountOffer: "",
  });

  const user = session?.user as {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | undefined;

  // Web Audio chime player for Sound Test
  const playTestChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(
          (notificationData.soundVolume / 100) * 0.3,
          ctx.currentTime + start
        );
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(587.33, 0, 0.2); // D5
      playTone(880.0, 0.15, 0.25); // A5
      playTone(1174.66, 0.3, 0.4); // D6
    } catch (e) {
      console.warn("Audio test failed", e);
    }
  };

  // Fetch restaurant details
  const fetchRestaurant = useCallback(async () => {
    setLoading(true);
    try {
      const email =
        user?.email ||
        (typeof window !== "undefined"
          ? localStorage.getItem("restaurant_owner_email") || ""
          : "");

      const res = await getMyRestaurantProfile(email, user?.id);
      if (res.success && res.data) {
        const d = res.data;
        setRestaurant(d);

        // Populate general data
        setGeneralData({
          restaurantName: d.restaurantName || d.name || "",
          tagline: d.tagline || "",
          description: d.description || "",
          logo: d.logo || "",
          bannerImage: d.bannerImage || "",
          contactEmail: d.contactEmail || d.ownerEmail || "",
          contactNumber: d.contactNumber || d.ownerPhone || "",
          website: d.website || d.socialLinks?.website || "",
          cuisines: Array.isArray(d.cuisineTypes)
            ? d.cuisineTypes
            : Array.isArray(d.cuisines)
            ? d.cuisines
            : [],
          newCuisineInput: "",
        });

        // Populate timing
        setTimingData({
          isOpen: d.isOpen ?? true,
          generalOpenTime: d.generalOpenTime || "09:00 AM",
          generalCloseTime: d.generalCloseTime || "10:00 PM",
          autoAcceptOrders: (d as any).autoAcceptOrders ?? true,
          avgPrepTime: (d as any).avgPrepTime || "20-30 mins",
          weeklySchedule: d.openingHours || {
            monday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
            tuesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
            wednesday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
            thursday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
            friday: { open: "09:00 AM", close: "11:00 PM", isOpen: true },
            saturday: { open: "09:00 AM", close: "11:00 PM", isOpen: true },
            sunday: { open: "09:00 AM", close: "10:00 PM", isOpen: true },
          },
        });

        // Populate pricing
        setPricingData({
          minOrderAmount: Number(d.pricing?.minOrderAmount || d.minOrderAmount) || 100,
          deliveryFee: Number(d.pricing?.deliveryFee || d.deliveryFee) || 40,
          freeDelivery: Boolean(d.features?.freeDelivery || d.deliveryFee === 0),
          freeDeliveryThreshold: Number((d as any).freeDeliveryThreshold) || 500,
          deliveryTimeMin: Number(d.deliveryTimeMin) || 20,
          deliveryTimeMax: Number(d.deliveryTimeMax) || 40,
          costForTwo: Number(d.pricing?.costForTwo) || 350,
          priceRange: d.priceRange || d.pricing?.priceRange || "$$",
          hasDelivery: d.features?.hasDelivery ?? true,
          hasTakeaway: d.features?.hasTakeaway ?? true,
          hasDineIn: d.features?.hasDineIn ?? false,
          isPureVeg: d.features?.isPureVeg ?? false,
          isHalal: d.features?.isHalal ?? true,
        });

        // Populate location
        setLocationData({
          street: d.address?.street || "",
          area: d.address?.area || "",
          city: d.address?.city || "Dhaka",
          division: d.address?.division || d.address?.state || "Dhaka",
          postalCode: d.address?.postalCode || "",
          latitude: Number(d.address?.latitude) || 23.8103,
          longitude: Number(d.address?.longitude) || 90.4125,
          deliveryRadiusKm: Number((d as any).deliveryRadiusKm) || 5,
        });

        // Populate notifications
        setNotificationData({
          soundAlerts: (d as any).soundAlerts ?? true,
          soundVolume: Number((d as any).soundVolume) || 80,
          emailAlerts: (d as any).emailAlerts ?? true,
          smsAlerts: (d as any).smsAlerts ?? false,
          dailySummary: (d as any).dailySummary ?? true,
        });

        // Populate marketing
        setMarketingData({
          facebook: d.socialLinks?.facebook || "",
          instagram: d.socialLinks?.instagram || "",
          twitter: d.socialLinks?.twitter || "",
          discountOffer: d.discountOffer || "",
        });
      } else {
        setRestaurant(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch restaurant settings:", err);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  // Handle Tag Addition
  const handleAddCuisine = (cuisineToAdd?: string) => {
    const target = (cuisineToAdd || generalData.newCuisineInput).trim();
    if (!target) return;
    if (!generalData.cuisines.includes(target)) {
      setGeneralData((prev) => ({
        ...prev,
        cuisines: [...prev.cuisines, target],
        newCuisineInput: "",
      }));
    } else {
      setGeneralData((prev) => ({ ...prev, newCuisineInput: "" }));
    }
  };

  const handleRemoveCuisine = (cuisine: string) => {
    setGeneralData((prev) => ({
      ...prev,
      cuisines: prev.cuisines.filter((c) => c !== cuisine),
    }));
  };

  // Handle Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setMessage({ type: "success", text: "📍 GPS coordinates updated successfully!" });
        setTimeout(() => setMessage(null), 3000);
      },
      (err) => {
        setMessage({ type: "error", text: `GPS error: ${err.message}` });
      }
    );
  };

  // Master Save Function
  const handleSaveAllSettings = async () => {
    const email = user?.email || restaurant?.ownerEmail;
    if (!email) {
      setMessage({ type: "error", text: "Owner email is missing. Please re-login." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: Partial<IRestaurant> & Record<string, any> = {
      restaurantName: generalData.restaurantName,
      name: generalData.restaurantName,
      tagline: generalData.tagline,
      description: generalData.description,
      logo: generalData.logo,
      bannerImage: generalData.bannerImage,
      contactEmail: generalData.contactEmail,
      contactNumber: generalData.contactNumber,
      website: generalData.website,
      cuisineTypes: generalData.cuisines,
      cuisines: generalData.cuisines,

      // Timing
      isOpen: timingData.isOpen,
      generalOpenTime: timingData.generalOpenTime,
      generalCloseTime: timingData.generalCloseTime,
      openingHours: timingData.weeklySchedule,
      autoAcceptOrders: timingData.autoAcceptOrders,
      avgPrepTime: timingData.avgPrepTime,

      // Pricing & Features
      deliveryTimeMin: Number(pricingData.deliveryTimeMin),
      deliveryTimeMax: Number(pricingData.deliveryTimeMax),
      deliveryFee: pricingData.freeDelivery ? 0 : Number(pricingData.deliveryFee),
      minOrderAmount: Number(pricingData.minOrderAmount),
      priceRange: pricingData.priceRange,
      discountOffer: marketingData.discountOffer,
      freeDeliveryThreshold: Number(pricingData.freeDeliveryThreshold),
      pricing: {
        minOrderAmount: Number(pricingData.minOrderAmount),
        deliveryFee: pricingData.freeDelivery ? 0 : Number(pricingData.deliveryFee),
        estimatedDeliveryTime: `${pricingData.deliveryTimeMin}-${pricingData.deliveryTimeMax} mins`,
        costForTwo: Number(pricingData.costForTwo),
      },
      features: {
        hasDelivery: pricingData.hasDelivery,
        hasTakeaway: pricingData.hasTakeaway,
        hasDineIn: pricingData.hasDineIn,
        isPureVeg: pricingData.isPureVeg,
        isHalal: pricingData.isHalal,
        freeDelivery: pricingData.freeDelivery,
        openNow: timingData.isOpen,
      },

      // Address & Location
      address: {
        street: locationData.street,
        area: locationData.area,
        city: locationData.city,
        state: locationData.division,
        division: locationData.division,
        postalCode: locationData.postalCode,
        country: "Bangladesh",
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      },
      deliveryRadiusKm: locationData.deliveryRadiusKm,

      // Notifications
      soundAlerts: notificationData.soundAlerts,
      soundVolume: notificationData.soundVolume,
      emailAlerts: notificationData.emailAlerts,
      smsAlerts: notificationData.smsAlerts,
      dailySummary: notificationData.dailySummary,

      // Social Links
      socialLinks: {
        facebook: marketingData.facebook,
        instagram: marketingData.instagram,
        twitter: marketingData.twitter,
        website: generalData.website,
      },
    };

    try {
      const res = await updateRestaurantProfile(email, payload);
      if (res.success && res.data) {
        setRestaurant(res.data);
        setMessage({
          type: "success",
          text: "🎉 All restaurant settings updated and synced successfully!",
        });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({
          type: "error",
          text: res.message || "Failed to update restaurant settings.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle master open status
  const handleToggleStoreStatus = async () => {
    const email = user?.email || restaurant?.ownerEmail;
    if (!email) return;

    const nextState = !timingData.isOpen;
    setTimingData((prev) => ({ ...prev, isOpen: nextState }));

    try {
      const res = await toggleRestaurantStatus(email, nextState);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Restaurant is now ${nextState ? "OPEN for orders" : "CLOSED temporarily"}.`,
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">
          Loading restaurant settings...
        </p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Restaurant Found
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
          You haven't set up a restaurant profile yet. Create your restaurant profile first to
          customize operational and store settings.
        </p>
        <Link
          href="/dashboard/restaurant/create-restaurant"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-md hover:from-orange-600 hover:to-amber-600 transition"
        >
          <Plus className="w-5 h-5" />
          Create Restaurant Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-orange-500/20">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Restaurant Settings
            </h1>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${
                timingData.isOpen
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  timingData.isOpen ? "bg-emerald-500 animate-ping" : "bg-rose-500"
                }`}
              />
              {timingData.isOpen ? "Store Open" : "Store Closed"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your store branding, operational hours, delivery fees, notifications & location.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/restaurant/${restaurant.slug || restaurant._id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
            View Public Store
          </Link>

          <button
            onClick={handleSaveAllSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-orange-500/25 disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status feedback message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800 scrollbar-none">
        {[
          { id: "general", label: "Store Profile", icon: Store },
          { id: "timing", label: "Hours & Schedule", icon: Clock },
          { id: "pricing", label: "Pricing & Delivery", icon: DollarSign },
          { id: "location", label: "Location & Radius", icon: MapPin },
          { id: "notifications", label: "Alerts & Sounds", icon: Bell },
          { id: "marketing", label: "Marketing & Social", icon: Share2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                isActive
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Store Profile */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-500" />
              Store Identity & Branding
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Restaurant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={generalData.restaurantName}
                  onChange={(e) =>
                    setGeneralData({ ...generalData, restaurantName: e.target.value })
                  }
                  placeholder="e.g. Sultan's Dine"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  value={generalData.tagline}
                  onChange={(e) => setGeneralData({ ...generalData, tagline: e.target.value })}
                  placeholder="e.g. The King of Authentic Kacchi Biryani"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  About Restaurant / Description
                </label>
                <textarea
                  rows={3}
                  value={generalData.description}
                  onChange={(e) => setGeneralData({ ...generalData, description: e.target.value })}
                  placeholder="Briefly describe your culinary specialties, hygiene standards, and customer experience..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  value={generalData.logo}
                  onChange={(e) => setGeneralData({ ...generalData, logo: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
                {generalData.logo && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={generalData.logo}
                      alt="Logo preview"
                      className="w-12 h-12 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                    <span className="text-xs text-gray-400">Logo preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  value={generalData.bannerImage}
                  onChange={(e) => setGeneralData({ ...generalData, bannerImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
                {generalData.bannerImage && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={generalData.bannerImage}
                      alt="Banner preview"
                      className="w-24 h-12 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                    <span className="text-xs text-gray-400">Banner preview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cuisines & Tags */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cuisine Categories & Specialties
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {generalData.cuisines.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                  >
                    {cuisine}
                    <button
                      type="button"
                      onClick={() => handleRemoveCuisine(cuisine)}
                      className="hover:text-rose-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={generalData.newCuisineInput}
                  onChange={(e) =>
                    setGeneralData({ ...generalData, newCuisineInput: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCuisine();
                    }
                  }}
                  placeholder="Type a cuisine (e.g. Seafood, Thai) and press Enter or Add"
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddCuisine()}
                  className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
                >
                  Add Tag
                </button>
              </div>

              {/* Suggestions */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold text-gray-600 dark:text-gray-400">Popular:</span>
                {DEFAULT_CUISINES.filter((c) => !generalData.cuisines.includes(c))
                  .slice(0, 6)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleAddCuisine(c)}
                      className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950 transition"
                    >
                      + {c}
                    </button>
                  ))}
              </div>
            </div>

            {/* Direct Contact Info */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                Public Contact Channels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={generalData.contactNumber}
                      onChange={(e) =>
                        setGeneralData({ ...generalData, contactNumber: e.target.value })
                      }
                      placeholder="+880 1700-000000"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={generalData.contactEmail}
                      onChange={(e) =>
                        setGeneralData({ ...generalData, contactEmail: e.target.value })
                      }
                      placeholder="support@myrestaurant.com"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={generalData.website}
                      onChange={(e) =>
                        setGeneralData({ ...generalData, website: e.target.value })
                      }
                      placeholder="https://myrestaurant.com"
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Timing & Schedule */}
      {activeTab === "timing" && (
        <div className="space-y-6">
          {/* Master Store Status Switch */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`p-3.5 rounded-2xl ${
                  timingData.isOpen
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                }`}
              >
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Live Store Receiving Status
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {timingData.isOpen
                    ? "Your restaurant is currently OPEN and accepting new customer orders."
                    : "Your restaurant is currently CLOSED. Customers will not be able to checkout."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleStoreStatus}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 ${
                timingData.isOpen
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Power className="w-4 h-4" />
              {timingData.isOpen ? "Close Store Now" : "Open Store Now"}
            </button>
          </div>

          {/* General Times & Auto Accept */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Standard Operating Times & Preparation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  General Opening Time
                </label>
                <input
                  type="text"
                  value={timingData.generalOpenTime}
                  onChange={(e) =>
                    setTimingData({ ...timingData, generalOpenTime: e.target.value })
                  }
                  placeholder="e.g. 09:00 AM"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  General Closing Time
                </label>
                <input
                  type="text"
                  value={timingData.generalCloseTime}
                  onChange={(e) =>
                    setTimingData({ ...timingData, generalCloseTime: e.target.value })
                  }
                  placeholder="e.g. 10:00 PM"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Average Kitchen Prep Time
                </label>
                <input
                  type="text"
                  value={timingData.avgPrepTime}
                  onChange={(e) => setTimingData({ ...timingData, avgPrepTime: e.target.value })}
                  placeholder="e.g. 20-30 mins"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Auto Accept Orders Toggle */}
            <div className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900/50">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Auto-Accept Incoming Orders
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically mark orders as Accepted and start kitchen preparation without manual click.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={timingData.autoAcceptOrders}
                  onChange={(e) =>
                    setTimingData({ ...timingData, autoAcceptOrders: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Weekly Schedule Matrix */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                Weekly Operating Days & Timetable
              </h3>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const schedule = timingData.weeklySchedule[day.key] || {
                    open: "09:00 AM",
                    close: "10:00 PM",
                    isOpen: true,
                  };

                  return (
                    <div
                      key={day.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60"
                    >
                      <div className="flex items-center gap-3 min-w-[130px]">
                        <input
                          type="checkbox"
                          checked={schedule.isOpen}
                          onChange={(e) =>
                            setTimingData({
                              ...timingData,
                              weeklySchedule: {
                                ...timingData.weeklySchedule,
                                [day.key]: { ...schedule, isOpen: e.target.checked },
                              },
                            })
                          }
                          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                        />
                        <span
                          className={`text-sm font-medium ${
                            schedule.isOpen
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-400 line-through"
                          }`}
                        >
                          {day.label}
                        </span>
                      </div>

                      {schedule.isOpen ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={schedule.open}
                            onChange={(e) =>
                              setTimingData({
                                ...timingData,
                                weeklySchedule: {
                                  ...timingData.weeklySchedule,
                                  [day.key]: { ...schedule, open: e.target.value },
                                },
                              })
                            }
                            placeholder="Open"
                            className="w-28 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-orange-500"
                          />
                          <span className="text-xs text-gray-400 font-semibold">to</span>
                          <input
                            type="text"
                            value={schedule.close}
                            onChange={(e) =>
                              setTimingData({
                                ...timingData,
                                weeklySchedule: {
                                  ...timingData.weeklySchedule,
                                  [day.key]: { ...schedule, close: e.target.value },
                                },
                              })
                            }
                            placeholder="Close"
                            className="w-28 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider py-1 px-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                          Closed all day
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pricing & Delivery */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
              Delivery Fees & Order Thresholds
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Base Delivery Fee (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={pricingData.freeDelivery}
                  value={pricingData.freeDelivery ? 0 : pricingData.deliveryFee}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, deliveryFee: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Minimum Order Amount (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={pricingData.minOrderAmount}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, minOrderAmount: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Average Cost for Two (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={pricingData.costForTwo}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, costForTwo: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Delivery Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Min Delivery Time (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={pricingData.deliveryTimeMin}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, deliveryTimeMin: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Delivery Time (Minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={pricingData.deliveryTimeMax}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, deliveryTimeMax: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Free Delivery Toggle */}
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Provide 100% Free Delivery Promotion
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sets delivery fee to ৳0 for all customers, boosting store visibility and conversion.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pricingData.freeDelivery}
                  onChange={(e) =>
                    setPricingData({ ...pricingData, freeDelivery: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Service Capabilities Checkboxes */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                Service Capabilities & Certifications
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    key: "hasDelivery",
                    label: "Home Delivery",
                    icon: Truck,
                    checked: pricingData.hasDelivery,
                  },
                  {
                    key: "hasTakeaway",
                    label: "Takeaway / Self-Pickup",
                    icon: ShoppingBag,
                    checked: pricingData.hasTakeaway,
                  },
                  {
                    key: "hasDineIn",
                    label: "Dine-In Available",
                    icon: Utensils,
                    checked: pricingData.hasDineIn,
                  },
                  {
                    key: "isHalal",
                    label: "100% Halal Certified",
                    icon: ShieldCheck,
                    checked: pricingData.isHalal,
                  },
                  {
                    key: "isPureVeg",
                    label: "Pure Vegetarian",
                    icon: Sparkles,
                    checked: pricingData.isPureVeg,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        item.checked
                          ? "bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          setPricingData({ ...pricingData, [item.key]: e.target.checked })
                        }
                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <Icon className="w-4 h-4 shrink-0 text-orange-500" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Location & Radius */}
      {activeTab === "location" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Physical Address & GPS Pin
              </h2>
              <button
                type="button"
                onClick={handleGetLocation}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Auto-Detect Current GPS
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Street Address / House & Road No.
                </label>
                <input
                  type="text"
                  value={locationData.street}
                  onChange={(e) => setLocationData({ ...locationData, street: e.target.value })}
                  placeholder="e.g. House 42, Road 11, Block D"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Area / Neighborhood
                </label>
                <input
                  type="text"
                  value={locationData.area}
                  onChange={(e) => setLocationData({ ...locationData, area: e.target.value })}
                  placeholder="e.g. Banani / Dhanmondi"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={locationData.city}
                  onChange={(e) => setLocationData({ ...locationData, city: e.target.value })}
                  placeholder="e.g. Dhaka"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Division / State
                </label>
                <input
                  type="text"
                  value={locationData.division}
                  onChange={(e) => setLocationData({ ...locationData, division: e.target.value })}
                  placeholder="e.g. Dhaka Division"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={locationData.postalCode}
                  onChange={(e) => setLocationData({ ...locationData, postalCode: e.target.value })}
                  placeholder="e.g. 1213"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  GPS Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={locationData.latitude}
                  onChange={(e) =>
                    setLocationData({ ...locationData, latitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  GPS Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={locationData.longitude}
                  onChange={(e) =>
                    setLocationData({
                      ...locationData,
                      longitude: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Delivery Radius */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Maximum Delivery Coverage Radius:{" "}
                  <span className="text-orange-500 font-bold">
                    {locationData.deliveryRadiusKm} km
                  </span>
                </label>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.5"
                value={locationData.deliveryRadiusKm}
                onChange={(e) =>
                  setLocationData({
                    ...locationData,
                    deliveryRadiusKm: parseFloat(e.target.value) || 5,
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 km</span>
                <span>5 km</span>
                <span>10 km</span>
                <span>15 km</span>
                <span>25 km</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Alerts & Sounds */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Incoming Order Audio & Alert Preferences
            </h2>

            {/* Sound alert switch & test */}
            <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500 text-white rounded-xl">
                    {notificationData.soundAlerts ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Order Notification Chime
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Play an audible alert tone whenever a new customer order is placed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={playTestChime}
                    className="px-3 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-900 border border-orange-300 dark:border-orange-800 rounded-xl hover:bg-orange-50 transition"
                  >
                    🔔 Test Sound
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.soundAlerts}
                      onChange={(e) =>
                        setNotificationData({
                          ...notificationData,
                          soundAlerts: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>

              {notificationData.soundAlerts && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Alert Tone Volume</span>
                    <span className="font-bold text-orange-600">
                      {notificationData.soundVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={notificationData.soundVolume}
                    onChange={(e) =>
                      setNotificationData({
                        ...notificationData,
                        soundVolume: parseInt(e.target.value) || 80,
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Notification channels list */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Email Notifications for New Orders
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receive instant email invoices and receipt alerts when an order arrives.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationData.emailAlerts}
                  onChange={(e) =>
                    setNotificationData({ ...notificationData, emailAlerts: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    SMS / Mobile Phone Alerts
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receive quick SMS alerts on registered manager contact phone.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationData.smsAlerts}
                  onChange={(e) =>
                    setNotificationData({ ...notificationData, smsAlerts: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/60">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Daily Sales & Revenue Report Digest
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receive a summary of completed orders, cancellations, and earnings at end of day.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationData.dailySummary}
                  onChange={(e) =>
                    setNotificationData({ ...notificationData, dailySummary: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Marketing & Social */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-orange-500" />
              Social Media & Promotional Banners
            </h2>

            {/* Discount Banner Offer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Special Promotional Header / Offer Tag
              </label>
              <input
                type="text"
                value={marketingData.discountOffer}
                onChange={(e) =>
                  setMarketingData({ ...marketingData, discountOffer: e.target.value })
                }
                placeholder="e.g. 20% OFF on all Platters this Weekend! Use Code FOOD20"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                This promotional tagline will be highlighted on your storefront card and menu header.
              </p>
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Social Profile Handles
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Facebook Page
                  </label>
                  <div className="relative">
                    <FaFacebookF className="w-4 h-4 text-blue-600 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={marketingData.facebook}
                      onChange={(e) =>
                        setMarketingData({ ...marketingData, facebook: e.target.value })
                      }
                      placeholder="https://facebook.com/..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Instagram Handle
                  </label>
                  <div className="relative">
                    <FaInstagram className="w-4 h-4 text-pink-600 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={marketingData.instagram}
                      onChange={(e) =>
                        setMarketingData({ ...marketingData, instagram: e.target.value })
                      }
                      placeholder="https://instagram.com/..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Twitter / X Profile
                  </label>
                  <div className="relative">
                    <FaTwitter className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={marketingData.twitter}
                      onChange={(e) =>
                        setMarketingData({ ...marketingData, twitter: e.target.value })
                      }
                      placeholder="https://twitter.com/..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Info className="w-4 h-4 text-orange-500" />
          <span>Remember to save your changes to apply updates to your live storefront.</span>
        </div>

        <button
          type="button"
          onClick={handleSaveAllSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm rounded-xl shadow-md disabled:opacity-50 transition"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
