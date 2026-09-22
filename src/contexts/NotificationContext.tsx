"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession } from "@/lib/auth-client";
import { getSocket, getOrderSocket, joinOrderRoom } from "@/lib/socket";
import { notificationSound } from "@/lib/notificationSound";
import { updateOrderStatusApi, getRestaurantOrdersApi, getRiderOrdersApi } from "@/lib/api/order";
import { toast } from "react-toastify";

export interface ActiveNotification {
  id: string;
  type: "restaurant_new_order" | "rider_new_delivery" | "customer_order_update";
  title: string;
  subtitle?: string;
  orderId: string;
  totalAmount?: number;
  userName?: string;
  userPhone?: string;
  restaurantId?: string;
  restaurantName?: string;
  itemsSummary?: string;
  items?: any[];
  address?: string;
  orderStatus?: string;
  paymentMethod?: string;
  riderPayout?: number;
  createdAt: number;
  isRead: boolean;
  isConfirmed?: boolean;
}

interface NotificationContextType {
  notifications: ActiveNotification[];
  activePopup: ActiveNotification | null;
  unreadCount: number;
  isDropdownOpen: boolean;
  isMuted: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  toggleMute: () => boolean;
  dismissPopup: () => void;
  confirmOrder: (orderId: string) => Promise<boolean>;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllAsRead: () => void;
  refreshPendingOrders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "foodflow_active_notifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; role?: string; name?: string }
    | undefined;

  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [activePopup, setActivePopup] = useState<ActiveNotification | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const processedEventKeys = useRef<Set<string>>(new Set());

  // Load sound mute state
  useEffect(() => {
    setIsMuted(notificationSound.isMuted());
  }, []);

  const toggleMute = useCallback(() => {
    const next = notificationSound.toggleMute();
    setIsMuted(next);
    return next;
  }, []);

  // Request browser desktop notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerDesktopNotification = useCallback((title: string, body: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
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

