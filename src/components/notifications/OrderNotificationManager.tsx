"use client";

import React from "react";
import OrderNotificationModal from "./OrderNotificationModal";

/**
 * Global OrderNotificationManager mounted in RootLayout.
 * Connects to NotificationContext to render real-time popup cards.
 */
export default function OrderNotificationManager() {
  return <OrderNotificationModal />;
}
