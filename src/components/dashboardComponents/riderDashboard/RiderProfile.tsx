"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Bike,
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Power,
  ShieldCheck,
  CreditCard,
  FileText,
  Calendar,
  Sparkles,
  TrendingUp,
  PackageCheck,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { IRiderProfile, getMyRiderProfile } from "@/lib/api/rider";
import { toggleRiderAvailability } from "@/lib/actions/rider";
import CreateRiderProfile from "./CreateRiderProfile";

export default function RiderProfile() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [rider, setRider] = useState<IRiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
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
    image?: string;
  } | undefined;

  const showToast = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.email && !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const email = user?.email || "";
      const res = await getMyRiderProfile(email, user?.id);
      if (res.success && res.data) {
        setRider(res.data);
      } else {
        setRider(null);
      }
    } catch (err) {
      console.error("Error fetching rider profile:", err);
      setRider(null);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Online/Offline Status Toggle
  const handleToggleOnlineStatus = async () => {
    if (!rider || !user?.email) return;

    const nextState = !rider.isAvailable;
    setToggleLoading(true);

    try {
      const res = await toggleRiderAvailability(user.email, nextState);
      if (res.success) {
        setRider((prev) => (prev ? { ...prev, isAvailable: nextState } : null));
        showToast(
          "success",
          `Status updated: You are now ${nextState ? "Online & Ready for orders!" : "Offline."}`
        );
      } else {
        showToast("error", res.message || "Failed to update availability status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update status.");
    } finally {
      setToggleLoading(false);
    }
  };

  const handleCreatedOrUpdated = (updatedRider: IRiderProfile) => {
    setRider(updatedRider);
    setIsEditMode(false);
    showToast("success", "Rider profile saved successfully!");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("riderProfileChanged"));
    }
  };

  // 1. Loading State
  if (sessionLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6B35]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-gray-500 animate-pulse">
          Loading your delivery partner profile...
        </p>
      </div>
    );
  }

  // 2. No Profile Exists OR in Edit Mode -> Render Form
  if (!rider || isEditMode) {
    return (
      <div className="space-y-6">
        {!rider && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="p-4 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
              <Bike className="w-8 h-8" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-bold text-amber-900">
                Complete Your Rider Profile to Start Delivering
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                You haven&apos;t created your rider profile yet. Please provide your vehicle details,
                operating zone, and emergency contact to activate delivery requests.
              </p>
            </div>
          </div>
        )}

        <CreateRiderProfile
          initialData={rider}
          userEmail={user?.email || ""}
          userName={user?.name || ""}
          userId={user?.id || ""}
          isEditMode={Boolean(rider && isEditMode)}
          onSuccess={handleCreatedOrUpdated}
          onCancel={rider ? () => setIsEditMode(false) : undefined}
        />
      </div>
    );
  }

  // Helper for Vehicle Icon
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "bicycle":
        return <Bike className="w-4 h-4" />;
      case "electric_bike":
        return <Zap className="w-4 h-4" />;
      default:
        return <Bike className="w-4 h-4" />;
    }
  };

  const getVehicleLabel = (type: string) => {
    switch (type) {
      case "bicycle":
        return "Bicycle";
      case "electric_bike":
        return "Electric Bike (E-Bike)";
      case "scooter":
        return "Scooter";
      default:
        return "Motorcycle / Bike";
    }
  };

  // 3. Full Rider Profile View
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-medium ${
              statusMessage.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800 shadow-emerald-500/10"
                : "bg-white border-rose-200 text-rose-800 shadow-rose-500/10"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Hero Profile Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-[#FF6B35] via-[#FF8C42] to-[#FFB703] overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-gray-800 text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar & Core Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-white bg-orange-100 shadow-lg relative flex items-center justify-center font-bold text-3xl text-orange-600">
                {rider.avatar ? (
                  <img
                    src={rider.avatar}
                    alt={rider.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{rider.name.charAt(0).toUpperCase()}</span>
                )}
                {rider.isAvailable && (
                  <span
                    title="Online"
                    className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-400/40 animate-pulse"
                  />
                )}
              </div>

              <div className="space-y-1 sm:pb-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-gray-900">{rider.name}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-[#FF6B35] border border-orange-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Delivery Partner
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {rider.email}
                  </span>
                  {rider.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {rider.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {rider.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Availability Live Toggle Button */}
            <div className="sm:pb-2 flex flex-col items-center sm:items-end gap-1.5">
              <button
                onClick={handleToggleOnlineStatus}
                disabled={toggleLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 shadow-sm ${
                  rider.isAvailable
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {toggleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className={`w-4 h-4 ${rider.isAvailable ? "text-emerald-600" : "text-gray-400"}`} />
                )}
                <span>{rider.isAvailable ? "Online • Ready for Deliveries" : "Offline • Shift Paused"}</span>
              </button>
              <span className="text-[11px] text-gray-400 font-medium">
                Click to switch your delivery availability
              </span>
            </div>
          </div>

          {/* Rider Bio if exists */}
          {rider.bio && (
            <p className="mt-4 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-2xl border border-gray-100 leading-relaxed">
              &ldquo;{rider.bio}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* 4 Performance Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deliveries Completed */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Deliveries
            </span>
            <div className="p-2.5 rounded-xl bg-orange-50 text-[#FF6B35]">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {rider.totalDeliveries || 0}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Active Delivery Status
          </p>
        </div>

        {/* Customer Rating */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Customer Rating
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 flex items-center gap-1.5">
            <span>{rider.rating ? Number(rider.rating).toFixed(1) : "5.0"}</span>
            <span className="text-xs font-semibold text-gray-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-amber-600 font-semibold">Top Rated Partner</p>
        </div>

        {/* Vehicle Mode */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Vehicle Type
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              {getVehicleIcon(rider.vehicleType)}
            </div>
          </div>
          <div className="text-base font-extrabold text-gray-900 truncate">
            {getVehicleLabel(rider.vehicleType)}
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {rider.vehicleBrand || "Standard Vehicle"}
          </p>
        </div>

        {/* Operating Zone */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Delivery Zone
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-extrabold text-gray-900 truncate">
            {rider.deliveryZone || rider.city}
          </div>
          <p className="text-[11px] text-purple-600 font-semibold truncate">
            Primary Area
          </p>
        </div>
      </div>

      {/* Detailed Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: Vehicle & Transport Specifications */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Vehicle &amp; Transport Details
              </h3>
              <p className="text-xs text-gray-400">Registered transport information</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Vehicle Category:</span>
              <span className="font-bold text-gray-900">
                {getVehicleLabel(rider.vehicleType)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Brand &amp; Model:</span>
              <span className="font-bold text-gray-900">
                {rider.vehicleBrand || "Not specified"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">License Plate No:</span>
              <span className="font-bold text-gray-900 uppercase">
                {rider.vehicleNumber || "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Driving License:</span>
              <span className="font-bold text-gray-900 uppercase">
                {rider.drivingLicenseNumber || "Verified"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">National ID (NID):</span>
              <span className="font-bold text-gray-900">
                {rider.nidNumber || "Encrypted / Verified"}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Service Zone & Address */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Operating Zone &amp; Location
              </h3>
              <p className="text-xs text-gray-400">Coverage area and base details</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Primary Hub / Zone:</span>
              <span className="font-bold text-gray-900">{rider.deliveryZone}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">City:</span>
              <span className="font-bold text-gray-900">{rider.city}</span>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 space-y-1">
              <span className="text-gray-500 font-medium block">Residential Base Address:</span>
              <span className="font-bold text-gray-900 block leading-relaxed">
                {rider.address?.fullAddress ||
                  rider.address?.street ||
                  `${rider.deliveryZone}, ${rider.city}`}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Account Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {rider.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: Emergency Contact */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Emergency Contact
              </h3>
              <p className="text-xs text-gray-400">Emergency support &amp; guardian contact</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Contact Person:</span>
              <span className="font-bold text-gray-900">
                {rider.emergencyContact?.name || "Not set"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Relationship:</span>
              <span className="font-bold text-gray-900">
                {rider.emergencyContact?.relation || "Family"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Emergency Phone:</span>
              <span className="font-bold text-gray-900">
                {rider.emergencyContact?.phone ? (
                  <a
                    href={`tel:${rider.emergencyContact.phone}`}
                    className="text-[#FF6B35] hover:underline"
                  >
                    {rider.emergencyContact.phone}
                  </a>
                ) : (
                  "Not set"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: Account Timeline & Platform Security */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Account &amp; Security
              </h3>
              <p className="text-xs text-gray-400">Partner registration details</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Joined Platform:</span>
              <span className="font-bold text-gray-900">
                {rider.createdAt
                  ? new Date(rider.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Active Partner"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Profile Last Updated:</span>
              <span className="font-bold text-gray-900">
                {rider.updatedAt
                  ? new Date(rider.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
              <span className="text-gray-500 font-medium">Security Verification:</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Identity &amp; Transport Verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
