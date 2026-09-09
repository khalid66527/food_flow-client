"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  MapPin,
  Navigation,
  Loader2,
  Sparkles,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import {
  updateRealTimeLocation,
  getRealTimeLocation,
  subscribeLocation,
  parseBangladeshHierarchy,
} from "@/lib/location";
import LoadingSpinner from "@/components/LoadingSpinner";

function isRouteLocationRequired(pathname: string): boolean {
  if (!pathname) return false;
  const path = pathname.toLowerCase();

  // 1. PUBLIC WHITELIST ROUTES (LocationGuard modal is NEVER shown here)
  if (
    path === "/" ||
    path === "/about" ||
    path.startsWith("/about/") ||
    path === "/contact" ||
    path.startsWith("/contact/") ||
    path === "/login" ||
    path === "/register" ||
    path.startsWith("/auth/")
  ) {
    return false;
  }

  // 2. PROTECTED & DISHES ROUTES (Mandatory GPS location required)
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/dishes") ||
    path.startsWith("/restaurants") ||
    path.startsWith("/checkout") ||
    path.includes("/cart") ||
    path.includes("/order-tracking")
  ) {
    return true;
  }

  return false;
}

export default function LocationGuard({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState<boolean>(false);
  const isProtected = isRouteLocationRequired(pathname);

  const [hasLocation, setHasLocation] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reverse geocode helper & in-memory location updater
  const processCoordinates = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const data = await res.json();
      const parsed = parseBangladeshHierarchy(data);

      updateRealTimeLocation(parsed.city, parsed.area, lat, lon, {
        division: parsed.division,
        district: parsed.district,
        upazila: parsed.upazila,
      });
    } catch {
      updateRealTimeLocation("Chattogram", "Chattogram Central", lat, lon, {
        division: "Chattogram",
        district: "Chattogram",
        upazila: "Chattogram GPO",
      });
    }

    setHasLocation(true);
    setIsOpen(false);
    setIsDetecting(false);
    setIsChecking(false);
    setError(null);
  }, []);

  // Real-time GPS Scanner
  const scanAndDetectLocation = useCallback((isManualClick: boolean = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (isManualClick) {
        setError("Geolocation is not supported by your browser or device.");
      }
      setIsChecking(false);
      return;
    }

    if (isManualClick) {
      setIsDetecting(true);
      setError(null);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        await processCoordinates(lat, lon);
        setIsChecking(false);
      },
      (err) => {
        if (isManualClick) {
          console.warn("GPS Permission error:", err.message);
          setError(
            "GPS access is required to view nearby dishes. Please allow location access in your browser or device settings to continue."
          );
          setIsDetecting(false);
        }
        const loc = getRealTimeLocation();
        if (!loc.hasRealLocation) {
          setHasLocation(false);
          setIsOpen(true);
        }
        setIsChecking(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [processCoordinates]);

  // Initial & route-change background scan
  useEffect(() => {
    if (!mounted) return;

    if (!isProtected) {
      setIsOpen(false);
      setIsChecking(false);
      return;
    }

    const loc = getRealTimeLocation();
    setHasLocation(loc.hasRealLocation);

    if (loc.hasRealLocation) {
      setIsOpen(false);
      setIsChecking(false);
    } else {
      setIsChecking(true);
      scanAndDetectLocation(false);
    }

    const unsubscribe = subscribeLocation(() => {
      const currentLoc = getRealTimeLocation();
      setHasLocation(currentLoc.hasRealLocation);
      if (currentLoc.hasRealLocation) {
        setIsOpen(false);
        setIsChecking(false);
      }
    });

    // Auto-detect if browser permission changes to granted
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
        if (status.state === "granted") {
          scanAndDetectLocation(false);
        }
        status.onchange = () => {
          if (status.state === "granted") {
            scanAndDetectLocation(false);
          }
        };
      }).catch(() => {});
    }

    const handleFocus = () => {
      const currentLoc = getRealTimeLocation();
      if (!currentLoc.hasRealLocation && isProtected) {
        scanAndDetectLocation(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [mounted, pathname, isProtected, scanAndDetectLocation]);

  // Strict Guard: Prevent closing modal on Escape key press when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 0. Pre-hydration SSR pass -> match server HTML output exactly
  if (!mounted) {
    return <>{children}</>;
  }

  // 1. Unprotected public route -> render children immediately
  if (!isProtected) {
    return <>{children}</>;
  }

  // 2. Location already confirmed -> render children
  if (hasLocation) {
    return <>{children}</>;
  }

  // 3. Initial checking state -> render clean LoadingSpinner (NO modal pop-up flicker!)
  if (isChecking) {
    return <LoadingSpinner fullScreen />;
  }

  // 4. Location OFF / Permission Denied -> render mandatory LocationGuard modal
  return (
    <>
      <div className="hidden">{children}</div>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-gray-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Decorative Gradient Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-8 text-white text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-inner border border-white/30">
                <MapPin className="w-8 h-8 text-white animate-bounce" />
              </div>

              <div className="mb-2">
                <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[11px] font-extrabold tracking-widest text-amber-100 uppercase">
                  Location Access Required
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white">
                GPS Access Required
              </h2>
              <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto font-medium leading-relaxed">
                FoodFlow requires your live GPS location to display nearby partner restaurants and dishes.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Error Box — Only rendered if user manually clicked button and permission was denied/failed */}
              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-red-700 dark:text-red-300 text-xs font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Single Prominent GPS Button */}
              <button
                onClick={() => scanAndDetectLocation(true)}
                disabled={isDetecting}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-5 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-sm font-bold">Requesting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-base font-extrabold">Turn on GPS Location</span>
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse ml-auto" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl text-[11px] text-gray-500 dark:text-gray-400 text-center font-medium">
                <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" />
                <span>GPS access is required to view dishes and order from FoodFlow.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
