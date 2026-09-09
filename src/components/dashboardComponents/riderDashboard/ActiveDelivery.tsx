"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  ArrowRight,
  LocateFixed,
  Loader2,
  Banknote,
  Route,
  User,
  Package,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getOrderByIdApi, getRiderOrdersApi, updateOrderStatusApi } from "@/lib/api/order";
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
  paymentStatus?: string;
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
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Check for active in-progress order statuses
export function isDeliveryActive(orderStatus?: string): boolean {
  if (!orderStatus) return true;
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

export default function ActiveDelivery() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();

  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Live location sharing state for rider
  const [sharing, setSharing] = useState<boolean>(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  const riderProfile = getRiderProfile();

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

  // Fetch active deliveries assigned to this rider or single order details
  const fetchDeliveryData = useCallback(async () => {
    if (sessionPending || !userId || !userEmail) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch rider's active orders (assigned or in-progress)
      const riderOrdersRes = await getRiderOrdersApi(userId, userEmail, { mode: "active" });
      let liveList: TOrder[] = [];
      if (riderOrdersRes.success && Array.isArray(riderOrdersRes.data)) {
        const allOrders = riderOrdersRes.data as TOrder[];
        liveList = allOrders.filter((o) => isDeliveryActive(o.orderStatus));
        setActiveOrders(liveList);
      }

      // 2. Fetch specific order details if tracking a target ID (Step 2)
      if (activeTrackId) {
        const res = await getOrderByIdApi(activeTrackId, userId, userEmail);
        if (res.success && res.data) {
          setOrder(res.data as TOrder);
        } else {
          setError(res.message || "Could not load specified delivery details.");
          setOrder(null);
        }
      } else {
        setOrder(null);
      }
    } catch (err: any) {
      console.error("Failed to load rider delivery data:", err);
      setError(err.message || "Failed to load delivery information.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [activeTrackId, userId, userEmail, sessionPending]);

  useEffect(() => {
    fetchDeliveryData();
  }, [fetchDeliveryData]);

  // Transition from Step 1 (Card List View) -> Step 2 (Detailed Tracking View)
  const handleTrackOrderClick = (targetId: string) => {
    setViewMode("detail");
    setSelectedOrderId(targetId);
    setLoading(true);
    setLiveStatus(null);
    setError(null);
    router.push(`/dashboard/rider/active-delivery?orderId=${targetId}`);
  };

  // Transition from Step 2 (Detailed View) -> Step 1 (Active Deliveries List View)
  const handleBackToCardList = () => {
    setViewMode("list");
    setSelectedOrderId(null);
    setOrder(null);
    setLiveStatus(null);
    setError(null);
    router.replace("/dashboard/rider/active-delivery");
  };

  // Socket.IO real-time delivery tracking & status syncing
  useEffect(() => {
    if (!activeTrackId || sessionPending || !userId) return;

    const socket = getOrderSocket(activeTrackId);
    joinOrderRoom(activeTrackId);
    joinOrderRoom("rider_" + userId);
    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);
      joinOrderRoom(activeTrackId);
      joinOrderRoom("rider_" + userId);
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
        if (newStatus.toLowerCase() === "delivered") {
          setSharing(false);
        }
        if (!isDeliveryActive(newStatus)) {
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
      const lat = toNumber(payload.latitude ?? payload.lat);
      const lng = toNumber(payload.longitude ?? payload.lng);
      if (lat && lng) {
        setRiderLocation({ lat, lng });
      }
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
  }, [activeTrackId, sessionPending, userId]);

  useEffect(() => {
    return () => disconnectOrderSocket();
  }, []);

  // ─── Emit / Stream Live Location via Socket ────────────────────────
  const emitLocation = useCallback(
    (payload: { lat: number; lng: number; immediate: boolean }) => {
      if (!activeTrackId || !userId) return;
      const socket = getOrderSocket(activeTrackId);
      socket.emit("update_rider_location", {
        orderId: activeTrackId,
        riderId: userId,
        riderName: riderProfile?.name || user?.name || "Delivery Partner",
        vehicleNumber: riderProfile?.vehicleNumber,
        lat: payload.lat,
        lng: payload.lng,
        latitude: payload.lat,
        longitude: payload.lng,
        immediate: payload.immediate,
      });
    },
    [activeTrackId, userId, user?.name, riderProfile?.name, riderProfile?.vehicleNumber]
  );

  useEffect(() => {
    if (!sharing || !activeTrackId) return;

    // Emit initial location immediately
    const startLat = riderLocation?.lat || DEFAULT_START[0];
    const startLng = riderLocation?.lng || DEFAULT_START[1];
    emitLocation({ lat: startLat, lng: startLng, immediate: true });

    const interval = window.setInterval(() => {
      // Use real GPS if available, else simulate realistic movement
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setRiderLocation({ lat, lng });
            emitLocation({ lat, lng, immediate: false });
          },
          () => {
            setRiderLocation((prev) => {
              const base = prev || { lat: DEFAULT_START[0], lng: DEFAULT_START[1] };
              const lat = base.lat + (Math.random() - 0.5) * 0.0012;
              const lng = base.lng + (Math.random() - 0.5) * 0.0012;
              emitLocation({ lat, lng, immediate: false });
              return { lat, lng };
            });
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setRiderLocation((prev) => {
          const base = prev || { lat: DEFAULT_START[0], lng: DEFAULT_START[1] };
          const lat = base.lat + (Math.random() - 0.5) * 0.0012;
          const lng = base.lng + (Math.random() - 0.5) * 0.0012;
          emitLocation({ lat, lng, immediate: false });
          return { lat, lng };
        });
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [sharing, activeTrackId, emitLocation]);

  // ─── Status Update Handler ──────────────────────────────────────────
  const updateStatus = async (targetOrder: TOrder, newStatus: string) => {
    const oId = targetOrder.orderId || targetOrder._id || "";
    if (!oId || !userId) return;

    try {
      setActionLoadingId(oId);
      const payload: Record<string, unknown> = {
        orderStatus: newStatus,
        riderInfo: {
          riderId: userId,
          name: riderProfile?.name || user?.name || "Delivery Partner",
          phone: riderProfile?.phone,
          vehicleNumber: riderProfile?.vehicleNumber,
        },
      };

      if (newStatus === "Delivered" && (targetOrder.paymentMethod === "COD" || targetOrder.paymentStatus === "Pending")) {
        payload.paymentStatus = "Paid";
      }

      const res = await updateOrderStatusApi(oId, payload, userId, userEmail || "");
      if (res.success) {
        setLiveStatus(newStatus);
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                orderStatus: newStatus as TOrder["orderStatus"],
                ...(newStatus === "Delivered" ? { paymentStatus: "Paid" } : {}),
              }
            : null
        );

        setActiveOrders((prev) =>
          prev.map((o) =>
            o.orderId === oId || o._id === oId
              ? {
                  ...o,
                  orderStatus: newStatus as TOrder["orderStatus"],
                  ...(newStatus === "Delivered" ? { paymentStatus: "Paid" } : {}),
                }
              : o
          )
        );

        const socket = getOrderSocket(oId);
        socket.emit("order_status_updated", {
          orderId: oId,
          orderStatus: newStatus,
          paymentStatus: newStatus === "Delivered" ? "Paid" : targetOrder.paymentStatus,
        });

        if (newStatus === "Delivered") {
          setSharing(false);
        }
      } else {
        alert(res.message || "Failed to update delivery status.");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentStatus = liveStatus || order?.orderStatus || "Pending";
  const isCancelled = currentStatus.toLowerCase() === "cancelled";

  // Loading state
  if (loading && !order && activeTrackId) {
    return (
      <div className="max-w-4xl mx-auto min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  // ===========================================================================
  // STEP 1: INITIAL STATE — ACTIVE DELIVERIES CARD LIST VIEW
  // (Rendered when rider visits /dashboard/rider/active-delivery with no query ID)
  // ===========================================================================
  if (!activeTrackId) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/rider/delivery-details"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Available Deliveries
          </Link>
          <button
            type="button"
            onClick={fetchDeliveryData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        {/* Initial Loading Spinner */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size={50} color="#f97316" />
          </div>
        ) : activeOrders.length === 0 ? (
          /* EMPTY STATE: NO ACTIVE DELIVERIES */
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-md">
              <Bike className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-gray-900">No Active Deliveries Found</h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                You don&apos;t have any active deliveries assigned right now. Check available delivery requests to accept a new order.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard/rider/delivery-details"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white font-extrabold text-xs shadow-md hover:bg-orange-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Route className="w-4 h-4" /> Browse Available Deliveries
              </Link>
              <Link
                href="/dashboard/rider/history"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-xs hover:bg-gray-200 transition cursor-pointer"
              >
                View Delivery History
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE DELIVERIES CARD CONTAINER */
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-orange-600" /> Active Deliveries in Progress ({activeOrders.length})
                </h1>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  Select an active delivery card below to view its live progress bar, map route, and update status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {activeOrders.map((o) => {
                const oId = o._id || o.id || o.orderId || "";
                const displayId = o.orderId || oId;
                const statusStr = o.orderStatus || "Pending";
                const rNames =
                  [...new Set((o.items || []).map((i) => i.restaurantName).filter(Boolean))].join(", ") ||
                  "FoodFlow Kitchen";
                const itemCount = (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

                return (
                  <div
                    key={oId}
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-gray-900">
                          Delivery #{displayId.slice(-6).toUpperCase()}
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
                      Track & Deliver
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
  // STEP 2: DETAILED DELIVERY VIEW & CONTROLS
  // (Rendered when specific orderId is selected or provided via ?orderId=...)
  // ===========================================================================

  if (error && !order) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <button
          type="button"
          onClick={handleBackToCardList}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Active Deliveries
        </button>

        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">Delivery Not Found</h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={handleBackToCardList}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Active Deliveries
          </button>
        </div>
      </div>
    );
  }

  // Coordinates extraction
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
      {/* Back Button to Card List View */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackToCardList}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-gray-700 hover:text-orange-600 transition bg-white px-3.5 py-2 rounded-2xl border border-gray-200 shadow-2xs cursor-pointer hover:shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-orange-600" /> Back to Active Deliveries List
        </button>

        {activeOrders.length > 1 && (
          <span className="text-xs font-bold text-gray-500">
            Tracking 1 of {activeOrders.length} active deliveries
          </span>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">
            Order Cancelled (#{displayOrderId.slice(-6).toUpperCase()})
          </h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">
            This delivery was cancelled by the customer or restaurant. No further action is required.
          </p>
          <button
            type="button"
            onClick={handleBackToCardList}
            className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Active Deliveries
          </button>
        </div>
      ) : (
        <>
          {/* 1. Live Delivery Header Banner */}
          <section className="bg-gradient-to-r from-[#FF6B35] via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-white border border-white/25">
                  <DraftingCompass className="w-3.5 h-3.5" /> Live Delivery Tracking
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Delivery #{displayOrderId.slice(-6).toUpperCase()}
                </h1>
                <p className="text-orange-100 text-xs sm:text-sm">
                  {restaurantNames.length > 0
                    ? `${restaurantNames.join(", ")} • ${totalItems} item${totalItems === 1 ? "" : "s"}`
                    : "Manage active trip and stream live location"}
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
                  onClick={fetchDeliveryData}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 cursor-pointer transition"
                  title="Refresh delivery details"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </section>

          {/* 2. Step-by-Step Delivery Progress Stepper */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <h2 className="text-sm sm:text-base font-black text-gray-900">Delivery Progress</h2>
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

          {/* 3. Live Map Route & Rider Location */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Live Delivery Route & Location</h3>
                  <p className="text-[11px] font-medium text-gray-400">
                    {sharing
                      ? "Streaming live coordinates to customer in real-time"
                      : completed
                        ? "Delivery completed successfully"
                        : "Turn on live location sharing to guide your customer"}
                  </p>
                </div>
              </div>
              {sharing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Sharing Active
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
                  riderName={riderProfile?.name || user?.name}
                  active={true}
                />
                {!hasCoordinates && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[4] bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                    Waiting for delivery coordinates...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Details Grid: Customer Destination, Pickup, and Location Sharing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Delivery Destination (Customer) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B35]" /> Delivery Destination
              </h3>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {order?.deliveryAddress?.fullName || order?.userName || "Customer Address"}
                </p>
                <p className="text-xs font-medium text-gray-500 leading-relaxed">
                  {[order?.deliveryAddress?.streetAddress, order?.deliveryAddress?.building, city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {order?.deliveryAddress?.phoneNumber && (
                  <a
                    href={`tel:${order.deliveryAddress.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline pt-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.deliveryAddress.phoneNumber}
                  </a>
                )}
              </div>

              {order?.deliveryAddress?.deliveryInstructions && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-800 font-semibold">
                  📌 {order.deliveryAddress.deliveryInstructions}
                </div>
              )}
            </div>

            {/* Pickup / Restaurant Info */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FF6B35]" /> Pickup Details
              </h3>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-black text-gray-900">
                  {restaurantNames.join(", ") || "FoodFlow Kitchen"}
                </p>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Items to deliver:</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {(order?.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-700 font-medium">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-bold text-gray-900">Tk {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Sharing Controller */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#FF6B35]" /> Live Location Streaming
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                {sharing
                  ? "Broadcasting your live location to the customer's map every 3 seconds."
                  : "Turn on live location sharing so the customer can track your route in real-time."}
              </p>
              <button
                type="button"
                disabled={completed}
                onClick={() => setSharing((s) => !s)}
                className={`w-full py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                  completed
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : sharing
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20"
                }`}
              >
                {sharing ? (
                  <>
                    <LocateFixed className="w-4 h-4" /> Stop Sharing Location
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" /> Share Live Location
                  </>
                )}
              </button>
            </div>

            {/* Rider Status Action Buttons */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#FF6B35]" /> Delivery Actions
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Update the delivery state to keep the customer and restaurant synchronized.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {currentStatus !== "Delivered" && currentStatus !== "Out for Delivery" && (
                  <button
                    type="button"
                    disabled={actionLoadingId === (order?.orderId || order?._id)}
                    onClick={() => order && updateStatus(order, "Out for Delivery")}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === (order?.orderId || order?._id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bike className="w-4 h-4" />
                    )}
                    Out for Delivery
                  </button>
                )}

                {currentStatus !== "Delivered" ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === (order?.orderId || order?._id)}
                    onClick={() => order && updateStatus(order, "Delivered")}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === (order?.orderId || order?._id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Mark Delivered
                  </button>
                ) : (
                  <div className="w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Delivery Completed
                  </div>
                )}
              </div>
            </div>

            {/* Cash on Delivery (COD) Notice */}
            {order?.paymentMethod === "COD" && currentStatus !== "Delivered" && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-black">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-amber-900">Cash on Delivery (COD)</h5>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Collect cash payment from the customer before completing delivery.
                    </p>
                  </div>
                </div>
                <div className="text-right ml-auto">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Total To Collect</span>
                  <span className="text-base font-black text-amber-950">Tk {(order?.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Bottom Summary Footer */}
            <div className="md:col-span-2 bg-gray-50/70 border border-gray-100 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Wallet className="w-4 h-4 text-gray-400" />
                {order?.paymentMethod === "STRIPE" ? "Paid by Card" : "Cash on Delivery"}
                <span>•</span>
                <span>Tk {(order?.totalAmount || 0).toFixed(2)}</span>
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