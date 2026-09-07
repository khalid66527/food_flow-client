"use client";

import React, { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRestaurantOrdersApi, updateOrderStatusApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

type TTab = "ALL" | "PLACED" | "CONFIRMED" | "PREPARING" | "READY" | "OUT FOR DELIVERY" | "DELIVERED";

const TABS: { key: TTab; label: string; icon: React.ElementType }[] = [
  { key: "ALL", label: "All Orders", icon: Receipt },
  { key: "PLACED", label: "New", icon: Clock },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "READY", label: "Ready", icon: PackageCheck },
  { key: "OUT FOR DELIVERY", label: "Dispatched", icon: Bike },
  { key: "DELIVERED", label: "Completed", icon: CheckCircle2 },
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
      setOrders(res.data as TOrder[]);
    } else {
      setOrders([]);
      if (res.message) setError(res.message);
    }
    setLoading(false);
  }, [user?.id, user?.email, profile?._id, profile?.restaurantName]);

  useEffect(() => {
    if (!sessionPending && user?.id) fetchOrders();
  }, [sessionPending, user?.id, fetchOrders]);

  // Socket: listen for real-time order status updates
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

    const onStatusUpdated = (payload: { orderId?: string; orderStatus?: string; status?: string; restaurantStatus?: string }) => {
      const orderId = payload?.orderId;
      const newStatus = payload?.orderStatus || payload?.status;
      if (!orderId || !newStatus) return;
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus as TOrder["orderStatus"] } : o))
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order_status_updated", onStatusUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order_status_updated", onStatusUpdated);
    };
  }, [sessionPending, user?.id]);

  useEffect(() => () => disconnectOrderSocket(), []);

  // ─── Status progression actions ──────────────────────────────
  const updateStatus = async (order: TOrder, newStatus: string) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id) return;
    try {
      setActionLoadingId(orderId);
      const res = await updateOrderStatusApi(orderId, { orderStatus: newStatus }, user.id, user.email || "");
      if (res.success) {
        setOrders((prev) => prev.map((o) => (o.orderId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus as TOrder["orderStatus"] } : o)));
        // Broadcast to customer tracking pages via socket
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", { orderId, orderStatus: newStatus });
      }
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── Filtering ───────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.orderId?.toLowerCase().includes(q) ||
      o.items?.some((i) => i.name.toLowerCase().includes(q)) ||
      o.userName?.toLowerCase().includes(q);
    const s = (o.orderStatus || "Placed").toUpperCase();
    const matchesTab = activeTab === "ALL" || s === activeTab.toUpperCase();
    return matchesSearch && matchesTab;
  });

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
              <Store className="w-3.5 h-3.5 text-white" /> Kitchen Orders
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {profile?.restaurantName || "Your Restaurant"} Orders
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Manage incoming orders and update kitchen status in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold border border-white/20">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-white/50"}`} />
              {socketConnected ? "Live" : "Offline"}
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Orders</span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">{activeOrderCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Today&apos;s Orders</span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">{todayCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue (All)</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            ${orders.filter((o) => o.orderStatus === "Delivered").reduce((s, o) => s + (o.totalAmount || 0), 0).toFixed(2)}
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
            placeholder="Search order ID, food name, or customer..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === "ALL" ? orders.length : orders.filter((o) => (o.orderStatus || "Placed").toUpperCase() === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer shrink-0 ${activeTab === tab.key ? "bg-[#FF6B35] text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === tab.key ? "bg-white/25" : "bg-gray-200"}`}>
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
          <button onClick={fetchOrders} className="underline font-bold text-rose-800 shrink-0 cursor-pointer">Retry</button>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Orders Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || activeTab !== "ALL"
                ? "No orders match your current search or filter."
                : "No orders received yet. Orders will appear here as customers place them."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const orderId = order.orderId || order._id || "";
            const status = (order.orderStatus || "Placed").toLowerCase();
            const groupedItems = groupItemsByRestaurant(order.items || []);
            const totalItems = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
            const isActionLoading = actionLoadingId === orderId;
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Just now";

            return (
              <div key={orderId} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm sm:text-base">#{orderId}</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border ${getStatusBadgeClass(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus || "Placed"}
                      </span>
                      {order.paymentMethod === "COD" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">COD</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formattedDate}</span>
                      <span>•</span>
                      <span className="text-gray-700 font-bold">{totalItems} item{totalItems === 1 ? "" : "s"}</span>
                      {order.userName && (
                        <>
                          <span>•</span>
                          <span className="text-gray-600 font-bold">👤 {order.userName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items */}
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
                              <p className="text-[11px] text-gray-400 font-medium">Qty: {item.quantity} × ${(item.discountPrice || item.price).toFixed(2)}</p>
                            </div>
                            <span className="text-xs font-black text-gray-900 shrink-0">${((item.discountPrice || item.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Order Total */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Delivery: {order.deliveryFee ? `$${order.deliveryFee.toFixed(2)}` : "Free"}
                    </span>
                    <span className="text-lg font-black text-[#FF6B35]">${(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">
                    Delivery: {order.deliveryAddress?.streetAddress || "Address on file"}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    {status === "placed" && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => updateStatus(order, "Confirmed")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Confirm Order
                      </button>
                    )}

                    {status === "confirmed" && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => updateStatus(order, "Preparing")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
                        Start Preparing
                      </button>
                    )}

                    {(status === "preparing") && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => updateStatus(order, "Ready")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                      >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                        Mark Ready for Pickup
                      </button>
                    )}

                    {status === "out for delivery" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                        <Bike className="w-3.5 h-3.5 animate-pulse" /> Rider En Route
                      </span>
                    )}

                    {status === "delivered" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                      </span>
                    )}

                    {status === "cancelled" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-extrabold border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}