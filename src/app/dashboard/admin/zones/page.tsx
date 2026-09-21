import React from "react";
import AdminZones from "@/components/dashboardComponents/adminDashboard/AdminZones";

export const metadata = {
  title: "Delivery Zones Management | Admin Dashboard - Food Flow",
  description: "Configure geometric delivery zones, point-in-polygon geofencing, and delivery radius limits.",
};

export default function AdminZonesPage() {
  return <AdminZones />;
}
