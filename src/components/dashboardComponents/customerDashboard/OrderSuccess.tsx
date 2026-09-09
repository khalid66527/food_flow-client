"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import {
  CheckCircle2,
  FileText,
  MapPin,
  Loader2,
  ArrowRight,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  User,
  Phone,
  Home,
  Briefcase,
  Download,
  ExternalLink,
} from "lucide-react";
import { TOrder } from "@/types/order";
import { getOrderByIdApi } from "@/lib/api/order";
import { downloadInvoicePdf } from "@/lib/pdf/generateInvoice";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderIdParam = searchParams.get("orderId") || searchParams.get("order_id");
  const sessionIdParam = searchParams.get("session_id");

  const [order, setOrder] = useState<TOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchOrder = async () => {
      const targetId = orderIdParam || sessionIdParam;

      if (!targetId) {
        setIsLoading(false);
        setOrder(null);
        setErrorMsg("No active order ID or payment session found in request.");
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await getOrderByIdApi(
          targetId,
          undefined,
          undefined,
          sessionIdParam || undefined
        );
        if (isCancelled) return;

        if (res.success && res.data) {
          setOrder(res.data as TOrder);
        } else {
          setOrder(null);
          setErrorMsg(res.message || "Unable to load order from database.");
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setOrder(null);
          const message = err instanceof Error ? err.message : "Failed to connect to database. Server may be offline.";
          setErrorMsg(message);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchOrder();

    return () => {
      isCancelled = true;
    };
  }, [orderIdParam, sessionIdParam]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setIsDownloading(true);
    await downloadInvoicePdf(order);
    setIsDownloading(false);
  };

  const handleTrackOrder = () => {
    const targetId = order?.orderId || order?._id || order?.id;
    if (targetId) {
      router.push(`/dashboard/customer/order-tracking?orderId=${targetId}`);
    } else {
      router.push("/dashboard/customer/order-tracking");
    }
  };

  if (isLoading) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center bg-white rounded-3xl border border-rose-100 p-8 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto font-black text-2xl border border-rose-200">
          !
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Order Not Found</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {errorMsg || "We couldn't retrieve the details for this order from MongoDB."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/dashboard/customer/orders"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition"
          >
            View My Orders History
          </Link>
        </div>
      </div>
    );
  }

  const isStripe = order.paymentMethod === "STRIPE" || Boolean(sessionIdParam);
  const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
  const isCancelled = (order.orderStatus || "").toLowerCase() === "cancelled";
  const isPaid = order.paymentStatus === "Paid" || isStripe || isDelivered;
  const isVoucherEnabled = isDelivered;
  const isTrackEnabled = !isCancelled;

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8 animate-fadeIn">
      {/* Top Banner Celebration Card (Signature Bright Orange Gradient Theme) */}
      <div className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden text-center">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-3 text-white border border-white/30">
          🎉 Order Confirmed
        </span>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          Thank You For Your Order!
        </h1>

        <p className="text-orange-100 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
          Your order <span className="font-extrabold text-white">#{order.orderId}</span> has been successfully placed and forwarded to the restaurant kitchen.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-extrabold">
          <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md shadow-xs">
            Method: {isStripe ? "Stripe Online Payment" : "Cash on Delivery (COD)"}
          </span>
          <span
            className={`px-4 py-1.5 rounded-full border backdrop-blur-md ${isPaid
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
          >
            Payment Status: {isPaid ? "Paid" : "Cash on Delivery (Unpaid)"}
          </span>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="bg-white rounded-3xl border border-orange-100 shadow-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-gray-900">
            Order Actions
          </h2>
          <p className="text-xs text-gray-500">
            {isVoucherEnabled
              ? "Download your official voucher invoice or track your order in real-time."
              : "Track your live delivery progress in real-time. Voucher will be unlocked upon delivery."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Action 1: Download Voucher / Invoice */}
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={isDownloading || !isVoucherEnabled}
            className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-extrabold text-sm shadow-lg transition ${isVoucherEnabled
                ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:brightness-125 active:scale-98 cursor-pointer"
                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
              }`}
            title={
              isVoucherEnabled
                ? "Download Invoice Voucher"
                : "Voucher download will unlock after successful delivery (Delivered)"
            }
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className={`w-5 h-5 ${isVoucherEnabled ? "text-[#FF6B35]" : "text-gray-400"}`} />
                Download Voucher / Invoice
              </>
            )}
          </button>

          {/* Action 2: Track Order */}
          {isTrackEnabled ? (
            <button
              type="button"
              onClick={handleTrackOrder}
              className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-98 transition cursor-pointer"
            >
              <MapPin className="w-5 h-5" />
              Track Order
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-extrabold text-sm bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60 shadow-xs"
              title="Order tracking is disabled for cancelled orders"
            >
              <MapPin className="w-5 h-5 text-gray-400" />
              Track Order
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Address Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="w-4 h-4 text-[#FF6B35]" /> Delivery Address
          </h3>

          {order.deliveryAddress && (
            <div className="text-xs space-y-1.5 text-gray-700">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {order.deliveryAddress.fullName}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {order.deliveryAddress.phoneNumber}
              </p>
              <p className="font-medium pt-1">
                {order.deliveryAddress.streetAddress}, {order.deliveryAddress.area}
                {order.deliveryAddress.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <ShoppingBag className="w-4 h-4 text-[#FF6B35]" /> Ordered Items
          </h3>

          <div className="space-y-2 text-xs divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
            {(order.items || []).map((item, idx) => {
              const unitPrice = item.discountPrice || item.price;
              return (
                <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-extrabold text-gray-900">
                    Tk {(unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm font-extrabold text-gray-900">
            <span>Total Paid</span>
            <span className="text-[#FF6B35] text-lg">Tk {(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccess() {
  return (
    <Suspense fallback={<LoadingSpinner size={50} minHeight="60vh" />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
