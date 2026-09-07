"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  Sparkles,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { updateRealTimeLocation, loadLocationFromStorage } from "@/lib/location";

export default function LocationGuard({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to fetch location via lat & lng reverse geocoding
  const processCoordinates = useCallback(async (lat: number, lon: number) => {
    let city = "Chattogram";
    let area = "Chattogram Central";

    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const data = await res.json();

      const detectedCityRaw =
        data.city ||
        data.principalSubdivision ||
        data.locality ||
        "Chattogram";

      const detectedAreaRaw =
        data.locality || data.localityInfo?.locality?.[0]?.name || detectedCityRaw;

      const lowerRaw = detectedCityRaw.toLowerCase();
      if (lowerRaw.includes("dhaka")) city = "Dhaka";
      else if (lowerRaw.includes("chittagong") || lowerRaw.includes("chattogram")) city = "Chattogram";
      else if (lowerRaw.includes("sylhet")) city = "Sylhet";
      else if (lowerRaw.includes("rajshahi")) city = "Rajshahi";
      else if (lowerRaw.includes("khulna")) city = "Khulna";
      else if (lowerRaw.includes("barisal") || lowerRaw.includes("barishal")) city = "Barishal";
      else if (lowerRaw.includes("rangpur")) city = "Rangpur";
      else if (lowerRaw.includes("comilla") || lowerRaw.includes("cumilla")) city = "Comilla";
      else if (lowerRaw.includes("mymensingh")) city = "Mymensingh";
      else if (detectedCityRaw) city = detectedCityRaw;

      area = detectedAreaRaw ? `${detectedAreaRaw}, ${city}` : `${city} Central`;
    } catch {
      area = `${city} Central`;
    }

    updateRealTimeLocation(city, area, lat, lon);
    setIsOpen(false);
    setIsDetecting(false);
    window.dispatchEvent(new Event("storage"));
  }, []);

  // Smart Auto-Detection scanning function
  const scanAndDetectLocation = useCallback((isManualClick: boolean = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (isManualClick) {
        setError("Geolocation is not supported by your browser or device.");
      }
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
      },
      (err) => {
        if (isManualClick) {
          console.warn("GPS Permission error:", err.message);
          setError("GPS access was denied or disabled. Please allow location access in your browser or device settings.");
          setIsDetecting(false);
        } else {
          // If silent auto-check fails/denied, ensure modal stays open
          const savedCity = localStorage.getItem("foodflow_real_city");
          if (!savedCity) {
            setIsOpen(true);
          }
        }
      },
      { timeout: 8000, maximumAge: 30000 }
    );
  }, [processCoordinates]);

  // Initial mount check & background scanning
  useEffect(() => {
    const savedCity = localStorage.getItem("foodflow_real_city");
    const savedArea = localStorage.getItem("foodflow_real_area");

    if (savedCity || savedArea) {
      loadLocationFromStorage();
      setIsOpen(false);
    } else {
      // No saved location — attempt silent auto-detection first
      setIsOpen(true);
      scanAndDetectLocation(false);
    }

    // Auto-detect if browser permission status changes
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

    // Also re-scan on window focus / visibility change
    const handleFocus = () => {
      const currentCity = localStorage.getItem("foodflow_real_city");
      if (!currentCity) {
        scanAndDetectLocation(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [scanAndDetectLocation]);

  // Prevent closing modal on Escape key press when open
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

  return (
    <>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-gray-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Decorative Gradient Header with FoodFlow Branding */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-8 text-white text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-inner border border-white/30">
                <MapPin className="w-8 h-8 text-white animate-bounce" />
              </div>

              <div className="mb-2">
                <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[11px] font-extrabold tracking-widest text-amber-100 uppercase">
                  FoodFlow Location Guard
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white">
                Turn On GPS Location
              </h2>
              <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto font-medium">
                We need your live location to display nearby partner restaurants, menus, and real-time delivery estimates.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-red-700 dark:text-red-300 text-xs">
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
                    <span className="text-sm font-bold">Detecting Live Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-base font-extrabold">Turn on GPS Location</span>
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse ml-auto" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl text-[11px] text-gray-500 dark:text-gray-400 text-center">
                <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Location access is required to browse and order from FoodFlow.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
