"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  Bike,
  UtensilsCrossed,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  Eye,
  X,
  CreditCard,
  Percent,
  Receipt,
  MessageSquare,
  Sparkles,
  Award,
  Calendar,
  Activity,
  UserCheck,
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

interface OverviewData {
  stats: {
    revenue: {
      totalGross: number;
      adminProfit: number;
      restaurantPayout: number;
      riderPayout: number;
      taxFundVat: number;
      discounts: number;
      averageOrderValue: number;
    };
    orders: {
      total: number;
      delivered: number;
      placed: number;
      preparing: number;
      onTheWay: number;
      cancelled: number;
      paid: number;
      pending: number;
      cod: number;
      stripe: number;
    };
    users: {
      total: number;
      customers: number;
      restaurants: number;
      riders: number;
      admins: number;
      active: number;
      pending: number;
    };
    partners: {
      restaurantsTotal: number;
      restaurantsActive: number;
      restaurantsPending: number;
      ridersTotal: number;
      ridersActive: number;
      ridersPending: number;
      totalPendingApprovals: number;
    };
    catalog: {
      totalFoods: number;
      availableFoods: number;
      totalCategories: number;
      totalReviews: number;
      unreadMessages: number;
    };
    settings: {
      vatPercentage?: number;
      restaurantCommissionPercentage?: number;
      riderCommissionPercentage?: number;
      deliveryFeePerKm?: number;
    };
  };
  chartData: {
    date: string;
    day: string;
    sales: number;
    orders: number;
    adminNet: number;
  }[];
  recentOrders: any[];
  recentUsers: any[];
  topRestaurants: any[];
  topFoods: any[];
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "delivered" | "pending">("all");
  const [chartMetric, setChartMetric] = useState<"sales" | "adminNet" | "orders">("sales");

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err) {
      console.error("Failed to fetch admin overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter recent orders by tab
  const filteredRecentOrders = useMemo(() => {
    if (!data?.recentOrders) return [];
    if (activeTab === "all") return data.recentOrders;
    if (activeTab === "active") {
      return data.recentOrders.filter((o) =>
        ["placed", "preparing", "cooking", "confirmed", "on the way", "on_the_way"].includes(
          (o.orderStatus || "").toLowerCase()
        )
      );
    }
    if (activeTab === "delivered") {
      return data.recentOrders.filter((o) => (o.orderStatus || "").toLowerCase() === "delivered");
    }
    if (activeTab === "pending") {
      return data.recentOrders.filter((o) => (o.paymentStatus || "").toLowerCase() === "pending");
    }
    return data.recentOrders;
  }, [data?.recentOrders, activeTab]);

  // Max chart value for relative bar heights
  const maxChartVal = useMemo(() => {
    if (!data?.chartData || data.chartData.length === 0) return 100;
    const maxVal = Math.max(...data.chartData.map((d) => d[chartMetric]));
    return maxVal > 0 ? maxVal : 100;
  }, [data?.chartData, chartMetric]);

  if (loading && !data) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-[#F8F9FC] p-6">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-semibold text-gray-500 animate-pulse">
          Connecting to FoodFlow Core Services & Analytics...
        </p>
      </div>
    );
  }

  const stats = data?.stats;
  const adminName = session?.user?.name || "Super Admin";

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-16 pt-3">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* =========================================================================
            1. HERO COMMAND BANNER & HEADER (SIGNATURE FOODFLOW BRAND GRADIENT)
        ========================================================================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 border border-orange-400/30">
          {/* Decorative glowing gradient orbs */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-amber-300/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-xs font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span>FoodFlow Master Control System</span>
                <span className="text-white/60">•</span>
                <span className="text-emerald-200 font-black">100% Operational</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Welcome back, <span>{adminName}</span> 👋
              </h1>
              <p className="text-sm sm:text-base text-orange-50/90 max-w-2xl font-medium">
                Here is the real-time financial health, fleet activity, and cross-restaurant intelligence across the FoodFlow ecosystem.
              </p>
            </div>

            {/* Top Right Quick Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-orange-100" />
                <span>Last Synced: <strong className="text-white font-bold">{lastUpdated || "Live"}</strong></span>
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-orange-50 text-[#FF6B35] text-xs sm:text-sm font-black shadow-lg shadow-black/10 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#FF6B35]" : "text-[#FF6B35]"}`} />
                <span>{refreshing ? "Syncing..." : "Sync Live Data"}</span>
              </button>
            </div>
          </div>

          {/* Quick Stat Ribbon inside Hero */}
          <div className="mt-8 pt-6 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-xs text-orange-100 font-semibold">Platform GMV Volume</p>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                ${(stats?.revenue.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-xs text-orange-100 font-semibold">Platform Net Profit</p>
              <p className="text-lg sm:text-xl font-black text-emerald-100 mt-1">
                +${(stats?.revenue.adminProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-xs text-orange-100 font-semibold">Completed Orders</p>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                {(stats?.orders.delivered || 0).toLocaleString()} <span className="text-xs text-orange-100 font-normal">/ {stats?.orders.total || 0}</span>
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-xs text-orange-100 font-semibold">Pending Approvals</p>
              <p className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-1.5">
                {stats?.partners.totalPendingApprovals || 0}
                {(stats?.partners.totalPendingApprovals || 0) > 0 && (
                  <span className="text-[10px] bg-white text-[#FF6B35] font-black px-2 py-0.5 rounded-full shadow-sm">Action</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. ACTION REQUIRED HUB (IF PENDING APPROVALS OR UNREAD MESSAGES)
        ========================================================================== */}
        {((stats?.partners.totalPendingApprovals || 0) > 0 || (stats?.catalog.unreadMessages || 0) > 0) && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Action Required: Pending Verification & Inquiries
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                    {(stats?.partners.totalPendingApprovals || 0) + (stats?.catalog.unreadMessages || 0)} Pending
                  </span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {stats?.partners.restaurantsPending || 0} restaurants and {stats?.partners.ridersPending || 0} delivery riders are waiting for KYC approval. {stats?.catalog.unreadMessages || 0} unread customer inquiries.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/admin/restaurant&rider"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5"
              >
                <span>Review Partners</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              {(stats?.catalog.unreadMessages || 0) > 0 && (
                <Link
                  href="/dashboard/admin/messages"
                  className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold transition-all"
                >
                  View Messages
                </Link>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            3. CORE KPI TILES (HIGH-IMPACT CARDS)
        ========================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Gross GMV */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gross GMV</span>
              <div className="w-9 h-9 rounded-2xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-gray-900">
                ${(stats?.revenue.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Gross platform volume</span>
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Paid: {stats?.orders.paid || 0}</span>
              <span>Pending: {stats?.orders.pending || 0}</span>
            </div>
          </div>

          {/* Card 2: Net Platform Profit */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Profit</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-emerald-600">
                ${(stats?.revenue.adminProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                After coupon subsidies
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Margin: ~15%</span>
              <span>Tax VAT: ${(stats?.revenue.taxFundVat || 0).toFixed(0)}</span>
            </div>
          </div>

          {/* Card 3: Total Orders */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
              <div className="w-9 h-9 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-gray-900">
                {(stats?.orders.total || 0).toLocaleString()}
              </h2>
              <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                <span>{stats?.orders.delivered || 0} delivered</span>
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Active: {(stats?.orders.placed || 0) + (stats?.orders.preparing || 0) + (stats?.orders.onTheWay || 0)}</span>
              <span className="text-red-500">Cancelled: {stats?.orders.cancelled || 0}</span>
            </div>
          </div>

          {/* Card 4: Registered Users */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Users</span>
              <div className="w-9 h-9 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-gray-900">
                {(stats?.users.total || 0).toLocaleString()}
              </h2>
              <p className="text-xs text-purple-600 font-semibold mt-1">
                {stats?.users.customers || 0} active customers
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Rest: {stats?.users.restaurants || 0}</span>
              <span>Riders: {stats?.users.riders || 0}</span>
            </div>
          </div>

          {/* Card 5: Kitchens & Fleets */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partners</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-gray-900">
                {(stats?.partners.restaurantsTotal || 0) + (stats?.partners.ridersTotal || 0)}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {stats?.partners.restaurantsActive || 0} kitchens • {stats?.partners.ridersActive || 0} riders
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="text-amber-600 font-semibold">Pending: {stats?.partners.totalPendingApprovals || 0}</span>
              <Link href="/dashboard/admin/restaurant&rider" className="text-[#FF6B35] font-bold hover:underline">Manage</Link>
            </div>
          </div>

          {/* Card 6: Food Catalog & Items */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Food Catalog</span>
              <div className="w-9 h-9 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-gray-900">
                {(stats?.catalog.totalFoods || 0).toLocaleString()}
              </h2>
              <p className="text-xs text-rose-600 font-semibold mt-1">
                {stats?.catalog.availableFoods || 0} in stock & live
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Categories: {stats?.catalog.totalCategories || 0}</span>
              <Link href="/dashboard/admin/foods" className="text-[#FF6B35] font-bold hover:underline">View</Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. VISUAL TRENDS & ORDER LIFECYCLE ANALYTICS
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-Day Performance Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="text-lg font-extrabold text-gray-900">7-Day Financial & Volume Trends</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Real-time daily platform performance</p>
              </div>

              {/* Metric Toggle */}
              <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 self-start sm:self-auto">
                <button
                  onClick={() => setChartMetric("sales")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMetric === "sales"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Gross Sales ($)
                </button>
                <button
                  onClick={() => setChartMetric("adminNet")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMetric === "adminNet"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Admin Profit ($)
                </button>
                <button
                  onClick={() => setChartMetric("orders")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMetric === "orders"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Orders (#)
                </button>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-gray-100">
              {(data?.chartData || []).map((item, idx) => {
                const val = item[chartMetric];
                const heightPercent = Math.max(8, Math.round((val / maxChartVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mb-1 text-[10px] font-bold px-2 py-1 bg-gray-900 text-white rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-20">
                      {chartMetric === "orders" ? `${val} orders` : `$${val.toFixed(2)}`}
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full max-w-[48px] bg-gray-100 rounded-t-2xl overflow-hidden relative flex flex-col justify-end" style={{ height: "100%" }}>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-2xl transition-all duration-500 ${
                          chartMetric === "adminNet"
                            ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-700 group-hover:to-emerald-500"
                            : chartMetric === "orders"
                            ? "bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-700 group-hover:to-blue-500"
                            : "bg-gradient-to-t from-[#FF6B35] to-[#FF8C42] group-hover:from-[#FF5A1F] group-hover:to-[#FF7843]"
                        }`}
                      />
                    </div>

                    {/* Day label */}
                    <div className="text-center pt-2">
                      <span className="text-xs font-bold text-gray-700 block">{item.day}</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {chartMetric === "orders" ? `${val}` : `$${Math.round(val)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick summary footer */}
            <div className="grid grid-cols-3 gap-4 pt-1 text-center">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Avg Order Value</span>
                <span className="text-base font-black text-gray-900">${(stats?.revenue.averageOrderValue || 0).toFixed(2)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Restaurant Payouts</span>
                <span className="text-base font-black text-gray-900">${(stats?.revenue.restaurantPayout || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Rider Fleet Payouts</span>
                <span className="text-base font-black text-gray-900">${(stats?.revenue.riderPayout || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Pipeline & Settlement Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="text-lg font-extrabold text-gray-900">Order Lifecycle</h3>
                </div>
                <span className="text-xs font-bold text-gray-400">Status Mix</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Real-time fulfillment distribution</p>

              {/* Status List with Visual Bars */}
              <div className="mt-6 space-y-4">
                {/* Delivered */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Delivered Successfully
                    </span>
                    <span>{stats?.orders.delivered || 0} ({stats?.orders.total ? Math.round(((stats?.orders.delivered || 0) / stats.orders.total) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${stats?.orders.total ? ((stats?.orders.delivered || 0) / stats.orders.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* In Delivery / On the way */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Out For Delivery
                    </span>
                    <span>{stats?.orders.onTheWay || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${stats?.orders.total ? ((stats?.orders.onTheWay || 0) / stats.orders.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Preparing */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Kitchen Preparing
                    </span>
                    <span>{stats?.orders.preparing || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats?.orders.total ? ((stats?.orders.preparing || 0) / stats.orders.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Placed / New */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Newly Placed
                    </span>
                    <span>{stats?.orders.placed || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${stats?.orders.total ? ((stats?.orders.placed || 0) / stats.orders.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Cancelled */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Cancelled / Rejected
                    </span>
                    <span>{stats?.orders.cancelled || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${stats?.orders.total ? ((stats?.orders.cancelled || 0) / stats.orders.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Split */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Settlement Channels</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center text-[#FF6B35]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Cash on Delivery</span>
                    <span className="text-sm font-black text-gray-900 block">{stats?.orders.cod || 0} orders</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Stripe / Online</span>
                    <span className="text-sm font-black text-gray-900 block">{stats?.orders.stripe || 0} orders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. QUICK OPERATIONS HUB (8 CORE SECTIONS NAVIGATION)
        ========================================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Platform Command Hub</h3>
              <p className="text-xs text-gray-500">Jump directly into any management sub-system</p>
            </div>
            <span className="text-xs font-bold text-gray-400">8 Modules Active</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 1. Users */}
            <Link
              href="/dashboard/admin/users"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">User Management</h4>
                <p className="text-xs text-gray-500 mt-0.5">{stats?.users.total || 0} accounts • Roles & Status</p>
              </div>
            </Link>

            {/* 2. Restaurant & Rider */}
            <Link
              href="/dashboard/admin/restaurant&rider"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative"
            >
              {(stats?.partners.totalPendingApprovals || 0) > 0 && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                  {stats?.partners.totalPendingApprovals} pending
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Partners & KYC</h4>
                <p className="text-xs text-gray-500 mt-0.5">{stats?.partners.restaurantsActive || 0} kitchens • {stats?.partners.ridersActive || 0} riders</p>
              </div>
            </Link>

            {/* 3. Global Foods */}
            <Link
              href="/dashboard/admin/foods"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Food Catalog</h4>
                <p className="text-xs text-gray-500 mt-0.5">{stats?.catalog.totalFoods || 0} items • Stock & Pricing</p>
              </div>
            </Link>

            {/* 4. Categories */}
            <Link
              href="/dashboard/admin/categories"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Food Categories</h4>
                <p className="text-xs text-gray-500 mt-0.5">{stats?.catalog.totalCategories || 0} categories configured</p>
              </div>
            </Link>

            {/* 5. Transactions */}
            <Link
              href="/dashboard/admin/transactions"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Financial Ledger</h4>
                <p className="text-xs text-gray-500 mt-0.5">Payouts, Commissions, Refunds</p>
              </div>
            </Link>

            {/* 6. Reviews */}
            <Link
              href="/dashboard/admin/reviews"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Reviews & Ratings</h4>
                <p className="text-xs text-gray-500 mt-0.5">{stats?.catalog.totalReviews || 0} customer reviews</p>
              </div>
            </Link>

            {/* 7. Messages */}
            <Link
              href="/dashboard/admin/messages"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative"
            >
              {(stats?.catalog.unreadMessages || 0) > 0 && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                  {stats?.catalog.unreadMessages} new
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Support Messages</h4>
                <p className="text-xs text-gray-500 mt-0.5">Contact forms & inquiries</p>
              </div>
            </Link>

            {/* 8. Settings */}
            <Link
              href="/dashboard/admin/settings"
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-orange-50/50 p-5 rounded-3xl border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Percent className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B35] transition-colors" />
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-[#FF6B35] transition-colors">Global Settings</h4>
                <p className="text-xs text-gray-500 mt-0.5">VAT: {stats?.settings.vatPercentage || 5}% • Com: {stats?.settings.restaurantCommissionPercentage || 15}%</p>
              </div>
            </Link>
          </div>
        </div>

        {/* =========================================================================
            6. REAL-TIME ORDERS TABLE
        ========================================================================== */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#FF6B35]" />
                <h3 className="text-lg font-extrabold text-gray-900">Recent Platform Orders</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Live stream of incoming customer orders across all vendors</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl self-start sm:self-auto overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All Orders ({data?.recentOrders.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("delivered")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "delivered" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Delivered
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "pending" ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Payment Pending
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Order Status</th>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {filteredRecentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No orders found in this view filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecentOrders.map((order: any, idx: number) => {
                    const status = (order.orderStatus || "Placed").toLowerCase();
                    let statusBadgeClass = "bg-gray-100 text-gray-700 border-gray-200";
                    if (status === "delivered") statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    else if (["preparing", "cooking", "confirmed"].includes(status)) statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    else if (["on the way", "on_the_way", "picked_up"].includes(status)) statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    else if (status === "cancelled") statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                    else if (status === "placed") statusBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";

                    const isPaid = order.paymentStatus === "Paid";

                    return (
                      <tr key={order.id || idx} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-gray-900">
                          <span className="font-mono text-xs">{order.orderId}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-900">{order.customerName}</div>
                          <div className="text-[11px] text-gray-400">{order.customerEmail}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-black text-gray-900 text-sm">
                            ${(order.totalAmount || 0).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-bold">
                            Profit: +${(order.adminNetProfit || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-800">{order.paymentMethod}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}>
                            {order.orderStatus || "Placed"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-[11px]">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-[#FF6B35] hover:text-white text-gray-600 transition-all cursor-pointer"
                            title="View Full Order Breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Showing latest orders in system</span>
            <Link
              href="/dashboard/admin/transactions"
              className="text-[#FF6B35] font-bold hover:underline flex items-center gap-1"
            >
              <span>View Full Ledger & Exports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* =========================================================================
            7. TOP RESTAURANTS & RECENT SIGNUPS SPOTLIGHT
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Restaurants */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#FF6B35]" />
                  <span>Partner Kitchens</span>
                </h3>
                <p className="text-xs text-gray-500">Active restaurants on FoodFlow</p>
              </div>
              <Link href="/dashboard/admin/restaurant&rider" className="text-xs font-bold text-[#FF6B35] hover:underline">
                View All ({stats?.partners.restaurantsTotal || 0})
              </Link>
            </div>

            <div className="space-y-3">
              {(data?.topRestaurants || []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No restaurants registered yet.</p>
              ) : (
                data?.topRestaurants.map((rest: any, idx: number) => (
                  <div key={rest.id || idx} className="p-3.5 rounded-2xl bg-gray-50 hover:bg-orange-50/40 border border-gray-100 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FF8C42]/10 border border-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] font-black text-sm shrink-0">
                        {rest.name ? rest.name.charAt(0).toUpperCase() : "R"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{rest.name}</h4>
                        <p className="text-xs text-gray-500">{rest.cuisine} • {rest.city}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-600 flex items-center gap-1 justify-end">
                        <span>★</span>
                        <span>{rest.rating || 4.8}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        {rest.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent User Signups */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <span>Recent User Registrations</span>
                </h3>
                <p className="text-xs text-gray-500">Latest platform joiners</p>
              </div>
              <Link href="/dashboard/admin/users" className="text-xs font-bold text-[#FF6B35] hover:underline">
                View All ({stats?.users.total || 0})
              </Link>
            </div>

            <div className="space-y-3">
              {(data?.recentUsers || []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No registered users found.</p>
              ) : (
                data?.recentUsers.map((u: any, idx: number) => {
                  const role = (u.role || "Customer").toLowerCase();
                  let roleClass = "bg-gray-100 text-gray-700";
                  if (role === "admin") roleClass = "bg-rose-100 text-rose-800";
                  else if (role.includes("restaurant")) roleClass = "bg-amber-100 text-amber-800";
                  else if (role.includes("rider") || role.includes("delivery")) roleClass = "bg-blue-100 text-blue-800";

                  return (
                    <div key={u.id || idx} className="p-3.5 rounded-2xl bg-gray-50 hover:bg-purple-50/30 border border-gray-100 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{u.name}</h4>
                          <p className="text-[11px] text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${roleClass}`}>
                          {u.role}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            8. ORDER DETAILS MODAL
        ========================================================================== */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FF6B35]/10 text-[#FF6B35]">
                      ORDER DETAILS
                    </span>
                    <span className="font-mono text-sm font-black text-gray-900">{selectedOrder.orderId}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "N/A"}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold uppercase block mb-1">Customer Info</span>
                  <p className="font-bold text-gray-900">{selectedOrder.customerName}</p>
                  <p className="text-gray-500">{selectedOrder.customerEmail}</p>
                  <p className="text-gray-500 mt-0.5">{selectedOrder.deliveryAddress?.phone || "No phone provided"}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-bold uppercase block mb-1">Delivery Destination</span>
                  <p className="font-semibold text-gray-800">
                    {selectedOrder.deliveryAddress?.addressLine || selectedOrder.deliveryAddress?.street || "Standard Delivery"}
                  </p>
                  <p className="text-gray-500">
                    {selectedOrder.deliveryAddress?.city || "Dhaka"}, {selectedOrder.deliveryAddress?.postalCode || ""}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Order Items</span>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Item</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {item.name || item.foodName || `Item #${i + 1}`}
                            </td>
                            <td className="py-3 px-4 text-center">{item.quantity || 1}</td>
                            <td className="py-3 px-4 text-right">${(Number(item.price) || 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-black text-gray-900">
                              ${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 px-4 text-gray-400 text-center">
                            1 x Standard Order Package (${(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toFixed(2)})
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Split Breakdown */}
              <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 p-4 rounded-2xl border border-orange-100 space-y-2 text-xs">
                <span className="font-bold text-gray-700 uppercase tracking-wider block mb-1">Financial Reconciliation</span>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">${(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee:</span>
                  <span className="font-bold">+${(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT ({stats?.settings.vatPercentage || 5}%):</span>
                  <span className="font-bold">+${(selectedOrder.vatAmount || 0).toFixed(2)}</span>
                </div>
                {(selectedOrder.discount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Coupon Discount (Admin Subsidized):</span>
                    <span className="font-bold">-${(selectedOrder.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-orange-200 flex justify-between text-sm font-black text-gray-900">
                  <span>Total Paid by Customer:</span>
                  <span className="text-[#FF6B35]">${(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-dashed border-orange-200 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                  <div className="bg-white/80 p-2 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">Kitchen Payout</span>
                    <span className="text-gray-900">${(selectedOrder.restaurantPayout || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">Rider Payout</span>
                    <span className="text-gray-900">${(selectedOrder.riderPayout || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-300">
                    <span className="text-emerald-700 block text-[10px]">Admin Net Profit</span>
                    <span className="text-emerald-700">+${(selectedOrder.adminNetProfit || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2.5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
