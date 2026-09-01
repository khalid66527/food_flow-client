import React from "react";
import { Metadata } from "next";
import RestaurantProfile from "@/components/dashboardComponents/restaurantDashboard/RestaurantProfile";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Restaurant Profile | FoodFlow Partner Dashboard",
  description: "Manage and configure your restaurant profile, cuisines, operations, and store settings.",
};

const RestaurantProfilePage = () => {
  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          href="/dashboard/restaurant"
          className="hover:text-[#FF6B35] transition flex items-center gap-1.5"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-800">Restaurant Profile</span>
      </nav>

      {/* Profile & Setup Component */}
      <RestaurantProfile />
    </div>
  );
};

export default RestaurantProfilePage;