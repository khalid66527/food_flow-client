"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Bike, 
  UtensilsCrossed, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Calendar,
  Utensils
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getUserOrdersApi } from "@/lib/api/order";
import { getRealTimeLocation, subscribeLocation, loadLocationFromStorage, ILocationInfo } from "@/lib/location";
import { useCart } from "@/contexts/CartContext";
import { TOrder } from "@/types/order";

export default function CustomerHome() {
  const { data: session, isPending: sessionPending } = useSession();
  const { totalItems: cartCount } = useCart();
  const user = session?.user;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<"weekly" | "monthly">("weekly");

  // Dynamic location subscription
  const [locationInfo, setLocationInfo] = useState<ILocationInfo>(() => getRealTimeLocation());

  useEffect(() => {
    loadLocationFromStorage();
    setLocationInfo(getRealTimeLocation());

    const unsubscribe = subscribeLocation(() => {
      setLocationInfo(getRealTimeLocation());
    });
    return unsubscribe;
  }, []);

  // Fetch customer orders
  const fetchOrders = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getUserOrdersApi(user.id, user.email);
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data as TOrder[]);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.warn("Failed to fetch customer orders:", err);
      setOrders([]);
      setError("Unable to load latest orders.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!sessionPending) {
      fetchOrders();
    }
  }, [sessionPending, fetchOrders]);

  // Derived stats
  const totalOrders = orders.length;

  const activeOrders = orders.filter((o) => {
    const status = (o.orderStatus || "").toLowerCase();
    return ["pending", "preparing", "accepted", "confirmed", "on-the-way", "out for delivery", "cooking"].includes(status);
  });

  const activeOrdersCount = activeOrders.length;

  /**
   * Accurate "Total Spent" Financial Logic:
   * 1. Stripe / Online Payments: Counted automatically once order is placed/paid (not cancelled).
   * 2. Cash on Delivery (COD): Counted ONLY when order status is marked as 'Delivered' (cash collected).
   */
  const isOrderPaidAndCompleted = (o: TOrder): boolean => {
    const status = (o.orderStatus || "").toLowerCase().trim();
    if (status === "cancelled") return false;

    const method = (o.paymentMethod || "").toUpperCase().trim();
    const payStatus = (o.paymentStatus || "").toLowerCase().trim();

    if (method === "STRIPE" || payStatus === "paid") {
      return true;
    }

    if (method === "COD" || !method) {
      return status === "delivered";
    }

    return false;
  };

  const totalSpent = orders
    .filter(isOrderPaidAndCompleted)
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Weekly spending calculation for chart
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daySpendMap: { [key: string]: number } = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  
  orders.forEach((o) => {
    if (isOrderPaidAndCompleted(o) && o.createdAt) {
      const d = new Date(o.createdAt);
      const dayName = daysOfWeek[d.getDay()];
      if (dayName) {
        daySpendMap[dayName] = (daySpendMap[dayName] || 0) + (o.totalAmount || 0);
      }
    }
  });

  const maxDaySpend = Math.max(...Object.values(daySpendMap), 100);

  // Monthly 4-week breakdown
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const weekSpendMap: { [key: string]: number } = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 };
  
  orders.forEach((o) => {
    if (isOrderPaidAndCompleted(o) && o.createdAt) {
      const d = new Date(o.createdAt);
      const dateNum = d.getDate();
      let weekName = "Week 1";
      if (dateNum > 21) weekName = "Week 4";
      else if (dateNum > 14) weekName = "Week 3";
      else if (dateNum > 7) weekName = "Week 2";
      
      weekSpendMap[weekName] = (weekSpendMap[weekName] || 0) + (o.totalAmount || 0);
    }
  });

  const maxWeekSpend = Math.max(...Object.values(weekSpendMap), 100);

  // Derived breakdown totals for active toggle
  const weeklyTotal = Object.values(daySpendMap).reduce((sum, val) => sum + val, 0);
  const monthlyTotal = Object.values(weekSpendMap).reduce((sum, val) => sum + val, 0);
  const activeTimeframeTotal = chartTimeframe === "weekly" ? weeklyTotal : monthlyTotal;

  // Helper to calculate dynamic amount-based bar gradient color scale
  const getBarGradientClass = (spend: number, maxSpend: number): string => {
    if (spend === 0) {
      return "bg-gradient-to-t from-slate-200 to-slate-100 opacity-40";
    }
    const ratio = maxSpend > 0 ? spend / maxSpend : 0;
    if (ratio >= 0.7) {
      return "bg-gradient-to-t from-orange-600 via-amber-500 to-amber-400 opacity-100 shadow-md shadow-orange-500/25";
    }
    if (ratio >= 0.35) {
      return "bg-gradient-to-t from-orange-500 to-amber-400 opacity-95";
    }
    return "bg-gradient-to-t from-amber-400 to-amber-300 opacity-80";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. WELCOME BANNER */}
      <section className="relative rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 sm:p-10 text-white shadow-xl overflow-hidden">
        {/* Ambient Glow Effects */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            {/* Real-time Location Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-white border border-white/30 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-200 animate-bounce" />
              <span>{locationInfo.area || `${locationInfo.city} Central`}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Welcome back, {user?.name || "Foodie"}! 👋
            </h1>
            <p className="text-orange-100 text-sm sm:text-base font-medium leading-relaxed">
              Delicious meals from top restaurants in {locationInfo.city} are ready for instant delivery to your doorstep.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-orange-600 font-extrabold text-sm shadow-lg hover:bg-orange-50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <UtensilsCrossed className="w-4 h-4" /> Explore Food Menu
              </Link>
              {activeOrdersCount > 0 && (
                <Link
                  href="/dashboard/customer/order-tracking"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/25 backdrop-blur-md text-white font-extrabold text-sm border border-white/30 hover:bg-black/40 transition cursor-pointer"
                >
                  <Bike className="w-4 h-4 text-emerald-300 animate-pulse" /> Track {activeOrdersCount} Live Order{activeOrdersCount > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>

          {/* Dynamic Welcome Banner Badge Card (Rendered only if active orders exist) */}
          {activeOrdersCount > 0 && (
            <div className="hidden lg:flex items-center justify-center shrink-0">
              <div className="w-36 h-36 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center p-4 text-center shadow-2xl space-y-1 transform rotate-2 hover:rotate-0 transition-transform">
                <Bike className="w-8 h-8 text-emerald-200 animate-pulse" />
                <span className="text-3xl font-black">{activeOrdersCount}</span>
                <span className="text-[11px] font-extrabold text-orange-100 uppercase tracking-wider">
                  Active Order{activeOrdersCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. ESSENTIAL METRICS GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stat 1: Total Orders */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{totalOrders}</span>
            <span className="text-xs font-semibold text-gray-500">lifetime</span>
          </div>
        </div>

        {/* Stat 2: Active Orders */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Active Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900">{activeOrdersCount}</span>
            {activeOrdersCount > 0 ? (
              <Link href="/dashboard/customer/order-tracking" className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1">
                Track <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-xs font-medium text-gray-400">None pending</span>
            )}
          </div>
        </div>

        {/* Stat 3: Cart Items */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Cart Items</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900">{cartCount}</span>
            <Link href="/dashboard/customer/cart" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
              Checkout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stat 4: Total Spent */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Total Spent</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">৳{totalSpent.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* 3. MINIMAL & COMPACT EXPENDITURE SUMMARY WIDGET */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" /> Expenditure Summary
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
              Accurate breakdown of completed and paid dining expenditures
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="hidden sm:inline-block text-xs font-bold text-gray-500">
              {chartTimeframe === "weekly" ? "Weekly" : "Monthly"} Total:{" "}
              <strong className="text-gray-900 font-black">৳{activeTimeframeTotal.toFixed(2)}</strong>
            </span>
            {/* Clean Timeframe Toggle */}
            <div className="inline-flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setChartTimeframe("weekly")}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  chartTimeframe === "weekly"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe("monthly")}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  chartTimeframe === "monthly"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic & Compact Bar Chart Container */}
        <div className="p-4 sm:p-5 bg-slate-50/60 rounded-2xl border border-slate-100/80">
          {chartTimeframe === "weekly" ? (
            <div className="grid grid-cols-7 gap-2 sm:gap-5 items-end h-36">
              {daysOfWeek.map((day) => {
                const spend = daySpendMap[day] || 0;
                const heightPercent = maxDaySpend > 0 ? Math.max(12, Math.round((spend / maxDaySpend) * 100)) : 12;
                const gradientClass = getBarGradientClass(spend, maxDaySpend);

                return (
                  <div key={day} className="flex flex-col items-center gap-1.5 group h-full justify-end">
                    <span className="text-[10px] font-black text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-0.5 group-hover:translate-y-0">
                      ৳{spend.toFixed(0)}
                    </span>
                    
                    <div className="w-full max-w-[36px] sm:max-w-[48px] bg-slate-100/90 rounded-xl h-full max-h-28 flex flex-col justify-end overflow-hidden p-1 border border-slate-200/50">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${gradientClass} group-hover:scale-[1.02]`}
                      />
                    </div>

                    <span className="text-[11px] font-extrabold text-gray-500 group-hover:text-orange-600 transition-colors">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 sm:gap-7 items-end h-36">
              {weeks.map((wk) => {
                const spend = weekSpendMap[wk] || 0;
                const heightPercent = maxWeekSpend > 0 ? Math.max(12, Math.round((spend / maxWeekSpend) * 100)) : 12;
                const gradientClass = getBarGradientClass(spend, maxWeekSpend);

                return (
                  <div key={wk} className="flex flex-col items-center gap-1.5 group h-full justify-end">
                    <span className="text-[10px] font-black text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-0.5 group-hover:translate-y-0">
                      ৳{spend.toFixed(0)}
                    </span>
                    
                    <div className="w-full max-w-[60px] sm:max-w-[80px] bg-slate-100/90 rounded-xl h-full max-h-28 flex flex-col justify-end overflow-hidden p-1 border border-slate-200/50">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${gradientClass} group-hover:scale-[1.02]`}
                      />
                    </div>

                    <span className="text-[11px] font-extrabold text-gray-500 group-hover:text-orange-600 transition-colors">
                      {wk}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. QUICK SHORTCUT ACCESS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/restaurants"
          className="group bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-3xl p-5 hover:border-orange-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition">Browse Restaurants</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Discover top-rated local kitchens in {locationInfo.city}</p>
          </div>
          <div className="flex items-center text-xs font-extrabold text-orange-600 group-hover:translate-x-1 transition-transform">
            Explore now <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/dashboard/customer/order-tracking"
          className="group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 hover:border-blue-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition">Live Order Tracking</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Real-time status updates & rider location map</p>
          </div>
          <div className="flex items-center text-xs font-extrabold text-blue-600 group-hover:translate-x-1 transition-transform">
            Track active order <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/dashboard/customer/address"
          className="group bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 hover:border-emerald-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition">Delivery Addresses</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage home, work, or custom delivery points</p>
          </div>
          <div className="flex items-center text-xs font-extrabold text-emerald-600 group-hover:translate-x-1 transition-transform">
            Manage addresses <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          href="/dashboard/customer/cart"
          className="group bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-3xl p-5 hover:border-purple-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 group-hover:text-purple-600 transition">Shopping Cart</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">{cartCount} item{cartCount === 1 ? "" : "s"} waiting in your cart</p>
          </div>
          <div className="flex items-center text-xs font-extrabold text-purple-600 group-hover:translate-x-1 transition-transform">
            Checkout cart <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </section>
    </div>
  );
}
