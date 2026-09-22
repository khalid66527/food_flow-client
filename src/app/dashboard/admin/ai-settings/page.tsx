import AdminAiSettings from "@/components/dashboardComponents/adminDashboard/AdminAiSettings";
import React from "react";

export const metadata = {
  title: "AI Assistant Configuration | FoodFlow Admin",
  description: "Configure FoodFlow AI Assistant models, providers, key pools, and Sales Executive persona.",
};

const AiSettingsPage = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <AdminAiSettings />
    </div>
  );
};

export default AiSettingsPage;
