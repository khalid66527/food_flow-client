"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Phone,
  MapPin,
  Package,
  Route,
  Banknote,
  Store,
  Navigation,
  ArrowRight,
  User,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Power,
  ShieldCheck,
  Star,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Wallet,
  Zap,
  Check,
  Share2,
  Calendar,
  Layers,
  Map,
  ShoppingBag,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "@/lib/auth-client";
import { getRiderOrdersApi, updateOrderStatusApi } from "@/lib/api/order";
import { getMyRiderProfile, IRiderProfile } from "@/lib/api/rider";
import { toggleRiderAvailability } from "@/lib/actions/rider";
import { getOrderSocket, joinOrderRoom } from "@/lib/socket";
import { TOrder } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

function formatAddress(addr: unknown): string {
  if (!addr) return "Address on record";
  if (typeof addr === "string") return addr;
  const a = addr as {
    street?: string;
    area?: string;
    city?: string;
    fullAddress?: string;
    address?: string;
  };
  if (a.fullAddress) return a.fullAddress;
  if (a.address) return a.address;
  return (
    [a.street, a.area, a.city].filter(Boolean).join(", ") ||
    "Address on record"
  );
}

function getRestaurantName(order: TOrder): string {
  return (
    order.items?.[0]?.restaurantName ||
    (order as unknown as { restaurantName?: string }).restaurantName ||
    "FoodFlow Kitchen"
  );
}

function getCustomerName(order: TOrder): string {
  return (
    order.deliveryAddress?.fullName ||
    order.userName ||
    (order as unknown as { customerName?: string }).customerName ||
    "Customer"
  );
}

function getCustomerPhone(order: TOrder): string | undefined {
  return (
    order.deliveryAddress?.phoneNumber ||
    (order as unknown as { userPhone?: string; customerPhone?: string })
      .userPhone ||
    (order as unknown as { userPhone?: string; customerPhone?: string })
      .customerPhone
  );
}

