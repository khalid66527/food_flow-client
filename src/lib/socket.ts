import { io, Socket } from "socket.io-client";
import { getServerBaseUrl } from "@/lib/api/config";

let socket: Socket | null = null;
const activeRooms = new Set<string>();

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    // Server-side stub to prevent SSR breakages
    return {
      connected: false,
      on: () => {},
      off: () => {},
      emit: () => {},
      disconnect: () => {},
    } as unknown as Socket;
  }

  if (!socket) {
    socket = io(getServerBaseUrl(), {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to FoodFlow Real-time Socket Server");
      // Re-join all active rooms on reconnect
      activeRooms.forEach((room) => {
        socket?.emit("join_order_room", { orderId: room });
        socket?.emit("join_room", { room });
      });
    });

    socket.on("connect_error", () => {
      // Silently retry connection in background
    });
  }

  return socket;
}

export function getOrderSocket(orderId?: string): Socket {
  const s = getSocket();
  if (orderId) {
    joinOrderRoom(orderId);
  }
  return s;
}

export function joinOrderRoom(orderId: string): void {
  if (!orderId || typeof window === "undefined") return;
  activeRooms.add(orderId);
  const s = getSocket();
  if (s.connected) {
    s.emit("join_order_room", { orderId });
    s.emit("join_room", { room: orderId });
  }
}

export function leaveOrderRoom(orderId: string): void {
  if (!orderId) return;
  activeRooms.delete(orderId);
}

export function disconnectOrderSocket(): void {
  // We keep the singleton socket alive for global notifications across pages.
  // Individual components should remove their event listeners via socket.off(...)
}

export function emitNewOrderEvent(order: any): void {
  if (!order) return;
  try {
    const s = getSocket();
    s.emit("new_order_placed", order);
  } catch (err) {
    console.warn("Could not emit new_order_placed:", err);
  }
}

export function emitOrderStatusUpdateEvent(payload: any): void {
  if (!payload) return;
  try {
    const s = getSocket();
    s.emit("order_status_updated", payload);
  } catch (err) {
    console.warn("Could not emit order_status_updated:", err);
  }
}