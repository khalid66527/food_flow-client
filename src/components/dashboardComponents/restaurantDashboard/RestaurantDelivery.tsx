"use client";

import React, { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  RefreshCw,
  Bike,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  Banknote,
  User,
  Search,
  Truck,
  Package,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRestaurantOrdersApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import { TOrder } from "@/types/order";

function getRestaurantProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foodflow_restaurant_data");
    return raw ? (JSON.parse(raw) as { _id?: string; restaurantName?: string }) : null;
  } catch {
    return null;
  }
}

export default function RestaurantDelivery() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string } | undefined;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const profile = getRestaurantProfile();

  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    const res = await getRestaurantOrdersApi(user.id, user.email, {
      restaurantId: profile?._id,
      restaurantName: profile?.restaurantName,
      status: "Ready,Out for Delivery,Delivered",
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

  // Socket: listen for out-for-delivery / completion updates
  useEffect(() => {
    if (!user?.id || sessionPending) return;

    const socket = getOrderSocket("restaurant_delivery_" + (user.id || "unknown"));
    joinOrderRoom("restaurant_" + (user.id || "unknown"));
    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      joinOrderRoom("restaurant_" + (user.id || "unknown"));
    };
    const onDisconnect = () => setSocketConnected(false);

    const onStatusUpdated = (payload: { orderId?: string; orderStatus?: string; status?: string }) => {
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

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      o.orderId?.toLowerCase().includes(q) ||
      o.items?.some((i) => i.name.toLowerCase().includes(q)) ||
      o.riderInfo?.name?.toLowerCase().includes(q)
    );
  });

  const dispatched = orders.filter((o) => o.orderStatus === "Out for Delivery").length;
  const delivered = orders.filter((o) => o.orderStatus === "Delivered").length;

  if (sessionPending || loading) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Truck className="w-3.5 h-3.5 text-white" /> Outgoing Deliveries
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Delivery Tracking</h1>
            <p className="text-orange-100 text-sm mt-1">
              Follow dispatched orders and assigned riders from pickup to dropped off.
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
              title="Refresh deliveries"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Deliveries</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{dispatched}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed Today</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">{delivered}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order, food, or rider..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button onClick={fetchOrders} className="underline font-bold text-rose-800 shrink-0 cursor-pointer">Retry</button>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Dispatched Orders</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Orders that are ready for pickup, out for delivery, or delivered will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const orderId = order.orderId || order._id || "";
            const totalItems = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
            const itemsPreview = (order.items || []).slice(0, 3).map((i) => i.name).join(", ");
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Recent";

            const isDelivered = order.orderStatus === "Delivered";

            return (
              <div key={orderId} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm sm:text-base">#{orderId}</span>
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                          <Bike className="w-3.5 h-3.5 text-amber-600" /> Out for Delivery
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formattedDate}</span>
                      <span>•</span>
                      <span className="text-gray-700 font-bold">{totalItems} items</span>
                      <span>•</span>
                      <span className="text-gray-600 font-bold">{itemsPreview}{order.items && order.items.length > 3 ? "..." : ""}</span>
                    </div>
                  </div>

                  <span className="text-lg font-black text-[#FF6B35]">${(order.totalAmount || 0).toFixed(2)}</span>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Delivery Address */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" /> Delivery To
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">{order.deliveryAddress?.fullName || "Customer"}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.building, order.deliveryAddress?.area].filter(Boolean).join(", ")}
                    </p>
                    {order.deliveryAddress?.phoneNumber && (
                      <a href={`tel:${order.deliveryAddress.phoneNumber}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline">
                        <Phone className="w-3.5 h-3.5" /> {order.deliveryAddress.phoneNumber}
                      </a>
                    )}
                  </div>

                  {/* Payment */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Payment
                    </h4>
                    <p className="text-xs font-bold text-gray-800">
                      {order.paymentMethod === "STRIPE" ? "Card (Paid Online)" : "Cash on Delivery"}
                    </p>
                    <p className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                      order.paymentStatus === "Paid" || isDelivered ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {order.paymentStatus === "Paid" || isDelivered ? "Paid" : "Pending"}
                    </p>
                  </div>

                  {/* Rider */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#FF6B35]" /> Rider
                    </h4>
                    {order.riderInfo?.name ? (
                      <>
                        <p className="text-xs sm:text-sm font-bold text-gray-800">{order.riderInfo.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          {order.riderInfo.vehicleNumber && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-600">
                              <Package className="w-3 h-3 text-gray-400" /> {order.riderInfo.vehicleNumber}
                            </span>
                          )}
                          {order.riderInfo.phone && (
                            <a href={`tel:${order.riderInfo.phone}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition">
                              <Phone className="w-3 h-3" /> Call
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-gray-400 font-medium">No rider assigned yet</p>
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