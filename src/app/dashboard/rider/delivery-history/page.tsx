import React, { Suspense } from "react";
import RiderDeliveryHistory from "@/components/dashboardComponents/riderDashboard/RiderDeliveryHistory";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery History | Rider Partner Dashboard",
  description: "View all completed deliveries, rider payout earnings, and drop-off records.",
};

export default function RiderDeliveryHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">
          Loading Delivery History...
        </div>
      }
    >
      <RiderDeliveryHistory />
    </Suspense>
  );
}
