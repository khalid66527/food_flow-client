"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bike,
  Sparkles,
  Download,
  Building,
  Smartphone,
  Check,
  X,
  Store,
  MapPin,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "@/lib/auth-client";
import { TOrder } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

type PayoutRecord = {
  id: string;
  amount: number;
  method: "bKash" | "Nagad" | "Bank Transfer";
  account: string;
  date: string;
  status: "Completed" | "Processing" | "Pending";
};

function formatAddress(addr: unknown): string {
  if (!addr) return "Address on record";
  if (typeof addr === "string") return addr;
  const a = addr as { street?: string; area?: string; city?: string; fullAddress?: string };
  if (a.fullAddress) return a.fullAddress;
  return [a.street, a.area, a.city].filter(Boolean).join(", ") || "Address on record";
}

function getRestaurantName(order: TOrder): string {
  return order.items?.[0]?.restaurantName || (order as unknown as { restaurantName?: string }).restaurantName || "Restaurant Partner";
}

function getCustomerName(order: TOrder): string {
  return order.userName || (order as unknown as { customerName?: string }).customerName || "Customer";
}

export default function RiderEarnings() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string }
    | undefined;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<
    "bKash" | "Nagad" | "Bank Transfer"
  >("bKash");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock initial withdrawal history
  const [payouts, setPayouts] = useState<PayoutRecord[]>([
    {
      id: "PO-98421",
      amount: 1500,
      method: "bKash",
      account: "017***4582",
      date: new Date(Date.now() - 86400000 * 2).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Completed",
    },
    {
      id: "PO-97103",
      amount: 2200,
      method: "Nagad",
      account: "018***9921",
      date: new Date(Date.now() - 86400000 * 6).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: "Completed",
    },
  ]);

  // Load completed orders
  const fetchEarningsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/orders/success-orders?role=rider&userId=${user.id}`,
        {
          headers: {
            "x-user-id": user.id,
            "x-user-email": user.email || "",
          },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to load rider earnings data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionPending && user?.id) {
      fetchEarningsData();
    }
  }, [sessionPending, user?.id, fetchEarningsData]);

  // Calculations
  const stats = useMemo(() => {
    const totalDeliveries = orders.length;

    const totalEarnings = orders.reduce((sum, o) => {
      const fee = Number(o.deliveryFee) || 50;
      return sum + fee;
    }, 0);

    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toDateString() : "";
      return d === todayStr;
    });
    const todayEarnings = todayOrders.reduce((sum, o) => {
      const fee = Number(o.deliveryFee) || 50;
      return sum + fee;
    }, 0);

    const oneWeekAgo = Date.now() - 7 * 86400000;
    const weekOrders = orders.filter((o) => {
      const time = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return time >= oneWeekAgo;
    });
    const weekEarnings = weekOrders.reduce((sum, o) => {
      const fee = Number(o.deliveryFee) || 50;
      return sum + fee;
    }, 0);

    const codCollected = orders
      .filter((o) => (o.paymentMethod || "").toUpperCase() === "COD")
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const tipsEarned = totalDeliveries * 10;

    const totalWithdrawn = payouts
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, totalEarnings + tipsEarned - totalWithdrawn);

    return {
      totalDeliveries,
      totalEarnings,
      todayEarnings,
      weekEarnings,
      codCollected,
      tipsEarned,
      totalWithdrawn,
      availableBalance,
    };
  }, [orders, payouts]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const restName = getRestaurantName(order).toLowerCase();
      const custName = getCustomerName(order).toLowerCase();

      const matchesQuery =
        !q ||
        order.orderId?.toLowerCase().includes(q) ||
        restName.includes(q) ||
        custName.includes(q);

      const method = (order.paymentMethod || "").toUpperCase();
      const matchesMethod =
        methodFilter === "ALL" ||
        (methodFilter === "COD" && method === "COD") ||
        (methodFilter === "ONLINE" && method !== "COD");

      return matchesQuery && matchesMethod;
    });
  }, [orders, searchQuery, methodFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Handle Withdraw Form Submission
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (!amount || amount < 100) {
      toast.error("Minimum withdrawal amount is ৳100.");
      return;
    }

    if (amount > stats.availableBalance) {
      toast.error("Withdrawal amount cannot exceed available balance.");
      return;
    }

    if (!withdrawAccount.trim()) {
      toast.error("Please enter a valid recipient account/number.");
      return;
    }

    setIsWithdrawing(true);
    setTimeout(() => {
      const newPayout: PayoutRecord = {
        id: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
        amount,
        method: withdrawMethod,
        account: withdrawAccount.trim(),
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: "Completed",
      };

      setPayouts((prev) => [newPayout, ...prev]);
      setIsWithdrawing(false);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawAccount("");
      toast.success(`🎉 ৳${amount} payout sent successfully to ${withdrawMethod}!`);
    }, 1000);
  };

  if (sessionPending || loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 font-semibold text-sm">
          Loading your earnings analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 text-gray-800 font-sans">
      {/* ========================================================================= */}
      {/* 💳 1. EARNINGS HERO BANNER WITH FOODFLOW BRAND THEME */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 md:p-8 shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/50 shadow-lg shrink-0 bg-white/20 flex items-center justify-center">
              <Wallet className="w-9 h-9 text-white drop-shadow" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Available Wallet Balance
              </span>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm mt-0.5">
                ৳{stats.availableBalance.toLocaleString()}
              </h1>
              <p className="text-white/90 text-xs md:text-sm font-medium mt-1">
                Lifetime Earned: <strong>৳{stats.totalEarnings}</strong> from {stats.totalDeliveries} completed deliveries
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchEarningsData();
              }}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 transition active:scale-95"
              title="Refresh earnings"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              className="px-6 py-3 rounded-2xl bg-white text-[#FF6B35] hover:bg-orange-50 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-black/10 transition active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 text-[#FF6B35]" />
              <span>Withdraw Funds</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📊 2. METRICS CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Today&apos;s Revenue
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              ৳{stats.todayEarnings}
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              Daily Active Shift
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              This Week
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              ৳{stats.weekEarnings}
            </h3>
            <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
              Last 7 Days
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Customer Tips */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Customer Tips
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              ৳{stats.tipsEarned}
            </h3>
            <span className="text-[11px] font-semibold text-purple-600 mt-0.5">
              100% Tips Kept
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* COD Cash in Hand */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              COD Cash In Hand
            </span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              ৳{stats.codCollected}
            </h3>
            <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
              Cash on Delivery Orders
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📜 3. RECENT PAYOUTS HISTORY */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Payout & Withdrawal Transactions
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Funds transferred directly to your mobile wallet or bank account.
            </p>
          </div>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF6B35] font-extrabold text-xs rounded-xl border border-orange-200 transition flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Request Payout
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-extrabold">
                <th className="py-3 px-3">Transaction ID</th>
                <th className="py-3 px-3">Payment Channel</th>
                <th className="py-3 px-3">Recipient Account</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-3.5 px-3 font-mono font-extrabold text-gray-900">
                    {p.id}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-extrabold text-gray-800 flex items-center gap-1.5">
                      {p.method === "bKash" && (
                        <span className="w-2 h-2 rounded-full bg-pink-500" />
                      )}
                      {p.method === "Nagad" && (
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                      {p.method === "Bank Transfer" && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      {p.method}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-gray-600 font-mono">
                    {p.account}
                  </td>
                  <td className="py-3.5 px-3 text-gray-500">{p.date}</td>
                  <td className="py-3.5 px-3 font-black text-gray-900 text-sm">
                    ৳{p.amount}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📋 4. TRIP-BY-TRIP DETAILED EARNINGS LEDGER */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Trip Delivery Fees & Order Breakdown
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Every completed food delivery and fee credited to your wallet.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search restaurant/order..."
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none w-48"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#FF6B35] outline-none font-bold text-gray-700 bg-white"
            >
              <option value="ALL">All Payments</option>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="ONLINE">Paid Online</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Bike className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="font-bold text-sm text-gray-700">
              No delivery records found
            </h4>
            <p className="text-xs text-gray-400">
              Complete deliveries to start building your earnings ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-extrabold">
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Restaurant</th>
                  <th className="py-3 px-3">Customer & Drop</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Order Total</th>
                  <th className="py-3 px-3 text-right">Rider Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => {
                  const id = order.orderId || order._id || "";
                  const fee = Number(order.deliveryFee) || 50;
                  const isCod =
                    (order.paymentMethod || "").toUpperCase() === "COD";

                  return (
                    <tr
                      key={id}
                      className="hover:bg-orange-50/20 transition group"
                    >
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-extrabold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                          #{id.slice(-6).toUpperCase()}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )
                            : "Delivered"}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-gray-900 block truncate max-w-[150px]">
                          {getRestaurantName(order)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-gray-800 block truncate max-w-[160px]">
                          {getCustomerName(order)}
                        </span>
                        <span className="text-[10px] text-gray-400 line-clamp-1">
                          {formatAddress(order.deliveryAddress)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isCod
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {order.paymentMethod || "COD"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-gray-700">
                        ৳{order.totalAmount || 0}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-black text-emerald-600 text-sm">
                          +৳{fee}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Page {currentPage} of {totalPages} ({filteredOrders.length} trips)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🛑 WITHDRAWAL POPUP MODAL */}
      {/* ========================================================================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">
                    Withdraw Earnings
                  </h3>
                  <p className="text-xs text-gray-500">
                    Available: <strong>৳{stats.availableBalance}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Payout Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "bKash", label: "bKash" },
                    { id: "Nagad", label: "Nagad" },
                    { id: "Bank Transfer", label: "Bank" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setWithdrawMethod(
                          m.id as "bKash" | "Nagad" | "Bank Transfer"
                        )
                      }
                      className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition ${
                        withdrawMethod === m.id
                          ? "bg-gradient-to-r from-[#FF6B35] to-[#FF7843] text-white shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Account */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {withdrawMethod === "Bank Transfer"
                    ? "Bank Account Number & Branch"
                    : `${withdrawMethod} Personal/Agent Number`}
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder={
                    withdrawMethod === "Bank Transfer"
                      ? "e.g. 150.120.48512 (City Bank)"
                      : "017XXXXXXXX"
                  }
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-900"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Amount to Withdraw (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={100}
                    max={stats.availableBalance}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-sm font-extrabold text-gray-900"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                  <span>Min: ৳100</span>
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawAmount(String(stats.availableBalance))
                    }
                    className="text-[#FF6B35] font-bold hover:underline"
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#FF6B35] to-[#FF7843] hover:from-[#ff5518] hover:to-[#ff672a] text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {isWithdrawing ? "Processing..." : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
