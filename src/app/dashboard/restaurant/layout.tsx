import DashboardSideBar from "@/components/dashboardComponents/restaurantDashboard/DashboardSideBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#06060C] text-gray-800 dark:text-gray-300 font-sans flex flex-col md:flex-row transition-colors duration-300">
      <DashboardSideBar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="p-6 md:p-10 flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}