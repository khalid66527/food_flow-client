import DashboardSideBar from "@/components/dashboardComponents/adminDashboard/DashboardSideBar";
import RoleGuard from "@/components/common/RoleGuard";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RoleGuard allowedRoles={["admin", "Admin", "super-admin"]} dashboardName="Admin Dashboard">
      <div className="min-h-screen bg-[#F8F9FC] text-gray-800 font-sans flex flex-col md:flex-row transition-colors duration-300">
        <DashboardSideBar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F8F9FC]">
          <main className="p-6 md:p-10 flex-grow bg-[#F8F9FC]">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
