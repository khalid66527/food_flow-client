import OrderTracking from "@/components/dashboardComponents/customerDashboard/OrderTracking";
import React, { Suspense } from "react";

const page = () => {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">Loading Order Tracking...</div>}>
      <OrderTracking />
    </Suspense>
  );
};

export default page;
