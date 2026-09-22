
import FoodDetails from "@/components/dashboardComponents/customerDashboard/FoodDetails";
import React from "react";

interface DetailsPageProps {
  params: Promise<{ id: string }>;
}

const DetailsPage = async ({ params }: DetailsPageProps) => {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#FFFDF8] text-gray-900 font-sans pb-20">
      <FoodDetails foodId={id} />
    </main>
  );
};

export default DetailsPage;