  // Helpers to get cached restaurant / rider data from localStorage
  const getStoredRestaurant = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("foodflow_restaurant_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const getStoredRider = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("foodflow_rider_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Fetch pending orders on login to populate notification bell
  const refreshPendingOrders = useCallback(async () => {
    if (!user?.id || !user?.role) return;
    const role = user.role.toLowerCase();

    // 1. For Restaurant Partner: Fetch active "Placed" orders that need confirmation
    if (role.includes("restaurant")) {
      try {
        const restaurantProfile = getStoredRestaurant();
        const res = await getRestaurantOrdersApi(user.id, user.email || "", {
          status: "Placed",
          restaurantId: restaurantProfile?._id,
        });

        if (res?.success && Array.isArray(res.data)) {
          const placedOrders = res.data.filter(
            (o: any) =>
              (o.orderStatus || o.status || "").toLowerCase() === "placed" ||
              (o.orderStatus || o.status || "").toLowerCase() === "pending"
          );

          if (placedOrders.length > 0) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.orderId));
              const newItems: ActiveNotification[] = placedOrders
                .filter((o: any) => !existingIds.has(o.orderId))
                .map((o: any) => {
                  const items = Array.isArray(o.items) ? o.items : [];
                  const itemsSummary = items
                    .map((it: any) => `${it.name || "Item"} × ${it.quantity || 1}`)
                    .join(", ");
                  const address =
                    typeof o.deliveryAddress === "string"
                      ? o.deliveryAddress
                      : [o.deliveryAddress?.address, o.deliveryAddress?.city]
                          .filter(Boolean)
                          .join(", ");

                  return {
                    id: `init_order_${o.orderId}`,
                    type: "restaurant_new_order",
                    title: `🔔 New Order Placed #${o.orderId}`,
                    orderId: o.orderId,
                    totalAmount: o.totalAmount,
                    userName: o.userName || o.deliveryAddress?.fullName || "Customer",
                    userPhone: o.deliveryAddress?.phone,
                    restaurantName:
                      items[0]?.restaurantName || o.restaurantName || "FoodFlow Kitchen",
                    itemsSummary: itemsSummary || "1 Order item",
                    address,
                    paymentMethod: o.paymentMethod,
                    createdAt: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
                    isRead: false,
                    isConfirmed: false,
                  };
                });

              return [...newItems, ...prev];
            });
          }
        }
      } catch (e) {
        console.warn("Could not sync restaurant pending orders:", e);
      }
    }

    // 2. For Rider: Fetch available "Ready" orders ready for pickup
    if (role.includes("rider") || role.includes("delivery")) {
      try {
        const res = await getRiderOrdersApi(user.id, user.email || "", {
          mode: "available",
        });

        if (res?.success && Array.isArray(res.data)) {
          const availableOrders = res.data.filter((o: any) =>
            ["ready", "ready for pickup", "out for delivery"].includes(
              (o.orderStatus || o.status || "").toLowerCase()
            )
          );

          if (availableOrders.length > 0) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.orderId));
              const newItems: ActiveNotification[] = availableOrders
                .filter((o: any) => !existingIds.has(o.orderId))
                .map((o: any) => ({
                  id: `init_rider_${o.orderId}`,
                  type: "rider_new_delivery",
                  title: `🛵 Order Ready for Pickup #${o.orderId}`,
                  orderId: o.orderId,
                  totalAmount: o.totalAmount,
                  riderPayout: o.riderPayout || o.deliveryFee || 25,
                  userName: o.userName || "Customer",
                  restaurantName: o.items?.[0]?.restaurantName || "Restaurant",
                  address:
                    typeof o.deliveryAddress === "string"
                      ? o.deliveryAddress
                      : o.deliveryAddress?.address,
                  itemsSummary: Array.isArray(o.items)
                    ? o.items.map((it: any) => it.name).join(", ")
                    : undefined,
                  createdAt: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
                  isRead: false,
                }));

              return [...newItems, ...prev];
            });
          }
        }
      } catch (e) {
        console.warn("Could not sync rider ready orders:", e);
      }
    }
  }, [user?.id, user?.email, user?.role, getStoredRestaurant]);

  // Initial sync when user session loads
  useEffect(() => {
    if (user?.id) {
      refreshPendingOrders();
    } else {
      // Clear notifications on logout
      setNotifications([]);
      setActivePopup(null);
    }
  }, [user?.id, refreshPendingOrders]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();

    // ─── 1. Handle New Order Placed Event ──────────────────────
    const handleNewOrder = (order: any) => {
      if (!order || !order.orderId) return;

      const orderKey = `new_${order.orderId}`;
      if (processedEventKeys.current.has(orderKey)) return;
      processedEventKeys.current.add(orderKey);

      const role = (user?.role || "").toLowerCase();
      const restaurantProfile = getStoredRestaurant();
      const riderProfile = getStoredRider();

      // STRICT ROLE CHECK: Only active logged-in restaurant role can receive restaurant popup
      const isRestaurantUser =
        role.includes("restaurant") || role.includes("restaurant partner");

      // STRICT ROLE CHECK: Only active logged-in rider role can receive rider delivery popup
      const isRiderUser =
        role.includes("rider") ||
        role.includes("delivery") ||
        role.includes("delivery partner");

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

      // A) Restaurant Notification (Only for the matching restaurant!)
      if (isRestaurantUser) {
        const matchesRestaurant =
          Boolean(restaurantProfile?._id && order.restaurantId === restaurantProfile._id) ||
          Boolean(
            restaurantProfile?._id &&
              items.some((it: any) => it.restaurantId === restaurantProfile._id)
          ) ||
          Boolean(
            restaurantProfile?.restaurantName &&
              items.some(
                (it: any) =>
                  it.restaurantName?.toLowerCase() ===
                  restaurantProfile.restaurantName.toLowerCase()
              )
          ) ||
          order.restaurantId === user.id ||
          order.restaurantEmail === user.email;

        if (matchesRestaurant) {
          notificationSound.playNewOrderSound();
          triggerDesktopNotification(
            `🔔 New Order Received! #${order.orderId}`,
            `Total: $${order.totalAmount || 0} - ${itemsSummary || "New order placed"}`
          );

          const notif: ActiveNotification = {
            id: `rest_${order.orderId}_${Date.now()}`,
            type: "restaurant_new_order",
            title: `🔔 New Order Received! #${order.orderId}`,
            subtitle: "Kitchen Order Awaiting Confirmation",
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            userName: order.userName || order.deliveryAddress?.fullName || "Customer",
            userPhone: order.deliveryAddress?.phone,
            restaurantName,
            itemsSummary: itemsSummary || "Food Items",
            items,
            address,
            paymentMethod: order.paymentMethod,
            createdAt: Date.now(),
            isRead: false,
            isConfirmed: false,
          };

          setActivePopup(notif);
          setNotifications((prev) => [
            notif,
            ...prev.filter((n) => n.orderId !== order.orderId).slice(0, 29),
          ]);
          return;
        }
      }

      // B) Rider Notification (If new delivery request broadcasted)
      if (isRiderUser) {
        notificationSound.playRiderAlertSound();
        triggerDesktopNotification(
          `🚴 New Delivery Request! #${order.orderId}`,
          `Pickup: ${restaurantName} - Payout: $${order.riderPayout || order.deliveryFee || 25}`
        );

        const notif: ActiveNotification = {
          id: `rider_${order.orderId}_${Date.now()}`,
          type: "rider_new_delivery",
          title: `🚴 New Delivery Request! #${order.orderId}`,
          subtitle: "Available for pickup",
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          riderPayout: order.riderPayout || order.deliveryFee || 25,
          userName: order.userName || "Customer",
          restaurantName,
          itemsSummary: itemsSummary || "Food Delivery",
          address,
          createdAt: Date.now(),
          isRead: false,
        };

        setActivePopup(notif);
        setNotifications((prev) => [
          notif,
          ...prev.filter((n) => n.orderId !== order.orderId).slice(0, 29),
        ]);
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
      if (processedEventKeys.current.has(eventKey)) return;
      processedEventKeys.current.add(eventKey);

      const role = (user?.role || "").toLowerCase();
      const isRiderUser =
        role.includes("rider") ||
        role.includes("delivery") ||
        role.includes("delivery partner");

      // When restaurant confirms the order (status becomes "Confirmed" or "Preparing")
      if (status.toLowerCase() === "confirmed" || status.toLowerCase() === "preparing") {
        // If it was in the unconfirmed restaurant list, mark it confirmed / remove from unconfirmed
        setNotifications((prev) =>
          prev.map((n) =>
            n.orderId === orderId ? { ...n, isConfirmed: true, orderStatus: status } : n
          )
        );
      }

      // A) RIDER ALERT: When Food is marked "Ready" or "Ready for Pickup"
      if (
        isRiderUser &&
        ["ready", "ready for pickup", "preparing"].includes(status.toLowerCase())
      ) {
        notificationSound.playRiderAlertSound();
        triggerDesktopNotification(
          `🛵 Order #${orderId} is Ready for Pickup!`,
          `Pickup at ${order.items?.[0]?.restaurantName || "Restaurant"}`
        );

        const notif: ActiveNotification = {
          id: `rider_ready_${orderId}_${Date.now()}`,
          type: "rider_new_delivery",
          title: `🛵 Order #${orderId} is Ready for Pickup!`,
          subtitle: `Food prepared at ${order.items?.[0]?.restaurantName || "Restaurant"}`,
          orderId,
          riderPayout: order.riderPayout || order.deliveryFee || 25,
          restaurantName: order.items?.[0]?.restaurantName || "Restaurant",
          address:
            typeof order.deliveryAddress === "string"
              ? order.deliveryAddress
              : order.deliveryAddress?.address,
          itemsSummary: Array.isArray(order.items)
            ? order.items.map((it: any) => it.name).join(", ")
            : undefined,
          createdAt: Date.now(),
          isRead: false,
        };

        setActivePopup(notif);
        setNotifications((prev) => [
          notif,
          ...prev.filter((n) => n.id !== notif.id).slice(0, 29),
        ]);
      }

      // B) CUSTOMER ALERT: When logged-in user is the customer who placed this order
      if (
        user?.id &&
        (order.userId === user.id ||
          order.userEmail === user.email ||
          payload.userId === user.id ||
          payload.userEmail === user.email)
      ) {
        notificationSound.playStatusUpdateSound();
        triggerDesktopNotification(
          `✨ Order #${orderId}: ${status}`,
          `Your food order status has been updated to ${status}.`
        );

        const items = Array.isArray(order.items) ? order.items : [];
        const itemsSummary = items
          .map((it: any) => `${it.name || "Item"} × ${it.quantity || 1}`)
          .join(", ");
        const restName =
          items[0]?.restaurantName || order.restaurantName || "FoodFlow Kitchen";

        const statusLower = status.toLowerCase();
        let statusTitle = `🍽️ Order #${orderId} is now ${status}!`;
        if (statusLower === "confirmed") {
          statusTitle = `🎉 Order Confirmed by ${restName}!`;
        } else if (statusLower === "preparing") {
          statusTitle = `🍳 ${restName} is preparing your food!`;
        } else if (statusLower === "ready" || statusLower === "ready for pickup") {
          statusTitle = `📦 Food is packed & ready for pickup!`;
        } else if (statusLower === "out for delivery") {
          statusTitle = `🛵 Rider picked up your order and is on the way!`;
        } else if (statusLower === "delivered") {
          statusTitle = `✨ Order Delivered! Enjoy your food!`;
        }

        const notif: ActiveNotification = {
          id: `cust_${orderId}_${status}_${Date.now()}`,
          type: "customer_order_update",
          title: statusTitle,
          subtitle: `Status: ${status}`,
          orderId,
          orderStatus: status,
          totalAmount: order.totalAmount,
          restaurantName: restName,
          itemsSummary: itemsSummary || undefined,
          createdAt: Date.now(),
          isRead: false,
        };

        setActivePopup(notif);
        setNotifications((prev) => [notif, ...prev.slice(0, 29)]);
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
  }, [
    user?.id,
    user?.email,
    user?.role,
    getStoredRestaurant,
    getStoredRider,
    triggerDesktopNotification,
  ]);

  // Dismiss popup
  const dismissPopup = useCallback(() => {
    setActivePopup(null);
  }, []);

  // Confirm Order directly (from popup, navbar dropdown, or dashboard)
  const confirmOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!orderId || !user?.id) return false;

      try {
        const res = await updateOrderStatusApi(
          orderId,
          { orderStatus: "Confirmed" },
          user.id,
          user.email || ""
        );

        if (res?.success) {
          // 1. Update socket
          const socket = getOrderSocket(orderId);
          socket.emit("order_status_updated", {
            orderId,
            orderStatus: "Confirmed",
          });

          // 2. Remove / mark confirmed from notifications list
          setNotifications((prev) =>
            prev.filter((n) => n.orderId !== orderId || n.type !== "restaurant_new_order")
          );

          // 3. Dismiss popup if active
          if (activePopup?.orderId === orderId) {
            setActivePopup(null);
          }

          toast.success(`🎉 Order #${orderId} confirmed successfully!`, {
            position: "top-center",
            toastId: `conf-${orderId}`,
          });

          return true;
        } else {
          toast.error(res?.message || "Failed to confirm order.", {
            position: "top-center",
          });
          return false;
        }
      } catch (err: any) {
        toast.error(err?.message || "Error confirming order.", {
          position: "top-center",
        });
        return false;
      }
    },
    [user?.id, user?.email, activePopup?.orderId]
  );

  // Dismiss individual notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setActivePopup(null);
  }, []);

  // Mark all as read (marks regular alerts read, but unconfirmed orders remain pending until accepted)
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.type !== "restaurant_new_order" ? { ...n, isRead: true } : n))
    );
  }, []);

  // Actionable badge count: all unconfirmed restaurant orders + unaccepted rider orders + unread customer updates
  const unreadCount = notifications.filter((n) => {
    if (n.type === "restaurant_new_order") {
      return !n.isConfirmed;
    }
    if (n.type === "rider_new_delivery") {
      return true;
    }
    return !n.isRead;
  }).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        activePopup,
        unreadCount,
        isDropdownOpen,
        isMuted,
        setIsDropdownOpen,
        toggleMute,
        dismissPopup,
        confirmOrder,
        dismissNotification,
        clearAllNotifications,
        markAllAsRead,
        refreshPendingOrders,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
