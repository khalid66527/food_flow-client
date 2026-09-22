import { Metadata } from "next";
import RestaurantSettings from "@/components/dashboardComponents/restaurantDashboard/RestaurantSettings";

export const metadata: Metadata = {
  title: "Restaurant Settings & Preferences | FoodFlow Partner",
  description: "Configure your restaurant profile, operating hours, delivery options, pricing tiers, and notification preferences.",
};

export default function RestaurantSettingsPage() {
  return (
    <div className="w-full">
      <RestaurantSettings />
    </div>
  );
}
