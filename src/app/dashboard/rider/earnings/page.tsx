import { Metadata } from "next";
import RiderEarnings from "@/components/dashboardComponents/riderDashboard/RiderEarnings";

export const metadata: Metadata = {
  title: "Rider Earnings & Payouts | FoodFlow Partner",
  description: "View delivery fees, customer tips, wallet balance, and request mobile payouts (bKash/Nagad/Bank).",
};

export default function RiderEarningsPage() {
  return (
    <div className="w-full">
      <RiderEarnings />
    </div>
  );
}
