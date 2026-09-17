import { Metadata } from "next";
import RiderHome from "@/components/dashboardComponents/riderDashboard/RiderHome";

export const metadata: Metadata = {
  title: "Rider Overview & Duty Control | FoodFlow Partner",
  description: "Live overview, online duty toggle, incoming orders, and daily performance for FoodFlow delivery riders.",
};

export default function RiderHomePage() {
  return (
    <div className="w-full">
      <RiderHome />
    </div>
  );
}
