import ActiveDelivery from '@/components/dashboardComponents/riderDashboard/ActiveDelivery';
import React, { Suspense } from 'react';

const page = () => {
    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-sm font-bold text-gray-500">Loading Delivery Tracking...</div>}>
            <ActiveDelivery />
        </Suspense>
    );
};

export default page;

