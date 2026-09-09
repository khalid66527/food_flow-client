import React, { Suspense } from "react";
import CustomerDeliveryHistory from "@/components/dashboardComponents/customerDashboard/CustomerDeliveryHistory";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery History | FoodFlow Platform",
  description: "View all your past and completed food deliveries, rider details, and download invoice vouchers.",
};

export default function CustomerDeliveryHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">
          Loading Delivery History...
        </div>
      }
    >
      <CustomerDeliveryHistory />
    </Suspense>
  );
}
