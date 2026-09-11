"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import {
  Loader2,
  RefreshCw,
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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRiderOrdersApi, updateOrderStatusApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import { TOrder } from "@/types/order";
import { toast } from "react-toastify";

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

export default function DeliveryDetails() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const riderProfile = getRiderProfile();

  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    const res = await getRiderOrdersApi(user.id, user.email);
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

  // Socket: real-time updates for available/new out-for-delivery orders
  useEffect(() => {
    if (!user?.id || sessionPending) return;

    const socket = getOrderSocket("rider_deliveries_" + (user.id || "unknown"));
    joinOrderRoom("rider_" + (user.id || "unknown"));
    setSocketConnected(socket.connected);

    const onConnect = () => {
      setSocketConnected(true);
      joinOrderRoom("rider_" + (user.id || "unknown"));
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
  }, [sessionPending, user?.id]);

  useEffect(() => () => disconnectOrderSocket(), []);

  // ─── Accept Order ────────────────────────────────────────────
  const acceptOrder = async (order: TOrder) => {
    const orderId = order.orderId || order._id || "";
    if (!orderId || !user?.id) return;
    try {
      setActionLoadingId(orderId);
      const res = await updateOrderStatusApi(
        orderId,
        {
          orderStatus: "Out for Delivery",
          riderInfo: {
            riderId: user.id,
            name: riderProfile?.name || user.name || "Delivery Partner",
            phone: riderProfile?.phone,
            vehicleNumber: riderProfile?.vehicleNumber,
          },
        },
        user.id,
        user.email || ""
      );
      if (res.success) {
        // Move into assignment immediately
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === orderId || o._id === orderId
              ? {
                ...o,
                orderStatus: "Out for Delivery" as TOrder["orderStatus"],
                riderInfo: { riderId: user.id, name: user.name, phone: riderProfile?.phone, vehicleNumber: riderProfile?.vehicleNumber },
              }
              : o
          )
        );
        const socket = getOrderSocket(orderId);
        socket.emit("order_status_updated", { orderId, orderStatus: "Out for Delivery" });

        toast.success("🚴 Delivery accepted! Start your trip.", {
          position: "top-center",
          toastId: `rider-accept-${orderId}`,
        });

        router.push(`/dashboard/rider/active-delivery?orderId=${orderId}`);
      } else {
        toast.error(res.message || "Could not accept order.", { position: "top-center" });
      }
    } catch (err) {
      console.error("Accept order failed:", err);
      toast.error("Accept order failed. Please try again.", { position: "top-center" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const availableOrders = orders.filter((o) => {
    const s = (o.orderStatus || "").toLowerCase();
    return (
      ["ready", "ready for pickup", "out for delivery"].includes(s) &&
      !o.riderInfo?.riderId
    );
  });
  const myOrders = orders.filter(
    (o) =>
      o.riderInfo?.riderId === user?.id &&
      !["delivered", "completed", "cancelled", "canceled", "rejected", "failed"].includes(
        (o.orderStatus || "").toLowerCase()
      )
  );

  if (sessionPending || loading) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  const renderOrderCard = (order: TOrder, view: "available" | "mine") => {
    const orderId = order.orderId || order._id || "";
    const isAccepting = actionLoadingId === orderId;
    const totalItems = (order.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    const pickup = order.items?.[0]?.restaurantName || "FoodFlow Kitchen";
    const earnings = Number(((order.totalAmount || 0) * 0.15).toFixed(2));

    return (
      <div key={orderId} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-gray-900 text-sm sm:text-base">#{orderId}</span>
              {view === "mine" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                  <Bike className="w-3.5 h-3.5" /> Accepted — Out for Delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Package className="w-3.5 h-3.5" /> Ready for Pickup
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {totalItems} items • {order.items?.[0]?.name}{order.items && order.items.length > 1 ? " +" + (order.items.length - 1) + " more" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
              <Banknote className="w-3.5 h-3.5" /> Earning ~{earnings.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#FF6B35]" /> Pickup
            </h4>
            <p className="text-xs sm:text-sm font-bold text-gray-800">{pickup}</p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" /> Customer & Delivery Details
            </h4>
            
            {/* Customer Name */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF6B35] flex items-center justify-center text-xs font-black shrink-0">
                <User className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Name</span>
                <p className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                  {order.deliveryAddress?.fullName || order.userName || "Customer"}
                </p>
              </div>
            </div>

            {/* Customer Phone Number */}
            {order.deliveryAddress?.phoneNumber && (
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                  <a
                    href={`tel:${order.deliveryAddress.phoneNumber}`}
                    className="text-xs sm:text-sm font-black text-[#FF6B35] hover:underline inline-flex items-center gap-1"
                  >
                    {order.deliveryAddress.phoneNumber}
                  </a>
                </div>
              </div>
            )}

            {/* Customer Address */}
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Address</span>
                <p className="text-xs font-bold text-gray-800 leading-snug">
                  {[
                    order.deliveryAddress?.streetAddress,
                    order.deliveryAddress?.building,
                    order.deliveryAddress?.area,
                    (order.deliveryAddress as any)?.city,
                    order.deliveryAddress?.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Address on file"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">
            Payment: {order.paymentMethod === "STRIPE" ? "Paid Online" : "Cash on Delivery"}
          </span>

          {view === "available" ? (
            <button
              type="button"
              disabled={isAccepting}
              onClick={() => acceptOrder(order)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 disabled:opacity-50"
            >
              {isAccepting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              Accept Order
            </button>
          ) : (
            <Link
              href={`/dashboard/rider/active-delivery?orderId=${orderId}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-900 to-black text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-125"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Go to Active Delivery
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Route className="w-3.5 h-3.5 text-white" /> Delivery Requests
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Available Deliveries</h1>
            <p className="text-orange-100 text-sm mt-1">
              {availableOrders.length} delivery request{availableOrders.length === 1 ? "" : "s"} waiting for a rider.
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

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button onClick={fetchOrders} className="underline font-bold text-rose-800 shrink-0 cursor-pointer">Retry</button>
        </div>
      )}

      {/* My accepted deliveries */}
      {myOrders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Bike className="w-4 h-4 text-[#FF6B35]" /> My In-Progress Deliveries ({myOrders.length})
          </h2>
          {myOrders.map((o) => renderOrderCard(o, "mine"))}
        </section>
      )}

      {/* Available deliveries */}
      <section className="space-y-4">
        <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-[#FF6B35]" /> Available Now ({availableOrders.length})
        </h2>

        {availableOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
              <Bike className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-gray-900">No Deliveries Available</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                New delivery requests appear here the moment restaurants mark orders ready for pickup. You&apos;ll also see real-time updates over socket.
              </p>
            </div>
          </div>
        ) : (
          availableOrders.map((o) => renderOrderCard(o, "available"))
        )}
      </section>
    </div>
  );
}