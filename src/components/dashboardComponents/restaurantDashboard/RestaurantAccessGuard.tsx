"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Lock,
  Loader2,
  FileText,
  UtensilsCrossed,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getMyRestaurantProfile, IRestaurant } from "@/lib/api/restaurant";

import LoadingSpinner from "@/lib/api/LoadingSpinner";

interface RestaurantAccessGuardProps {
  children: React.ReactNode;
}

export default function RestaurantAccessGuard({ children }: RestaurantAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const fetchRestaurant = useCallback(async () => {
    if (!user?.email && !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await getMyRestaurantProfile(user?.email || "", user?.id || "");
      if (res.success && res.data) {
        setRestaurant(res.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("foodflow_has_restaurant", "true");
          localStorage.setItem("foodflow_restaurant_data", JSON.stringify(res.data));
          if (res.data.ownerEmail) {
            localStorage.setItem("restaurant_owner_email", res.data.ownerEmail);
          }
        }
      } else {
        setRestaurant(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("foodflow_has_restaurant");
          localStorage.removeItem("foodflow_restaurant_data");
        }
      }
    } catch (err) {
      console.error("Error checking restaurant status in guard:", err);
      setRestaurant(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    fetchRestaurant();

    const handleProfileChange = () => fetchRestaurant();
    window.addEventListener("restaurantStatusChanged", handleProfileChange);
    return () => {
      window.removeEventListener("restaurantStatusChanged", handleProfileChange);
    };
  }, [fetchRestaurant]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchRestaurant();
  };

  // Paths that are allowed for onboarding / profile management
  const isOnboardingRoute =
    pathname === "/dashboard/restaurant/profile" ||
    pathname === "/dashboard/restaurant/create-restaurant" ||
    pathname === "/dashboard/restaurant/settings";

  // 1. Loading State
  if (sessionLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <LoadingSpinner size={50} color="#f97316" message="Verifying restaurant partner credentials..." />
      </div>
    );
  }

  // 2. Case A: NO RESTAURANT PROFILE CREATED YET
  if (!restaurant) {
    // If user is already on profile or create page, let them through to fill out the form
    if (isOnboardingRoute) {
      return <>{children}</>;
    }

    // Otherwise, block all operational pages (like add-food, menu, orders, etc.)
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl shadow-gray-200/50 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-extrabold uppercase tracking-wider text-[#FF6B35]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Profile Setup Required</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Create Your Restaurant Profile
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              You haven&apos;t set up your restaurant profile yet. You must complete your store details, address, and cuisines before accessing dashboard operations like adding food, managing menus, or receiving orders.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href="/dashboard/restaurant/create-restaurant"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Restaurant Profile Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>I Already Created It (Refresh Status)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = (restaurant.status || "pending").toLowerCase();
  const isActive = status === "active" || status === "approved";

  // 3. Case B: RESTAURANT PROFILE EXISTS BUT IS PENDING / NOT ACTIVE
  if (!isActive) {
    // If on profile page, let children render (RestaurantProfile will show the disabled profile + pending modal)
    if (isOnboardingRoute) {
      return <>{children}</>;
    }

    // On other operational pages (add-food, orders, menu, delivery, etc.), show strict locked barrier
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-amber-100 shadow-2xl shadow-amber-500/5 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Access Locked • Pending Admin Approval</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Awaiting Admin Approval
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              Your restaurant application for <strong className="text-gray-900 font-extrabold">{restaurant.restaurantName || restaurant.name}</strong> has been submitted and is currently undergoing verification by Food Flow Admins.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Store Name:</span>
              <span className="font-extrabold text-gray-900">{restaurant.restaurantName || restaurant.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Application Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                {restaurant.status || "Pending Approval"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-bold">Contact Email:</span>
              <span className="font-semibold text-gray-700">{restaurant.ownerEmail || restaurant.contactEmail}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Adding menu items, receiving food orders, and managing delivery settings will automatically unlock once the administrator approves your store.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/dashboard/restaurant/profile"
              className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-[#FF6B35]/25 hover:opacity-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>View Application Status</span>
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

  // 4. Fully Active & Approved -> Render full dashboard page
  return <>{children}</>;
}
