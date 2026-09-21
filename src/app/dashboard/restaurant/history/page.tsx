import React, { Suspense } from "react";
import RestaurantSellHistory from "@/components/dashboardComponents/restaurantDashboard/RestaurantSellHistory";

export default function RestaurantHistoryAliasPage() {
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
