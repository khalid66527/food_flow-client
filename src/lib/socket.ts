"use client";

import { io, Socket } from "socket.io-client";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
)
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

let socket: Socket | null = null;
const activeRooms = new Set<string>();

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_BASE_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    socket.on("connect", () => {
      // Re-join all active rooms on reconnect
      activeRooms.forEach((room) => {
        socket?.emit("join_order_room", { orderId: room });
        socket?.emit("join_room", { room });
      });
    });

    socket.on("connect_error", () => {
      // Silently retry connection
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
  if (!orderId) return;
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
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    activeRooms.clear();
  }
}