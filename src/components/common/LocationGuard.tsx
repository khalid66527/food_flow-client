"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Building2,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { updateRealTimeLocation, loadLocationFromStorage } from "@/lib/location";

const POPULAR_CITIES = [
  { name: "Chattogram", area: "GEC, Chattogram", lat: 22.3569, lng: 91.7832 },
  { name: "Dhaka", area: "Gulshan, Dhaka", lat: 23.8103, lng: 90.4125 },
  { name: "Sylhet", area: "Zindabazar, Sylhet", lat: 24.8949, lng: 91.8687 },
  { name: "Rajshahi", area: "Saheb Bazar, Rajshahi", lat: 24.3745, lng: 88.6042 },
  { name: "Khulna", area: "KDA Avenue, Khulna", lat: 22.8456, lng: 89.5403 },
  { name: "Barishal", area: "Sadat Manzil, Barishal", lat: 22.701, lng: 90.3535 },
  { name: "Rangpur", area: "Jahaj Company, Rangpur", lat: 25.7439, lng: 89.2752 },
  { name: "Comilla", area: "Kandirpar, Comilla", lat: 23.4607, lng: 91.1809 },
];

export default function LocationGuard({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if location is already saved in localStorage
    const savedCity = localStorage.getItem("foodflow_real_city");
    const savedArea = localStorage.getItem("foodflow_real_area");

    if (!savedCity && !savedArea) {
      setIsOpen(true);
    } else {
      loadLocationFromStorage();
    }
  }, []);

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

  // GPS Location Handler
  const handleTurnOnGPS = async () => {
    setIsDetecting(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Please select your city manually below.");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

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
          setIsDetecting(false);
          setIsOpen(false);
          
          // Trigger storage & location events for real-time restaurant loading
          window.dispatchEvent(new Event("storage"));
        } catch {
          setError("Failed to fetch location details. Please select your city manually.");
          setIsDetecting(false);
        }
      },
      (err) => {
        console.warn("GPS Permission error:", err.message);
        setError("GPS permission was denied or timed out. Please select your city manually below.");
        setIsDetecting(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  // Manual City Selection Handler
  const handleSelectCity = (cityName: string) => {
    const selected = POPULAR_CITIES.find((c) => c.name === cityName) || {
      name: cityName,
      area: `${cityName} Central`,
      lat: 22.3569,
      lng: 91.7832,
    };

    updateRealTimeLocation(selected.name, selected.area, selected.lat, selected.lng);
    setIsOpen(false);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Decorative Gradient Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-8 text-white text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-inner border border-white/30">
                <MapPin className="w-8 h-8 text-white animate-bounce" />
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white">
                Set Delivery Location
              </h2>
              <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-medium">
                To show restaurants, menus, and fast delivery options near you, please share your location.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* GPS Primary Button */}
              <button
                onClick={handleTurnOnGPS}
                disabled={isDetecting}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-sm font-semibold">Detecting Precise Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">Turn on GPS Location</span>
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse ml-auto" />
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                <span className="bg-white dark:bg-gray-900 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                  Or select city manually
                </span>
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
              </div>

              {/* Popular Cities Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  Select Your City:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleSelectCity(city.name)}
                      className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-gray-200 dark:border-gray-700/80 hover:border-orange-300 dark:hover:border-orange-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer group text-left"
                    >
                      <span className="truncate">{city.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-[11px] text-gray-500 dark:text-gray-400 text-center">
                📍 Location is required to connect you with nearby active restaurants and live order tracking.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
