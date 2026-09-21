"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  X,
  Crosshair,
  Loader2,
} from "lucide-react";
import {
  ILocationInfo,
  getRealTimeLocation,
  updateRealTimeLocation,
  getDistanceFromLatLonInMeters,
} from "@/lib/location";
import { getAllZones, detectZone } from "@/lib/api/zone";
import { IZone } from "@/types/zone";
import LocationPickerMap from "./LocationPickerMap";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<IZone[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Selected Coordinates & Address State
  const [latitude, setLatitude] = useState<number>(24.7471);
  const [longitude, setLongitude] = useState<number>(90.4203);
  const [addressText, setAddressText] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<IZone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search suggestions
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Geofence Zone Evaluation based strictly on Latitude & Longitude
  const [zoneEval, setZoneEval] = useState<{
    isInside: boolean;
    zone: IZone | null;
    distanceToNearestKm?: number;
    nearestZoneName?: string;
  }>({ isInside: true, zone: null });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evaluate coordinates whenever latitude or longitude changes
  useEffect(() => {
    let active = true;
    const evaluateCoords = async () => {
      try {
        const res = await detectZone(latitude, longitude);
        if (!active) return;
        if (res.success && res.data?.isInsideServiceArea && res.data.primaryZone) {
          setZoneEval({
            isInside: true,
            zone: res.data.primaryZone,
          });
          setSelectedZone(res.data.primaryZone);
        } else {
          setZoneEval({
            isInside: false,
            zone: null,
            distanceToNearestKm: res.data?.distanceToNearestKm,
            nearestZoneName: res.data?.nearestZone?.name,
          });
          setSelectedZone(null);
        }
      } catch {
        if (!active) return;
        // Strict local Haversine distance check against each zone's radiusKm
        let inside: IZone | null = null;
        for (const z of zones) {
          if (z.centerCoordinates && z.radiusKm) {
            const dist =
              getDistanceFromLatLonInMeters(
                latitude,
                longitude,
                z.centerCoordinates.latitude,
                z.centerCoordinates.longitude
              ) / 1000;
            if (dist <= z.radiusKm) {
              inside = z;
              break;
            }
          }
        }
        if (inside) {
          setZoneEval({ isInside: true, zone: inside });
          setSelectedZone(inside);
        } else {
          setZoneEval({ isInside: false, zone: null });
          setSelectedZone(null);
        }
      }
    };
    evaluateCoords();
    return () => {
      active = false;
    };
  }, [latitude, longitude, zones]);

  // Fetch zones on open & sync current location
  useEffect(() => {
    if (isOpen) {
      const current = getRealTimeLocation();
      const lat = Number.isFinite(current.lat) ? (current.lat as number) : 24.7471;
      const lng = Number.isFinite(current.lng) ? (current.lng as number) : 90.4203;
      setLatitude(lat);
      setLongitude(lng);

      const initialAddr =
        current.formattedAddress ||
        (current.zoneName
          ? `${current.zoneName}, ${current.city || "Bangladesh"}`
          : `${current.upazila || current.district || current.city || "Mymensingh"}, Bangladesh`);
      setAddressText(initialAddr);
      setSearchQuery(initialAddr);

      // Fetch active delivery zones
      const fetchZones = async () => {
        try {
          const res = await getAllZones({ isActive: true });
          if (res.success && Array.isArray(res.data)) {
            setZones(res.data);
            if (current.currentZoneId) {
              const matched = res.data.find(
                (z) =>
                  z._id === current.currentZoneId ||
                  String(z.zoneId) === String(current.currentZoneId)
              );
              if (matched) setSelectedZone(matched);
            }
          }
        } catch {}
      };
      fetchZones();
    }
  }, [isOpen]);

  // Reverse Geocoding with high accuracy street address formatting
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();

        if (data && data.display_name) {
          const formatted = data.display_name;
          setAddressText(formatted);
          setSearchQuery(formatted);
          return;
        }
      } catch {}

      const fb = `Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setAddressText(fb);
      setSearchQuery(fb);
    },
    []
  );

  // Handle position change on map (click / drag)
  const handlePositionChange = (lat: number, lng: number) => {
    setSelectedZone(null);
    setLatitude(lat);
    setLongitude(lng);
    reverseGeocode(lat, lng);
  };

  // Handle Exact GPS Location Detection ("Locate me")
  const handleLocateMe = async () => {
    setIsLocating(true);
    setSelectedZone(null);
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const exactLat = pos.coords.latitude;
        const exactLng = pos.coords.longitude;
        setLatitude(exactLat);
        setLongitude(exactLng);
        await reverseGeocode(exactLat, exactLng);
        setIsLocating(false);
      },
      async () => {
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          if (ipRes.ok) {
            const data = await ipRes.json();
            if (data && data.latitude && data.longitude) {
              setLatitude(data.latitude);
              setLongitude(data.longitude);
              await reverseGeocode(data.latitude, data.longitude);
            }
          }
        } catch {}
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Address search autocompletion
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery === addressText) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(`${searchQuery.trim()}, Bangladesh`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=bd`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowSuggestions(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, addressText]);

  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedZone(null);
    setLatitude(lat);
    setLongitude(lng);
    setAddressText(result.display_name);
    setSearchQuery(result.display_name);
    setShowSuggestions(false);
  };

  // Final Submit Location
  const handleSubmitLocation = async () => {
    setIsSubmitting(true);
    try {
      let targetLat = latitude;
      let targetLng = longitude;
      let targetAddress = addressText;

      // If user typed into the search box without clicking a suggestion
      if (searchQuery.trim() && searchQuery.trim() !== addressText.trim()) {
        try {
          const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery.trim() + ", Bangladesh"
          )}&limit=1&countrycodes=bd`;
          const geoRes = await fetch(geoUrl, { headers: { "Accept-Language": "en" } });
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            targetLat = parseFloat(geoData[0].lat);
            targetLng = parseFloat(geoData[0].lon);
            targetAddress = geoData[0].display_name;
            setLatitude(targetLat);
            setLongitude(targetLng);
            setAddressText(targetAddress);
          }
        } catch {}
      }

      // Strictly check if coordinates fall inside any delivery zone
      let matchedZone: IZone | null = null;
      let detectedCandidateZoneIds: string[] = [];
      let detectedMaxRadius = 6.0;

      try {
        const detectRes = await detectZone(targetLat, targetLng);
        if (detectRes.success && detectRes.data?.isInsideServiceArea && detectRes.data?.primaryZone) {
          matchedZone = detectRes.data.primaryZone;
          detectedCandidateZoneIds = (detectRes.data.candidateZoneIds || []).map(String);
          detectedMaxRadius = detectRes.data.maxDeliveryRadiusKm || 6.0;
        }
      } catch {
        // Local calculation fallback using strict radiusKm
        for (const z of zones) {
          if (z.centerCoordinates && z.radiusKm) {
            const distKm =
              getDistanceFromLatLonInMeters(
                targetLat,
                targetLng,
                z.centerCoordinates.latitude,
                z.centerCoordinates.longitude
              ) / 1000;
            if (distKm <= z.radiusKm) {
              matchedZone = z;
              break;
            }
          }
        }
      }

      if (matchedZone) {
        const zoneIdStr = String(matchedZone.zoneId !== undefined ? matchedZone.zoneId : (matchedZone._id || ""));
        const cityName = matchedZone.city || "Bangladesh";
        const zoneName = matchedZone.name;
        const finalCandidateZoneIds =
          detectedCandidateZoneIds.length > 0
            ? Array.from(new Set([zoneIdStr, ...detectedCandidateZoneIds]))
            : [zoneIdStr];

        updateRealTimeLocation(
          cityName,
          targetAddress,
          targetLat,
          targetLng,
          {
            division: matchedZone.division || cityName,
            district: matchedZone.district || cityName,
            upazila: matchedZone.upazila || cityName,
          },
          {
            currentZoneId: zoneIdStr,
            zoneName,
            candidateZoneIds: finalCandidateZoneIds,
            maxDeliveryRadiusKm: detectedMaxRadius || matchedZone.maxDeliveryRadiusKm || matchedZone.radiusKm || 6.0,
          }
        );
      } else {
        // Outside active delivery geofence
        const parts = targetAddress.split(",").map((s) => s.trim()).filter(Boolean);
        const areaTitle = parts[0] || "Your Area";
        const districtTitle =
          parts.length > 2 ? parts[parts.length - 3] || parts[parts.length - 2] : areaTitle;

        updateRealTimeLocation(
          districtTitle || "Outside Service Area",
          targetAddress,
          targetLat,
          targetLng,
          {
            division: "",
            district: districtTitle,
            upazila: areaTitle,
          },
          {
            currentZoneId: "",
            zoneName: "",
            candidateZoneIds: [],
            maxDeliveryRadiusKm: 5.0,
          }
        );
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* 1. Header (Foodi Exact Style) */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
            <h2 className="text-sm sm:text-base font-semibold text-gray-800">
              Is this your exact location?
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Search / Address Input with Red Border and "Locate me" Button */}
          <div className="p-4 sm:p-5 space-y-3.5 bg-white overflow-y-auto">
            <div className="relative">
              <div className="relative flex items-center border border-red-500 rounded-xl px-3.5 py-2.5 bg-white shadow-xs focus-within:ring-1 focus-within:ring-red-500">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedZone(null);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Enter your location"
                  className="w-full text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none pr-2 bg-transparent"
                />

                {/* Right action button inside input: "Locate me" or Clear (X) */}
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSuggestions(false);
                      searchInputRef.current?.focus();
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer shrink-0"
                    title="Clear text"
                  >
                    <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                      ✕
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer border border-red-200"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span>{isLocating ? "Locating..." : "Locate me"}</span>
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-[500] max-h-48 overflow-y-auto py-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-xs text-gray-700 hover:text-red-700 flex items-start gap-2 transition cursor-pointer border-b border-gray-50 last:border-none"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Interactive Leaflet Map */}
            <div className="w-full h-[290px] sm:h-[340px] relative rounded-xl overflow-hidden border border-gray-200">
              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onPositionChange={handlePositionChange}
                onLocateMe={handleLocateMe}
                isLocating={isLocating}
              />
            </div>

            {/* 4. Bottom Location Confirmation Card with Live Geofence Feedback */}
            {zoneEval.isInside && zoneEval.zone ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200/70 text-emerald-800 tracking-wide">
                      Zone {zoneEval.zone.zoneId || 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                      {zoneEval.zone.name}
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-700 leading-snug mt-0.5 truncate">
                    {addressText || "Delivery available in this area."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-rose-600 fill-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-200 text-rose-800 tracking-wide">
                      Outside Service Area
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                      Delivery Not Possible
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-700 leading-snug mt-0.5">
                    {zoneEval.nearestZoneName
                      ? `This pin is outside our delivery radius (~${zoneEval.distanceToNearestKm} km away from ${zoneEval.nearestZoneName}).`
                      : "This location is outside all active delivery coverage zones."}
                  </p>
                </div>
              </div>
            )}

            {/* 5. Foodi Big Submit Button */}
            <button
              type="button"
              onClick={handleSubmitLocation}
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                zoneEval.isInside
                  ? "bg-[#E60000] hover:bg-[#CC0000] active:scale-[0.99] text-white"
                  : "bg-gray-800 hover:bg-gray-900 active:scale-[0.99] text-white"
              } disabled:opacity-60`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Updating Location...</span>
                </>
              ) : zoneEval.isInside ? (
                <span>Confirm Location • Deliver Here</span>
              ) : (
                <span>Confirm Location (Outside Delivery Area)</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
