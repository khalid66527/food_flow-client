"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  ChefHat,
  Bike,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  MapPin,
  Sparkles,
  DollarSign,
  Package,
} from "lucide-react";
import { notificationSound } from "@/lib/notificationSound";

export interface ActiveNotification {
  id: string;
  type: "restaurant_new_order" | "rider_new_delivery" | "customer_order_update";
  title: string;
  orderId: string;
  totalAmount?: number;
  userName?: string;
  userPhone?: string;
  restaurantName?: string;
  itemsSummary?: string;
  address?: string;
  orderStatus?: string;
  paymentMethod?: string;
  riderPayout?: number;
  createdAt: number;
}

interface OrderNotificationModalProps {
  notification: ActiveNotification | null;
  onDismiss: () => void;
}

export default function OrderNotificationModal({
  notification,
  onDismiss,
}: OrderNotificationModalProps) {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setIsMuted(notificationSound.isMuted());
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = notificationSound.toggleMute();
    setIsMuted(next);
  };

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

  const handleActionClick = () => {
    onDismiss();
    if (isRestaurant) {
      router.push("/dashboard/restaurant/orders");
    } else if (isRider) {
      router.push("/dashboard/rider/delivery-details");
    } else {
      router.push(`/order-tracking/${notification.orderId}`);
    }
  };

  return (
    <div className="fixed top-5 right-5 z-[999999] max-w-md w-full animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto">
      <div
        className={`relative overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 ${
          isRestaurant
            ? "bg-white/95 dark:bg-gray-900/95 border-orange-500/40 shadow-orange-500/20"
            : isRider
            ? "bg-white/95 dark:bg-gray-900/95 border-emerald-500/40 shadow-emerald-500/20"
            : "bg-white/95 dark:bg-gray-900/95 border-blue-500/40 shadow-blue-500/20"
        }`}
      >
        {/* Glow Header Accent */}
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isRestaurant
              ? "from-orange-500 via-amber-400 to-rose-500"
              : isRider
              ? "from-emerald-500 via-teal-400 to-cyan-500"
              : "from-blue-500 via-indigo-400 to-purple-500"
          }`}
        />

        <div className="p-4 sm:p-5">
          {/* Top Bar: Role badge, Order ID, Mute button, Close */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse ${
                  isRestaurant
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300"
                    : isRider
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
                }`}
              >
                {isRestaurant && <ChefHat className="w-3.5 h-3.5" />}
                {isRider && <Bike className="w-3.5 h-3.5" />}
                {isCustomer && <Sparkles className="w-3.5 h-3.5" />}
                {isRestaurant ? "New Restaurant Order" : isRider ? "New Delivery Available" : "Order Status"}
              </span>

              <span className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
                #{notification.orderId}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                title={isMuted ? "Unmute sound" : "Mute sound"}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>

              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-2 mb-4">
            <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>{notification.title}</span>
            </h4>

            {/* Info Snippets */}
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              {notification.itemsSummary && (
                <div className="flex items-start gap-1.5">
                  <Package className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2 font-medium">
                    {notification.itemsSummary}
                  </span>
                </div>
              )}

              {notification.userName && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {notification.userName} {notification.userPhone ? `(${notification.userPhone})` : ""}
                  </span>
                </div>
              )}

              {notification.restaurantName && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Restaurant:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {notification.restaurantName}
                  </span>
                </div>
              )}

              {notification.address && (
                <div className="flex items-start gap-1.5 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-rose-500 mt-0.5" />
                  <span className="line-clamp-1">{notification.address}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 font-semibold text-xs border-t border-gray-200/60 dark:border-gray-700/60">
                <span className="text-gray-500 dark:text-gray-400">
                  {isRider ? "Rider Earning:" : "Total Bill:"}
                </span>
                <span
                  className={`text-sm font-bold ${
                    isRestaurant
                      ? "text-orange-600 dark:text-orange-400"
                      : isRider
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  ${Number(isRider ? notification.riderPayout || notification.totalAmount || 0 : notification.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleActionClick}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-95 ${
                isRestaurant
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25"
                  : isRider
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 shadow-emerald-500/25"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
              }`}
            >
              {isRestaurant ? (
                <>
                  <ChefHat className="w-4 h-4" />
                  <span>Go to Kitchen & Orders</span>
                </>
              ) : isRider ? (
                <>
                  <Bike className="w-4 h-4" />
                  <span>Accept & View Delivery</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Track Order Live</span>
                </>
              )}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onDismiss}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Bottom Countdown Progress Bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1">
          <div
            className={`h-full transition-all linear duration-100 ${
              isRestaurant
                ? "bg-orange-500"
                : isRider
                ? "bg-emerald-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
