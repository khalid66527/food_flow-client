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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  Receipt,
  UtensilsCrossed,
  Bike,
  Layers,
  Sparkles,
  Eye,
  Download,
  Printer,
  X,
  FileText,
  CreditCard,
  ShieldCheck,
  Package,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSession } from "@/lib/auth-client";
import { TOrder, TOrderItem } from "@/types/order";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { getOrderSocket, joinOrderRoom, disconnectOrderSocket } from "@/lib/socket";

function getRestaurantProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foodflow_restaurant_data");
    return raw ? (JSON.parse(raw) as { _id?: string; restaurantName?: string }) : null;
  } catch {
    return null;
  }
}

export default function RestaurantSellHistory() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
  const userId = user?.id;
  const userEmail = user?.email;

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Viewing Order Details & Invoice
  const [selectedOrderModal, setSelectedOrderModal] = useState<TOrder | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 8;

  const restaurantProfile = getRestaurantProfile();

  const fetchSellHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        role: "restaurant",
        userId,
      });
      if (restaurantProfile?._id) qs.set("restaurantId", restaurantProfile._id);
      if (restaurantProfile?.restaurantName) qs.set("restaurantName", restaurantProfile.restaurantName);

      const res = await fetch(`/api/orders/success-orders?${qs.toString()}`, {
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
      console.error("Failed to load restaurant sell history:", err);
      setError(err.message || "Failed to load sell history.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, restaurantProfile?._id, restaurantProfile?.restaurantName]);

  useEffect(() => {
    if (!sessionPending && userId) {
      fetchSellHistory();
    }
  }, [sessionPending, userId, fetchSellHistory]);

  // Real-time socket sync: update sell history immediately when rider delivers an order
  useEffect(() => {
    if (!userId || sessionPending) return;

    const socket = getOrderSocket("restaurant_sell_history_" + (userId || "unknown"));
    joinOrderRoom("restaurant_" + (userId || "unknown"));

    const onStatusUpdated = (payload: { orderId?: string; orderStatus?: string; status?: string }) => {
      const newStatus = payload?.orderStatus || payload?.status;
      if (newStatus === "Delivered") {
        fetchSellHistory();
      }
    };

    socket.on("order_status_updated", onStatusUpdated);

    return () => {
      socket.off("order_status_updated", onStatusUpdated);
      disconnectOrderSocket();
    };
  }, [sessionPending, userId, fetchSellHistory]);

  // Statistics
  const stats = useMemo(() => {
    const totalSalesCount = orders.length;
    let totalRevenue = 0;
    let totalDishesSold = 0;

    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const p = item.discountPrice || item.price || 0;
        const q = item.quantity || 1;
        totalRevenue += p * q;
        totalDishesSold += q;
      });
    });

    const avgOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
    return { totalSalesCount, totalRevenue, totalDishesSold, avgOrderValue };
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

  // ─── PDF INVOICE GENERATOR ─────────────────────────────────────────────
  const handleDownloadPDF = useCallback(
    (order: TOrder) => {
      try {
        setIsDownloadingPdf(true);
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const displayId = order.orderId || order._id || "N/A";
        const restaurantName =
          order.items?.[0]?.restaurantName || restaurantProfile?.restaurantName || "FoodFlow Kitchen";
        const customerName = order.deliveryAddress?.fullName || order.userName || "Customer";
        const customerPhone = order.deliveryAddress?.phoneNumber || "N/A";
        const customerAddress = [
          order.deliveryAddress?.streetAddress,
          order.deliveryAddress?.area,
          order.deliveryAddress?.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        const createdDate = order.createdAt
          ? new Date(order.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";

        const deliveredDate = order.deliveredAt || order.updatedAt
          ? new Date(order.deliveredAt || order.updatedAt || Date.now()).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Completed";

        // Header Background Banner
        doc.setFillColor(255, 107, 53); // FoodFlow Orange
        doc.rect(0, 0, 210, 32, "F");

        // Header Titles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("FoodFlow", 14, 18);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("OFFICIAL SALES INVOICE & RECEIPT", 14, 26);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`INVOICE #${displayId}`, 196, 18, { align: "right" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Status: DELIVERED & PAID`, 196, 26, { align: "right" });

        // Restaurant & Customer Details
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);

        // Left column
        doc.setFont("helvetica", "bold");
        doc.text("RESTAURANT / KITCHEN:", 14, 42);
        doc.setFont("helvetica", "normal");
        doc.text(restaurantName, 14, 48);

        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY PARTNER (RIDER):", 14, 58);
        doc.setFont("helvetica", "normal");
        doc.text(
          order.riderInfo?.name
            ? `${order.riderInfo.name} (${order.riderInfo.phone || "No phone"})`
            : "FoodFlow Direct Delivery",
          14,
          64
        );

        // Right column
        doc.setFont("helvetica", "bold");
        doc.text("CUSTOMER (BUYER) DETAILS:", 110, 42);
        doc.setFont("helvetica", "normal");
        doc.text(`Name: ${customerName}`, 110, 48);
        doc.text(`Phone: ${customerPhone}`, 110, 54);
        const splitAddr = doc.splitTextToSize(`Address: ${customerAddress || "Address on file"}`, 85);
        doc.text(splitAddr, 110, 60);

        // Timestamps
        doc.setFont("helvetica", "bold");
        doc.text("Order Placed:", 14, 76);
        doc.setFont("helvetica", "normal");
        doc.text(createdDate, 40, 76);

        doc.setFont("helvetica", "bold");
        doc.text("Delivered At:", 110, 76);
        doc.setFont("helvetica", "normal");
        doc.text(deliveredDate, 136, 76);

        // Items Table
        const tableBody = (order.items || []).map((item, idx) => {
          const unitPrice = item.discountPrice || item.price || 0;
          const qty = item.quantity || 1;
          const lineTotal = unitPrice * qty;
          return [
            idx + 1,
            item.name,
            qty,
            `Tk ${unitPrice.toFixed(2)}`,
            `Tk ${lineTotal.toFixed(2)}`,
          ];
        });

        autoTable(doc, {
          startY: 84,
          head: [["#", "Dish / Item Description", "Qty", "Unit Price", "Total Price"]],
          body: tableBody,
          theme: "grid",
          headStyles: {
            fillColor: [255, 107, 53],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [50, 50, 50],
          },
          columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 18, halign: "center" },
            3: { cellWidth: 32, halign: "right" },
            4: { cellWidth: 35, halign: "right" },
          },
          margin: { left: 14, right: 14 },
        });

        // Totals & Financials
        const finalY = (doc as any).lastAutoTable?.finalY || 140;

        let subtotal = 0;
        (order.items || []).forEach((i) => {
          subtotal += (i.discountPrice || i.price || 0) * (i.quantity || 1);
        });
        const totalAmount = order.totalAmount || subtotal;
        const deliveryFee = Math.max(0, totalAmount - subtotal);

        // Payment info on the left
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text("PAYMENT SUMMARY:", 14, finalY + 12);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Payment Method: ${
            order.paymentMethod === "STRIPE"
              ? "Paid Online (Stripe / Card)"
              : "Cash on Delivery (COD)"
          }`,
          14,
          finalY + 18
        );
        doc.text(`Settlement: Delivered & Paid in Full`, 14, finalY + 24);

        // Right totals summary
        const rightBoxX = 130;
        doc.setFont("helvetica", "normal");
        doc.text("Items Subtotal:", rightBoxX, finalY + 12);
        doc.text(`Tk ${subtotal.toFixed(2)}`, 196, finalY + 12, { align: "right" });

        doc.text("Delivery & Platform:", rightBoxX, finalY + 18);
        doc.text(`Tk ${deliveryFee.toFixed(2)}`, 196, finalY + 18, { align: "right" });

        // Divider line
        doc.setDrawColor(200, 200, 200);
        doc.line(rightBoxX, finalY + 22, 196, finalY + 22);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(255, 107, 53);
        doc.text("Grand Total:", rightBoxX, finalY + 30);
        doc.text(`Tk ${totalAmount.toFixed(2)}`, 196, finalY + 30, { align: "right" });

        // Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "Thank you for choosing FoodFlow. For inquiries, contact support@foodflow.com",
          105,
          285,
          { align: "center" }
        );

        doc.save(`FoodFlow-Invoice-${displayId}.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF. You can also print this page directly.");
      } finally {
        setIsDownloadingPdf(false);
      }
    },
    [restaurantProfile?.restaurantName]
  );

  // Print invoice modal directly
  const handlePrint = () => {
    window.print();
  };

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
              <Receipt className="w-3.5 h-3.5 text-white" /> Restaurant Partner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Sell History
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Table log of all completed customer sales, assigned delivery partners, and net revenue.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSellHistory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
            title="Refresh Sell History"
          >
            <RefreshCw className="w-4 h-4 text-white" /> Refresh History
          </button>
        </div>
      </section>

      {/* 📊 STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Completed Sales
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {stats.totalSalesCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Revenue
          </span>
          <p className="text-xl sm:text-2xl font-black text-[#FF6B35]">
            Tk {stats.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Dishes Sold
          </span>
          <p className="text-xl sm:text-2xl font-black text-gray-900">
            {stats.totalDishesSold} Items
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
            placeholder="Search order #, customer, dish, rider..."
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
            onClick={fetchSellHistory}
            className="underline font-bold text-rose-800 shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 📋 TABLE OF COMPLETED SALES */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">No Sell History Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || paymentFilter !== "ALL"
                ? "No completed sales match your search criteria."
                : "Completed sales records will be listed in this table once marked delivered."}
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-5">Order ID</th>
                  <th className="py-4 px-5">Customer (Buyer)</th>
                  <th className="py-4 px-5">Dishes Sold</th>
                  <th className="py-4 px-5">Delivery Partner (Rider)</th>
                  <th className="py-4 px-5">Payment Method</th>
                  <th className="py-4 px-5">Total Revenue</th>
                  <th className="py-4 px-5">Delivered Time</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
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

                  return (
                    <tr
                      key={order._id || order.orderId}
                      className="hover:bg-orange-50/20 transition-colors"
                    >
                      {/* 1. Order ID */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-extrabold text-gray-900 block">#{order.orderId}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Sale Completed</span>
                      </td>

                      {/* 2. Customer Details */}
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

                      {/* 3. Dishes Sold */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1 max-w-[200px]">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="text-gray-700 truncate">
                              <span className="font-semibold text-gray-900">{item.quantity}×</span> {item.name}
                              <span className="text-gray-400 text-[10px] ml-1">
                                (Tk {((item.discountPrice || item.price) * item.quantity).toFixed(2)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 4. Delivery Partner (Rider) */}
                      <td className="py-4 px-5 align-top">
                        {order.riderInfo?.name ? (
                          <div className="space-y-1">
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-[#FF6B35]" />
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
                          <span className="text-gray-400 font-medium">In-house / Direct Delivery</span>
                        )}
                      </td>

                      {/* 5. Payment Method */}
                      <td className="py-4 px-5 align-top">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          <Banknote className="w-3 h-3 text-[#FF6B35]" />
                          {order.paymentMethod === "STRIPE" ? "Paid Online" : "Cash on Delivery"}
                        </span>
                      </td>

                      {/* 6. Total Revenue */}
                      <td className="py-4 px-5 align-top">
                        <span className="font-black text-[#FF6B35] text-sm block">
                          Tk {(order.totalAmount || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* 7. Delivered Time */}
                      <td className="py-4 px-5 align-top text-gray-600 font-medium text-[11px]">
                        {formattedDelivered}
                      </td>

                      {/* 8. Status */}
                      <td className="py-4 px-5 align-top text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered & Paid
                        </span>
                      </td>

                      {/* 9. Actions (View Details & Download PDF) */}
                      <td className="py-4 px-5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] font-black text-xs transition cursor-pointer border border-orange-200/60 shadow-2xs hover:scale-102 active:scale-98"
                            title="View full order breakdown & invoice"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs transition cursor-pointer border border-gray-200 shadow-2xs hover:scale-102 active:scale-98"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-600" /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
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

      {/* ========================================================================= */}
      {/* 📄 ORDER DETAILS & INVOICE MODAL                                          */}
      {/* ========================================================================= */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#FF6B35] via-amber-500 to-orange-600 text-white flex items-center justify-between sticky top-0 z-10 shadow-md">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  <Receipt className="w-3 h-3" /> Sales Invoice
                </div>
                <h3 className="text-xl font-black">
                  Order #{selectedOrderModal.orderId || selectedOrderModal._id}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedOrderModal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 text-xs font-black shadow-xs transition cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
                  title="Print invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderModal(null)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Top Status Badges */}
              <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900">Order Delivered Successfully</h4>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Delivered at:{" "}
                      {selectedOrderModal.deliveredAt || selectedOrderModal.updatedAt
                        ? new Date(
                            selectedOrderModal.deliveredAt || selectedOrderModal.updatedAt || Date.now()
                          ).toLocaleString()
                        : "Completed"}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-emerald-800 text-xs font-black border border-emerald-300 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  OTP Verified
                </div>
              </div>

              {/* Customer & Rider Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Details */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#FF6B35]" /> Customer Information
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-gray-900 text-sm">
                      {selectedOrderModal.deliveryAddress?.fullName ||
                        selectedOrderModal.userName ||
                        "Valued Customer"}
                    </p>
                    {selectedOrderModal.deliveryAddress?.phoneNumber && (
                      <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {selectedOrderModal.deliveryAddress.phoneNumber}
                      </p>
                    )}
                    <p className="text-gray-600 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      {[
                        selectedOrderModal.deliveryAddress?.streetAddress,
                        selectedOrderModal.deliveryAddress?.area,
                        selectedOrderModal.deliveryAddress?.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                {/* Delivery Partner Details */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-[#FF6B35]" /> Delivery Partner
                  </h4>
                  <div className="space-y-1 text-xs">
                    {selectedOrderModal.riderInfo?.name ? (
                      <>
                        <p className="font-extrabold text-gray-900 text-sm">
                          {selectedOrderModal.riderInfo.name}
                        </p>
                        {selectedOrderModal.riderInfo.phone && (
                          <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {selectedOrderModal.riderInfo.phone}
                          </p>
                        )}
                        {selectedOrderModal.riderInfo.vehicleNumber && (
                          <p className="text-gray-600">
                            Vehicle No: <strong>{selectedOrderModal.riderInfo.vehicleNumber}</strong>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 font-medium italic">
                        In-house / Direct Restaurant Delivery
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dishes & Items Sold */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF6B35]" /> Items Ordered
                </h4>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-2xs">
                  {(selectedOrderModal.items || []).map((item, idx) => {
                    const price = item.discountPrice || item.price || 0;
                    const qty = item.quantity || 1;
                    const lineTotal = price * qty;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-orange-50 text-[#FF6B35] font-black flex items-center justify-center shrink-0 border border-orange-100">
                            {qty}×
                          </span>
                          <div>
                            <p className="font-black text-gray-900">{item.name}</p>
                            <p className="text-[11px] text-gray-400">
                              Unit Price: Tk {price.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <span className="font-black text-gray-900 text-sm">
                          Tk {lineTotal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Breakdown / Receipt */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Payment Method</span>
                  <span className="font-extrabold text-gray-900 inline-flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-[#FF6B35]" />
                    {selectedOrderModal.paymentMethod === "STRIPE"
                      ? "Paid Online (Stripe)"
                      : "Cash on Delivery (COD)"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-gray-800">
                    Tk{" "}
                    {(selectedOrderModal.items || [])
                      .reduce(
                        (sum, i) => sum + (i.discountPrice || i.price || 0) * (i.quantity || 1),
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Delivery & Service Fee</span>
                  <span className="font-bold text-gray-800">
                    Tk{" "}
                    {Math.max(
                      0,
                      (selectedOrderModal.totalAmount || 0) -
                        (selectedOrderModal.items || []).reduce(
                          (sum, i) => sum + (i.discountPrice || i.price || 0) * (i.quantity || 1),
                          0
                        )
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-black text-gray-900">Total Net Amount</span>
                  <span className="text-base font-black text-[#FF6B35]">
                    Tk {(selectedOrderModal.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0">
              <span className="text-[11px] text-gray-400 font-medium">
                Official invoice generated by FoodFlow
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedOrderModal)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderModal(null)}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
