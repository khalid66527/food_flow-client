"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChefHat,
  Bike,
  Sparkles,
  CheckCircle2,
  X,
  Package,
  MapPin,
  Clock,
  ArrowRight,
  Trash2,
  CheckCheck,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNotification, ActiveNotification } from "@/contexts/NotificationContext";
import { useSession } from "@/lib/auth-client";

function formatTimeAgo(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function NavbarNotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;

  const {
    notifications,
    unreadCount,
    confirmOrder,
    dismissNotification,
    clearAllNotifications,
    markAllAsRead,
    isMuted,
    toggleMute,
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpenToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleConfirm = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmingOrderId(orderId);
    try {
      await confirmOrder(orderId);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const role = (user?.role || "").toLowerCase();
  const isRestaurant = role.includes("restaurant");
  const isRider = role.includes("rider") || role.includes("delivery");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button - Clean design matching Cart button */}
      <button
        type="button"
        onClick={handleOpenToggle}
        className={`relative p-2 sm:p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
          isOpen
            ? "text-orange-600 bg-orange-50"
            : unreadCount > 0
            ? "text-orange-600 hover:bg-orange-50"
            : "text-gray-600 hover:text-orange-600 hover:bg-gray-50"
        }`}
        aria-label="Order Notifications"
        title={unreadCount > 0 ? `${unreadCount} unconfirmed order(s)` : "Notifications"}
      >
        <Bell
          className={`h-5 w-5 transition-transform ${
            unreadCount > 0 ? "animate-bounce text-orange-600" : ""
          }`}
        />

        {/* Unread / Pending Action Counter Badge (Clean matching Cart badge) */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-84 sm:w-96 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 z-[100] overflow-hidden border border-slate-200/90 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-orange-100 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-orange-500" /> Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-orange-500 text-white shadow-2xs">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                  {notifications.length} total
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Unmute alert sounds" : "Mute alert sounds"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                )}
              </button>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Body: Notifications List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 bg-white">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center bg-white">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-3">
                  <CheckCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  You're all caught up!
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  New real-time orders, delivery alerts, and kitchen updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRestOrder = item.type === "restaurant_new_order";
                const isRiderOrder = item.type === "rider_new_delivery";
                const isCustOrder = item.type === "customer_order_update";
                const isConfirming = confirmingOrderId === item.orderId;

                // Status-aware badge styling for Customer, Restaurant, and Rider
                let badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
                let badgeLabel = "New Order";
                let BadgeIcon: React.ElementType = ChefHat;

                if (isRestOrder) {
                  badgeClass = "bg-orange-100 text-orange-700 border-orange-200";
                  badgeLabel = "New Order";
                  BadgeIcon = ChefHat;
                } else if (isRiderOrder) {
                  badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                  badgeLabel = "Ready for Pickup";
                  BadgeIcon = Bike;
                } else if (isCustOrder) {
                  const st = (item.orderStatus || "").toLowerCase();
                  if (st === "confirmed") {
                    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    badgeLabel = "Confirmed";
                    BadgeIcon = CheckCircle2;
                  } else if (st === "preparing") {
                    badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                    badgeLabel = "Preparing Food";
                    BadgeIcon = ChefHat;
                  } else if (st === "ready" || st === "ready for pickup") {
                    badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
                    badgeLabel = "Packed & Ready";
                    BadgeIcon = Package;
                  } else if (st === "out for delivery") {
                    badgeClass = "bg-teal-100 text-teal-800 border-teal-200";
                    badgeLabel = "On The Way";
                    BadgeIcon = Bike;
                  } else if (st === "delivered") {
                    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    badgeLabel = "Delivered";
                    BadgeIcon = CheckCircle2;
                  } else {
                    badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
                    badgeLabel = item.orderStatus ? item.orderStatus : "Live Update";
                    BadgeIcon = Sparkles;
                  }
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 transition-colors relative group hover:bg-orange-50/40 ${
                      !item.isRead
                        ? isRestOrder
                          ? "bg-amber-50/50"
                          : isRiderOrder
                          ? "bg-emerald-50/40"
                          : "bg-orange-50/30"
                        : "bg-white"
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${badgeClass}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badgeLabel}</span>
                        </span>

                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                          #{item.orderId}
                        </span>

                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(item.id);
                        }}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content Details Box */}
                    <div className="space-y-1.5 mb-3 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/60">
                      {/* Title / Status Message */}
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </p>

                      {/* Items or Restaurant Info */}
                      {item.restaurantName && (
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                          <span className="text-slate-400">Restaurant:</span>
                          <strong className="text-slate-700">{item.restaurantName}</strong>
                        </p>
                      )}

                      {item.itemsSummary && (
                        <p className="text-xs text-slate-700 font-medium flex items-start gap-1.5 bg-white p-2 rounded-lg border border-slate-200/60">
                          <Package className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.itemsSummary}</span>
                        </p>
                      )}

                      {item.userName && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 font-medium">Customer:</span>
                          <span className="font-bold text-slate-800 truncate max-w-[200px]">
                            {item.userName} {item.userPhone ? `(${item.userPhone})` : ""}
                          </span>
                        </div>
                      )}

                      {item.address && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </p>
                      )}

                      {item.totalAmount !== undefined && (
                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 font-semibold">
                          <span className="text-slate-500">
                            {isRiderOrder ? "Rider Payout:" : "Total Bill:"}
                          </span>
                          <span
                            className={`font-extrabold text-sm ${
                              isRiderOrder ? "text-emerald-600" : "text-orange-600"
                            }`}
                          >
                            ${Number(
                              isRiderOrder
                                ? item.riderPayout || item.totalAmount || 0
                                : item.totalAmount || 0
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {isRestOrder && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleConfirm(e, item.orderId)}
                            disabled={isConfirming}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isConfirming ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{isConfirming ? "Confirming..." : "Confirm Order"}</span>
                          </button>

                          <Link
                            href="/dashboard/restaurant/orders"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                          >
                            <span>Orders</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </>
                      )}

                      {isRiderOrder && (
                        <Link
                          href="/dashboard/rider"
                          onClick={() => setIsOpen(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 transition-all"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          <span>Accept & View Delivery</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {isCustOrder && (
                        <Link
                          href={`/order-tracking/${item.orderId}`}
                          onClick={() => setIsOpen(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Track Order Live</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-gradient-to-r from-orange-50/70 via-white to-orange-50/70 text-center">
              <Link
                href={
                  isRestaurant
                    ? "/dashboard/restaurant/orders"
                    : isRider
                    ? "/dashboard/rider"
                    : "/dashboard/customer"
                }
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 group"
              >
                <span>
                  {isRestaurant
                    ? "Go to Kitchen & Orders Dashboard"
                    : isRider
                    ? "Go to Rider Dashboard"
                    : "View All Orders"}
                </span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
