"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { getSocket, joinOrderRoom } from "@/lib/socket";
import { notificationSound } from "@/lib/notificationSound";
import OrderNotificationModal, { ActiveNotification } from "./OrderNotificationModal";

export default function OrderNotificationManager() {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; email?: string; role?: string; name?: string } | undefined;

  const [activeNotification, setActiveNotification] = useState<ActiveNotification | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<ActiveNotification[]>([]);
  const processedOrderEvents = useRef<Set<string>>(new Set());

  // Request browser Notification permissions gracefully on first interaction
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerDesktopNotification = useCallback((title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/foodNav.png",
          badge: "/foodNav.png",
        });
      } catch (e) {
        console.warn("Desktop notification error:", e);
      }
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const getStoredRestaurant = () => {
      try {
        const raw = localStorage.getItem("foodflow_restaurant_data");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const getStoredRider = () => {
      try {
        const raw = localStorage.getItem("foodflow_rider_data");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    // ─── 1. Handle New Order Placed ──────────────────────────────
    const handleNewOrder = (order: any) => {
      if (!order || !order.orderId) return;

      const orderKey = `new_${order.orderId}`;
      if (processedOrderEvents.current.has(orderKey)) return;
      processedOrderEvents.current.add(orderKey);

      const restaurantProfile = getStoredRestaurant();
      const riderProfile = getStoredRider();
      const role = (user?.role || "").toLowerCase();

      const isRestaurantUser =
        role.includes("restaurant") ||
        Boolean(restaurantProfile?._id) ||
        Boolean(restaurantProfile?.restaurantName);

      const isRiderUser =
        role.includes("rider") ||
        role.includes("delivery") ||
        Boolean(riderProfile?._id) ||
        Boolean(riderProfile?.phone);

      const items = Array.isArray(order.items) ? order.items : [];
      const itemsSummary = items
        .map((it: any) => `${it.name || "Item"} × ${it.quantity || 1}`)
        .join(", ");

      const restaurantName =
        items[0]?.restaurantName || order.restaurantName || "FoodFlow Kitchen";

      const address =
        typeof order.deliveryAddress === "string"
          ? order.deliveryAddress
          : [order.deliveryAddress?.address, order.deliveryAddress?.city]
              .filter(Boolean)
              .join(", ");

      // A) Restaurant Notification
      if (isRestaurantUser) {
        const matchesRestaurant =
          !restaurantProfile?._id ||
          order.restaurantId === restaurantProfile._id ||
          items.some(
            (it: any) =>
              it.restaurantId === restaurantProfile._id ||
              (restaurantProfile.restaurantName &&
                it.restaurantName?.toLowerCase() === restaurantProfile.restaurantName.toLowerCase())
          );

        if (matchesRestaurant) {
          notificationSound.playNewOrderSound();
          triggerDesktopNotification(
            `🔔 New Order Received! #${order.orderId}`,
            `Total: $${order.totalAmount || 0} - ${itemsSummary || "New order placed"}`
          );

          const notif: ActiveNotification = {
            id: order.orderId,
            type: "restaurant_new_order",
            title: "🔔 New Order Received in Kitchen!",
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            userName: order.userName || order.deliveryAddress?.fullName || "Customer",
            userPhone: order.deliveryAddress?.phone,
            restaurantName,
            itemsSummary: itemsSummary || "1 Order item",
            address,
            paymentMethod: order.paymentMethod,
            createdAt: Date.now(),
          };

          setActiveNotification(notif);
          setNotificationHistory((prev) => [notif, ...prev.slice(0, 19)]);
          return;
        }
      }

      // B) Rider Notification (When new order is available for pickup/delivery)
      if (isRiderUser) {
        notificationSound.playRiderAlertSound();
        triggerDesktopNotification(
          `🚴 New Delivery Request Available! #${order.orderId}`,
          `Pickup from ${restaurantName} - Earning: $${order.riderPayout || order.deliveryFee || 20}`
        );

        const notif: ActiveNotification = {
          id: order.orderId,
          type: "rider_new_delivery",
          title: "🚴 New Delivery Order Available!",
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          riderPayout: order.riderPayout || order.deliveryFee || 25,
          userName: order.userName || "Customer",
          restaurantName,
          itemsSummary: itemsSummary || "Food Delivery",
          address,
          createdAt: Date.now(),
        };

        setActiveNotification(notif);
        setNotificationHistory((prev) => [notif, ...prev.slice(0, 19)]);
      }
    };

    // ─── 2. Handle Order Status Updates ─────────────────────────
    const handleStatusUpdate = (payload: any) => {
      const order = payload?.order || payload;
      if (!order || !order.orderId) return;

      const orderId = order.orderId;
      const status = (order.orderStatus || payload.orderStatus || "").trim();
      if (!status) return;

      const eventKey = `status_${orderId}_${status}`;
      if (processedOrderEvents.current.has(eventKey)) return;
      processedOrderEvents.current.add(eventKey);

      const riderProfile = getStoredRider();
      const role = (user?.role || "").toLowerCase();
      const isRiderUser =
        role.includes("rider") ||
        role.includes("delivery") ||
        Boolean(riderProfile?._id);

      // If status is "Ready" or "Ready for Pickup", notify Rider
      if (isRiderUser && ["ready", "ready for pickup", "preparing"].includes(status.toLowerCase())) {
        notificationSound.playRiderAlertSound();
        triggerDesktopNotification(
          `🛵 Order #${orderId} is Ready for Pickup!`,
          `Pickup at ${order.items?.[0]?.restaurantName || "Restaurant"}`
        );

        const notif: ActiveNotification = {
          id: orderId,
          type: "rider_new_delivery",
          title: `🛵 Order #${orderId} is Ready for Pickup!`,
          orderId,
          riderPayout: order.riderPayout || order.deliveryFee || 25,
          restaurantName: order.items?.[0]?.restaurantName || "Restaurant",
          address: typeof order.deliveryAddress === "string" ? order.deliveryAddress : order.deliveryAddress?.address,
          itemsSummary: Array.isArray(order.items) ? order.items.map((it: any) => it.name).join(", ") : undefined,
          createdAt: Date.now(),
        };

        setActiveNotification(notif);
        setNotificationHistory((prev) => [notif, ...prev.slice(0, 19)]);
      }

      // If current user is the customer who placed this order
      if (user?.id && (order.userId === user.id || order.userEmail === user.email)) {
        notificationSound.playStatusUpdateSound();
        triggerDesktopNotification(
          `✨ Order #${orderId}: ${status}`,
          `Your food order status has been updated to ${status}.`
        );

        const notif: ActiveNotification = {
          id: orderId,
          type: "customer_order_update",
          title: `🍽️ Order #${orderId} is now ${status}!`,
          orderId,
          orderStatus: status,
          totalAmount: order.totalAmount,
          restaurantName: order.items?.[0]?.restaurantName,
          createdAt: Date.now(),
        };

        setActiveNotification(notif);
        setNotificationHistory((prev) => [notif, ...prev.slice(0, 19)]);
      }
    };

    socket.on("new_order_placed", handleNewOrder);
    socket.on("order:created", handleNewOrder);
    socket.on("order_status_updated", handleStatusUpdate);
    socket.on("order:status_updated", handleStatusUpdate);
    socket.on("new_delivery_available", handleNewOrder);

    return () => {
      socket.off("new_order_placed", handleNewOrder);
      socket.off("order:created", handleNewOrder);
      socket.off("order_status_updated", handleStatusUpdate);
      socket.off("order:status_updated", handleStatusUpdate);
      socket.off("new_delivery_available", handleNewOrder);
    };
  }, [user?.id, user?.email, user?.role, triggerDesktopNotification]);

  return (
    <OrderNotificationModal
      notification={activeNotification}
      onDismiss={() => setActiveNotification(null)}
    />
  );
}
