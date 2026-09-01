"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("rider_token") : null;
    socket = io(process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000", {
      auth: { token: token || "" },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
