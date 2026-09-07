"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  Bike,
  CheckCircle2,
  Phone,
  Truck,
  AlertTriangle,
  Navigation,
  LocateFixed,
  Route,
  User,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRiderOrdersApi, updateOrderStatusApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { TOrder } from "@/types/order";

function getRiderProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foodflow_rider_data");
    return raw
      ? (JSON.parse(raw) as { userId?: string; name?: string; phone?: string; vehicleNumber?: string; _id?: string })
      : null;
  } catch {
    return null;
  }
}

const DEFAULT_START: [number, number] = [23.8103, 90.4125];

function formatMoney(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function ActiveDelivery() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Live location sharing
  const [sharing, setSharing] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const riderProfile = getRiderProfile();

  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    const res = await getRiderOrdersApi(user.id, user.email, { mode: "active" });
    if (res.success && Array.isArray(res.data)) {
      setOrders(res.data as TOrder[]);
    } else {
      setOrders([]);
      if (res.message) setError(res.message);
    }
    setLoading(false);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionPending && user?.id) fetchOrders();
  }, [sessionPending, user?.id, fetchOrders]);

  // Current active order = first Out for Delivery assigned to me, else nearest
  const activeOrder = useMemo(
    () => orders.find((o) => o.orderStatus === "Out for Delivery") || orders[0] || null,
    [orders]
  );

  // Socket: join active order room + emit simulated locations when sharing
  const activeOrderId = activeOrder?.orderId || activeOrder?._id || "";

  useEffect(() => {
    if (!user?.id || sessionPending) return;

    const socket = getOrderSocket("rider_" + (user.id || "unknown"));
    joinOrderRoom("rider_" + (user.id || "unknown"));
    if (activeOrderId) joinOrderRoom(activeOrderId);
    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      joinOrderRoom("rider_" + (user.id || "unknown"));
      if (activeOrderId) joinOrderRoom(activeOrderId);
    };
    const onDisconnect = () => setSocketConnected(false);

    const onStatusUpdated = (payload: { orderId?: string; orderStatus?: string; status?: string }) => {
      const orderId = payload?.orderId;
      const newStatus = payload?.orderStatus || payload?.status;
      if (!orderId || !newStatus) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus as TOrder["orderStatus"] } : o
        )
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
  }, [sessionPending, user?.id, activeOrderId]);

  // Clean socket connection when component unmounts
  useEffect(() => () => disconnectOrderSocket(), []);

  // ─── Simulate / Share Live Location ──────────────────────────
  const emitLocation = useCallback(
    (payload: { lat: number; lng: number; immediate: boolean }) => {
      if (!activeOrderId || !user?.id) return;
      const socket = getOrderSocket(activeOrderId);
      socket.emit("update_rider_location", {
        orderId: activeOrderId,
        riderId: user.id,
        riderName: riderProfile?.name || user.name || "Delivery Partner",
        vehicleNumber: riderProfile?.vehicleNumber,
        lat: payload.lat,
        lng: payload.lng,
        latitude: payload.lat,
        longitude: payload.lng,
        immediate: payload.immediate,
      });
    },
    [activeOrderId, user?.id, user?.name, riderProfile?.name, riderProfile?.vehicleNumber]
  );

  useEffect(() => {
    if (!sharing || !activeOrderId) return;

    // Emit once immediately, then move the marker on an interval
    emitLocation({ lat: DEFAULT_START[0], lng: DEFAULT_START[1], immediate: true });

    const interval = window.setInterval(() => {
      setSimulatedLocation((prev) => {
        const base = prev || { lat: DEFAULT_START[0], lng: DEFAULT_START[1] };
        const lat = base.lat + (Math.random() - 0.5) * 0.0012;
        const lng = base.lng + (Math.random() - 0.5) * 0.0012;
        emitLocation({ lat, lng, immediate: false });
        return { lat, lng };
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [sharing, activeOrderId, emitLocation]);

  // Stop sharing when delivery completes or component unmounts
  useEffect(() => {
    if (activeOrder?.orderStatus === "Delivered" && sharing) setSharing(false);
  }, [activeOrder?.orderStatus, sharing]);

  // ─── Status Progression Actions ─────────────────────────────
  const updateStatus = async (order: TOrder, newStatus: string) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id) return;
    try {
      setActionLoadingId(orderId);
      const res = await updateOrderStatusApi(orderId, { orderStatus: newStatus }, user.id, user.email || "");
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus as TOrder["orderStatus"] } : o
          )
        );
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", { orderId, orderStatus: newStatus });
      }
    } catch (err) {
      console.error("Rider status update failed:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (sessionPending || loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  const order = activeOrder;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Bike className="w-3.5 h-3.5 text-white" /> Active Delivery
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Your Current Delivery</h1>
            <p className="text-orange-100 text-sm mt-1">
              Start the delivery, share your live location, and mark it delivered on arrival.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold border border-white/20">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-white/50"}`} />
              {socketConnected ? "Socket Connected" : "Offline"}
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

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button onClick={fetchOrders} className="underline font-bold text-rose-800 shrink-0 cursor-pointer">Retry</button>
        </div>
      )}

      {!order ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Active Delivery</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You don&apos;t have any active delivery right now. Browse available deliveries to accept the next order.
            </p>
          </div>
          <Link
            href="/dashboard/rider/delivery-details"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition"
          >
            <span>Browse Available Deliveries</span>
            <Route className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Active Delivery Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-gray-900 text-base">#{order.orderId || order._id}</span>
                  {order.orderStatus === "Out for Delivery" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                      <Bike className="w-3.5 h-3.5" /> Out for Delivery
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {order.orderStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  {(order.items || []).length} items • {(order.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} total quantity • {formatMoney(order.totalAmount)}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Customer</h4>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">{order.deliveryAddress?.fullName || order.userName || "Customer"}</p>
                </div>
                {order.deliveryAddress?.phoneNumber && (
                  <a href={`tel:${order.deliveryAddress.phoneNumber}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline">
                    <Phone className="w-3.5 h-3.5" /> {order.deliveryAddress.phoneNumber}
                  </a>
                )}
              </div>

              {/* Pickup */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Pickup</h4>
                <p className="text-xs font-bold text-gray-800">{order.items?.[0]?.restaurantName || "FoodFlow Kitchen"}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {(order.items || []).slice(0, 4).map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  {(order.items || []).length > 4 ? "..." : ""}
                </p>
              </div>

              {/* Dropoff */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Dropoff</h4>
                <p className="text-xs font-bold text-gray-800">{order.deliveryAddress?.streetAddress || "On file"}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {[order.deliveryAddress?.area, order.deliveryAddress?.postalCode, order.deliveryAddress?.deliveryInstructions].filter(Boolean).join(" • ")}
                </p>
              </div>
            </div>

            {/* Live Map */}
            <div className="px-5 sm:px-6 pb-2">
              <div className="h-[300px] rounded-2xl overflow-hidden border border-gray-100 relative">
                <OrderTrackingMap
                  deliveryLat={undefined}
                  deliveryLng={undefined}
                  riderLat={simulatedLocation?.lat}
                  riderLng={simulatedLocation?.lng}
                  riderName={riderProfile?.name || user?.name}
                  active
                />
              </div>
            </div>

            {/* Location Sharing Toggle */}
            <div className="p-5 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${sharing ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                  {sharing ? <LocateFixed className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Share Live Location</h4>
                  <p className="text-[11px] font-medium text-gray-400">
                    {sharing
                      ? `Streaming simulated coordinates every 3s ${simulatedLocation ? `(${simulatedLocation.lat.toFixed(5)}, ${simulatedLocation.lng.toFixed(5)})` : ""}`
                      : `Emits update_rider_location to keep the customer updated`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharing((s) => !s)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer ${sharing
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white hover:brightness-110"
                  }`}
              >
                {sharing ? (
                  <>
                    <LocateFixed className="w-4 h-4" /> Stop Sharing
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" /> Share Live Location
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="p-5 sm:p-6 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-gray-400">
                {order.orderStatus === "Out for Delivery" ? "Customer is tracking your live position." : "Start the trip to update your customer."}
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Out for Delivery (picked up & started trip) — shown always while active */}
                {order.orderStatus !== "Delivered" && (
                  <button
                    type="button"
                    disabled={actionLoadingId === (order.orderId || order._id)}
                    onClick={() => updateStatus(order, "Out for Delivery")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                  >
                    {actionLoadingId === (order.orderId || order._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Bike className="w-3.5 h-3.5" />
                    )}
                    Out for Delivery
                  </button>
                )}

                {/* Mark Delivered */}
                {order.orderStatus !== "Delivered" ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === (order.orderId || order._id)}
                    onClick={() => updateStatus(order, "Delivered")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
                  >
                    {actionLoadingId === (order.orderId || order._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Mark Delivered
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cease simulation on delivered note */}
          {sharing && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Live location sharing is active — customers can see your simulated marker moving on their tracking page.
            </div>
          )}
        </>
      )}
    </div>
  );
}