"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Store,
  CheckCircle2,
  Phone,
  MapPin,
  Truck,
  Banknote,
  Search,
  Calendar,
  Wallet,
  ShoppingBag,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  UtensilsCrossed,
  Receipt,
  Download,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRestaurantOrdersApi } from "@/lib/api/order";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

function getRestaurantProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foodflow_restaurant_data");
    return raw ? (JSON.parse(raw) as { _id?: string; restaurantName?: string }) : null;
  } catch {
    return null;
  }
}

export default function RestaurantSalesHistory() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 8;

  const restaurantProfile = getRestaurantProfile();

  const fetchSalesHistory = useCallback(async () => {
    if (!userId || !userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRestaurantOrdersApi(userId, userEmail, {
        restaurantId: restaurantProfile?._id,
        restaurantName: restaurantProfile?.restaurantName,
        status: "Delivered",
      });

      if (res.success && Array.isArray(res.data)) {
        const deliveredOrders = (res.data as TOrder[]).filter(
          (o) => (o.orderStatus || "").toLowerCase() === "delivered"
        );
        setOrders(deliveredOrders);
      } else {
        setOrders([]);
        if (res.message) setError(res.message);
      }
    } catch (err: any) {
      console.error("Failed to load restaurant sales history:", err);
      setError(err.message || "Failed to load sales history.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, restaurantProfile?._id, restaurantProfile?.restaurantName]);

  useEffect(() => {
    if (!sessionPending && userId) {
      fetchSalesHistory();
    }
  }, [sessionPending, userId, fetchSalesHistory]);

  // Financial Stats calculation for this restaurant's items
  const stats = useMemo(() => {
    const totalSalesCount = orders.length;
    let totalRevenue = 0;
    let totalItemsSold = 0;

    orders.forEach((o) => {
      // Calculate revenue from this restaurant's items
      const myItems = o.items || [];
      myItems.forEach((item) => {
        const p = item.discountPrice || item.price || 0;
        const q = item.quantity || 1;
        totalRevenue += p * q;
        totalItemsSold += q;
      });
    });

    const avgOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    return { totalSalesCount, totalRevenue, totalItemsSold, avgOrderValue };
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
          order.riderInfo?.name?.toLowerCase().includes(q) ||
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 🟠 TOP HEADER BANNER */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Receipt className="w-3.5 h-3.5 text-white" /> Sales History & Analytics
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Restaurant Sales History
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Detailed record of all completed food sales, assigned delivery partners, and customer order breakdowns.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSalesHistory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
            title="Refresh Sales History"
          >
            <RefreshCw className="w-4 h-4 text-white" /> Refresh History
          </button>
        </div>
      </section>

      {/* 📊 STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Completed Orders
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {stats.totalSalesCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Sales Revenue
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">
            Tk {stats.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Dishes Sold
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            {stats.totalItemsSold} Items
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Avg. Order Value
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            Tk {stats.avgOrderValue.toFixed(2)}
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
            placeholder="Search order #, customer, rider, dish..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: "ALL", label: "All Sales" },
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
            onClick={fetchSalesHistory}
            className="underline font-bold text-rose-800 shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 📦 SALES CARDS */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Sales History Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || paymentFilter !== "ALL"
                ? "No completed sales match your search criteria."
                : "Completed customer orders will be recorded here once marked delivered."}
            </p>
          </div>
          <Link
            href="/dashboard/restaurant/orders"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:brightness-105 transition"
          >
            <span>View Active Orders</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {paginatedOrders.map((order) => {
            const deliveredDate = order.deliveredAt || order.updatedAt || order.createdAt;
            const formattedDate = deliveredDate
              ? new Date(deliveredDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Completed";

            const itemCount = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

            return (
              <div
                key={order._id || order.orderId}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
              >
                {/* Header Line */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                        Order #{order.orderId}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Delivered & Paid
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Delivered on {formattedDate}
                      </span>
                      <span>•</span>
                      <span className="text-gray-600 font-bold">
                        {itemCount} item{itemCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* Revenue / Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                      <Wallet className="w-3.5 h-3.5" />
                      Revenue: Tk {(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 3-Column Body: Customer Info, Rider Info, Sold Dishes */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* 1. Customer Details (কোন কাস্টমার) */}
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                      <User className="w-4 h-4 text-[#FF6B35]" />
                      <span>Customer Details</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-gray-800">
                        {order.deliveryAddress?.fullName || order.userName || "Customer"}
                      </p>
                      <p className="text-gray-500 leading-relaxed">
                        {[
                          order.deliveryAddress?.streetAddress,
                          order.deliveryAddress?.building,
                          order.deliveryAddress?.area,
                          order.deliveryAddress?.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {order.deliveryAddress?.phoneNumber && (
                        <div className="pt-1">
                          <a
                            href={`tel:${order.deliveryAddress.phoneNumber}`}
                            className="inline-flex items-center gap-1 text-[#FF6B35] font-bold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {order.deliveryAddress.phoneNumber}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Delivery Partner / Rider Details (কোন রাইডার) */}
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                      <Truck className="w-4 h-4 text-[#FF6B35]" />
                      <span>Delivery Partner</span>
                    </div>
                    {order.riderInfo?.name ? (
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-gray-800">{order.riderInfo.name}</p>
                        <p className="text-gray-500 font-medium">
                          Vehicle: {order.riderInfo.vehicleNumber || "Delivery Bike"}
                        </p>
                        {order.riderInfo.phone && (
                          <div className="pt-1">
                            <a
                              href={`tel:${order.riderInfo.phone}`}
                              className="inline-flex items-center gap-1 text-[#FF6B35] font-bold hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {order.riderInfo.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium pt-1">
                        Completed via In-house / Direct Courier
                      </p>
                    )}
                  </div>

                  {/* 3. Items Sold Breakdown (কী কী বিক্রি হয়েছে) */}
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                      <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />
                      <span>Dishes Sold ({itemCount})</span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {(order.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-gray-700 font-medium py-0.5"
                        >
                          <span className="truncate pr-2">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-bold text-gray-900 shrink-0">
                            Tk {((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Bar: Payment Method & Totals */}
                <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-gray-600 font-semibold">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                      <Banknote className="w-3.5 h-3.5 text-[#FF6B35]" />
                      Payment: {order.paymentMethod === "STRIPE" ? "Paid Online (Stripe)" : "Cash on Delivery"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs font-bold text-gray-500">Total Net Sale:</span>
                    <span className="text-base sm:text-lg font-black text-gray-900">
                      Tk {(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-gray-500 font-medium">
                Showing <strong className="text-gray-800">{(currentPage - 1) * ORDERS_PER_PAGE + 1}</strong> to{" "}
                <strong className="text-gray-800">
                  {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}
                </strong>{" "}
                of <strong className="text-gray-800">{filteredOrders.length}</strong> completed sales
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white shadow-sm shadow-orange-500/20"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
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
