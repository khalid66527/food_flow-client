"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Key,
  ShieldCheck,
  Copy,
  Check,
  Bike,
  Store,
  MapPin,
  Clock,
  RefreshCw,
  ArrowRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getUserOrdersApi } from "@/lib/api/order";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { TOrder } from "@/types/order";
import { isOrderActive } from "@/components/dashboardComponents/customerDashboard/OrderTracking";

export default function CustomerDeliveryOtpPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userId || !userEmail || sessionPending) return;
    setLoading(true);
    try {
      const res = await getUserOrdersApi(userId, userEmail);
      if (res.success && Array.isArray(res.data)) {
        const all = res.data as TOrder[];
        const active = all.filter((o) => isOrderActive(o.orderStatus));
        setOrders(active);
      }
    } catch (err) {
      console.error("Failed to fetch customer orders for delivery OTP:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, sessionPending]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket sync for real-time status changes
  useEffect(() => {
    if (orders.length === 0) return;

    orders.forEach((o) => {
      const oId = o.orderId || o._id || o.id;
      if (oId) {
        const socket = getOrderSocket(oId);
        joinOrderRoom(oId);
        socket.on("order_status_updated", (payload: any) => {
          if (payload?.order) {
            setOrders((prev) =>
              prev.map((ord) =>
                ord.orderId === payload.order.orderId || ord._id === payload.order._id
                  ? (payload.order as TOrder)
                  : ord
              )
            );
          } else if (payload?.orderStatus) {
            setOrders((prev) =>
              prev.map((ord) =>
                ord.orderId === payload.orderId || ord._id === payload.orderId
                  ? { ...ord, orderStatus: payload.orderStatus }
                  : ord
              )
            );
          }
        });
      }
    });

    return () => {
      disconnectOrderSocket();
    };
  }, [orders]);

  const handleCopyOtp = (otp: string, orderId: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOrderId(orderId);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2500);
  };

  const ordersWithOtp = orders.filter((o) => o.deliveryOtp);
  const pendingOrdersWithoutOtp = orders.filter((o) => !o.deliveryOtp);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-white border border-white/25">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Delivery Handover
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Delivery Verification OTPs
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm max-w-xl">
              Use your secure 6-digit OTP code to verify and accept your food when your delivery rider arrives at your doorstep.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Codes
          </button>
        </div>
      </section>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size={50} color="#f97316" />
        </div>
      ) : ordersWithOtp.length === 0 && pendingOrdersWithoutOtp.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto shadow-md">
            <Key className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">No Pending Delivery OTPs</h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
              You don&apos;t have any active deliveries that require OTP verification right now. When an order goes out for delivery, your verification code will appear here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white font-extrabold text-xs shadow-md hover:bg-orange-700 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              Order Food Now
            </Link>
            <Link
              href="/dashboard/customer/orders"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-xs hover:bg-gray-200 transition cursor-pointer"
            >
              View Past Orders
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Deliveries with Live OTP */}
          {ordersWithOtp.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" /> Active Delivery Codes ({ordersWithOtp.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ordersWithOtp.map((order) => {
                  const oId = order.orderId || order._id || "";
                  const displayId = order.orderId || oId;
                  const restaurantName =
                    [...new Set((order.items || []).map((i) => i.restaurantName).filter(Boolean))].join(", ") ||
                    "FoodFlow Kitchen";
                  const isCopied = copiedOrderId === oId;

                  return (
                    <div
                      key={oId}
                      className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl">
                        {order.orderStatus || "Out for Delivery"}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                            Order #{displayId.slice(-6).toUpperCase()}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-gray-900 line-clamp-1">
                          {restaurantName}
                        </h3>

                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{(order.items || []).length} item{(order.items || []).length === 1 ? "" : "s"}</span>
                            <span>•</span>
                            <span className="font-bold text-gray-900">Tk {order.totalAmount?.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.area].filter(Boolean).join(", ")}
                            </span>
                          </div>
                          {order.riderInfo?.name && (
                            <div className="flex items-center gap-1.5 text-orange-600 font-semibold">
                              <Bike className="w-3.5 h-3.5 shrink-0" />
                              <span>Rider: {order.riderInfo.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prominent OTP Code Container */}
                      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300 p-4 text-center space-y-2">
                        <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wider block">
                          Delivery Verification Code
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <span className="font-mono text-3xl sm:text-4xl font-black text-orange-600 tracking-[8px]">
                            {order.deliveryOtp}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOtp(order.deliveryOtp!, oId)}
                            className="p-2.5 rounded-xl bg-white hover:bg-orange-500 hover:text-white border border-orange-200 text-orange-600 transition shadow-xs cursor-pointer group"
                            title="Copy OTP"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Share this code with your rider upon receiving food.
                        </p>
                      </div>

                      {/* Track Order Link */}
                      <Link
                        href={`/dashboard/customer/order-tracking?orderId=${oId}`}
                        className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        <Bike className="w-4 h-4" /> Track Live Delivery Route
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Kitchen Orders (OTP will be generated upon dispatch) */}
          {pendingOrdersWithoutOtp.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Preparing in Kitchen ({pendingOrdersWithoutOtp.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingOrdersWithoutOtp.map((order) => {
                  const oId = order.orderId || order._id || "";
                  const displayId = order.orderId || oId;
                  const restaurantName =
                    [...new Set((order.items || []).map((i) => i.restaurantName).filter(Boolean))].join(", ") ||
                    "FoodFlow Kitchen";

                  return (
                    <div
                      key={oId}
                      className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-gray-400">
                            #{displayId.slice(-6).toUpperCase()}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                            {order.orderStatus || "Preparing"}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 line-clamp-1">
                          {restaurantName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Tk {order.totalAmount?.toFixed(2)} • OTP code will be sent when rider picks up the order.
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/customer/order-tracking?orderId=${oId}`}
                        className="w-full py-2.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        Track Order <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security & FAQ Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-blue-900 font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>How does FoodFlow Delivery OTP protection work?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-800 leading-relaxed">
              <div className="bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-blue-100 space-y-1">
                <span className="font-extrabold text-blue-950 block">1. Generated at Pickup</span>
                <p className="text-blue-700">When your rider collects your package from the restaurant, a unique 6-digit OTP is created and emailed to you.</p>
              </div>
              <div className="bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-blue-100 space-y-1">
                <span className="font-extrabold text-blue-950 block">2. Share at Doorstep</span>
                <p className="text-blue-700">Only share your OTP code once the delivery partner arrives and hands over your package.</p>
              </div>
              <div className="bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-blue-100 space-y-1">
                <span className="font-extrabold text-blue-950 block">3. Instant Verification</span>
                <p className="text-blue-700">The rider enters your OTP into their terminal to confirm receipt and finalize your delivery status.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
