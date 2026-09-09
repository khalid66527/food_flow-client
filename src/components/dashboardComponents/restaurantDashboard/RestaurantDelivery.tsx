"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
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
  Navigation,
  Eye,
  X,
  CreditCard,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRestaurantOrdersApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import { TOrder } from "@/types/order";
import OrderStatusStepper from "@/components/tracking/OrderStatusStepper";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";

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

  // Live Tracking Modal
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [riderLiveCoords, setRiderLiveCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  const profile = getRestaurantProfile();

  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    const res = await getRestaurantOrdersApi(user.id, user.email, {
      restaurantId: profile?._id,
      restaurantName: profile?.restaurantName,
      status: "Ready,Ready for Pickup,Out for Delivery,Delivered",
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

  // Keep selected order updated
  useEffect(() => {
    if (selectedOrder) {
      const match = orders.find(
        (o) => (o.orderId && o.orderId === selectedOrder.orderId) || (o._id && o._id === selectedOrder._id)
      );
      if (match) setSelectedOrder(match);
    }
  }, [orders, selectedOrder]);

  // Socket: listen for out-for-delivery / completion updates & live coordinates
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

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        o.orderId?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name.toLowerCase().includes(q)) ||
        o.riderInfo?.name?.toLowerCase().includes(q) ||
        o.deliveryAddress?.fullName?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Live Delivery Tracking</h1>
            <p className="text-orange-100 text-sm mt-1">
              Follow dispatched orders, rider live GPS locations, and delivery handoffs in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold border border-white/20">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-white/50"}`} />
              {socketConnected ? "Live GPS Sync" : "Offline"}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active On Road</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{dispatched}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed Deliveries</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">{delivered}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Handled</span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">{orders.length}</p>
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
            placeholder="Search order ID, customer, rider..."
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
              Orders that are marked ready for pickup, out for delivery, or delivered will appear here.
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

                      {order.paymentMethod === "COD" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200">
                          <Banknote className="w-3 h-3 text-amber-600" /> COD
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                          <CreditCard className="w-3 h-3 text-emerald-600" /> Paid Online
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formattedDate}</span>
                      <span>•</span>
                      <span className="text-gray-700 font-bold">{totalItems} items</span>
                      <span>•</span>
                      <span className="text-gray-600 font-bold">{itemsPreview}{order.items && order.items.length > 3 ? "..." : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <span className="text-lg font-black text-[#FF6B35]">${(order.totalAmount || 0).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-extrabold border border-orange-200/60 transition cursor-pointer shrink-0"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Live Track
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Delivery Address */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" /> Delivery To
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">{order.deliveryAddress?.fullName || order.userName || "Customer"}</p>
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
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Payment Status
                    </h4>
                    <p className="text-xs font-bold text-gray-800">
                      {order.paymentMethod === "STRIPE" ? "Card (Paid Online)" : "Cash on Delivery (COD)"}
                    </p>
                    <p className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${order.paymentStatus === "Paid" || isDelivered ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                      {order.paymentStatus === "Paid" || isDelivered ? "Payment Received" : "Pending Cash Collection"}
                    </p>
                  </div>

                  {/* Rider */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#FF6B35]" /> Assigned Rider
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
                              <Phone className="w-3 h-3" /> Call Rider
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

      {/* Live Order Tracking Modal */}
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
                    Live Delivery Journey
                  </span>
                  <span className="text-sm sm:text-base font-black">
                    #{selectedOrder.orderId || selectedOrder._id}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Trip Tracking & Map View
                </h3>
                <p className="text-orange-100 text-xs sm:text-sm">
                  Real-time rider coordinates and delivery progression.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stepper */}
              <div className="bg-gray-50/80 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <OrderStatusStepper
                  currentStatus={selectedOrder.orderStatus}
                  cancelled={selectedOrder.orderStatus === "Cancelled"}
                />
              </div>

              {/* Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#FF6B35]" /> GPS Live View
                  </h4>
                  {selectedOrder.orderStatus === "Out for Delivery" && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Streaming Location
                    </span>
                  )}
                </div>
                <div className="h-[300px] sm:h-[360px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative shadow-inner">
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

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 space-y-2">
                  <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Customer
                  </span>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {selectedOrder.deliveryAddress?.fullName || selectedOrder.userName || "Customer"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedOrder.deliveryAddress?.streetAddress}
                  </p>
                  {selectedOrder.deliveryAddress?.phoneNumber && (
                    <a
                      href={`tel:${selectedOrder.deliveryAddress.phoneNumber}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call ({selectedOrder.deliveryAddress.phoneNumber})
                    </a>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-2">
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" /> Rider
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
                          <Phone className="w-3.5 h-3.5" /> Call ({selectedOrder.riderInfo.phone})
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 font-medium">No rider assigned yet</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Payment
                  </span>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {selectedOrder.paymentMethod === "COD" ? "Cash on Delivery" : "Paid Online"}
                  </p>
                  <p className="text-sm font-black text-emerald-600">
                    ${(selectedOrder.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}