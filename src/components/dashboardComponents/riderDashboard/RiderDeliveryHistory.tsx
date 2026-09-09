"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  Phone,
  MapPin,
  Store,
  Banknote,
  Search,
  Calendar,
  Wallet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  UtensilsCrossed,
  Layers,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

export default function RiderDeliveryHistory() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 8;

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/success-orders?role=rider&userId=${userId}`, {
        headers: {
          ...(userId ? { "x-user-id": userId } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
        cache: "no-store",
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        setOrders([]);
        if (json.message) setError(json.message);
      }
    } catch (err: any) {
      console.error("Failed to load rider delivery history:", err);
      setError(err.message || "Failed to load delivery history.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    if (!sessionPending && userId) {
      fetchHistory();
    }
  }, [sessionPending, userId, fetchHistory]);

  // Statistics
  const stats = useMemo(() => {
    const totalDeliveries = orders.length;
    const totalEarnings = orders.reduce((sum, o) => sum + (o.totalAmount || 0) * 0.15, 0);
    const codCollected = orders
      .filter((o) => o.paymentMethod === "COD")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrderVolume = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return { totalDeliveries, totalEarnings, codCollected, totalOrderVolume };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          order.orderId?.toLowerCase().includes(q) ||
          order.userName?.toLowerCase().includes(q) ||
          order.deliveryAddress?.fullName?.toLowerCase().includes(q) ||
          order.deliveryAddress?.streetAddress?.toLowerCase().includes(q) ||
          order.items?.some((i) => i.restaurantName?.toLowerCase().includes(q)) ||
          order.items?.some((i) => i.name.toLowerCase().includes(q));

        const matchesPayment =
          paymentFilter === "ALL" ||
          (paymentFilter === "COD" && order.paymentMethod === "COD") ||
          (paymentFilter === "STRIPE" && (order.paymentMethod === "STRIPE" || (order.paymentMethod as string) === "STRIPE_CARD"));

        return matchesQuery && matchesPayment;
      })
      .sort((a, b) => {
        const timeA = a.deliveredAt || a.updatedAt || a.createdAt ? new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime() : 0;
        const timeB = b.deliveredAt || b.updatedAt || b.createdAt ? new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime() : 0;
        return timeB - timeA;
      });
  }, [orders, searchQuery, paymentFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIdx, startIdx + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  if (sessionPending || loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 🟠 TOP HEADER BANNER */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Bike className="w-3.5 h-3.5 text-white" /> Rider Partner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Delivery History
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Table log of all your completed deliveries, payout earnings (15%), and customer drop-off details.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4 text-white" /> Refresh History
          </button>
        </div>
      </section>

      {/* 📊 STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Completed Trips
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {stats.totalDeliveries}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Rider Earnings
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">
            Tk {stats.totalEarnings.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            COD Cash Collected
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600">
            Tk {stats.codCollected.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Order Volume
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            Tk {stats.totalOrderVolume.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 🔍 SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search customer, order #, or restaurant..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: "ALL", label: "All Deliveries" },
            { key: "COD", label: "Cash on Delivery" },
            { key: "STRIPE", label: "Paid Online" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPaymentFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                paymentFilter === tab.key
                  ? "bg-[#FF6B35] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ⚠️ Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button
            onClick={fetchHistory}
            className="underline font-bold text-rose-800 shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 📋 TABLE OF DELIVERIES */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Bike className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Delivery History Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || paymentFilter !== "ALL"
                ? "No completed deliveries match your search criteria."
                : "You haven't completed any deliveries yet. Accept orders from available deliveries to start earning!"}
            </p>
          </div>
          <Link
            href="/dashboard/rider/delivery-details"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition"
          >
            <span>Browse Available Deliveries</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-5">Delivery ID</th>
                  <th className="py-4 px-5">Customer (Dropoff)</th>
                  <th className="py-4 px-5">Pickup Restaurant</th>
                  <th className="py-4 px-5">Food Items</th>
                  <th className="py-4 px-5">Payment / COD</th>
                  <th className="py-4 px-5">Your Earning (15%)</th>
                  <th className="py-4 px-5">Delivered Time</th>
                  <th className="py-4 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedOrders.map((order) => {
                  const deliveredDate = order.deliveredAt || order.updatedAt || order.createdAt;
                  const formattedDelivered = deliveredDate
                    ? new Date(deliveredDate).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Completed";

                  const earning = Number(((order.totalAmount || 0) * 0.15).toFixed(2));
                  const rName = order.items?.[0]?.restaurantName || "FoodFlow Kitchen";

                  return (
                    <tr
                      key={order._id || order.orderId}
                      className="hover:bg-orange-50/20 transition-colors"
                    >
                      {/* 1. Delivery ID */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-extrabold text-gray-900 block">#{order.orderId}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Trip Completed</span>
                      </td>

                      {/* 2. Customer Details (কোন কাস্টমার) */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-0.5 max-w-[190px]">
                          <p className="font-bold text-gray-900 truncate">
                            {order.deliveryAddress?.fullName || order.userName || "Customer"}
                          </p>
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.area].filter(Boolean).join(", ")}
                          </p>
                          {order.deliveryAddress?.phoneNumber && (
                            <a
                              href={`tel:${order.deliveryAddress.phoneNumber}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6B35] hover:underline pt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              {order.deliveryAddress.phoneNumber}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 3. Restaurant Details (কোন রেস্টুরেন্ট) */}
                      <td className="py-4 px-5 align-top font-bold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#FF6B35] shrink-0" />
                          <span className="line-clamp-2">{rName}</span>
                        </div>
                      </td>

                      {/* 4. Food Items */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1 max-w-[180px]">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="text-gray-700 truncate">
                              <span className="font-semibold text-gray-900">{item.quantity}×</span> {item.name}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 5. Payment & COD */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-bold text-gray-900 block">
                          Tk {(order.totalAmount || 0).toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 bg-amber-50 text-amber-800 border border-amber-200">
                          <Banknote className="w-3 h-3" />
                          {order.paymentMethod === "COD" ? "COD Collected" : "Paid Online"}
                        </span>
                      </td>

                      {/* 6. Rider Earning */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-black text-[#FF6B35] text-sm block">
                          Tk {earning.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">15% Payout</span>
                      </td>

                      {/* 7. Delivered Time */}
                      <td className="py-4 px-5 align-top text-gray-600 font-medium text-[11px]">
                        {formattedDelivered}
                      </td>

                      {/* 8. Status Badge */}
                      <td className="py-4 px-5 align-top text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
              <div className="text-xs text-gray-500 font-medium">
                Showing <strong className="text-gray-800">{(currentPage - 1) * ORDERS_PER_PAGE + 1}</strong> to{" "}
                <strong className="text-gray-800">
                  {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}
                </strong>{" "}
                of <strong className="text-gray-800">{filteredOrders.length}</strong> completed deliveries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${
                      currentPage === i + 1
                        ? "bg-[#FF6B35] text-white"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
