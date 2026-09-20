import { Metadata } from "next";
import RestaurantSmartGrocery from "@/components/dashboardComponents/restaurantDashboard/RestaurantSmartGrocery";

export const metadata: Metadata = {
  title: "Smart Grocery & Inventory | Restaurant Dashboard | FoodFlow",
  description:
    "AI & smart ingredient aggregation system for restaurant kitchens. Select dishes, calculate bulk raw materials, and export categorized grocery shopping lists.",
};

export default function RestaurantGroceryPage() {
  return <RestaurantSmartGrocery />;
}