export default function RiderHome() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const [riderProfile, setRiderProfile] = useState<IRiderProfile | null>(null);
  const [orders, setOrders] = useState<TOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "recent">("available");

  // Fetch all rider data
  const loadRiderData = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    try {
      // 1. Fetch live rider profile
      const profRes = await getMyRiderProfile(user.email, user.id);
      if (profRes.success && profRes.data) {
        setRiderProfile(profRes.data);
        setIsOnline(profRes.data.isAvailable ?? true);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "foodflow_rider_data",
            JSON.stringify(profRes.data)
          );
        }
      }

      // 2. Fetch available & assigned active orders
      const res = await getRiderOrdersApi(user.id, user.email);
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data as TOrder[]);
      } else {
        setOrders([]);
      }

      // 3. Fetch completed deliveries for daily stats & history
      const historyRes = await fetch(
        `/api/orders/success-orders?role=rider&userId=${user.id}`,
        {
          headers: {
            "x-user-id": user.id,
            "x-user-email": user.email,
          },
          cache: "no-store",
        }
      );
      const historyJson = await historyRes.json();
      if (historyJson.success && Array.isArray(historyJson.data)) {
        setCompletedOrders(historyJson.data);
      }
    } catch (err) {
      console.error("Failed to load rider dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionPending && user?.id) {
      loadRiderData();
    }
  }, [sessionPending, user?.id, loadRiderData]);

  // Real-time socket listener for new delivery requests
  useEffect(() => {
    if (!user?.id || sessionPending) return;

    const socket = getOrderSocket("rider_home_" + (user.id || "unknown"));
    joinOrderRoom("rider_" + (user.id || "unknown"));

    const onOrderEvent = () => {
      loadRiderData();
    };

    socket.on("order:created", onOrderEvent);
    socket.on("new_order_placed", onOrderEvent);
    socket.on("new_delivery_available", onOrderEvent);
    socket.on("order:status_updated", onOrderEvent);
    socket.on("order_status_updated", onOrderEvent);

    return () => {
      socket.off("order:created", onOrderEvent);
      socket.off("new_order_placed", onOrderEvent);
      socket.off("new_delivery_available", onOrderEvent);
      socket.off("order:status_updated", onOrderEvent);
      socket.off("order_status_updated", onOrderEvent);
    };
  }, [user?.id, sessionPending, loadRiderData]);

  // Online / Offline Duty Switch
  const handleToggleOnline = async () => {
    if (!user?.email) return;
    setTogglingOnline(true);
    const nextStatus = !isOnline;

    try {
      const res = await toggleRiderAvailability(user.email, nextStatus);
      if (res.success) {
        setIsOnline(nextStatus);
        setRiderProfile((prev) =>
          prev ? { ...prev, isAvailable: nextStatus } : null
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("foodflow_rider_is_online", String(nextStatus));
        }
        toast.success(
          nextStatus
            ? "🟢 You are now ONLINE & receiving orders!"
            : "🔴 You are now OFFLINE (Duty Paused)."
        );
        window.dispatchEvent(new Event("riderStatusChanged"));
      } else {
        toast.error(res.message || "Failed to change duty status.");
      }
    } catch {
      toast.error("Network error updating status.");
    } finally {
      setTogglingOnline(false);
    }
  };

  // Filter Active vs Available Orders
  const { availableOrders, myActiveOrders, stats } = useMemo(() => {
    // 1. My Assigned Active Trips
    const myActive = orders.filter((o) => {
      const s = (o.orderStatus || "").toLowerCase();
      const isAssignedToMe = (o as unknown as { riderInfo?: { riderId?: string } }).riderInfo?.riderId === user?.id;
      const isActiveStatus =
        s === "out for delivery" ||
        s === "ready for pickup" ||
        s === "ready" ||
        s === "preparing";

      return (
        (isAssignedToMe || s === "out for delivery") &&
        !["delivered", "completed", "cancelled", "canceled"].includes(s)
      );
    });

    // 2. Available unassigned orders ready for pickup
    const available = orders.filter((o) => {
      const s = (o.orderStatus || "").toLowerCase();
      const hasRider = Boolean(
        (o as unknown as { riderInfo?: { riderId?: string } }).riderInfo?.riderId
      );
      return (
        ["ready", "ready for pickup", "confirmed", "preparing"].includes(s) &&
        !hasRider
      );
    });

    // 3. Today's stats
    const todayStr = new Date().toDateString();
    const todayCompleted = completedOrders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toDateString() : "";
      return d === todayStr;
    });

    const todayEarnings = todayCompleted.reduce((sum, o) => {
      const fee = Number(o.deliveryFee) || 50;
      return sum + fee;
    }, 0);

    const lifetimeEarnings = completedOrders.reduce((sum, o) => {
      const fee = Number(o.deliveryFee) || 50;
      return sum + fee;
    }, 0);

    const codCollected = completedOrders
      .filter((o) => (o.paymentMethod || "").toUpperCase() === "COD")
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const currentPrimaryActive = myActive[0] || null;

    return {
      availableOrders: available,
      myActiveOrders: myActive,
      stats: {
        todayEarnings,
        todayTrips: todayCompleted.length,
        totalTrips: completedOrders.length,
        lifetimeEarnings,
        codCollected,
        currentPrimaryActive,
      },
    };
  }, [orders, completedOrders, user?.id]);

  // Accept Order Action
  const handleAcceptOrder = async (order: TOrder) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id || !user?.email) return;

    setActionLoadingId(orderId);
    try {
      const res = await updateOrderStatusApi(
        orderId,
        {
          orderStatus: "Out for Delivery",
          riderInfo: {
            riderId: user.id,
            name: riderProfile?.name || user.name || "Delivery Partner",
            phone: riderProfile?.phone || "",
            vehicleNumber: riderProfile?.vehicleNumber || "",
          },
        },
        user.id,
        user.email
      );

      if (res.success) {
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", {
          orderId,
          orderStatus: "Out for Delivery",
        });

        toast.success("🚴 Delivery accepted! Opening Live Map navigation...");
        router.push(`/dashboard/rider/active-delivery?orderId=${orderId}`);
      } else {
        toast.error(res.message || "Could not accept order.");
      }
    } catch {
      toast.error("Error accepting delivery.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="min-h-[550px] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 font-semibold text-sm">
          Loading Rider Command Center...
        </p>
      </div>
    );
  }

  const riderName = riderProfile?.name || user?.name || "Delivery Partner";
  const vehicleType = riderProfile?.vehicleType || "Motorcycle";
  const vehicleNumber = riderProfile?.vehicleNumber || "Verified Rider";
  const deliveryZone = riderProfile?.deliveryZone || riderProfile?.city || "Dhaka Hub";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 text-gray-800 font-sans">
      {/* ========================================================================= */}
      {/* 🌟 1. HERO BANNER - FOODFLOW CORAL-ORANGE GRADIENT WITH HARMONIZED BUTTONS */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 md:p-8 shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/60 shadow-lg shrink-0 bg-white/20 flex items-center justify-center">
              {riderProfile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={riderProfile.avatar}
                  alt={riderName}
                  className="w-full h-full object-cover bg-white"
                />
              ) : (
                <Bike className="w-9 h-9 text-white drop-shadow" />
              )}
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
                title={isOnline ? "Duty: Online" : "Duty: Offline"}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  Welcome back, {riderName}!
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30">
                  {vehicleType} • {vehicleNumber}
                </span>
              </div>
              <p className="text-white/95 text-sm max-w-xl font-medium">
                {isOnline
                  ? `🟢 Active on duty in ${deliveryZone}. Ready to receive live pickups.`
                  : "🔴 You are currently offline. Turn duty ON when you are ready to deliver."}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                loadRiderData();
              }}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 transition shadow-sm active:scale-95"
              title="Refresh deliveries"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            {/* Duty Toggle Button */}
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              className={`px-5 py-3 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isOnline
                  ? "bg-white text-[#FF6B35] hover:bg-orange-50 shadow-lg font-black"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/50 font-black"
              }`}
            >
              {togglingOnline ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span>{isOnline ? "Duty: ON DUTY" : "Duty: GO ONLINE"}</span>
            </button>

            {stats.currentPrimaryActive ? (
              <Link
                href={`/dashboard/rider/active-delivery?orderId=${
                  stats.currentPrimaryActive.orderId ||
                  stats.currentPrimaryActive._id
                }`}
                className="px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white border border-white/40 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg backdrop-blur-md transition active:scale-95"
              >
                <Navigation className="w-4 h-4 text-white animate-pulse" />
                <span>Track Active Trip</span>
              </Link>
            ) : (
              <Link
                href="/dashboard/rider/earnings"
                className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-xs md:text-sm flex items-center gap-2 transition active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                <span>My Earnings</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📊 2. HARMONIZED 4 STAT METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Earnings */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Today&apos;s Revenue
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              ৳{stats.todayEarnings}
            </h3>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {stats.todayTrips} trips completed
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Deliveries */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Deliveries
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {stats.totalTrips} Trips
            </h3>
            <span className="text-xs font-bold text-gray-500 mt-1 block">
              ৳{stats.lifetimeEarnings} Total Payout
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Active Trip Status */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Delivery
            </span>
            <h3 className="text-lg font-black text-gray-900 mt-1 truncate max-w-[140px]">
              {stats.currentPrimaryActive ? (
                <span className="text-[#FF6B35] flex items-center gap-1.5 font-black">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-ping" />
                  In Progress
                </span>
              ) : (
                <span className="text-gray-400 font-bold">Idle / Ready</span>
              )}
            </h3>
            <span className="text-xs font-bold text-gray-500 mt-1 block">
              {availableOrders.length} available to accept
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <Route className="w-6 h-6" />
          </div>
        </div>

        {/* Rider Rating */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Rider Rating
            </span>
            <h3 className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
              ★ {riderProfile?.rating ? Number(riderProfile.rating).toFixed(1) : "5.0"}
            </h3>
            <span className="text-xs font-bold text-emerald-600 mt-1 block">
              98% Acceptance Rate
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🚀 3. ACTIVE TRIP CARD - LIGHT PREMIUM THEME (NO HEAVY BLACK BOX) */}
      {/* ========================================================================= */}
      {stats.currentPrimaryActive && (
        <div className="bg-white rounded-3xl border-2 border-orange-200/80 shadow-md shadow-orange-500/5 overflow-hidden transition-all">
          {/* Card Accent Top Bar */}
          <div className="p-5 md:p-6 bg-gradient-to-r from-orange-50/90 via-amber-50/40 to-white border-b border-orange-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-[#FF6B35] text-white tracking-wider">
                    Active Delivery
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-500">
                    #{stats.currentPrimaryActive.orderId || stats.currentPrimaryActive._id?.slice(-6)}
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Trip in progress — Heading to destination
                </h3>
              </div>
            </div>

            <Link
              href={`/dashboard/rider/active-delivery?orderId=${
                stats.currentPrimaryActive.orderId ||
                stats.currentPrimaryActive._id
              }`}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF7843] hover:from-[#e85a26] hover:to-[#FF6B35] text-white font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-95 self-start md:self-auto"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Live Map & OTP Verification</span>
            </Link>
          </div>

          {/* Pickup & Drop Details */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup */}
            <div className="p-4.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
              <span className="font-extrabold text-[#FF6B35] flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Store className="w-3.5 h-3.5" /> Pickup From Kitchen:
              </span>
              <p className="font-black text-base text-gray-900">
                {getRestaurantName(stats.currentPrimaryActive)}
              </p>
              <p className="text-xs font-medium text-gray-500">
                {(stats.currentPrimaryActive.items || []).length} food items in bag • ৳{stats.currentPrimaryActive.totalAmount || 0} Total
              </p>
            </div>

            {/* Drop Off */}
            <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-1.5">
              <span className="font-extrabold text-emerald-700 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <MapPin className="w-3.5 h-3.5" /> Drop Off To Customer:
              </span>
              <div className="flex items-center justify-between">
                <p className="font-black text-base text-gray-900">
                  {getCustomerName(stats.currentPrimaryActive)}
                </p>
                {getCustomerPhone(stats.currentPrimaryActive) && (
                  <a
                    href={`tel:${getCustomerPhone(stats.currentPrimaryActive)}`}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Call Customer</span>
                  </a>
                )}
              </div>
              <p className="text-xs font-medium text-gray-600 line-clamp-1">
                {formatAddress(stats.currentPrimaryActive.deliveryAddress)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📦 4. TABS: AVAILABLE ORDERS VS RECENT DELIVERIES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Orders Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            {/* Clean Pill Tab Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveTab("available")}
                  className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition flex items-center gap-2 ${
                    activeTab === "available"
                      ? "bg-white text-[#FF6B35] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Ready Pickups ({availableOrders.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("recent")}
                  className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition flex items-center gap-2 ${
                    activeTab === "recent"
                      ? "bg-white text-[#FF6B35] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Completed Today ({stats.todayTrips})</span>
                </button>
              </div>

              <span className="text-xs text-gray-400 font-bold hidden sm:inline">
                Live Dispatch
              </span>
            </div>

            {/* TAB A: AVAILABLE ORDERS TO ACCEPT */}
            {activeTab === "available" && (
              <div className="space-y-4">
                {availableOrders.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] mx-auto flex items-center justify-center">
                      <Bike className="w-8 h-8" />
                    </div>
                    <h4 className="font-black text-gray-800 text-sm">
                      No Available Delivery Requests Right Now
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Stay online. When kitchens prepare new food orders, they will appear here immediately for you to accept.
                    </p>
                  </div>
                ) : (
                  availableOrders.map((order) => {
                    const id = order.orderId || order._id || "";
                    const fee = Number(order.deliveryFee) || 50;
                    const isAccepting = actionLoadingId === id;

                    return (
                      <div
                        key={id}
                        className="p-5 rounded-2xl border border-gray-100 hover:border-orange-200 bg-white hover:bg-orange-50/10 transition-all space-y-4 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white font-mono">
                              #{id.slice(-6).toUpperCase()}
                            </span>
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-[#FF6B35] border border-orange-200/70">
                              {order.orderStatus || "Ready for Pickup"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-400">
                              Earn Delivery Fee:
                            </span>
                            <span className="text-base font-black text-emerald-600 ml-1.5">
                              +৳{fee}
                            </span>
                          </div>
                        </div>

                        {/* Pickup & Drop Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                          <div>
                            <span className="font-bold text-gray-400 flex items-center gap-1 mb-1">
                              <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
                              Pickup Kitchen:
                            </span>
                            <p className="font-extrabold text-gray-900 text-sm">
                              {getRestaurantName(order)}
                            </p>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              {(order.items || []).length} food items in package
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 flex items-center gap-1 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              Customer Drop-Off:
                            </span>
                            <p className="font-extrabold text-gray-900 truncate">
                              {getCustomerName(order)}
                            </p>
                            <p className="text-gray-500 line-clamp-1">
                              {formatAddress(order.deliveryAddress)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-gray-500 font-medium">
                            Payment:{" "}
                            <strong className="text-gray-800">
                              {order.paymentMethod || "COD"} (৳{order.totalAmount || 0})
                            </strong>
                          </div>

                          <button
                            onClick={() => handleAcceptOrder(order)}
                            disabled={isAccepting}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#FF6B35] to-[#FF7843] hover:from-[#e85a26] hover:to-[#FF6B35] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
                          >
                            {isAccepting ? (
                              <LoadingSpinner size={14} color="#ffffff" />
                            ) : (
                              <Bike className="w-3.5 h-3.5" />
                            )}
                            <span>Accept & Start Delivery</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB B: COMPLETED TRIPS TODAY */}
            {activeTab === "recent" && (
              <div className="space-y-3">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs font-medium">
                    No completed trips recorded today.
                  </div>
                ) : (
                  completedOrders.slice(0, 6).map((order) => {
                    const id = order.orderId || order._id || "";
                    const fee = Number(order.deliveryFee) || 50;
                    return (
                      <div
                        key={id}
                        className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 shadow-xs flex items-center justify-between text-xs transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-gray-900">
                                #{id.slice(-6).toUpperCase()}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Delivered
                              </span>
                            </div>
                            <p className="text-gray-500 mt-0.5">
                              {getRestaurantName(order)} ➔ {getCustomerName(order)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-emerald-600 text-sm">
                            +৳{fee}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {order.paymentMethod || "COD"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links & COD Ledger Status */}
        <div className="space-y-6">
          {/* Quick Menu */}
          <div className="bg-white p-6 md:p-7 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-black text-gray-900 text-base">
              Rider Operations Menu
            </h3>

            <div className="space-y-2.5">
              <Link
                href="/dashboard/rider/earnings"
                className="p-3.5 rounded-2xl bg-orange-50/60 hover:bg-orange-50 border border-orange-100 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#FF6B35] text-white rounded-xl shadow-xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">
                      Earnings & Payouts
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Withdraw balance & view trip fees
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/dashboard/rider/delivery-history"
                className="p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-100 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">
                      Delivery History
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      View all past completed trips
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/dashboard/rider/delivery-details"
                className="p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100/80 border border-gray-100 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">
                      Order Queue
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Pickup checklists & details
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* COD Cash in Hand Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 rounded-3xl border border-amber-200/80 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-600" />
                COD Cash in Hand
              </span>
              <span className="text-base font-black text-amber-900">
                ৳{stats.codCollected}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
              Cash collected from customer Cash on Delivery orders. Remit to your zone hub weekly.
            </p>
          </div>

          {/* Safety & Support Card - Light Theme Matching FoodFlow */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 text-amber-500">
              <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
              <h4 className="font-black text-sm text-gray-900">
                Rider Safety & Support
              </h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Always wear your helmet and follow traffic safety rules. Need urgent delivery assistance?
            </p>
            <div className="pt-1">
              <a
                href="tel:16500"
                className="w-full py-3 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#FF6B35] text-xs font-black flex items-center justify-center gap-2 transition"
              >
                <Phone className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Call Emergency Helpline</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
