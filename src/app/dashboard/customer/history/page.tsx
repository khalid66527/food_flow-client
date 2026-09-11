import React, { Suspense } from "react";
import CustomerOrders from "@/components/dashboardComponents/customerDashboard/CustomerOrders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History | FoodFlow Platform",
  description: "View your order history, delivery details, and receipts.",
};

export default function CustomerHistoryAliasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">
          Loading Order History...
        </div>
      }
    >
      <CustomerOrders />
    </Suspense>
  );
}
