"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
  User,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

import LoadingSpinner from "@/lib/api/LoadingSpinner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  dashboardName: string;
}

// Map user roles to their correct dashboard
function getCorrectDashboardUrl(rawRole?: string | null): string {
  if (!rawRole) return "/dashboard/customer";
  const r = rawRole.toLowerCase();
  if (r.includes("admin")) return "/dashboard/admin";
  if (r.includes("restaurant")) return "/dashboard/restaurant";
  if (r.includes("rider") || r.includes("delivery")) return "/dashboard/rider";
  return "/dashboard/customer";
}

// Check if user role satisfies allowed roles
function isRoleAllowed(userRole: string | undefined | null, allowedRoles: string[]): boolean {
  if (!userRole) {
    // If user has no role defined, default is customer
    return allowedRoles.some((ar) => ar.toLowerCase() === "customer");
  }

  const normalizedUserRole = userRole.toLowerCase().trim();

  return allowedRoles.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    if (normAllowed === "admin" && (normalizedUserRole.includes("admin") || normalizedUserRole === "super-admin")) return true;
    if (normAllowed === "restaurant" && (normalizedUserRole.includes("restaurant") || normalizedUserRole === "restaurant partner")) return true;
    if (normAllowed === "rider" && (normalizedUserRole.includes("rider") || normalizedUserRole.includes("delivery") || normalizedUserRole === "delivery partner")) return true;
    if (normAllowed === "customer" && normalizedUserRole.includes("customer")) return true;
    return normalizedUserRole === normAllowed;
  });
}

export default function RoleGuard({
  children,
  allowedRoles,
  dashboardName,
}: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSwitchAccount = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`;
            router.push(loginUrl);
            router.refresh();
          },
        },
      });
    } catch {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  };

  // 1. Loading State
  if (!isClient || isPending) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  // 2. Not Logged In State
  if (!session?.user) {
    const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`;

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-xs font-bold uppercase tracking-wider text-[#FF6B35]">
              Authentication Required
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Sign In to Access {dashboardName}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You must be logged in with an authorized account to view this page.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={loginUrl}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-sm shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <span>Sign In with Credentials</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = session.user as {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  const userRole = user.role || "Customer";
  const hasAccess = isRoleAllowed(userRole, allowedRoles);

  // 3. Unauthorized Role State (e.g. Customer trying to open Admin Dashboard)
  if (!hasAccess) {
    const myDashboardUrl = getCorrectDashboardUrl(userRole);
    const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`;

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-rose-100 shadow-2xl shadow-rose-500/5 text-center space-y-6">
          {/* Alert Icon */}
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-10 h-10" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Access Denied (403 Unauthorized)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Unauthorized Access
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              You do not have permission to view the <strong className="text-gray-800">{dashboardName}</strong>.
            </p>
          </div>

          {/* Current Account Details Box */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                Logged in Account:
              </span>
              <span className="font-bold text-gray-800">{user.name || user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                Your Current Role:
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-rose-700 bg-rose-100/80 font-bold capitalize">
                {userRole}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                Required Role:
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-gray-700 bg-gray-200/80 font-bold capitalize">
                {allowedRoles.join(" or ")}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Link
              href={myDashboardUrl}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-sm shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to My Dashboard ({userRole})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleSwitchAccount}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
              <span>Sign in with another account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized -> Render Dashboard
  return <>{children}</>;
}
