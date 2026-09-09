"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
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
  Download,
  Loader2,
  Bike,
  Package,
  Layers,
  UtensilsCrossed,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { downloadInvoicePdf } from "@/lib/pdf/generateInvoice";

export default function CustomerDeliveryHistory() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 8;

  const fetchDeliveryHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/success-orders?role=customer&userId=${userId}`, {
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
      console.error("Failed to load customer delivery history:", err);
      setError(err.message || "Failed to load delivery history.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    if (!sessionPending && userId) {
      fetchDeliveryHistory();
    }
  }, [sessionPending, userId, fetchDeliveryHistory]);

  const handleDownloadInvoice = async (order: TOrder) => {
    try {
      setDownloadingId(order.orderId || order._id || "invoice");
      await downloadInvoicePdf(order);
    } catch (err) {
      console.error("Invoice voucher download error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalDeliveries = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const uniqueRiders = new Set(orders.map((o) => o.riderInfo?.riderId || o.riderInfo?.name).filter(Boolean)).size;
    const totalDishes = orders.reduce(
      (sum, o) => sum + (o.items || []).reduce((iSum, i) => iSum + (i.quantity || 1), 0),
      0
    );
    return { totalDeliveries, totalSpent, uniqueRiders, totalDishes };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          order.orderId?.toLowerCase().includes(q) ||
          order.riderInfo?.name?.toLowerCase().includes(q) ||
          order.items?.some((i) => i.restaurantName?.toLowerCase().includes(q)) ||
          order.items?.some((i) => i.name.toLowerCase().includes(q)) ||
          order.deliveryAddress?.streetAddress?.toLowerCase().includes(q);

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
              <ShoppingBag className="w-3.5 h-3.5 text-white" /> Customer History
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Delivery History
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Table view of all your successfully delivered meals, assigned rider partners, and invoices.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDeliveryHistory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4 text-white" /> Refresh History
          </button>
        </div>
      </section>

      {/* 📊 STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Delivered Orders
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {stats.totalDeliveries}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Spent
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">
            Tk {stats.totalSpent.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Dishes Enjoyed
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            {stats.totalDishes} Items
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Delivery Partners
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-600 flex items-center gap-1.5">
            <Bike className="w-5 h-5 text-blue-500" />
            {stats.uniqueRiders} Riders
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
            placeholder="Search order #, restaurant, rider, dish..."
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
            onClick={fetchDeliveryHistory}
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
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Delivery History Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || paymentFilter !== "ALL"
                ? "No completed deliveries match your search filter."
                : "You don't have any delivered orders yet. Explore our menu to place your first order!"}
            </p>
          </div>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition"
          >
            <span>Explore Restaurants</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-5">Order ID & Date</th>
                  <th className="py-4 px-5">Restaurant</th>
                  <th className="py-4 px-5">Food Items</th>
                  <th className="py-4 px-5">Delivery Partner (Rider)</th>
                  <th className="py-4 px-5">Delivery Address</th>
                  <th className="py-4 px-5">Payment & Total</th>
                  <th className="py-4 px-5">Delivered Time</th>
                  <th className="py-4 px-5 text-center">Invoice</th>
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

                  const rNames = [
                    ...new Set((order.items || []).map((i) => i.restaurantName).filter(Boolean)),
                  ].join(", ") || "FoodFlow Kitchen";

                  const isDownloading = downloadingId === (order.orderId || order._id);

                  return (
                    <tr
                      key={order._id || order.orderId}
                      className="hover:bg-orange-50/20 transition-colors"
                    >
                      {/* 1. Order ID & Status */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-extrabold text-gray-900 block">#{order.orderId}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                        </span>
                      </td>

                      {/* 2. Restaurant */}
                      <td className="py-4 px-5 align-top font-bold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#FF6B35] shrink-0" />
                          <span className="line-clamp-2">{rNames}</span>
                        </div>
                      </td>

                      {/* 3. Food Items */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1 max-w-[200px]">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="text-gray-700 truncate">
                              <span className="font-semibold text-gray-900">{item.quantity}×</span> {item.name}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 4. Delivery Partner (Rider) */}
                      <td className="py-4 px-5 align-top">
                        {order.riderInfo?.name ? (
                          <div className="space-y-1">
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              <Bike className="w-3.5 h-3.5 text-[#FF6B35]" />
                              {order.riderInfo.name}
                            </span>
                            {order.riderInfo.vehicleNumber && (
                              <span className="text-[10px] text-gray-500 block">
                                Vehicle: {order.riderInfo.vehicleNumber}
                              </span>
                            )}
                            {order.riderInfo.phone && (
                              <a
                                href={`tel:${order.riderInfo.phone}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6B35] hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {order.riderInfo.phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">Standard Courier</span>
                        )}
                      </td>

                      {/* 5. Delivery Address */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-0.5 max-w-[180px] text-gray-600">
                          <p className="font-bold text-gray-900 truncate">
                            {order.deliveryAddress?.fullName || order.userName || "Customer"}
                          </p>
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {[order.deliveryAddress?.streetAddress, order.deliveryAddress?.area].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </td>

                      {/* 6. Payment & Total */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-black text-gray-900 text-sm block">
                          Tk {(order.totalAmount || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 block mt-0.5">
                          {order.paymentMethod === "STRIPE" ? "Paid Online" : "Cash on Delivery"}
                        </span>
                      </td>

                      {/* 7. Delivered Time */}
                      <td className="py-4 px-5 align-top text-gray-600 font-medium text-[11px]">
                        {formattedDelivered}
                      </td>

                      {/* 8. Invoice Download */}
                      <td className="py-4 px-5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition shadow-2xs cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                          title="Download Invoice PDF"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </button>
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
                of <strong className="text-gray-800">{filteredOrders.length}</strong> delivered orders
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
