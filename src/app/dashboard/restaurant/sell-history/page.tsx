import React, { Suspense } from "react";
import RestaurantSellHistory from "@/components/dashboardComponents/restaurantDashboard/RestaurantSellHistory";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell History | Restaurant Partner Dashboard",
  description: "View all completed sales, delivery partner details, and revenue breakdown in table format.",
};

export default function RestaurantSellHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">
          Loading Sell History...
        </div>
      }
    >
      <RestaurantSellHistory />
    </Suspense>
  );
}
