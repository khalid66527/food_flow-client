"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  Home,
  Package,
  Navigation,
  DollarSign,
  History,
  User,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu as MenuIcon,
  X,
  Sparkles,
  MapPin,
  Clock,
  Lock,
  Plus,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: "brand" | "accent" | "success" | "muted";
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [riderData, setRiderData] = useState<any>(null);

  // Sync rider profile status
  useEffect(() => {
    const checkRiderProfile = async () => {
      const email = session?.user?.email;
      if (!email) return;

      try {
        const { getMyRiderProfile } = await import("@/lib/api/rider");
        const res = await getMyRiderProfile(email, session?.user?.id);
        if (res.success && res.data) {
          setRiderData(res.data);
          setIsOnline(res.data.isAvailable ?? false);
        } else {
          setRiderData(null);
        }
      } catch {
        setRiderData(null);
      }
    };

    checkRiderProfile();

    const handleCustomEvent = () => checkRiderProfile();
    window.addEventListener("storage", handleCustomEvent);
    window.addEventListener("riderProfileChanged", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleCustomEvent);
      window.removeEventListener("riderProfileChanged", handleCustomEvent);
    };
  }, [session?.user?.email, session?.user?.id]);

  const handleLogout = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/auth/login");
            router.refresh();
          },
        },
      });
    } catch {
      router.push("/auth/login");
    }
  };

  const rStatus = (riderData?.status || "").toLowerCase();
  const isRiderApproved = rStatus === "active" || rStatus === "approved";
  const hasRider = Boolean(riderData);

  const navSections: NavSection[] = [
    {
      title: "Deliveries & Operations",
      items: [
        {
          label: "Rider Home",
          href: "/dashboard/rider",
          icon: Home,
        },
        {
          label: "Delivery Details",
          href: "/dashboard/rider/delivery-details",
          icon: Package,
          badge: "4 Near",
          badgeType: "brand",
        },
        {
          label: "Active Delivery",
          href: "/dashboard/rider/active-delivery",
          icon: Navigation,
          badge: "Live",
          badgeType: "accent",
        },
      ],
    },
    {
      title: "Earnings & Records",
      items: [
        {
          label: "Earnings",
          href: "/dashboard/rider/earnings",
          icon: DollarSign,
        },
        {
          label: "History",
          href: "/dashboard/rider/history",
          icon: History,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: riderData ? "Rider Profile" : "Create Profile",
          href: "/dashboard/rider/profile",
          icon: User,
          badge: isRiderApproved ? "Verified" : riderData ? "Pending" : undefined,
          badgeType: isRiderApproved ? "success" : "brand",
        },
      ],
    },
  ];

  const mobileNavItems = [
    { label: "Home", href: "/dashboard/rider", icon: Home },
    { label: "Deliveries", href: "/dashboard/rider/delivery-details", icon: Package },
    { label: "Map", href: "/dashboard/rider/active-delivery", icon: MapPin },
    { label: "Earnings", href: "/dashboard/rider/earnings", icon: DollarSign },
    { label: riderData ? "Profile" : "Create Profile", href: "/dashboard/rider/profile", icon: User },
  ];

  const getBadgeClass = (type?: "brand" | "accent" | "success" | "muted", isActive?: boolean) => {
    if (isActive) {
      return "bg-white/20 text-white border border-white/30";
    }
    switch (type) {
      case "brand":
        return "bg-orange-50 text-[#FF6B35] border border-orange-200/80";
      case "accent":
        return "bg-amber-50 text-amber-700 border border-amber-200/80";
      case "success":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/80";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

  const userName = session?.user?.name || "Kamrul Hassan";
  const userEmail = session?.user?.email || "rider@foodflow.com";

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-[#FF6B35] transition-colors"
            aria-label="Open sidebar menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFB703] flex items-center justify-center shadow-md shadow-[#FF6B35]/20 text-white font-bold text-sm">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-[#FF6B35] to-[#E85A26] bg-clip-text text-transparent">
                Food Flow
              </span>
              <span className="block text-[10px] text-gray-400 font-semibold leading-none">
                Rider Hub
              </span>
            </div>
          </div>
        </div>

        {/* Quick Online Status Toggle */}
        {isRiderApproved ? (
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {isOnline ? "On Duty" : "Offline"}
          </button>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Pending Review</span>
          </div>
        )}
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar - Desktop */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen
          bg-white
          border-r border-gray-100
          flex flex-col justify-between
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-72 w-[280px]"}
          shadow-xl md:shadow-none
        `}
      >
        {/* Top Header & Logo */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/rider"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 group transition-transform ${isCollapsed ? "justify-center w-full" : ""}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6B35] via-[#FF8C42] to-[#FFB703] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20 text-white flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Bike className="w-5 h-5 text-white" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-[#FF6B35] bg-clip-text text-transparent">
                      Food Flow
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF6B35]">
                      Rider
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium truncate">
                    {riderData?.name || "Delivery Hub"}
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 md:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-orange-50 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Online / Duty Status Card */}
          {!isCollapsed && (
            <div className="mt-3.5 pt-3 border-t border-gray-100">
              {isRiderApproved ? (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
                    </span>
                    <span className="text-xs font-semibold text-emerald-900">
                      {isOnline ? "Ready for Orders" : "Duty Offline"}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                      isOnline
                        ? "text-emerald-700 hover:bg-emerald-100/60"
                        : "text-rose-700 hover:bg-rose-100/60"
                    }`}
                  >
                    {isOnline ? "Go Offline" : "Go Online"}
                  </button>
                </div>
              ) : hasRider ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold leading-tight">Verification Pending</p>
                    <p className="text-[10px] text-amber-700 truncate">Deliveries locked until approved</p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/dashboard/rider/profile"
                  className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-200 text-[#FF6B35] hover:bg-orange-100 transition-colors"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold leading-tight">Setup Profile</p>
                    <p className="text-[10px] text-orange-600 truncate">Register as a rider</p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-gray-200">
          {navSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="space-y-1">
              {section.title && !isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isLocked = !isRiderApproved && item.href !== "/dashboard/rider/profile" && item.href !== "/dashboard/rider/settings";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? (isLocked ? `${item.label} (Locked - Approval Needed)` : item.label) : undefined}
                      className={`
                        relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${isCollapsed ? "justify-center px-0 py-2.5" : ""}
                        ${
                          isActive
                            ? "bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-semibold shadow-md shadow-[#FF6B35]/25"
                            : isLocked
                            ? "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            : "text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50/70"
                        }
                      `}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                          isActive
                            ? "text-white"
                            : isLocked
                            ? "text-gray-300"
                            : "text-gray-400 group-hover:text-[#FF6B35] group-hover:scale-110"
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className={`truncate ${isLocked ? "text-gray-400 font-normal" : ""}`}>
                            {item.label}
                          </span>
                          {isLocked ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            item.badge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getBadgeClass(
                                  item.badgeType,
                                  isActive
                                )}`}
                              >
                                {item.badge}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Tooltip on Collapsed Mode */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                          {item.label} {isLocked ? "(Locked - Verification Needed)" : ""}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with Performance Badge & User Profile */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
          {!isCollapsed && (
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-50 via-amber-50/40 to-white border border-orange-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#E85A26]">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Rider Performance</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">4.9 ★ Rating</span>
                <span className="text-[10px] font-bold text-emerald-600">Top Performer</span>
              </div>
            </div>
          )}

          {/* User Account Info */}
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-white transition-all border border-transparent hover:border-gray-100 hover:shadow-xs ${
              isCollapsed ? "justify-center p-1" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#FFB703] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-xs">
              {userName.charAt(0).toUpperCase()}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {userEmail}
                </p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Rider Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-[#FF6B35] font-bold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
