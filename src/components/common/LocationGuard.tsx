"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  X,
  Sparkles,
  Info,
} from "lucide-react";
import {
  detectRealTimeLocation,
  getRealTimeLocation,
  subscribeLocation,
} from "@/lib/location";

export default function LocationGuard({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [hasLocation, setHasLocation] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Standard GPS Scanner triggering the native browser prompt with stabilized jitter filter
  const scanAndDetectLocation = useCallback(
    async (isManualClick: boolean = false) => {
      if (isManualClick) {
        setIsDetecting(true);
        setError(null);
      }

      if (typeof window === "undefined" || !navigator.geolocation) {
        if (isManualClick) {
          setError("Geolocation is not supported by your browser or device.");
          setIsDetecting(false);
        }
        return;
      }

      try {
        const loc = await detectRealTimeLocation();
        setHasLocation(loc.hasRealLocation);
        setIsDetecting(false);
        if (!loc.hasRealLocation && isManualClick) {
          if (loc.error) {
            setError("Location blocked. Click the lock 🔒 icon in your address bar to Allow Location.");
          }
        }
      } catch (err: any) {
        if (isManualClick) {
          setError(
            "Location blocked. Click the lock 🔒 icon in your address bar to Allow Location."
          );
        }
        setIsDetecting(false);
        const loc = getRealTimeLocation();
        setHasLocation(loc.hasRealLocation);
      }
    },
    []
  );

  // Initial auto-request on load (triggers browser native popup just like Google Maps)
  useEffect(() => {
    if (!mounted) return;

    const loc = getRealTimeLocation();
    setHasLocation(loc.hasRealLocation);

    // Prompt browser geolocation directly on page load
    scanAndDetectLocation(false);

    const unsubscribe = subscribeLocation(() => {
      const currentLoc = getRealTimeLocation();
      setHasLocation(currentLoc.hasRealLocation);
    });

    // Auto-detect when browser permission state changes
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (status.state === "granted") {
            scanAndDetectLocation(false);
          }
          status.onchange = () => {
            if (status.state === "granted") {
              scanAndDetectLocation(false);
            } else if (status.state === "denied") {
              setHasLocation(false);
            }
          };
        })
        .catch(() => {});
    }

    const handleFocus = () => {
      const currentLoc = getRealTimeLocation();
      if (!currentLoc.hasRealLocation) {
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
  }, [mounted, scanAndDetectLocation]);

  return (
    <>
      {/* 1. Page content is ALWAYS fully accessible without blocking */}
      {children}

      {/* 2. Non-blocking floating location notification alert */}
      {mounted && !hasLocation && !isDismissed && (
        <aside 
          aria-label="Location permission banner"
          className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-950/60 shadow-2xl shadow-orange-500/10 rounded-2xl p-4 sm:p-4.5 animate-bounce-subtle"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <MapPin className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <span>Turn on Location</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </h4>
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
                  aria-label="Dismiss location alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Allow location to find delicious dishes and express delivery from restaurants closest to you.
              </p>

              {error && (
                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-200 font-medium mt-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scanAndDetectLocation(true)}
                  disabled={isDetecting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Requesting Permission...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Allow Location</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 font-medium transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
