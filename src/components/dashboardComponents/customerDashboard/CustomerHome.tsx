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
  RefreshCw, 
  ChevronRight,
  Sparkles,
  Heart,
  ShoppingCart
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getUserOrdersApi } from "@/lib/api/order";
import { getRealTimeLocation, subscribeLocation, ILocationInfo } from "@/lib/location";
import { useCart } from "@/contexts/CartContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TOrder } from "@/types/order";

export default function CustomerHome() {
  const { data: session, isPending: sessionPending } = useSession();
  const { totalItems: cartCount } = useCart();
  const user = session?.user;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic location subscription
  const [locationInfo, setLocationInfo] = useState<ILocationInfo>(() => getRealTimeLocation());

  useEffect(() => {
    const unsubscribe = subscribeLocation(() => {
      setLocationInfo(getRealTimeLocation());
    });
    return unsubscribe;
  }, []);

  // Fetch recent orders
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

  const totalSpent = orders
    .filter((o) => (o.orderStatus || "").toLowerCase() !== "cancelled")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const recentOrders = orders.slice(0, 4);

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || "pending").toLowerCase();
    if (s === "delivered") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" /> Cancelled
        </span>
      );
    }
    if (s.includes("delivery") || s.includes("way")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <Bike className="w-3 h-3 text-blue-600" /> Out for Delivery
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" /> {statusStr || "Preparing"}
      </span>
    );
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

          {/* Banner Graphic Widget */}
          <div className="hidden lg:flex items-center justify-center shrink-0">
            <div className="w-36 h-36 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-4 text-center shadow-2xl space-y-1 transform rotate-2 hover:rotate-0 transition-transform">
              <Sparkles className="w-8 h-8 text-amber-200" />
              <span className="text-2xl font-black">{totalOrders}</span>
              <span className="text-[11px] font-bold text-orange-100 uppercase tracking-wider">Orders Placed</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK STATS CARDS */}
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
            <span className="text-3xl font-black text-gray-900">${totalSpent.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* 3. RECENT ACTIVITY & RECENT ORDERS */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900">Recent Orders & Activity</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Track your ongoing meals or reorder past favorites</p>
          </div>
          <Link
            href="/dashboard/customer/orders"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 hover:text-orange-700 transition"
          >
            View All Orders ({totalOrders}) <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size={40} color="#f97316" message="Loading your recent orders..." />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="py-12 text-center space-y-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">No Orders Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">You haven&apos;t placed any food orders yet. Explore top restaurants near you!</p>
            </div>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-extrabold text-xs shadow-md hover:bg-orange-700 transition"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const orderId = order._id || order.id || "N/A";
              const formattedDate = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              const itemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
              const restaurantNames = [...new Set((order.items || []).map((i) => i.restaurantName).filter(Boolean))].join(", ") || "FoodFlow Kitchen";
              const isLive = ["pending", "preparing", "accepted", "confirmed", "on-the-way", "out for delivery"].includes((order.orderStatus || "").toLowerCase());

              return (
                <div key={orderId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">Order #{orderId.slice(-6).toUpperCase()}</span>
                      {getStatusBadge(order.orderStatus || "Pending")}
                    </div>
                    <p className="text-xs font-bold text-gray-700">{restaurantNames}</p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {formattedDate} • {itemsCount} item{itemsCount === 1 ? "" : "s"} • ${order.totalAmount?.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLive ? (
                      <Link
                        href={`/dashboard/customer/order-tracking?orderId=${orderId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white font-extrabold text-xs shadow-sm hover:bg-orange-700 transition cursor-pointer"
                      >
                        <Bike className="w-3.5 h-3.5 animate-pulse text-amber-200" /> Track Order
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/customer/orders"
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition"
                      >
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
