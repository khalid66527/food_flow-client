import { Metadata } from "next";
import CustomerFavorites from "@/components/dashboardComponents/customerDashboard/CustomerFavorites";

export const metadata: Metadata = {
  title: "My Favorites | Food Flow Customer Dashboard",
  description: "View and manage your favorite dishes and quick reorders.",
};

export default function FavoritesPage() {
  return <CustomerFavorites />;
}
