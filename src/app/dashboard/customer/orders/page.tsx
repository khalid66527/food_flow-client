import React from "react";
import CustomerOrders from "@/components/dashboardComponents/customerDashboard/CustomerOrders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders | FoodFlow Platform",
  description: "View your past and active food orders, track delivery status, and download vouchers.",
};

export default function CustomerOrdersPage() {
  return <CustomerOrders />;
}
