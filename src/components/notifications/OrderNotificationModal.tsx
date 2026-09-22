"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Volume2,
  VolumeX,
  ChefHat,
  Bike,
  Clock,
  ArrowRight,
  MapPin,
  Sparkles,
  Package,
  Phone,
  User,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useNotification, ActiveNotification } from "@/contexts/NotificationContext";

interface OrderNotificationModalProps {
  notification?: ActiveNotification | null;
  onDismiss?: () => void;
}

export default function OrderNotificationModal({
  notification: propNotif,
  onDismiss: propOnDismiss,
}: OrderNotificationModalProps) {
  const router = useRouter();
  const {
    activePopup,
    dismissPopup,
    confirmOrder,
    isMuted,
    toggleMute,
  } = useNotification();

  const notification = propNotif !== undefined ? propNotif : activePopup;
  const onDismiss = propOnDismiss || dismissPopup;

  const [progress, setProgress] = useState(100);
  const [isConfirming, setIsConfirming] = useState(false);

  // 12-second auto-dismiss countdown timer
  useEffect(() => {
    if (!notification) return;
    setProgress(100);

    const startTime = Date.now();
    const duration = 12000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isRestaurant = notification.type === "restaurant_new_order";
  const isRider = notification.type === "rider_new_delivery";
  const isCustomer = notification.type === "customer_order_update";

  const handleConfirmOrder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(true);
    try {
      await confirmOrder(notification.orderId);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleNavigate = () => {
    onDismiss();
    if (isRestaurant) {
      router.push("/dashboard/restaurant/orders");
    } else if (isRider) {
      router.push("/dashboard/rider");
    } else {
      router.push(`/order-tracking/${notification.orderId}`);
    }
  };

  return (
    <div className="fixed top-5 right-5 z-[999999] max-w-md w-full animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto">
      <div
        className={`relative overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 bg-white ${
          isRestaurant
            ? "border-orange-300/80 shadow-orange-500/15 ring-1 ring-orange-500/10"
            : isRider
            ? "border-emerald-300/80 shadow-emerald-500/15 ring-1 ring-emerald-500/10"
            : "border-orange-300/80 shadow-orange-500/15 ring-1 ring-orange-500/10"
        }`}
      >
        {/* Glow Top Strip */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isRestaurant
              ? "from-amber-500 via-orange-500 to-rose-500"
              : isRider
              ? "from-emerald-500 via-teal-400 to-cyan-500"
              : "from-amber-400 via-orange-500 to-amber-500"
          }`}
        />

        <div className="p-4 sm:p-5">
          {/* Top Bar: Role badge, Order ID, Mute button, Close */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  isRestaurant
                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                    : isRider
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-orange-100 text-orange-700 border border-orange-200"
                }`}
              >
                {isRestaurant && <ChefHat className="w-3.5 h-3.5 animate-bounce" />}
                {isRider && <Bike className="w-3.5 h-3.5 animate-pulse" />}
                {isCustomer && <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />}
                {isRestaurant
                  ? "New Kitchen Order"
                  : isRider
                  ? "Food Ready for Pickup"
                  : "Order Live Status"}
              </span>

              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/70">
                #{notification.orderId}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                title={isMuted ? "Unmute sound" : "Mute sound"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Toggle notification sound"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-2 mb-4">
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{notification.title}</span>
            </h4>

            {/* Structured Info Box */}
            <div className="text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 shadow-inner">
              {notification.itemsSummary && (
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 font-medium text-slate-800">
                    {notification.itemsSummary}
                  </span>
                </div>
              )}

              {notification.userName && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Customer:
                  </span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {notification.userName}
                  </span>
                </div>
              )}

              {notification.userPhone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone:
                  </span>
                  <a
                    href={`tel:${notification.userPhone}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    {notification.userPhone}
                  </a>
                </div>
              )}

              {notification.restaurantName && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Restaurant:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {notification.restaurantName}
                  </span>
                </div>
              )}

              {notification.address && (
                <div className="flex items-start gap-1.5 pt-1 text-[11px] text-slate-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                  <span className="line-clamp-1">{notification.address}</span>
                </div>
              )}

              {/* Bill / Earnings Row */}
              <div className="flex items-center justify-between pt-2 font-semibold text-xs border-t border-slate-200/70">
                <span className="text-slate-500">
                  {isRider ? "Rider Payout:" : "Total Order Bill:"}
                </span>
                <span
                  className={`text-sm font-extrabold ${
                    isRestaurant
                      ? "text-orange-600"
                      : isRider
                      ? "text-emerald-600"
                      : "text-blue-600"
                  }`}
                >
                  ${Number(
                    isRider
                      ? notification.riderPayout || notification.totalAmount || 0
                      : notification.totalAmount || 0
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isRestaurant ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isConfirming}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isConfirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isConfirming ? "Confirming..." : "Confirm Order"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNavigate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-transform active:scale-95 cursor-pointer"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Kitchen Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : isRider ? (
              <button
                type="button"
                onClick={handleNavigate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                <Bike className="w-4 h-4" />
                <span>Accept & View Delivery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNavigate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Track Order Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Bottom Auto-Dismiss Countdown Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all linear duration-100 ${
              isRestaurant
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : isRider
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
