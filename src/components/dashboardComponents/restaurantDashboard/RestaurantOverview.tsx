"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  UtensilsCrossed,
  Truck,
  Receipt,
  Store,
  ChefHat,
  PackageCheck,
  Bike,
  Sparkles,
  DollarSign,
  Star,
  MapPin,
  Phone,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getMyRestaurantProfile, getRestaurantMenuItems, IRestaurant } from "@/lib/api/restaurant";
import { getRestaurantOrdersApi } from "@/lib/api/order";
import { getSocket } from "@/lib/socket";
import { TOrder } from "@/types/order";
import { IMenuItem } from "@/types/restaurant";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

export default function RestaurantOverview() {
  const { data: session } = useSession();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [orders, setOrders] = useState<TOrder[]>([]);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const loadData = useCallback(async () => {
    try {
      const email = user?.email || "";
      const userId = user?.id || "";

      // 1. Fetch restaurant profile
      let restData: IRestaurant | null = null;
      if (email || userId) {
        const restRes = await getMyRestaurantProfile(email, userId);
        if (restRes.success && restRes.data) {
          restData = restRes.data;
          setRestaurant(restData);
        }
      }

      const restId = restData?._id || restData?.id || "";
      const restName = restData?.restaurantName || "";

      // 2. Fetch orders and menu items in parallel
      const [ordersRes, menuRes] = await Promise.all([
        getRestaurantOrdersApi(userId, email, {
          restaurantId: restId,
          restaurantName: restName,
        }),
        restId ? getRestaurantMenuItems(restId) : Promise.resolve({ success: true, data: [] }),
      ]);

      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
      }

      if (menuRes.success && Array.isArray(menuRes.data)) {
        setMenuItems(menuRes.data);
      }
    } catch (err) {
      console.error("Error loading restaurant overview data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Socket Listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOrderEvent = () => {
      loadData();
    };

    socket.on("order:created", handleOrderEvent);
    socket.on("order:status_updated", handleOrderEvent);
    socket.on("order:updated", handleOrderEvent);

    return () => {
      socket.off("order:created", handleOrderEvent);
      socket.off("order:status_updated", handleOrderEvent);
      socket.off("order:updated", handleOrderEvent);
    };
  }, [loadData]);

  // Calculated Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let completedOrders = 0;
    let activeOrders = 0;
    let cancelledOrders = 0;
    let newOrders = 0;
    let preparingOrders = 0;
    let readyOrders = 0;
    let outForDeliveryOrders = 0;

    orders.forEach((order) => {
      const status = (order.orderStatus || "").toLowerCase();
      const amount = Number(order.totalAmount) || 0;

      if (status === "delivered") {
        totalRevenue += amount;
        completedOrders++;
      } else if (status === "cancelled") {
        cancelledOrders++;
      } else {
        activeOrders++;
        if (status === "placed") newOrders++;
        else if (status === "preparing") preparingOrders++;
        else if (status === "ready" || status === "ready for pickup") readyOrders++;
        else if (status === "out for delivery") outForDeliveryOrders++;
      }
    });

    const totalOrdersCount = orders.length;
    const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    const availableMenuItems = menuItems.filter((m) => m.isAvailable !== false).length;

    return {
      totalRevenue,
      totalOrdersCount,
      completedOrders,
      activeOrders,
      cancelledOrders,
      newOrders,
      preparingOrders,
      readyOrders,
      outForDeliveryOrders,
      avgOrderValue,
      totalMenuItems: menuItems.length,
      availableMenuItems,
    };
  }, [orders, menuItems]);

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5);
  }, [orders]);

  const topMenuItems = useMemo(() => {
    return [...menuItems].slice(0, 4);
  }, [menuItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "Placed").toLowerCase();
    switch (s) {
      case "delivered":
        return {
          label: "Delivered",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
        };
      case "out for delivery":
        return {
          label: "On the Way",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500 animate-pulse",
        };
      case "ready":
      case "ready for pickup":
        return {
          label: "Ready for Pickup",
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          dot: "bg-sky-500",
        };
      case "preparing":
        return {
          label: "Preparing",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          dot: "bg-purple-500",
        };
      default:
        return {
          label: "New Order",
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          dot: "bg-[#FF6B35] animate-ping",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <LoadingSpinner />
        <p className="text-sm font-semibold text-gray-500">Loading restaurant overview...</p>
      </div>
    );
  }

  const restName = restaurant?.restaurantName || "My Restaurant";
  const restStatus = (restaurant?.status || "active").toLowerCase();
  const isApproved = restStatus === "active" || restStatus === "approved";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 md:p-8 shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            {restaurant?.logo ? (
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg shrink-0 bg-white/20">
                <Image
                  src={restaurant.logo}
                  alt={restName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  {restName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${
                    isApproved
                      ? "bg-white/20 text-white border-white/30 backdrop-blur-md"
                      : "bg-amber-900/30 text-amber-100 border-amber-300/40"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isApproved ? "bg-emerald-300 animate-pulse" : "bg-amber-300 animate-pulse"
                    }`}
                  />
                  {isApproved ? "Store Active" : "Under Review"}
                </span>
              </div>

              <p className="text-orange-50 text-xs md:text-sm mt-1 max-w-xl line-clamp-1 font-medium">
                {restaurant?.tagline ||
                  restaurant?.description ||
                  "Manage your restaurant operations, active orders, and menu catalog from this hub."}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-orange-100">
                {restaurant?.address?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    {restaurant.address.city}
                  </span>
                )}
                {restaurant?.contactNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-white" />
                    {restaurant.contactNumber}
                  </span>
                )}
                <Link
                  href="/dashboard/restaurant/reviews"
                  className="flex items-center gap-1 text-white font-bold bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-full border border-white/25 transition cursor-pointer"
                  title="View Customer Feedback & Reviews"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>
                    {restaurant?.rating ? Number(restaurant.rating).toFixed(1) : "4.8"} (
                    {(restaurant as any)?.reviewCount || (restaurant as any)?.totalReviews || 0} Reviews)
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md border border-white/30 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/dashboard/restaurant/add-food"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-orange-50 text-[#FF6B35] hover:text-[#E85A26] text-xs font-black shadow-lg shadow-black/10 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Food</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform">
              ৳
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              ৳{stats.totalRevenue.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.completedOrders} Delivered Orders</span>
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.activeOrders}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#FF6B35] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-ping" />
              <span>In Kitchen & Dispatched</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalOrdersCount}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 font-medium">
              <span>Avg: ৳{Math.round(stats.avgOrderValue)} / order</span>
            </div>
          </div>
        </div>

        {/* Menu Dishes */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Menu Catalog
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalMenuItems}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 font-medium">
              <span>{stats.availableMenuItems} Active Dishes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Order Pipeline Progress */}
      <div className="p-5 md:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF6B35] flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Live Kitchen Pipeline
              </h2>
              <p className="text-xs text-gray-500">Real-time status of orders in progress</p>
            </div>
          </div>

          <Link
            href="/dashboard/restaurant/orders"
            className="text-xs font-bold text-[#FF6B35] hover:text-[#E85A26] flex items-center gap-1 transition-colors"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800">New Orders</span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-900">{stats.newOrders}</span>
              <span className="text-[11px] text-orange-700 font-medium">Pending action</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800">Preparing</span>
              <ChefHat className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-900">{stats.preparingOrders}</span>
              <span className="text-[11px] text-purple-700 font-medium">In the kitchen</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800">Ready for Pickup</span>
              <PackageCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-sky-900">{stats.readyOrders}</span>
              <span className="text-[11px] text-sky-700 font-medium">Packed & waiting</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">On the Way</span>
              <Bike className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900">
                {stats.outForDeliveryOrders}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">With rider</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Recent Orders & Top Menu Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 p-5 md:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#FF6B35]" />
                <h2 className="text-base font-extrabold text-gray-900">Recent Orders</h2>
              </div>
              <Link
                href="/dashboard/restaurant/orders"
                className="text-xs font-bold text-[#FF6B35] hover:underline flex items-center gap-1"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-12 px-4">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">No Orders Placed Yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  When customers place orders from your restaurant, they will appear here in
                  real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((order) => {
                      const badge = getStatusBadge(order.orderStatus);
                      const itemCount =
                        order.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;

                      return (
                        <tr
                          key={order._id || order.id || order.orderId}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            #{order.orderId?.slice(-6) || "N/A"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-800 block truncate max-w-[120px]">
                              {order.userName || order.deliveryAddress?.streetAddress || order.deliveryAddress?.area || "Customer"}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">
                              {order.userEmail}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 font-medium">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900">
                            ৳{Number(order.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href="/dashboard/restaurant/orders"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#FF6B35] text-gray-700 font-semibold transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing recent {recentOrders.length} orders</span>
            <Link
              href="/dashboard/restaurant/sell-history"
              className="text-[#FF6B35] font-semibold hover:underline"
            >
              View Sell History
            </Link>
          </div>
        </div>

        {/* Right Column: Menu Catalog Preview & Quick Links */}
        <div className="space-y-6">
          {/* Top Menu Items */}
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />
                <h3 className="text-sm font-extrabold text-gray-900">Menu Highlights</h3>
              </div>
              <Link
                href="/dashboard/restaurant/menu"
                className="text-xs font-bold text-[#FF6B35] hover:underline"
              >
                All Dishes
              </Link>
            </div>

            {topMenuItems.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">No Dishes Added Yet</p>
                <Link
                  href="/dashboard/restaurant/add-food"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white text-xs font-bold shadow-xs hover:bg-[#E85A26] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Dish</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topMenuItems.map((item) => (
                  <div
                    key={item._id || item.id || item.name}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UtensilsCrossed className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate">
                        {item.category || "General"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#FF6B35]">
                        ৳{Number(item.price || 0).toFixed(0)}
                      </span>
                      <span
                        className={`block text-[9px] font-bold ${
                          item.isAvailable !== false ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {item.isAvailable !== false ? "Available" : "Sold Out"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-100 rounded-2xl">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3">
              Quick Operations
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link
                href="/dashboard/restaurant/orders"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#FF6B35]/40 hover:shadow-xs transition-all text-gray-700 font-semibold"
              >
                <Receipt className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span className="truncate">Orders</span>
              </Link>

              <Link
                href="/dashboard/restaurant/menu"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#FF6B35]/40 hover:shadow-xs transition-all text-gray-700 font-semibold"
              >
                <UtensilsCrossed className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span className="truncate">Food Menu</span>
              </Link>

              <Link
                href="/dashboard/restaurant/delivery"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#FF6B35]/40 hover:shadow-xs transition-all text-gray-700 font-semibold"
              >
                <Truck className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span className="truncate">Delivery</span>
              </Link>

              <Link
                href="/dashboard/restaurant/sell-history"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#FF6B35]/40 hover:shadow-xs transition-all text-gray-700 font-semibold"
              >
                <TrendingUp className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span className="truncate">Sales Log</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}