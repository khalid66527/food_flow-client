"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { updateOrderStatusApi } from "@/lib/api/order";
import {
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Bike,
  Store,
  Search,
  Calendar,
  XCircle,
  Receipt,
  MapPin,
  Phone,
  User,
  Banknote,
  CreditCard,
  Navigation,
  Eye,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Ban,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRestaurantOrdersApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import OrderStatusStepper, { resolveStepIndex } from "@/components/tracking/OrderStatusStepper";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";

type TTab = "ALL" | "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "OUT FOR DELIVERY";

const TABS: { key: TTab; label: string; icon: React.ElementType }[] = [
  { key: "ALL", label: "Active Orders", icon: Receipt },
  { key: "PLACED", label: "New", icon: Clock },
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "READY", label: "Ready", icon: PackageCheck },
  { key: "OUT FOR DELIVERY", label: "Dispatched", icon: Bike },
];

function getRestaurantProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foodflow_restaurant_data");
    return raw ? (JSON.parse(raw) as { _id?: string; restaurantName?: string }) : null;
  } catch {
    return null;
  }
}

function getStatusIcon(status?: string) {
  const s = (status || "Placed").toLowerCase();
  if (s === "delivered") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (s === "cancelled") return <XCircle className="w-4 h-4 text-rose-600" />;
  if (s === "out for delivery") return <Bike className="w-4 h-4 text-amber-600" />;
  if (s === "preparing") return <ChefHat className="w-4 h-4 text-purple-600" />;
  if (s === "ready" || s === "ready for pickup") return <PackageCheck className="w-4 h-4 text-sky-600" />;
  if (s === "confirmed") return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
  return <Clock className="w-4 h-4 text-gray-500" />;
}

