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
  Route,
  User,
  Package,
  Key,
  Lock,
  ShieldCheck,
  ChevronDown,
  Send,
  X,
  Banknote,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "@/lib/auth-client";
import { getOrderByIdApi, getRiderOrdersApi, updateOrderStatusApi, sendDeliveryOtpApi } from "@/lib/api/order";
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
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  // Live location sharing state for rider
  const [sharing, setSharing] = useState<boolean>(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  // OTP Verification Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const riderProfile = getRiderProfile();

  // Derive active status & cancel states
  const currentStatus = liveStatus || order?.orderStatus || "Pending";
  const completed = currentStatus.toLowerCase() === "delivered";
  const isCancelled = ["cancelled", "canceled", "rejected", "failed"].includes(
    currentStatus.toLowerCase()
  );

  const activeTrackId = selectedOrderId || explicitOrderId;

  // Sync selectedOrderId when explicitOrderId changes in URL
  useEffect(() => {
    if (explicitOrderId) {
      setSelectedOrderId(explicitOrderId);
    }
  }, [explicitOrderId]);

  // Fetch active deliveries assigned to this rider and auto-load details
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

      // Auto-target: explicit url param OR current selected OR first active order
      const targetId =
        explicitOrderId ||
        selectedOrderId ||
        (liveList.length > 0
          ? liveList[0]._id || liveList[0].id || liveList[0].orderId
          : null);

      if (targetId) {
        setSelectedOrderId(targetId);
        const res = await getOrderByIdApi(targetId, userId, userEmail);
        if (res.success && res.data) {
          setOrder(res.data as TOrder);
        } else {
          setError(res.message || "Could not load specified delivery details.");
          setOrder(null);
        }
      } else {
        setOrder(null);
        setSelectedOrderId(null);
      }
    } catch (err: any) {
      console.error("Failed to load rider delivery data:", err);
      setError(err.message || "Failed to load delivery information.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [explicitOrderId, selectedOrderId, userId, userEmail, sessionPending]);

  useEffect(() => {
    fetchDeliveryData();
  }, [fetchDeliveryData]);

  // Switch between multiple active orders directly
  const handleSwitchOrder = async (targetId: string) => {
    setSelectedOrderId(targetId);
    setLiveStatus(null);
    setError(null);
    setLoading(true);
    try {
      const res = await getOrderByIdApi(targetId, userId, userEmail);
      if (res.success && res.data) {
        setOrder(res.data as TOrder);
      }
    } finally {
      setLoading(false);
    }
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
          setIsOtpModalOpen(false);
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
  const updateStatus = async (targetOrder: TOrder, newStatus: string, otpCode?: string) => {
    const oId = targetOrder.orderId || targetOrder._id || "";
    if (!oId || !userId) return;

    // If attempting to mark Delivered and no OTP provided yet, open modal
    if (newStatus === "Delivered" && !otpCode) {
      setIsOtpModalOpen(true);
      setOtpError(null);
      setResendSuccess(null);
      return;
    }

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

      if (otpCode) {
        payload.otp = otpCode.trim();
        payload.deliveryOtp = otpCode.trim();
      }

      if (newStatus === "Delivered" && (targetOrder.paymentMethod === "COD" || targetOrder.paymentStatus === "Pending")) {
        payload.paymentStatus = "Paid";
      }

      const res = await updateOrderStatusApi(oId, payload as any, userId, userEmail || "");
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
          setIsOtpModalOpen(false);
          setOtpInput("");
          setOtpError(null);

          toast.success("🎉 OTP Verified! Delivery completed.", {
            position: "top-center",
            toastId: `otp-success-${oId}`,
          });
        } else {
          toast.success(`✅ Status updated to ${newStatus}`, {
            position: "top-center",
          });
        }
      } else {
        if (newStatus === "Delivered") {
          const errMsg = res.message || "Invalid OTP code. Please ask customer for correct code.";
          setOtpError(errMsg);
          toast.error(errMsg, { position: "top-center" });
        } else {
          toast.error(res.message || "Failed to update delivery status.", { position: "top-center" });
        }
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      if (newStatus === "Delivered") {
        setOtpError(err.message || "Failed to verify OTP.");
        toast.error(err.message || "Failed to verify OTP.", { position: "top-center" });
      } else {
        toast.error("Failed to update status.", { position: "top-center" });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── OTP Verification Submission ─────────────────────────────────────
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order) return;
    const cleanOtp = otpInput.trim();
    if (cleanOtp.length !== 6) {
      setOtpError("Please enter the full 6-digit OTP code.");
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await updateStatus(order, "Delivered", cleanOtp);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── Resend OTP to Customer ──────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!order) return;
    const oId = order.orderId || order._id || "";
    if (!oId) return;

    setIsResendingOtp(true);
    setResendSuccess(null);
    setOtpError(null);

    try {
      const res = await sendDeliveryOtpApi(oId, userId, userEmail || "");
      if (res.success) {
        setResendSuccess("Delivery OTP resent to customer's email and dashboard!");
        if (res.data) {
          setOrder(res.data as TOrder);
        }
      } else {
        setOtpError(res.message || "Failed to resend OTP.");
      }
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend OTP.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Auto-start live location streaming when tracking an active delivery
  useEffect(() => {
    if (activeTrackId && !completed) {
      setSharing(true);
    } else if (completed) {
      setSharing(false);
    }
  }, [activeTrackId, completed]);

  // Loading state
  if (loading && !order && activeOrders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  // Empty State: No active deliveries in progress
  if (!loading && activeOrders.length === 0 && !order) {
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

        <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-md">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">No Active Deliveries in Progress</h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
              You do not have any active delivery orders right now. Check available requests to accept a new delivery.
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
              href="/dashboard/rider/delivery-history"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-xs hover:bg-gray-200 transition cursor-pointer"
            >
              View Delivery History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Link
          href="/dashboard/rider/delivery-details"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Available Deliveries
        </Link>

        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">Delivery Not Found</h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">{error}</p>
          <Link
            href="/dashboard/rider/delivery-details"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Available Deliveries
          </Link>
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
  const hasCoordinates = Boolean(
    deliveryLat || deliveryLng || restaurantLat || restaurantLng || riderLat || riderLng
  );

  const city = order?.deliveryAddress?.area || order?.deliveryAddress?.postalCode || "";
  const restaurantNames = [...new Set((order?.items || []).map((i) => i.restaurantName).filter(Boolean))];
  const totalItems = (order?.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
  const displayOrderId = order?.orderId || order?._id || order?.id || activeTrackId || "N/A";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Top Navigation & Multi-Order Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/rider/delivery-details"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-gray-700 hover:text-orange-600 transition bg-white px-3.5 py-2 rounded-2xl border border-gray-200 shadow-2xs cursor-pointer hover:shadow-xs w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-orange-600" /> Back to Available Deliveries
        </Link>

        {activeOrders.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white p-1.5 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-400 px-2 shrink-0">Trips ({activeOrders.length}):</span>
            {activeOrders.map((o) => {
              const oId = o._id || o.id || o.orderId || "";
              const isCurr = (order?._id || order?.orderId || order?.id) === oId || activeTrackId === oId;
              return (
                <button
                  key={oId}
                  type="button"
                  onClick={() => handleSwitchOrder(oId)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                    isCurr
                      ? "bg-[#FF6B35] text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  #{o.orderId?.slice(-6).toUpperCase() || oId.slice(-6).toUpperCase()}
                </button>
              );
            })}
          </div>
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
          <Link
            href="/dashboard/rider/delivery-details"
            className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition cursor-pointer"
          >
            Return to Available Deliveries
          </Link>
        </div>
      ) : (
        <>
          {/* 1. Live Delivery Header Banner */}
          <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
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

          {/* 2. Step-by-Step Delivery Progress Stepper & Top Action Bar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-black text-gray-900">Delivery Progress</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live GPS Auto-Sharing
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Current Status: <span className="font-bold text-orange-600">{currentStatus}</span>
                </p>
              </div>

              {/* Status Change Dropdown & OTP Verify Button placed directly in Progress Header */}
              {currentStatus !== "Delivered" ? (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative">
                    <select
                      value={currentStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === currentStatus) return;
                        if (val === "Delivered") {
                          setIsOtpModalOpen(true);
                          setOtpError(null);
                          setResendSuccess(null);
                        } else if (order) {
                          updateStatus(order, val);
                        }
                      }}
                      disabled={actionLoadingId === (order?.orderId || order?._id)}
                      className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl pl-3.5 pr-9 py-2.5 text-xs font-black text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs transition"
                    >
                      <option value="Preparing" disabled={currentStatus === "Out for Delivery"}>
                        Preparing (Kitchen)
                      </option>
                      <option value="Out for Delivery">
                        🚴 Out for Delivery
                      </option>
                      <option value="Delivered">
                        ✅ Delivered (Requires OTP)
                      </option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    disabled={actionLoadingId === (order?.orderId || order?._id)}
                    onClick={() => {
                      setIsOtpModalOpen(true);
                      setOtpError(null);
                      setResendSuccess(null);
                    }}
                    className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    Verify OTP & Deliver
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivery Completed Successfully
                </div>
              )}
            </div>

            <OrderStatusStepper currentStatus={currentStatus} />
          </div>

          {/* 🌟 3. Accepted Delivery Card: Title, Customer Name, Number & Address */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md shadow-orange-500/20">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                    <Package className="w-3 h-3" /> Order & Restaurant Title
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-gray-900 leading-tight">
                    {restaurantNames.join(", ") || "FoodFlow Restaurant"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Order #{displayOrderId.slice(-6).toUpperCase()} • {totalItems} item{totalItems === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {/* Payment Method Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border ${
                    order?.paymentMethod === "COD" && currentStatus !== "Delivered"
                      ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  {order?.paymentMethod === "COD" && currentStatus !== "Delivered"
                    ? `Collect Cash: Tk ${(order?.totalAmount || 0).toFixed(2)}`
                    : "Paid Online (No Cash Collection)"}
                </span>
              </div>
            </div>

            {/* 3 Core Fields: Customer Name, Phone Number, Full Delivery Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Field 1: Customer Name */}
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 block">
                    Customer Name
                  </span>
                  <p className="text-sm sm:text-base font-black text-gray-900 leading-snug mt-0.5 truncate">
                    {order?.deliveryAddress?.fullName || order?.userName || "Valued Customer"}
                  </p>
                </div>
              </div>

              {/* Field 2: Customer Phone Number */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                    Phone Number
                  </span>
                  {order?.deliveryAddress?.phoneNumber ? (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <a
                        href={`tel:${order.deliveryAddress.phoneNumber}`}
                        className="text-sm sm:text-base font-black text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        {order.deliveryAddress.phoneNumber}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (order?.deliveryAddress?.phoneNumber) {
                            navigator.clipboard.writeText(order.deliveryAddress.phoneNumber);
                            setCopiedPhone(true);
                            setTimeout(() => setCopiedPhone(false), 2500);
                          }
                        }}
                        className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer"
                        title="Copy Phone Number"
                      >
                        {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 mt-0.5">Not provided</p>
                  )}
                </div>
              </div>

              {/* Field 3: Delivery Address */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 md:col-span-1">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                      Delivery Address
                    </span>
                    <a
                      href={
                        deliveryLat && deliveryLng
                          ? `https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              [
                                order?.deliveryAddress?.streetAddress,
                                order?.deliveryAddress?.building,
                                order?.deliveryAddress?.area,
                                (order?.deliveryAddress as any)?.city,
                                order?.deliveryAddress?.postalCode,
                              ]
                                .filter(Boolean)
                                .join(", ") || "Delivery Destination"
                            )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                    >
                      Maps <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug mt-0.5">
                    {[
                      order?.deliveryAddress?.streetAddress,
                      order?.deliveryAddress?.building,
                      order?.deliveryAddress?.area,
                      (order?.deliveryAddress as any)?.city,
                      order?.deliveryAddress?.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address on file"}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Note if present */}
            {order?.deliveryAddress?.deliveryInstructions && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 font-medium leading-relaxed">
                <span className="font-extrabold text-amber-950 block mb-0.5">📌 Delivery Note / Instructions:</span>
                {order.deliveryAddress.deliveryInstructions}
              </div>
            )}
          </div>

          {/* 4. Live Map Route & Rider Location */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Live Delivery Route & Location</h3>
                  <p className="text-[11px] font-medium text-gray-400">
                    {completed
                      ? "Delivery completed successfully"
                      : "Broadcasting your live GPS position to the customer"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                GPS Broadcasting Live
              </span>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* 🔐 INTERACTIVE OTP VERIFICATION MODAL FOR RIDER */}
      {/* ========================================================================= */}
      {isOtpModalOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsOtpModalOpen(false);
                setOtpError(null);
                setResendSuccess(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-md shadow-orange-500/10 border border-orange-100">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-gray-900">
                Delivery OTP Verification
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Ask the customer for the <span className="font-bold text-gray-800">6-digit OTP code</span> sent to their email and dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-center text-xs font-bold text-gray-600 mb-2">
                  Enter 6-Digit Delivery OTP:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • • • •"
                  value={otpInput}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setOtpInput(clean);
                    if (otpError) setOtpError(null);
                  }}
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-black py-3.5 px-4 bg-gray-50 border-2 border-orange-200 rounded-2xl focus:border-orange-500 focus:bg-white focus:outline-hidden transition"
                />
              </div>

              {/* Error Message */}
              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* Resend Success Message */}
              {resendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={otpInput.trim().length !== 6 || isVerifyingOtp}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Verify & Complete Delivery
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={isResendingOtp}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isResendingOtp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Resend OTP to Customer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpModalOpen(false);
                      setOtpError(null);
                      setResendSuccess(null);
                    }}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}