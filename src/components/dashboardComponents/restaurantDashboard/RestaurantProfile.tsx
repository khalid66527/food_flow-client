"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Store,
  MapPin,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Power,
  Utensils,
  Share2,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa6";
import AOS from "aos";
import { useSession } from "@/lib/auth-client";
import { IRestaurant, getMyRestaurantProfile } from "@/lib/api/restaurant";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { toggleRestaurantStatus } from "@/lib/actions/restaurant";
import CreateRestaurant from "./CreateRestaurant";

export default function RestaurantProfile() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const user = session?.user as {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | undefined;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const email =
        user?.email ||
        (typeof window !== "undefined" ? localStorage.getItem("restaurant_owner_email") || "" : "");
      const res = await getMyRestaurantProfile(email, user?.id);
      if (res.success && res.data) {
        setRestaurant(res.data);
        if (typeof window !== "undefined" && res.data.ownerEmail) {
          localStorage.setItem("restaurant_owner_email", res.data.ownerEmail);
        }
      } else {
        setRestaurant(null);
      }
    } catch (err) {
      console.error("Error fetching restaurant:", err);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    AOS.refresh();
  }, [restaurant, isEditMode]);

  const handleCopyLink = () => {
    if (!restaurant) return;
    const storeUrl = `${window.location.origin}/restaurant/${restaurant.slug || restaurant._id || ""}`;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleOpenStatus = async () => {
    if (!restaurant || !user?.email) return;

    const newStatus = !restaurant.isOpen;
    setToggleLoading(true);

    try {
      const res = await toggleRestaurantStatus(user.email, newStatus);
      if (res.success) {
        setRestaurant((prev) => (prev ? { ...prev, isOpen: newStatus } : null));
        setStatusMessage({
          type: "success",
          text: `Store is now ${newStatus ? "Open for orders" : "Closed"}!`,
        });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage({
          type: "error",
          text: res.message || "Failed to change store status",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to update status",
      });
    } finally {
      setToggleLoading(false);
    }
  };

  const handleCreatedOrUpdated = (updatedRestaurant: IRestaurant) => {
    setRestaurant(updatedRestaurant);
    setIsEditMode(false);
    setStatusMessage({
      type: "success",
      text: "Restaurant profile saved successfully!",
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. Loading State
  if (sessionLoading || loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  // 2. If In Edit Mode or No Restaurant Exists yet -> Show Form
  if (!restaurant || isEditMode) {
    return (
      <CreateRestaurant
        initialData={restaurant}
        userEmail={user?.email || ""}
        userName={user?.name || ""}
        userId={user?.id || ""}
        isEditMode={Boolean(restaurant && isEditMode)}
        onSuccess={handleCreatedOrUpdated}
        onCancel={restaurant ? () => setIsEditMode(false) : undefined}
      />
    );
  }

  const status = (restaurant.status || "pending").toLowerCase();
  const isActive = status === "active" || status === "approved";

  // 3. Show Full Restaurant Profile Dashboard with Pending Modal Guard if not active
  return (
    <div className="relative w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* Toast feedback */}
      {statusMessage && (
        <div
          data-aos="fade-down"
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium transition-all ${statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* PENDING APPROVAL MODAL OVERLAY (Shown when store is pending / rejected / not active) */}
      {!isActive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div
            data-aos="zoom-in"
            data-aos-duration="400"
            className="bg-white rounded-3xl max-w-lg w-full border border-gray-100 shadow-2xl p-6 sm:p-8 text-center space-y-6"
          >
            {/* Header Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <Clock className="w-10 h-10 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
              </div>
            </div>

            {/* Title & Status */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Status: {status === "rejected" ? "Application Rejected" : "Awaiting Admin Approval"}</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {status === "rejected" ? "Application Needs Revision" : "Restaurant Under Review"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                {status === "rejected"
                  ? "Your restaurant registration was not approved by the admin. Please edit your application information or contact support."
                  : "Your restaurant profile has been submitted and is currently in the verification queue. Admin will review your store credentials shortly."}
              </p>
            </div>

            {/* Application Summary Box */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Restaurant Name:</span>
                <span className="font-extrabold text-gray-900">{restaurant.restaurantName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Contact Phone:</span>
                <span className="font-bold text-gray-800">{restaurant.contactNumber || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Location:</span>
                <span className="font-bold text-gray-800">
                  {restaurant.address?.street ? `${restaurant.address.street}, ` : ""}
                  {restaurant.address?.city || "Dhaka"}
                </span>
              </div>
              {restaurant.zoneName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-bold">Delivery Zone:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{restaurant.numericZoneId ? `Zone ${restaurant.numericZoneId}: ` : ''}{restaurant.zoneName}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-bold">Cuisines:</span>
                <span className="font-bold text-[#FF6B35] truncate max-w-[200px]">
                  {restaurant.cuisineTypes?.join(", ") || "General"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal">
              🔒 Once approved by admin, your profile, dashboard, menu publishing, and online food ordering will become active automatically.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setIsEditMode(true)}
                className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Application Info</span>
              </button>

              <button
                onClick={fetchProfile}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Check Approval Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile View Container (Disabled / Locked when not active) */}
      <div className={`${!isActive ? "pointer-events-none opacity-20 filter blur-xs select-none grayscale-[40%]" : ""} space-y-8 transition-all duration-300`}>

        {/* Hero Banner & Identity Header */}
        <div
          data-aos="fade-down"
          data-aos-duration="600"
          className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden"
        >
          {/* Cover Photo */}
          <div className="relative h-64 sm:h-80 w-full bg-gradient-to-r from-orange-400 to-amber-500 overflow-hidden">
            <img
              src={
                restaurant.bannerImage ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
              }
              alt={restaurant.restaurantName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute(
                  "src",
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
                );
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Top floating badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {(restaurant.status || "").toLowerCase() === "active" ? (
                <button
                  onClick={handleToggleOpenStatus}
                  disabled={toggleLoading}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md shadow-lg transition cursor-pointer ${restaurant.isOpen
                      ? "bg-emerald-500/90 text-white hover:bg-emerald-600"
                      : "bg-rose-500/90 text-white hover:bg-rose-600"
                    }`}
                >
                  {toggleLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Power className="w-3.5 h-3.5" />
                  )}
                  <span>{restaurant.isOpen ? "Status: OPEN" : "Status: CLOSED"}</span>
                </button>
              ) : (
                <div className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg bg-amber-500/90 text-white">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting Admin Approval</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Info Row */}
          <div className="p-6 sm:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-20 sm:-mt-24 mb-6">
              {/* Logo + Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                <div
                  data-aos="zoom-in"
                  data-aos-delay="200"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-1.5 shadow-2xl border-4 border-white overflow-hidden shrink-0"
                >
                  <img
                    src={
                      restaurant.logo ||
                      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80"
                    }
                    alt={restaurant.restaurantName}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute(
                        "src",
                        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80"
                      );
                    }}
                  />
                </div>

                <div className="space-y-1.5" data-aos="fade-right" data-aos-delay="300">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                      {restaurant.restaurantName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Partner</span>
                    </span>
                  </div>

                  {restaurant.tagline && (
                    <p className="text-sm font-medium text-[#FF6B35]">
                      {restaurant.tagline}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-500 pt-1">
                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>{restaurant.rating || 4.8}</span>
                      <span className="text-gray-400 font-normal">
                        ({restaurant.totalReviews || 0} reviews)
                      </span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {restaurant.address.city}, {restaurant.address.country || "Bangladesh"}
                      </span>
                    </div>
                    {restaurant.zoneName && (
                      <>
                        <span>•</span>
                        <div className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{restaurant.numericZoneId ? `Zone ${restaurant.numericZoneId}: ` : ''}{restaurant.zoneName}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 pt-2" data-aos="fade-left" data-aos-delay="300">
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e85b27] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-[#FF6B35]/25 transition cursor-pointer hover:scale-105"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-500" />
                      <span>Share Store</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              data-aos="fade-up"
              data-aos-delay="400"
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100"
            >
              <div className="text-center sm:text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Estimated Delivery
                </span>
                <span className="text-base font-extrabold text-gray-800">
                  {restaurant.pricing?.estimatedDeliveryTime || "25-35 mins"}
                </span>
              </div>

              <div className="text-center sm:text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Delivery Fee
                </span>
                <span className="text-base font-extrabold text-[#FF6B35]">
                  Tk {restaurant.pricing?.deliveryFee ?? 40}
                </span>
              </div>

              <div className="text-center sm:text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Min Order Amount
                </span>
                <span className="text-base font-extrabold text-gray-800">
                  Tk {restaurant.pricing?.minOrderAmount ?? 150}
                </span>
              </div>

              <div className="text-center sm:text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Avg Cost for Two
                </span>
                <span className="text-base font-extrabold text-gray-800">
                  Tk {restaurant.pricing?.costForTwo ?? 450}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 8 Cols: About, Cuisines, Services */}
          <div className="lg:col-span-8 space-y-6" data-aos="fade-up" data-aos-delay="200">
            {/* About Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FF6B35]" />
                <span>About Restaurant</span>
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {restaurant.description || "No description provided yet."}
              </p>

              {/* Cuisines */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
                  Cuisine Specialties
                </span>
                <div className="flex flex-wrap gap-2">
                  {restaurant.cuisineTypes?.map((cuisine) => (
                    <span
                      key={cuisine}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-50/80 text-[#FF6B35] font-bold text-xs border border-orange-200/50"
                    >
                      🍲 {cuisine}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service Badges */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2.5">
                  Service Offerings &amp; Badges
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {restaurant.features?.hasDelivery && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 text-emerald-800 text-xs font-semibold border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Home Delivery</span>
                    </div>
                  )}
                  {restaurant.features?.hasTakeaway && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 text-emerald-800 text-xs font-semibold border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Takeaway Pickup</span>
                    </div>
                  )}
                  {restaurant.features?.hasDineIn && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 text-emerald-800 text-xs font-semibold border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dine-in Area</span>
                    </div>
                  )}
                  {restaurant.features?.isHalal && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 text-emerald-800 text-xs font-semibold border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% Halal Certified</span>
                    </div>
                  )}
                  {restaurant.features?.isPureVeg && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 text-emerald-800 text-xs font-semibold border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Pure Vegetarian</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Social Presence Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#FF6B35]" />
                <span>Online &amp; Social Presence</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurant.socialLinks?.website || restaurant.website ? (
                  <a
                    href={restaurant.socialLinks?.website || restaurant.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100/70 transition group"
                  >
                    <Globe className="w-5 h-5 text-gray-600 group-hover:text-[#FF6B35]" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Website</span>
                      <span className="text-xs font-semibold text-gray-800 truncate block">
                        {restaurant.socialLinks?.website || restaurant.website}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-700" />
                  </a>
                ) : null}

                {restaurant.socialLinks?.facebook ? (
                  <a
                    href={restaurant.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100/70 transition group"
                  >
                    <FaFacebookF className="w-5 h-5 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Facebook</span>
                      <span className="text-xs font-semibold text-gray-800 truncate block">
                        {restaurant.socialLinks.facebook}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-700" />
                  </a>
                ) : null}

                {restaurant.socialLinks?.instagram ? (
                  <a
                    href={restaurant.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100/70 transition group"
                  >
                    <FaInstagram className="w-5 h-5 text-pink-600" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Instagram</span>
                      <span className="text-xs font-semibold text-gray-800 truncate block">
                        {restaurant.socialLinks.instagram}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-700" />
                  </a>
                ) : null}

                {restaurant.socialLinks?.twitter ? (
                  <a
                    href={restaurant.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100/70 transition group"
                  >
                    <FaTwitter className="w-5 h-5 text-sky-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Twitter / X</span>
                      <span className="text-xs font-semibold text-gray-800 truncate block">
                        {restaurant.socialLinks.twitter}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-700" />
                  </a>
                ) : null}

                {!restaurant.website &&
                  !restaurant.socialLinks?.website &&
                  !restaurant.socialLinks?.facebook &&
                  !restaurant.socialLinks?.instagram &&
                  !restaurant.socialLinks?.twitter && (
                    <p className="text-xs text-gray-400 italic col-span-2">
                      No social media links added yet. Click &quot;Edit Profile&quot; to connect your pages.
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Timings, Address, Contacts */}
          <div className="lg:col-span-4 space-y-6" data-aos="fade-up" data-aos-delay="300">
            {/* Operating Hours Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF6B35]" />
                <span>Operating Schedule</span>
              </h2>

              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100/80 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Daily Timing</span>
                <span className="text-xs font-extrabold text-[#FF6B35]">
                  {restaurant.generalOpenTime || "09:00 AM"} – {restaurant.generalCloseTime || "10:30 PM"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="font-medium text-gray-500">Mon – Fri</span>
                  <span className="font-semibold text-gray-800">
                    {restaurant.generalOpenTime || "09:00 AM"} – {restaurant.generalCloseTime || "10:30 PM"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="font-medium text-gray-500">Saturday</span>
                  <span className="font-semibold text-gray-800">
                    {restaurant.generalOpenTime || "09:00 AM"} – {restaurant.generalCloseTime || "11:00 PM"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium text-gray-500">Sunday</span>
                  <span className="font-semibold text-gray-800">
                    {restaurant.generalOpenTime || "09:00 AM"} – {restaurant.generalCloseTime || "11:00 PM"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Location Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B35]" />
                <span>Location &amp; Contacts</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#FF6B35] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Address</span>
                    <span className="font-semibold text-gray-800">
                      {restaurant.address.street}, {restaurant.address.city}
                      {restaurant.address.postalCode ? ` - ${restaurant.address.postalCode}` : ""}
                    </span>
                    <span className="text-gray-500 block">
                      {restaurant.address.state ? `${restaurant.address.state}, ` : ""}
                      {restaurant.address.country || "Bangladesh"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                  <Phone className="w-4 h-4 text-[#FF6B35] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Phone Number</span>
                    <a
                      href={`tel:${restaurant.contactNumber}`}
                      className="font-semibold text-gray-800 hover:text-[#FF6B35] transition"
                    >
                      {restaurant.contactNumber}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                  <Mail className="w-4 h-4 text-[#FF6B35] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Official Email</span>
                    <a
                      href={`mailto:${restaurant.contactEmail}`}
                      className="font-semibold text-gray-800 hover:text-[#FF6B35] transition truncate block max-w-[200px]"
                    >
                      {restaurant.contactEmail}
                    </a>
                  </div>
                </div>
              </div>

              {/* Map visual teaser */}
              <div className="rounded-2xl bg-gray-100 h-28 border border-gray-200 flex flex-col items-center justify-center text-center p-3 relative overflow-hidden group">
                <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-[#FF6B35] mb-1 group-hover:scale-110 transition">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700">
                  {restaurant.address.city}, Bangladesh
                </span>
                <span className="text-[9px] text-gray-400">Riders navigate here for pickup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
