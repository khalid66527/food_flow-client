import React from "react";
import AdminTransactions from "@/components/dashboardComponents/adminDashboard/AdminTransactions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Transactions & Refunds | Food Flow Admin",
  description: "Audit and manage payment transactions, settlements, and automated refunds.",
};

export default function AdminTransactionsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AdminTransactions />
    </div>
  );
}