function getStatusBadgeClass(status?: string) {
  const s = (status || "Placed").toLowerCase();
  if (s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "out for delivery") return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
  if (s === "preparing") return "bg-purple-50 text-purple-700 border-purple-200";
  if (s === "ready" || s === "ready for pickup") return "bg-sky-50 text-sky-700 border-sky-200";
  if (s === "confirmed") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function groupItemsByRestaurant(items: TOrderItem[] = []) {
  const groups: Record<string, TOrderItem[]> = {};
  items.forEach((item) => {
    const key = item.restaurantName?.trim() || "FoodFlow Kitchen";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

export default function RestaurantOrders() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string } | undefined;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Live Tracking Modal State
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [riderLiveCoords, setRiderLiveCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  const ORDERS_PER_PAGE = 10;
  const profile = getRestaurantProfile();

  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    const res = await getRestaurantOrdersApi(user.id, user.email, {
      restaurantId: profile?._id,
      restaurantName: profile?.restaurantName,
    });
    if (res.success && Array.isArray(res.data)) {
      const activeList = (res.data as TOrder[]).filter(
        (o) =>
          !["delivered", "completed", "cancelled", "canceled", "rejected", "failed"].includes(
            (o.orderStatus || "").toLowerCase()
          )
      );
      setOrders(activeList);
    } else {
      setOrders([]);
      if (res.message) setError(res.message);
    }
    setLoading(false);
  }, [user?.id, user?.email, profile?._id, profile?.restaurantName]);

  useEffect(() => {
    if (!sessionPending && user?.id) fetchOrders();
  }, [sessionPending, user?.id, fetchOrders]);

  // Keep selected order in sync when orders state changes
  useEffect(() => {
    if (selectedOrder) {
      const match = orders.find(
        (o) => (o.orderId && o.orderId === selectedOrder.orderId) || (o._id && o._id === selectedOrder._id)
      );
      if (match) setSelectedOrder(match);
    }
  }, [orders, selectedOrder]);

  // Socket: listen for real-time order status updates & live rider coordinates
  useEffect(() => {
    if (!user?.id || sessionPending) return;

    const socket = getOrderSocket("restaurant_" + (user.id || "unknown"));
    joinOrderRoom("restaurant_" + (user.id || "unknown"));
    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      joinOrderRoom("restaurant_" + (user.id || "unknown"));
    };
    const onDisconnect = () => setSocketConnected(false);

    const onStatusUpdated = (payload: {
      orderId?: string;
      orderStatus?: string;
      status?: string;
      paymentStatus?: string;
    }) => {
      const orderId = payload?.orderId;
      const newStatus = payload?.orderStatus || payload?.status;
      if (!orderId) return;

      if (
        newStatus &&
        ["delivered", "completed", "cancelled", "canceled", "rejected", "failed"].includes(
          newStatus.toLowerCase()
        )
      ) {
        // Delivered order moves to Sell History immediately
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId && o._id !== orderId));
        if (selectedOrder && (selectedOrder.orderId === orderId || selectedOrder._id === orderId)) {
          setSelectedOrder(null);
        }
        return;
      }

      setOrders((prev) =>
        prev.map((o) => {
          if (o.orderId === orderId || o._id === orderId) {
            return {
              ...o,
              ...(newStatus ? { orderStatus: newStatus as TOrder["orderStatus"] } : {}),
              ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus as TOrder["paymentStatus"] } : {}),
            };
          }
          return o;
        })
      );
    };

    const onRiderLocation = (payload: {
      orderId?: string;
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    }) => {
      const oId = payload?.orderId;
      const lat = payload?.lat ?? payload?.latitude;
      const lng = payload?.lng ?? payload?.longitude;
      if (oId && lat && lng) {
        setRiderLiveCoords((prev) => ({
          ...prev,
          [oId]: { lat, lng },
        }));
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order_status_updated", onStatusUpdated);
    socket.on("update_rider_location", onRiderLocation);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order_status_updated", onStatusUpdated);
      socket.off("update_rider_location", onRiderLocation);
    };
  }, [sessionPending, user?.id]);

  useEffect(() => () => disconnectOrderSocket(), []);

  // ─── Status progression actions (Restaurant Kitchen Flow) ───
  const updateStatus = async (order: TOrder, newStatus: string) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id) return;
    try {
      setActionLoadingId(orderId);
      const res = await updateOrderStatusApi(orderId, { orderStatus: newStatus }, user.id, user.email || "");
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.orderId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus as TOrder["orderStatus"] } : o))
        );
        // Broadcast to customer and rider tracking channels
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", { orderId, orderStatus: newStatus });
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── Cancel COD Order (Restaurant Action) ───────────────────
  const cancelOrder = async (order: TOrder) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id) return;
    try {
      setActionLoadingId(orderId);
      const res = await updateOrderStatusApi(
        orderId,
        { orderStatus: "Cancelled", reason: "Cancelled by restaurant" },
        user.id,
        user.email || ""
      );
      if (res.success) {
        // Remove cancelled order from list immediately
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId && o._id !== orderId));
        if (selectedOrder && (selectedOrder.orderId === orderId || selectedOrder._id === orderId)) {
          setSelectedOrder(null);
        }
        // Broadcast cancel event via socket
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", { orderId, orderStatus: "Cancelled" });
      } else {
        setError(res.message || "Failed to cancel order.");
      }
    } catch (err) {
      console.error("Cancel order failed:", err);
      setError("Failed to cancel order. Please try again.");
    } finally {
      setActionLoadingId(null);
      setCancelConfirmId(null);
    }
  };

  // ─── Filtering & Sorting (Newest First) ─────────────────────
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderId?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name.toLowerCase().includes(q)) ||
        o.userName?.toLowerCase().includes(q) ||
        o.deliveryAddress?.fullName?.toLowerCase().includes(q);
      const s = (o.orderStatus || "Placed").toUpperCase();
      const matchesTab = activeTab === "ALL" || s === activeTab.toUpperCase();
      return matchesSearch && matchesTab;
    });
    // Sort descending by createdAt (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [orders, searchQuery, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // ─── Pagination ─────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const activeOrderCount = orders.filter(
    (o) => o.orderStatus && !["Delivered", "Cancelled"].includes(o.orderStatus)
  ).length;

  const todayCount = orders.filter((o) => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  if (sessionPending || loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Store className="w-3.5 h-3.5 text-white" /> Kitchen Orders & Live Tracking
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {profile?.restaurantName || "Your Restaurant"} Kitchen
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Receive online & COD orders, prepare dishes, and monitor rider delivery trips in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold border border-white/20">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-white/50"}`} />
              {socketConnected ? "Live Socket" : "Offline"}
            </span>
            <button
              type="button"
              onClick={fetchOrders}
              className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 transition cursor-pointer"
              title="Refresh orders"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active In Kitchen</span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">{activeOrderCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Today&apos;s Orders</span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Online Paid</span>
          <p className="text-xl sm:text-2xl font-black text-blue-600">
            {orders.filter((o) => o.paymentMethod === "STRIPE" || o.paymentStatus === "Paid").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cash on Delivery</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">
            {orders.filter((o) => o.paymentMethod === "COD").length}
          </p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID, food name, customer..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.key === "ALL"
                ? orders.length
                : orders.filter((o) => (o.orderStatus || "Placed").toUpperCase() === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                  activeTab === tab.key ? "bg-[#FF6B35] text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === tab.key ? "bg-white/25" : "bg-gray-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button onClick={fetchOrders} className="underline font-bold text-rose-800 shrink-0 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Active Kitchen Orders</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || activeTab !== "ALL"
                ? "No active orders match your current search or filter tab."
                : "Active incoming orders will appear here automatically. Completed and delivered orders are moved to Sell History."}
            </p>
          </div>
          <Link
            href="/dashboard/restaurant/sell-history"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition cursor-pointer"
          >
            <span>View Completed Sell History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const orderId = order.orderId || order._id || "";
            const status = (order.orderStatus || "Placed").toLowerCase();
            const groupedItems = groupItemsByRestaurant(order.items || []);
            const totalItems = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
            const isActionLoading = actionLoadingId === orderId;
            const isCOD = order.paymentMethod === "COD";
            const isPaidOnline = order.paymentMethod === "STRIPE" || order.paymentStatus === "Paid";
            const canCancel = isCOD && !isPaidOnline && status === "placed";
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now";

            return (
              <div
                key={orderId}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm sm:text-base">#{orderId}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border ${getStatusBadgeClass(
                          order.orderStatus
                        )}`}
                      >
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus || "Placed"}
                      </span>

                      {/* Payment Method Badge */}
                      {order.paymentMethod === "COD" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200">
                          <Banknote className="w-3 h-3 text-amber-600" /> Cash on Delivery (COD)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                          <CreditCard className="w-3 h-3 text-emerald-600" /> Paid Online
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formattedDate}
                      </span>
                      <span>•</span>
                      <span className="text-gray-700 font-bold">
                        {totalItems} item{totalItems === 1 ? "" : "s"}
                      </span>
                      {order.userName && (
                        <>
                          <span>•</span>
                          <span className="text-gray-600 font-bold">👤 {order.userName}</span>
                        </>
                      )}
                      {order.riderInfo?.name && (
                        <>
                          <span>•</span>
                          <span className="text-[#FF6B35] font-extrabold">🛵 Rider: {order.riderInfo.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Right Live Track Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-extrabold border border-orange-200/60 transition cursor-pointer self-start sm:self-center shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Live Track & Details
                  </button>
                </div>

                {/* Items Breakdown */}
                <div className="p-5 sm:p-6 space-y-4">
                  {Object.entries(groupedItems).map(([rName, rItems]) => (
                    <div key={rName} className="space-y-2">
                      <div className="flex items-center gap-2 bg-orange-50/50 px-3 py-1.5 rounded-xl border border-orange-100/60">
                        <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
                        <span className="text-xs font-black text-gray-800">{rName}</span>
                        <span className="text-[10px] font-bold text-gray-400 ml-auto">{rItems.length} items</span>
                      </div>
                      <div className="divide-y divide-gray-100 pl-1">
                        {rItems.map((item, idx) => (
                          <div key={idx} className="py-2.5 first:pt-0 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">{item.name}</h4>
                              <p className="text-[11px] text-gray-400 font-medium">
                                Qty: {item.quantity} × ${(item.discountPrice || item.price).toFixed(2)}
                              </p>
                            </div>
                            <span className="text-xs font-black text-gray-900 shrink-0">
                              ${((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Order Total & Delivery Note */}
                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{order.deliveryAddress?.streetAddress || "Address on file"}</span>
                      {order.deliveryAddress?.phoneNumber && (
                        <a
                          href={`tel:${order.deliveryAddress.phoneNumber}`}
                          className="font-bold text-[#FF6B35] hover:underline ml-1"
                        >
                          ({order.deliveryAddress.phoneNumber})
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs text-gray-400">Total Bill:</span>
                      <span className="text-lg font-black text-[#FF6B35]">${(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    {order.paymentMethod === "COD" ? (
                      <span className="font-bold text-amber-700">💵 Rider collects cash on delivery</span>
                    ) : (
                      <span className="font-bold text-emerald-700">✓ Paid online — prepay complete</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    {/* Cancel Order Button — Only for COD + Placed status */}
                    {canCancel && (
                      cancelConfirmId === orderId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-600">Cancel this order?</span>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => cancelOrder(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-extrabold transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                          >
                            {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                            Confirm Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelConfirmId(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300 transition cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCancelConfirmId(orderId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold border border-rose-200 transition cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel Order
                        </button>
                      )
                    )}

                    {/* Step 1: Placed / Confirmed -> Preparing */}
                    {(status === "placed" || status === "confirmed") && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => updateStatus(order, "Preparing")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
                        Accept & Start Preparing
                      </button>
                    )}

                    {/* Step 2: Preparing -> Ready for Pickup */}
                    {status === "preparing" && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => updateStatus(order, "Ready")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                        Mark Food Ready for Pickup
                      </button>
                    )}

                    {/* Step 4: Ready -> Waiting */}
                    {(status === "ready" || status === "ready for pickup") && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-800 text-xs font-extrabold border border-sky-200">
                        <PackageCheck className="w-3.5 h-3.5" /> Ready • Waiting for Rider Pickup
                      </span>
                    )}

                    {/* Step 5: Out for delivery */}
                    {status === "out for delivery" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200">
                        <Bike className="w-3.5 h-3.5 animate-pulse text-amber-600" /> Rider En Route
                      </span>
                    )}

                    {/* Step 6: Delivered */}
                    {status === "delivered" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered Successfully
                      </span>
                    )}

                    {/* Cancelled */}
                    {status === "cancelled" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-800 text-xs font-extrabold border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Pagination Bar ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "...")[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                    acc.push("...");
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, idx) =>
                  page === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-xs text-gray-400 font-bold select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-9 h-9 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        currentPage === page
                          ? "bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white shadow-md shadow-orange-500/20"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              Next <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-gray-400 font-medium ml-2 hidden sm:inline">
              Page {currentPage} of {totalPages} ({filteredOrders.length} orders)
            </span>
          </div>
        )}
        </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* RESTAURANT LIVE ORDER TRACKING MODAL                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white relative shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="absolute right-5 top-5 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider">
                    Live Kitchen Tracker
                  </span>
                  <span className="text-sm sm:text-base font-black">
                    #{selectedOrder.orderId || selectedOrder._id}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Order Status & Delivery Journey
                </h3>
                <p className="text-orange-100 text-xs sm:text-sm">
                  Track cooking stages, customer delivery address, and live rider location on the map.
                </p>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 1. Visual Stepper */}
              <div className="bg-gray-50/80 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <OrderStatusStepper
                  currentStatus={selectedOrder.orderStatus}
                  cancelled={selectedOrder.orderStatus === "Cancelled"}
                />
              </div>

              {/* 2. Interactive Live Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#FF6B35]" /> Live Delivery Map
                  </h4>
                  {selectedOrder.orderStatus === "Out for Delivery" && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Rider Tracking Active
                    </span>
                  )}
                </div>
                <div className="h-[280px] sm:h-[340px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative shadow-inner">
                  <OrderTrackingMap
                    deliveryLat={
                      selectedOrder.deliveryAddress?.latitude ??
                      (selectedOrder.deliveryAddress as unknown as { lat?: number })?.lat
                    }
                    deliveryLng={
                      selectedOrder.deliveryAddress?.longitude ??
                      (selectedOrder.deliveryAddress as unknown as { lng?: number })?.lng
                    }
                    riderLat={
                      riderLiveCoords[selectedOrder.orderId || selectedOrder._id || ""]?.lat ??
                      selectedOrder.riderInfo?.latitude
                    }
                    riderLng={
                      riderLiveCoords[selectedOrder.orderId || selectedOrder._id || ""]?.lng ??
                      selectedOrder.riderInfo?.longitude
                    }
                    riderName={selectedOrder.riderInfo?.name}
                    active={selectedOrder.orderStatus === "Out for Delivery"}
                  />
                </div>
              </div>

              {/* 3. Three Columns Info (Customer, Rider, Payment) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Details */}
                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 space-y-2">
                  <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Customer Details
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {selectedOrder.deliveryAddress?.fullName || selectedOrder.userName || "Customer"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedOrder.deliveryAddress?.streetAddress || "Address on file"}
                  </p>
                  {selectedOrder.deliveryAddress?.phoneNumber && (
                    <a
                      href={`tel:${selectedOrder.deliveryAddress.phoneNumber}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Customer ({selectedOrder.deliveryAddress.phoneNumber})
                    </a>
                  )}
                </div>

                {/* Rider Details */}
                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-2">
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" /> Assigned Rider
                  </span>
                  {selectedOrder.riderInfo?.name ? (
                    <>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                        {selectedOrder.riderInfo.name}
                      </p>
                      {selectedOrder.riderInfo.vehicleNumber && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Vehicle: {selectedOrder.riderInfo.vehicleNumber}
                        </p>
                      )}
                      {selectedOrder.riderInfo.phone && (
                        <a
                          href={`tel:${selectedOrder.riderInfo.phone}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:underline pt-1"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Rider ({selectedOrder.riderInfo.phone})
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 font-medium">
                      {(selectedOrder.orderStatus || "").toLowerCase() === "ready"
                        ? "Food is ready. Waiting for a nearby rider to accept pickup."
                        : "Rider will be assigned once food is ready."}
                    </p>
                  )}
                </div>

                {/* Payment Info */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Payment & Billing
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Method:</span>
                    <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                      {selectedOrder.paymentMethod === "COD" ? "Cash on Delivery" : "Online (Card/Stripe)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Payment Status:</span>
                    <span
                      className={`text-xs font-black ${
                        selectedOrder.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {selectedOrder.paymentStatus || (selectedOrder.paymentMethod === "COD" ? "Pending" : "Paid")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total Amount:</span>
                    <span className="text-sm font-black text-emerald-600">
                      ${(selectedOrder.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Ordered Items Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Kitchen Order Items</h4>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 divide-y divide-gray-200/60 dark:divide-gray-700">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-[11px] text-gray-400">Qty: {item.quantity} × ${(item.discountPrice || item.price).toFixed(2)}</p>
                      </div>
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        ${((item.discountPrice || item.price) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Kitchen Actions */}
            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs font-bold text-gray-500">
                Current Kitchen Stage:{" "}
                <strong className="text-gray-900 dark:text-white uppercase">{selectedOrder.orderStatus || "Placed"}</strong>
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {((selectedOrder.orderStatus || "").toLowerCase() === "placed" || (selectedOrder.orderStatus || "").toLowerCase() === "confirmed") && (
                  <button
                    type="button"
                    disabled={actionLoadingId === (selectedOrder.orderId || selectedOrder._id)}
                    onClick={() => updateStatus(selectedOrder, "Preparing")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                  >
                    {actionLoadingId === (selectedOrder.orderId || selectedOrder._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChefHat className="w-3.5 h-3.5" />
                    )}
                    Accept & Start Preparing
                  </button>
                )}

                {(selectedOrder.orderStatus || "").toLowerCase() === "preparing" && (
                  <button
                    type="button"
                    disabled={actionLoadingId === (selectedOrder.orderId || selectedOrder._id)}
                    onClick={() => updateStatus(selectedOrder, "Ready")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                  >
                    {actionLoadingId === (selectedOrder.orderId || selectedOrder._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="w-3.5 h-3.5" />
                    )}
                    Mark Food Ready for Pickup
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-300 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}