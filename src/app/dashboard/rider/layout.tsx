import DashboardSideBar from "@/components/dashboardComponents/riderDashboard/DashboardSideBar";
import RoleGuard from "@/components/common/RoleGuard";
import RiderAccessGuard from "@/components/dashboardComponents/riderDashboard/RiderAccessGuard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RoleGuard allowedRoles={["rider", "delivery", "Delivery Partner"]} dashboardName="Rider Dashboard">
      <div className="min-h-screen bg-[#F8F9FC] text-gray-800 font-sans flex flex-col md:flex-row transition-colors duration-300">
        <DashboardSideBar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F8F9FC]">
          <main className="p-6 md:p-10 flex-grow bg-[#F8F9FC]">
            <RiderAccessGuard>{children}</RiderAccessGuard>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
