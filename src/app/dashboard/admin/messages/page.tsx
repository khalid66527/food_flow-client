import React from "react";
import AdminContactMessages from "@/components/dashboardComponents/adminDashboard/AdminContactMessages";

export const metadata = {
  title: "Support Inquiries & Messages — Food Flow Admin",
  description: "Manage contact messages and send direct email support responses to customers, restaurants, and riders.",
};

export default function AdminMessagesPage() {
  return <AdminContactMessages />;
}
