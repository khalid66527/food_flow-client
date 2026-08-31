"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Lock,
  Loader2,
  FileText,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getMyRiderProfile, IRiderProfile } from "@/lib/api/rider";

interface RiderAccessGuardProps {
  children: React.ReactNode;
}

export default function RiderAccessGuard({ children }: RiderAccessGuardProps) {
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();

  const [rider, setRider] = useState<IRiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const fetchRider = useCallback(async () => {
    if (!user?.email && !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await getMyRiderProfile(user?.email || "", user?.id || "");
      if (res.success && res.data) {
        setRider(res.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("foodflow_has_rider", "true");
          localStorage.setItem("foodflow_rider_data", JSON.stringify(res.data));
        }
      } else {
        setRider(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("foodflow_has_rider");
          localStorage.removeItem("foodflow_rider_data");
        }
      }
    } catch (err) {
      console.error("Error checking rider status in guard:", err);
      setRider(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchRider();

    const handleProfileChange = () => fetchRider();
    window.addEventListener("riderStatusChanged", handleProfileChange);
    return () => {
      window.removeEventListener("riderStatusChanged", handleProfileChange);
    };
  }, [fetchRider]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchRider();
  };

  const isOnboardingRoute =
    pathname === "/dashboard/rider/profile" ||
    pathname === "/dashboard/rider/settings";

  // 1. Loading State
  if (sessionLoading || loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6B35]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-gray-500 animate-pulse">
          Verifying delivery partner credentials...
        </p>
      </div>
    );
  }

  // 2. Case A: NO RIDER PROFILE CREATED YET
  if (!rider) {
    if (isOnboardingRoute) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl shadow-gray-200/50 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-inner">
            <Bike className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B35]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Rider Setup Required</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Complete Your Rider Profile
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              You must register your vehicle details, driving license, and delivery zone before accessing delivery requests and earning dashboards.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href="/dashboard/rider/profile"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Complete Rider Profile Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>I Already Created It (Refresh)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = (rider.status || "pending").toLowerCase();
  const isActive = status === "active" || status === "approved";

  // 3. Case B: RIDER PROFILE EXISTS BUT IS PENDING / NOT ACTIVE
  if (!isActive) {
    if (isOnboardingRoute) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-amber-100 shadow-2xl shadow-amber-500/5 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Access Locked • Pending Admin Verification</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Awaiting Verification
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              Your delivery partner credentials for <strong className="text-gray-900 font-extrabold">{rider.name}</strong> are currently under admin review. Delivering orders and earnings will unlock upon approval.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Rider Name:</span>
              <span className="font-extrabold text-gray-900">{rider.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Application Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                {rider.status || "Pending Verification"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Assigned Zone:</span>
              <span className="font-semibold text-gray-700">{rider.deliveryZone}, {rider.city}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/dashboard/rider/profile"
              className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>View Verification Status</span>
            </Link>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
