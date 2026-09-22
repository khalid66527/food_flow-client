import CustomerCheckout from "@/components/dashboardComponents/customerDashboard/CustomerCheckout";
import React, { Suspense } from "react";

const page = () => {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">Loading Checkout...</div>}>
      <CustomerCheckout />
    </Suspense>
  );
};

export default page;
