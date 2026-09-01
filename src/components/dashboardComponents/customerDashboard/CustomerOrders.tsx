"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  Search,
  Filter,
  Download,
  MapPin,
  ExternalLink,
  Loader2,
  CreditCard,
  Banknote,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Store,
  Trash2,
  XCircle,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TOrder, TOrderItem } from "@/types/order";
import { downloadInvoicePdf } from "@/lib/pdf/generateInvoice";

export default function CustomerOrders() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const user = session?.user;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Action Loading States & Confirmation Modals
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<TOrder | null>(null);
  const [deleteModalOrder, setDeleteModalOrder] = useState<TOrder | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 5;

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // 🔄 Fetch User Orders from MongoDB Atlas
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetUrl = userId ? `/api/orders?userId=${userId}` : "/api/orders";
      const res = await fetch(targetUrl, {
        headers: {
          ...(userId ? { "x-user-id": userId } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
        cache: "no-store", // Real-time database query
      });

      if (!res.ok) {
        throw new Error(`Server API Error (${res.status}). Failed to fetch orders from database.`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      } else {
        setOrders([]);
        if (json.message) setError(json.message);
      }
    } catch (err: any) {
      console.error("Error fetching customer orders:", err);
      setOrders([]); // Zero dummy or mock data fallback
      setError(err.message || "Failed to load orders from database. Backend server may be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionPending) {
      fetchOrders();
    }
  }, [sessionPending, userId]);

  // 📄 Handle Voucher PDF Download
  const handleDownloadVoucher = async (order: TOrder) => {
    try {
      setDownloadingId(order.orderId || order._id || "invoice");
      await downloadInvoicePdf(order);
    } catch (err) {
      console.error("Voucher download error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  // 🔴 4. Smart Order Cancellation Handler
  const handleCancelOrder = async (order: TOrder) => {
    const targetId = order.orderId || order._id;
    if (!targetId) return;

    try {
      setActionLoadingId(targetId);
      setActionError(null);

      const res = await fetch(`/api/orders/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to cancel order.");
      }

      setCancelModalOrder(null);
      await fetchOrders();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel order.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 🗑️ 3. Delete / Remove Order from User History Handler
  const handleDeleteOrder = async (order: TOrder) => {
    const targetId = order.orderId || order._id;
    if (!targetId) return;

    try {
      setActionLoadingId(targetId);
      setActionError(null);

      const res = await fetch(`/api/orders/${targetId}`, {
        method: "DELETE",
        headers: {
          ...(userId ? { "x-user-id": userId } : {}),
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to remove order from history.");
      }

      setDeleteModalOrder(null);
      await fetchOrders();
    } catch (err: any) {
      setActionError(err.message || "Failed to remove order.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 🔍 Filtered & ⬆️ 2. Newest First Sorted Orders Calculation (createdAt: -1)
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      // 1. Search Query filter (matches orderId or item name or restaurant name)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.orderId?.toLowerCase().includes(q) ||
        order.items?.some((i) => i.name.toLowerCase().includes(q)) ||
        order.items?.some((i) => i.restaurantName?.toLowerCase().includes(q));

      // 2. Status filter
      const currentStatus = (order.orderStatus || "Placed").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" || currentStatus === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });

    // 🔴 2. Guarantee Newest First Sorting (createdAt: -1)
    return filtered.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [orders, searchQuery, statusFilter]);

  // Paginated orders calculation
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1;

  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIdx, startIdx + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Statistics overview
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const deliveredCount = orders.filter(
      (o) => o.orderStatus === "Delivered"
    ).length;
    const activeCount = orders.filter(
      (o) => o.orderStatus && o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
    ).length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return { totalCount, deliveredCount, activeCount, totalSpent };
  }, [orders]);

  // 🏬 1. Helper to group items by restaurant for multi-restaurant order display
  const groupItemsByRestaurant = (items: TOrderItem[] = []) => {
    const groups: Record<string, TOrderItem[]> = {};
    items.forEach((item) => {
      const rName = item.restaurantName?.trim() || "FoodFlow Kitchen";
      if (!groups[rName]) groups[rName] = [];
      groups[rName].push(item);
    });
    return groups;
  };

  // Helper for Order Status Badge styling & icon
  const getOrderStatusBadge = (status?: string) => {
    const s = (status || "Placed").toLowerCase();
    switch (s) {
      case "cancelled":
        return {
          label: "Cancelled",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case "delivered":
        return {
          label: "Delivered",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "out for delivery":
        return {
          label: "Out for Delivery",
          className: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse",
          icon: <Truck className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "preparing":
      case "confirmed":
      case "processing":
        return {
          label: status || "Preparing",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <Package className="w-3.5 h-3.5 text-purple-600" />,
        };
      default:
        return {
          label: "Order Placed",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
        };
    }
  };

  // Helper for Payment Status Badge
  const getPaymentStatusBadge = (status?: string, method?: string, orderStatus?: string) => {
    const isDelivered = (orderStatus || "").toLowerCase() === "delivered";
    const isPaid = status === "Paid" || isDelivered;
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Paid
        </span>
      );
    }

    const isCod =
      method === "COD" ||
      method === "CASH_ON_DELIVERY" ||
      method === "Cash on Delivery";

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black border border-amber-200">
        <Banknote className="w-3.5 h-3.5 text-amber-600" />
        {isCod ? "Cash on Delivery (Unpaid)" : "Payment Pending"}
      </span>
    );
  };

  if (sessionPending || loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin" />
        <p className="text-sm font-bold text-gray-600">Loading your orders history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      
      {/* 🟠 TOP HEADER BANNER (Explore Dishes Bright Orange Gradient Theme) */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <ShoppingBag className="w-3.5 h-3.5 text-white" /> My Orders History
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Your Food Orders
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Track active deliveries, review past purchases, and download official vouchers directly from MongoDB.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
            title="Refresh Orders List"
          >
            <RefreshCw className="w-4 h-4 text-white" /> Refresh List
          </button>
        </div>
      </section>

      {/* 📊 OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Orders
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            {stats.totalCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Active Deliveries
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">
            {stats.activeCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Delivered
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            {stats.deliveredCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Spent
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            ${stats.totalSpent.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 🔍 SEARCH AND FILTER BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID or food name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {["ALL", "PLACED", "CONFIRMED", "DELIVERED", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                statusFilter === st
                  ? "bg-[#FF6B35] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {st === "ALL" ? "All Orders" : st}
            </button>
          ))}
        </div>
      </div>

      {/* ⚠️ Error Banner (if DB fetch fails) */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-xs font-semibold flex items-center justify-between gap-4">
          <p>⚠️ {error}</p>
          <button
            onClick={fetchOrders}
            className="underline font-bold text-rose-800 shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 📦 ORDERS LIST SECTION */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">
              No Orders Found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No orders match your current search or status filter criteria."
                : "You haven't placed any food orders yet. Explore our delicious menu today!"}
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
        <div className="space-y-6">
          {paginatedOrders.map((order) => {
            const statusBadge = getOrderStatusBadge(order.orderStatus);
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent Order";

            const groupedItems = groupItemsByRestaurant(order.items || []);
            const restaurantNames = Object.keys(groupedItems);
            const isMultiRestaurant = restaurantNames.length > 1;

            const isDownloading = downloadingId === (order.orderId || order._id);
            const isActionLoading = actionLoadingId === (order.orderId || order._id);

            // Universal Voucher Rule: Enabled ONLY when orderStatus is 'Delivered'
            const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
            const isVoucherEnabled = isDelivered;
            const isStripe =
              order.paymentMethod === "STRIPE" ||
              order.paymentMethod === "STRIPE_CARD";
            const currentStatusLower = (order.orderStatus || "Placed").toLowerCase();
            const isCancelled = currentStatusLower === "cancelled";
            const isTrackEnabled = !isCancelled;
            const canCancel = !isStripe && currentStatusLower === "placed";

            return (
              <div
                key={order._id || order.orderId}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
              >
                {/* Card Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50/80 via-white to-orange-50/30 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                        #{order.orderId}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border ${statusBadge.className}`}
                      >
                        {statusBadge.icon}
                        <span>{statusBadge.label}</span>
                      </span>

                      {/* 🏬 1. Multi-Restaurant Header Badge */}
                      {isMultiRestaurant && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-extrabold border border-purple-200">
                          <Layers className="w-3 h-3 text-purple-600" />
                          Multi-Restaurant ({restaurantNames.length} Kitchens)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formattedDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-gray-600 font-bold">
                        <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
                        {isMultiRestaurant
                          ? `${restaurantNames[0]} & ${restaurantNames.length - 1} more`
                          : restaurantNames[0] || "FoodFlow Kitchen"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge(
                      order.paymentStatus,
                      order.paymentMethod,
                      order.orderStatus
                    )}
                  </div>
                </div>

                {/* Card Items List Body - Grouped by Restaurant */}
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="space-y-5">
                    {Object.entries(groupedItems).map(([rName, rItems], groupIdx) => (
                      <div
                        key={groupIdx}
                        className="space-y-3 pt-3 first:pt-0 border-t border-gray-100/70 first:border-t-0"
                      >
                        {/* Restaurant Header Line */}
                        <div className="flex items-center justify-between gap-2 bg-orange-50/50 px-3 py-1.5 rounded-xl border border-orange-100/60">
                          <div className="flex items-center gap-2 text-xs font-black text-gray-800">
                            <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
                            <span>{rName}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">
                            {rItems.length} {rItems.length === 1 ? "Item" : "Items"}
                          </span>
                        </div>

                        {/* Items in this Restaurant */}
                        <div className="divide-y divide-gray-100 pl-1">
                          {rItems.map((item, idx) => {
                            const unitPrice = item.discountPrice || item.price;
                            const lineTotal = unitPrice * item.quantity;

                            return (
                              <div
                                key={idx}
                                className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-11 h-11 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <UtensilsCrossedIcon className="w-4 h-4" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                                      {item.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                      Qty: {item.quantity} × ${unitPrice.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                <span className="text-xs sm:text-sm font-black text-gray-900 shrink-0">
                                  ${lineTotal.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Total Footer Bar */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>
                        Subtotal: <strong className="text-gray-800">${(order.subtotal || order.totalAmount).toFixed(2)}</strong>
                        {order.deliveryFee ? ` | Delivery: $${order.deliveryFee.toFixed(2)}` : " | Free Delivery"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Delivery Address: {order.deliveryAddress?.streetAddress || "Registered Address"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-xs font-bold text-gray-500 sm:hidden">Total Amount:</span>
                      <span className="text-lg sm:text-xl font-black text-[#FF6B35]">
                        ${(order.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-400 hidden sm:inline">
                    Order Ref: {order.orderId}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    {/* 🔴 4. Smart Order Cancellation Button */}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelModalOrder(order)}
                        disabled={isActionLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition cursor-pointer disabled:opacity-50"
                        title="Cancel Cash on Delivery Order"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    {/* Action 1: Track Order */}
                    {isTrackEnabled ? (
                      <Link
                        href={`/dashboard/customer/order-tracking?orderId=${order.orderId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-xs font-extrabold transition shadow-xs cursor-pointer hover:brightness-110 hover:scale-102 active:scale-98"
                      >
                        <MapPin className="w-3.5 h-3.5 text-white" />
                        <span>Track Order</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60 text-xs font-extrabold"
                        title="Order tracking is disabled for cancelled orders"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>Track Order</span>
                      </button>
                    )}

                    {/* Action 2: Download Voucher PDF */}
                    <button
                      type="button"
                      onClick={() => isVoucherEnabled && handleDownloadVoucher(order)}
                      disabled={isDownloading || !isVoucherEnabled}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs ${
                        isVoucherEnabled
                          ? "bg-gradient-to-r from-gray-900 to-black text-white cursor-pointer hover:brightness-125 hover:scale-102 active:scale-98"
                          : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        isVoucherEnabled
                          ? "Download Official Invoice Voucher"
                          : "Voucher download will unlock after successful delivery (Delivered)"
                      }
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Download
                          className={`w-3.5 h-3.5 ${
                            isVoucherEnabled ? "text-amber-400" : "text-gray-400"
                          }`}
                        />
                      )}
                      <span>Download Voucher</span>
                    </button>

                    {/* 🗑️ 3. Delete / Remove Order from History Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteModalOrder(order)}
                      disabled={isActionLoading}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 text-xs font-bold border border-gray-200 transition cursor-pointer disabled:opacity-50"
                      title="Remove Order from History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}

          {/* 📄 PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-gray-500 font-medium">
                Showing <strong className="text-gray-800">{(currentPage - 1) * ORDERS_PER_PAGE + 1}</strong> to{" "}
                <strong className="text-gray-800">
                  {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}
                </strong>{" "}
                of <strong className="text-gray-800">{filteredOrders.length}</strong> orders
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

      {/* 🔴 CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-gray-900">
                Cancel Order #{cancelModalOrder.orderId}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to cancel this Cash on Delivery order? Once cancelled, the restaurant kitchen will stop preparing your meal.
              </p>
            </div>

            {actionError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                ⚠️ {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={() => handleCancelOrder(cancelModalOrder)}
                disabled={actionLoadingId === (cancelModalOrder.orderId || cancelModalOrder._id)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoadingId === (cancelModalOrder.orderId || cancelModalOrder._id) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE ORDER CONFIRMATION MODAL */}
      {deleteModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-gray-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-gray-900">
                Remove Order #{deleteModalOrder.orderId}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                This order will be hidden from your My Orders history in MongoDB database. You can still re-order items anytime.
              </p>
            </div>

            {actionError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                ⚠️ {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDeleteOrder(deleteModalOrder)}
                disabled={actionLoadingId === (deleteModalOrder.orderId || deleteModalOrder._id)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoadingId === (deleteModalOrder.orderId || deleteModalOrder._id) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Remove Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function UtensilsCrossedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a2.1 2.1 0 1 0-3 3L12 18" />
      <path d="m18 15-6-6" />
      <path d="m14 18 6 6" />
    </svg>
  );
}
