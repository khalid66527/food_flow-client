"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getOrderByIdApi } from "@/lib/api/order";
import { TOrder } from "@/types/order";

export default function OrderTracking() {
  const params = useParams();
  const searchParams = useSearchParams();

  const orderId =
    (params?.orderId as string) ||
    searchParams.get("orderId") ||
    searchParams.get("id") ||
    "N/A";

  const [order, setOrder] = useState<TOrder | null>(null);

  useEffect(() => {
    if (orderId && orderId !== "N/A") {
      getOrderByIdApi(orderId).then((res) => {
        if (res.success && res.data) {
          setOrder(res.data as TOrder);
        }
      });
    }
  }, [orderId]);

  const isCancelled = (order?.orderStatus || "").toLowerCase() === "cancelled";

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/customer/orders"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#FF6B35] transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      {/* Cancelled Order Notice or Minimalist Order Tracking Placeholder Box */}
      {isCancelled ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-rose-900">
            Order Has Been Cancelled (#{orderId})
          </h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-md mx-auto">
            Live order tracking is disabled because this order was cancelled. Please check your order history or place a new order.
          </p>
          <Link
            href="/dashboard/customer/orders"
            className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-md hover:bg-rose-700 transition"
          >
            Return to My Orders
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="inline-block px-3 py-1 rounded-full bg-orange-50 text-[#FF6B35] text-xs font-extrabold border border-orange-100">
            Order ID: #{orderId}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Order Tracking Placeholder
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            This space is prepared for team real-time Socket.io map tracking integration. All UI designs and static components have been cleared as requested.
          </p>

          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 font-mono">
            Route Target: <span className="font-bold text-gray-700">/dashboard/customer/order-tracking?orderId={orderId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
