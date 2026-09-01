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

export function getOrderSocket(orderId: string): Socket {
  if (!socket) {
    socket = io(SERVER_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      forceNew: true,
    });

    socket.on("connect", () => {
      socket?.emit("join_order_room", { orderId });
    });
  }

  return socket;
}

export function joinOrderRoom(orderId: string): void {
  const s = getOrderSocket(orderId);
  if (s.connected) {
    s.emit("join_order_room", { orderId });
  }
}

export function disconnectOrderSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}