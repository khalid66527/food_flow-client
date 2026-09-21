"use client";

import React, { useState } from "react";
import {
  Receipt,
  Download,
  Printer,
  X,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  Bike,
  UtensilsCrossed,
  Banknote,
  Loader2,
  Clock,
  Tag,
  Calendar,
} from "lucide-react";
import { TOrder } from "@/types/order";
import { downloadInvoicePdf } from "@/lib/pdf/generateInvoice";

interface OrderInvoiceModalProps {
  order: TOrder | null;
  onClose: () => void;
}

export default function OrderInvoiceModal({ order, onClose }: OrderInvoiceModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!order) return null;

  const displayId = order.orderId || order._id || order.id || "INVOICE";
  const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
  const isPaid =
    (order.paymentStatus || "").toLowerCase() === "paid" ||
    order.paymentMethod === "STRIPE" ||
    isDelivered;

  const handlePdfDownload = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(order);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate financial figures
  let itemsSubtotal = 0;
  (order.items || []).forEach((i) => {
    itemsSubtotal += (i.discountPrice || i.price || 0) * (i.quantity || 1);
  });

  const subtotal = order.subtotal || itemsSubtotal;
  const deliveryFee = order.deliveryFee || 0;
  const platformFee = order.platformFee || 0;
  const deliveryAndPlatform = deliveryFee + platformFee;
  const vat = order.vatAmount || 0;
  const discount = order.discount || 0;
  const couponCode = order.couponCode || null;
  const grandTotal = order.totalAmount || (subtotal + deliveryAndPlatform + vat - discount);

  const primaryRestaurant = order.items?.[0]?.restaurantName || "CraveYard Partner Kitchen";

  const orderPlacedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  const deliveredDate = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Pending / In Transit";

  const paymentShortText =
    order.paymentMethod === "STRIPE" ? "Online (Stripe)" : "COD";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Modal Header (Orange Background Header Bar) */}
        <div className="p-5 bg-gradient-to-r from-[#FF6B35] via-amber-500 to-orange-600 text-white rounded-t-3xl sticky top-0 z-10 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left Side: FoodFlow Official Logo + Title + Tagline */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 border border-white/40 shadow-xs">
                <img
                  src="/foodNav.png"
                  alt="FoodFlow Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white leading-none">
                  FOODFLOW
                </h3>
                <p className="text-xs font-semibold text-white/95 mt-1">
                  Official Order Invoice &amp; Voucher
                </p>
              </div>
            </div>

            {/* Right Side: Invoice Meta & Action Buttons */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
              <div className="text-left sm:text-right space-y-0.5 text-xs text-white">
                <p className="font-black text-sm text-white tracking-wide">
                  INVOICE #{displayId}
                </p>
                <p className="font-medium text-white/90">
                  Date: {orderPlacedDate}
                </p>
                <p className="font-medium text-white/90">
                  Payment: {paymentShortText}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePdfDownload}
                  disabled={isDownloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-orange-600 hover:bg-orange-50 text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Download PDF Invoice"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* 1. Details Card (Rounded Border Box Layout) */}
          <div className="bg-gray-50/80 rounded-2xl border border-gray-200/80 p-4 space-y-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Side: CUSTOMER DETAILS */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#FF6B35] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                  <User className="w-3.5 h-3.5" /> CUSTOMER DETAILS
                </h4>
                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-gray-900 text-sm">
                    {order.deliveryAddress?.fullName || order.userName || "Valued Customer"}
                  </p>
                  {order.deliveryAddress?.phoneNumber && (
                    <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {order.deliveryAddress.phoneNumber}
                    </p>
                  )}
                  <p className="text-gray-600 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    {[
                      order.deliveryAddress?.streetAddress,
                      order.deliveryAddress?.area,
                      (order.deliveryAddress as any)?.city,
                      order.deliveryAddress?.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>

              {/* Right Side: RESTORANT & RIDER */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                  <h4 className="text-xs font-black text-[#FF6B35] uppercase tracking-wider flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5" /> RESTORANT &amp; RIDER
                  </h4>

                  {/* Status Badge: STATUS: DELIVERED & PAID */}
                  {isDelivered && isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                      <CheckCircle2 className="w-3 h-3" /> STATUS: DELIVERED &amp; PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                      <Clock className="w-3 h-3" /> STATUS: {(order.orderStatus || "PROCESSING").toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-gray-900 text-sm">
                    Store Name: {primaryRestaurant}
                  </p>
                  {order.riderInfo?.name ? (
                    <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-gray-400" />
                      Delivery Partner: {order.riderInfo.name} ({order.riderInfo.phone || "No Phone"})
                    </p>
                  ) : (
                    <p className="text-gray-500 font-medium italic">
                      Delivery Partner: FoodFlow Express Delivery
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamps inside Details Card */}
            <div className="border-t border-gray-200/80 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-700">Order Placed:</span>
                <span className="font-medium text-gray-900">{orderPlacedDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-semibold text-gray-700">Delivered At:</span>
                <span className="font-medium text-gray-900">{deliveredDate}</span>
              </div>
            </div>
          </div>

          {/* 2. Invoice Body & Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF6B35]" /> Ordered Items Breakdown
            </h4>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FF6B35] text-white font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3 text-center border-r border-orange-400/40 w-10">#</th>
                    <th className="py-2.5 px-4 border-r border-orange-400/40">Food Item Description</th>
                    <th className="py-2.5 px-4 border-r border-orange-400/40">Restaurant / Kitchen</th>
                    <th className="py-2.5 px-3 text-center border-r border-orange-400/40 w-14">Qty</th>
                    <th className="py-2.5 px-4 text-right border-r border-orange-400/40">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(order.items || []).map((item, idx) => {
                    const price = item.discountPrice || item.price || 0;
                    const qty = item.quantity || 1;
                    const lineTotal = price * qty;
                    return (
                      <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-gray-500 border-r border-gray-100">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900 border-r border-gray-100">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-gray-600 border-r border-gray-100">
                          {item.restaurantName || primaryRestaurant}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-gray-900 border-r border-gray-100">
                          {qty}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700 font-semibold border-r border-gray-100">
                          Tk {price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-gray-900">
                          Tk {lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Payment Summary & Coupon Discount */}
          <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-gray-600 pb-1 border-b border-gray-200/60">
              <span className="font-semibold">Payment Method</span>
              <span className="font-extrabold text-gray-900 inline-flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-[#FF6B35]" />
                {order.paymentMethod === "STRIPE"
                  ? "Paid Online (Stripe)"
                  : "Cash on Delivery (COD)"}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span>Items Subtotal</span>
              <span className="font-bold text-gray-900">Tk {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span>Delivery &amp; Platform Fee</span>
              <span className="font-bold text-gray-900">
                {deliveryAndPlatform === 0 ? "FREE" : `Tk ${deliveryAndPlatform.toFixed(2)}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span>Vat Amount</span>
              <span className="font-bold text-gray-900">Tk {vat.toFixed(2)}</span>
            </div>

            {/* Explicit Coupon Code / Discount Line */}
            {discount > 0 && (
              <div className="flex items-center justify-between text-rose-600 font-bold bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  {couponCode ? `Coupon Discount (${couponCode})` : "Coupon Discount"}
                </span>
                <span className="text-sm font-black">-Tk {discount.toFixed(2)}</span>
              </div>
            )}

            {/* Grand Total Highlighted in Orange */}
            <div className="border-t-2 border-gray-300 pt-3 flex items-center justify-between mt-2">
              <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Grand Total</span>
              <span className="text-lg font-black text-[#FF6B35] bg-orange-50 px-3 py-1 rounded-xl border border-orange-200 shadow-2xs">
                Tk {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 sticky bottom-0">
          <span className="text-[11px] text-gray-400 font-medium">
            Official invoice generated by CraveYard FoodFlow
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

