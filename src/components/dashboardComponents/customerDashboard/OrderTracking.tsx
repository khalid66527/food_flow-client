"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Bike,
  Phone,
  MapPin,
  RefreshCw,
  Store,
  Wallet,
  ShoppingBag,
  Clock,
  DraftingCompass,
  UtensilsCrossed,
  Layers,
  ChevronRight,
  Navigation,
  ArrowRight
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getOrderByIdApi, getUserOrdersApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import OrderStatusStepper, { resolveStepIndex } from "@/components/tracking/OrderStatusStepper";

import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { TOrder } from "@/types/order";

interface OrderStatusUpdateEvent {
  orderId?: string;
  orderStatus?: string;
  status?: string;
  statusText?: string;
  restaurantStatus?: string;
  order?: TOrder;
}

interface RiderLocationEvent {
  orderId?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  riderId?: string;
  riderName?: string;
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  deliveryAddress?: { latitude?: number; longitude?: number };
  restaurantAddress?: { latitude?: number; longitude?: number };
}

interface RiderLocationState {
  lat: number;
  lng: number;
  riderName?: string;
  riderId?: string;
  phone?: string;
  vehicleNumber?: string;
}

// Robust check for active (in-progress) order statuses.
// Excludes orders that are completed, delivered, or cancelled.
export function isOrderActive(orderStatus?: string): boolean {
  if (!orderStatus) return true; // Default/newly placed orders are active
  const s = orderStatus.toLowerCase().trim();
  if (
    s === "delivered" ||
    s === "completed" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "rejected" ||
    s === "failed"
  ) {
    return false;
  }
  return true;
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function readLocationPayload(payload: RiderLocationEvent | null): RiderLocationState | null {
  if (!payload) return null;
  const lat = toNumber(payload.latitude ?? payload.lat ?? payload.deliveryLatitude);
  const lng = toNumber(payload.longitude ?? payload.lng ?? payload.deliveryLongitude);
  if (!lat || !lng) return null;
  return {
    lat,
    lng,
    riderName: payload.riderName || payload.name,
    riderId: payload.riderId,
    phone: payload.phone,
    vehicleNumber: payload.vehicleNumber,
  };
}

export default function OrderTracking() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();

  const user = session?.user;
  const userId = user?.id;
  const userEmail = user?.email;

  const rawParamId = params?.orderId as string;
  const explicitOrderId =
    (rawParamId && rawParamId !== "N/A" ? rawParamId : null) ||
    searchParams.get("orderId") ||
    searchParams.get("id");

  const [viewMode, setViewMode] = useState<"list" | "detail">(
    explicitOrderId ? "detail" : "list"
  );
  const [order, setOrder] = useState<TOrder | null>(null);
  const [activeOrders, setActiveOrders] = useState<TOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(explicitOrderId || null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocationState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Derive active view mode and target tracking ID
  const isListView = viewMode === "list" || (!explicitOrderId && !selectedOrderId);
  const activeTrackId = isListView ? null : (selectedOrderId || explicitOrderId);

  // Sync selectedOrderId and viewMode when explicitOrderId changes in URL
  useEffect(() => {
    if (explicitOrderId) {
      setSelectedOrderId(explicitOrderId);
      setViewMode("detail");
    } else if (!selectedOrderId) {
      setViewMode("list");
    }
  }, [explicitOrderId, selectedOrderId]);

  // Fetch data for initial card list view (Step 1) or specific detailed view (Step 2)
  const fetchOrderData = useCallback(async () => {
    if (sessionPending) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user's active orders (for initial card list view or fallback)
      if (userId && userEmail) {
        const userOrdersRes = await getUserOrdersApi(userId, userEmail);
        if (userOrdersRes.success && Array.isArray(userOrdersRes.data)) {
          const allOrders = userOrdersRes.data as TOrder[];
          const liveOrders = allOrders.filter((o) => isOrderActive(o.orderStatus));
          setActiveOrders(liveOrders);
        }
      }

      // 2. Fetch specific order details if tracking a target ID (Step 2)
      if (activeTrackId) {
        const res = await getOrderByIdApi(activeTrackId, userId, userEmail);
        if (res.success && res.data) {
          setOrder(res.data as TOrder);
        } else {
          setError(res.message || "Could not load specified order details.");
          setOrder(null);
        }
      } else {
        // Step 1 initial state: No specific order ID tracked yet
        setOrder(null);
      }
    } catch (err: any) {
      console.error("Failed to load order tracking data:", err);
      setError(err.message || "Failed to load order tracking information.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [activeTrackId, userId, userEmail, sessionPending]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  // Transition from Step 1 (Card List View) -> Step 2 (Detailed Tracking View)
  const handleTrackOrderClick = (targetId: string) => {
    setViewMode("detail");
    setSelectedOrderId(targetId);
    setLoading(true);
    setLiveStatus(null);
    setRiderLocation(null);
    setError(null);
    router.push(`/dashboard/customer/order-tracking?orderId=${targetId}`);
  };

  // Transition from Step 2 (Detailed View) -> Step 1 (Active Order Cards List View)
  const handleBackToCardList = () => {
    setViewMode("list");
    setSelectedOrderId(null);
    setOrder(null);
    setLiveStatus(null);
    setRiderLocation(null);
    setError(null);
    router.replace("/dashboard/customer/order-tracking");
  };

  // Socket.IO real-time order & rider location tracking
  useEffect(() => {
    if (!activeTrackId || sessionPending) return;

    const socket = getOrderSocket(activeTrackId);
    joinOrderRoom(activeTrackId);
    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      joinOrderRoom(activeTrackId);
    };
    const onDisconnect = () => setConnected(false);

    const onStatusUpdated = (payload: OrderStatusUpdateEvent) => {
      if (payload?.order && payload.order.orderStatus) {
        setOrder(payload.order as TOrder);
      }
      const newStatus =
        payload?.orderStatus || payload?.status || payload?.statusText || null;
      if (newStatus) {
        setLiveStatus(newStatus);
        const location = readLocationPayload(payload as unknown as RiderLocationEvent);
        if (location) setRiderLocation(location);

        if (!isOrderActive(newStatus)) {
          const updatedId = payload.orderId || payload.order?._id || payload.order?.orderId;
          if (updatedId) {
            setActiveOrders((prev) =>
              prev.filter((o) => (o._id || o.orderId || o.id) !== updatedId)
            );
          }
        }
      }
    };

    const onLocationUpdated = (payload: RiderLocationEvent) => {
      const rider = readLocationPayload(payload);
      if (rider) setRiderLocation(rider);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order_status_updated", onStatusUpdated);
    socket.on("location_updated", onLocationUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order_status_updated", onStatusUpdated);
      socket.off("location_updated", onLocationUpdated);
    };
  }, [activeTrackId, sessionPending]);

  useEffect(() => {
    return () => disconnectOrderSocket();
  }, []);

  const currentStatus = liveStatus || order?.orderStatus || "Pending";
  const isCancelled = currentStatus.toLowerCase() === "cancelled";

  // Loading state (initial data fetch)
  if (loading && !order && activeTrackId) {
    return (
      <div className="max-w-4xl mx-auto min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  // ===========================================================================
  // STEP 1: INITIAL STATE — ACTIVE ORDERS CARD LIST VIEW
  // (Rendered when user clicks "Order Tracking" in sidebar with NO orderId query)
  // ===========================================================================
  if (!activeTrackId) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/customer/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Orders
          </Link>
          <button
            type="button"
            onClick={fetchOrderData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        {/* Initial Loading Spinner for Active Orders List */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size={50} color="#f97316" />
          </div>
        ) : activeOrders.length === 0 ? (
          /* EMPTY STATE: NO ACTIVE ORDERS FOUND */
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-md">
              <Bike className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-gray-900">No Active Orders Found</h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                You don&apos;t have any live food orders currently being prepared or delivered right now.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white font-extrabold text-xs shadow-md hover:bg-orange-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4" /> Browse Restaurants
              </Link>
              <Link
                href="/dashboard/customer/orders"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-xs hover:bg-gray-200 transition cursor-pointer"
              >
                View Order History
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE ORDERS CARD CONTAINER */
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-orange-600" /> Active Orders in Progress ({activeOrders.length})
                </h1>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  Select an active order card below to view its live progress bar and map location.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {activeOrders.map((o) => {
                const oId = o._id || o.id || o.orderId || "";
                const displayId = o.orderId || oId;
                const statusStr = o.orderStatus || "Pending";
                const rNames = [...new Set((o.items || []).map((i) => i.restaurantName).filter(Boolean))].join(", ") || "FoodFlow Kitchen";
                const itemCount = (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

                return (
                  <div
                    key={oId}
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-gray-900">
                          Order #{displayId.slice(-6).toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          {statusStr}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{rNames}</p>
                      <p className="text-xs font-medium text-gray-500">
                        {itemCount} item{itemCount === 1 ? "" : "s"} • Tk {o.totalAmount?.toFixed(2)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTrackOrderClick(oId)}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer"
                    >
                      <Bike className="w-4 h-4 text-white" />
                      Track Order
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ===========================================================================
  // STEP 2: TRANSITION & DETAILS VIEW — SPECIFIC ORDER DETAILED TRACKING VIEW
  // (Rendered when user clicks "Track Order" on a card or arrives via ?orderId=...)
  // ===========================================================================

  if (error && !order) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <button
          type="button"
          onClick={handleBackToCardList}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </button>

        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">Order Not Found</h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={handleBackToCardList}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Active Orders
          </button>
        </div>
      </div>
    );
  }

  // Delivery / restaurant coordinates
  const deliveryLat = toNumber(
    (order as TOrder & { deliveryLatitude?: unknown })?.deliveryLatitude ??
    (order as { deliveryAddress?: { latitude?: unknown } })?.deliveryAddress?.latitude
  );
  const deliveryLng = toNumber(
    (order as TOrder & { deliveryLongitude?: unknown })?.deliveryLongitude ??
    (order as { deliveryAddress?: { longitude?: unknown } })?.deliveryAddress?.longitude
  );
  const restaurantLat = toNumber(
    (order as TOrder & { restaurantLatitude?: unknown })?.restaurantLatitude ??
    (order as { restaurantAddress?: { latitude?: unknown } })?.restaurantAddress?.latitude
  );
  const restaurantLng = toNumber(
    (order as TOrder & { restaurantLongitude?: unknown })?.restaurantLongitude ??
    (order as { restaurantAddress?: { longitude?: unknown } })?.restaurantAddress?.longitude
  );

  const riderLat = riderLocation?.lat;
  const riderLng = riderLocation?.lng;

  const statusIndex = resolveStepIndex(currentStatus);
  const isAssigned =
    currentStatus.toLowerCase() === "out for delivery" ||
    Boolean(riderLocation) ||
    currentStatus.toLowerCase() === "delivered";

  const completed = currentStatus.toLowerCase() === "delivered";
  const hasCoordinates = Boolean(
    deliveryLat || deliveryLng || restaurantLat || restaurantLng || riderLat || riderLng
  );

  const city = order?.deliveryAddress?.area || order?.deliveryAddress?.postalCode || "";
  const restaurantNames = [...new Set((order?.items || []).map((i) => i.restaurantName).filter(Boolean))];
  const totalItems = (order?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
  const displayOrderId = order?.orderId || order?._id || order?.id || activeTrackId || "N/A";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Seamless Back Button to Card List View */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackToCardList}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-gray-700 hover:text-orange-600 transition bg-white px-3.5 py-2 rounded-2xl border border-gray-200 shadow-2xs cursor-pointer hover:shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-orange-600" /> Back to Active Orders List
        </button>

        {activeOrders.length > 1 && (
          <span className="text-xs font-bold text-gray-500">
            Tracking 1 of {activeOrders.length} active orders
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">
            Order Has Been Cancelled (#{displayOrderId.slice(-6).toUpperCase()})
          </h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">
            Live order tracking is disabled because this order was cancelled. Please check your order history or place a new order.
          </p>
          <button
            type="button"
            onClick={handleBackToCardList}
            className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Active Orders
          </button>
        </div>
      ) : (
        <>
          {/* 1. Live Order Tracking Header Banner */}
          <section className="bg-gradient-to-r from-[#FF6B35] via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-white border border-white/25">
                  <DraftingCompass className="w-3.5 h-3.5" /> Live Order Tracking
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Order #{displayOrderId.slice(-6).toUpperCase()}
                </h1>
                <p className="text-orange-100 text-xs sm:text-sm">
                  {restaurantNames.length > 0
                    ? `${restaurantNames.join(", ")} • ${totalItems} item${totalItems === 1 ? "" : "s"}`
                    : "Follow your order in real-time"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold border backdrop-blur-md transition",
                    connected
                      ? "bg-emerald-400/20 border-emerald-200/40 text-emerald-50 animate-pulse"
                      : "bg-white/10 border-white/25 text-white",
                  ].join(" ")}
                >
                  {connected ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" /> Live
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" /> Reconnecting
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={fetchOrderData}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 cursor-pointer transition"
                  title="Refresh order details"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </section>

          {/* 2. Step-by-Step Order Progress Bar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <h2 className="text-sm sm:text-base font-black text-gray-900">Order Progress</h2>
              <div className="flex items-center gap-2">
                {completed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-[#FF6B35] text-xs font-black border border-orange-100">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B35] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B35]" />
                    </span>
                    {currentStatus}
                  </span>
                )}
              </div>
            </div>
            <OrderStatusStepper currentStatus={currentStatus} />
          </div>

          {/* 3. Live Rider Location Map */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Live Rider Location</h3>
                  <p className="text-[11px] font-medium text-gray-400">
                    {isAssigned && riderLocation
                      ? "Rider is on the move toward you"
                      : statusIndex >= 4
                        ? "Order delivered — thank you!"
                        : "Map activates when the rider sets out"}
                  </p>
                </div>
              </div>
              {riderLocation && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Position Updated
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5">
              <div className="w-full h-[320px] sm:h-[400px] rounded-2xl overflow-hidden border border-gray-100 relative">
                <OrderTrackingMap
                  deliveryLat={deliveryLat}
                  deliveryLng={deliveryLng}
                  restaurantLat={restaurantLat}
                  restaurantLng={restaurantLng}
                  riderLat={riderLat}
                  riderLng={riderLng}
                  riderName={riderLocation?.riderName}
                  active={isAssigned}
                />
                {!hasCoordinates && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[4] bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                    Waiting for delivery coordinates from the server...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery summary + rider info + payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B35]" /> Delivery Destination
              </h3>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {order?.deliveryAddress?.fullName || "Your address"}
                </p>
                <p className="text-xs font-medium text-gray-500 leading-relaxed">
                  {[order?.deliveryAddress?.streetAddress, order?.deliveryAddress?.building, city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <a
                  href={`tel:${order?.deliveryAddress?.phoneNumber || ""}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {order?.deliveryAddress?.phoneNumber || "Phone not available"}
                </a>
              </div>

              {order?.deliveryAddress?.deliveryInstructions && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-800 font-semibold">
                  📌 {order.deliveryAddress.deliveryInstructions}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#FF6B35]" /> Delivery Partner
              </h3>
              {riderLocation?.riderName || order?.riderInfo?.name ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-black text-gray-900">
                    {riderLocation?.riderName || order?.riderInfo?.name}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-gray-600">
                      <Bike className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {order?.riderInfo?.vehicleNumber || riderLocation?.vehicleNumber || "Bike"}
                    </span>
                    {order?.riderInfo?.phone && (
                      <a
                        href={`tel:${order.riderInfo.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Rider
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-medium text-gray-500">
                  Assigning a delivery partner... Once assigned, you&apos;ll see their live location here.
                </p>
              )}
            </div>

            <div className="md:col-span-2 bg-gray-50/70 border border-gray-100 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Wallet className="w-4 h-4 text-gray-400" />
                {order?.paymentMethod === "STRIPE" ? "Paid by Card" : "Cash on Delivery"}
                <span>•</span>
                <span>${(order?.totalAmount || 0).toFixed(2)}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                <Store className="w-3.5 h-3.5" />
                {restaurantNames.join(", ") || "FoodFlow Kitchen"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}