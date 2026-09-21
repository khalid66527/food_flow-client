"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, Utensils, Layers, Eye, EyeOff } from "lucide-react";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { getAllRestaurants } from "@/lib/api/restaurant";
import { getAllZones } from "@/lib/api/zone";
import { IZone } from "@/types/zone";

const L = typeof window !== "undefined" ? require("leaflet") : null;

// Dynamically imported Leaflet components for SSR safety
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Rectangle = dynamic(
  () => import("react-leaflet").then((m) => m.Rectangle),
  { ssr: false }
);

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface IMapRestaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  zoneName?: string;
  cuisineTypes?: string[];
  logo?: string;
}

export interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  currentRestaurantId?: string;
  nearbyRestaurants?: IMapRestaurant[];
  zones?: IZone[];
  showNearbyRestaurantsDefault?: boolean;
  showZonesDefault?: boolean;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onPositionChange,
  onLocateMe,
  isLocating,
  currentRestaurantId,
  nearbyRestaurants: propRestaurants,
  zones: propZones,
  showNearbyRestaurantsDefault = true,
  showZonesDefault = true,
}: LocationPickerMapProps) {
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<any>(null);

  // Toggle state for layers
  const [showRestaurants, setShowRestaurants] = useState(showNearbyRestaurantsDefault);
  const [showZones, setShowZones] = useState(showZonesDefault);

  // Loaded data state
  const [loadedRestaurants, setLoadedRestaurants] = useState<IMapRestaurant[]>([]);
  const [loadedZones, setLoadedZones] = useState<IZone[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch listed restaurants and zones if not supplied via props
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (propRestaurants && propZones) {
        setLoadedRestaurants(propRestaurants);
        setLoadedZones(propZones);
        return;
      }

      setDataLoading(true);
      try {
        const [restRes, zoneRes] = await Promise.all([
          !propRestaurants ? getAllRestaurants({ limit: "100" }) : null,
          !propZones ? getAllZones({ isActive: true }) : null,
        ]);

        if (isCancelled) return;

        if (propRestaurants) {
          setLoadedRestaurants(propRestaurants);
        } else if (restRes?.success && Array.isArray(restRes.data)) {
          const mapped: IMapRestaurant[] = restRes.data
            .map((r: any) => {
              const rLat = Number(
                r.coordinates?.latitude ??
                r.address?.coordinates?.latitude ??
                r.address?.latitude ??
                r.latitude
              );
              const rLng = Number(
                r.coordinates?.longitude ??
                r.address?.coordinates?.longitude ??
                r.address?.longitude ??
                r.longitude
              );
              return {
                id: r._id || r.id || "",
                name: r.restaurantName || r.name || "Restaurant",
                latitude: rLat,
                longitude: rLng,
                zoneName: r.zoneName || r.address?.zoneName || "",
                cuisineTypes: r.cuisineTypes || r.cuisines || [],
                logo: r.logo,
              };
            })
            .filter((r: any) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.latitude !== 0);

          setLoadedRestaurants(mapped);
        }

        if (propZones) {
          setLoadedZones(propZones);
        } else if (zoneRes?.success && Array.isArray(zoneRes.data)) {
          setLoadedZones(zoneRes.data);
        }
      } catch (err) {
        console.error("Failed to load map context data:", err);
      } finally {
        if (!isCancelled) setDataLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [propRestaurants, propZones]);

  // Filter out currently edited restaurant
  const displayedRestaurants = useMemo(() => {
    return loadedRestaurants.filter((r) => !currentRestaurantId || r.id !== currentRestaurantId);
  }, [loadedRestaurants, currentRestaurantId]);

  // Update map center smoothly when coordinates change
  useEffect(() => {
    if (mapRef.current && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      mapRef.current.flyTo([latitude, longitude], mapRef.current.getZoom() || 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [latitude, longitude]);

  // Vendor's own location draggable Pin
  const vendorMarkerIcon = useMemo(() => {
    if (!L) return undefined;
    return L.divIcon({
      className: "custom-vendor-pin",
      html: `
        <div style="position: relative; width: 42px; height: 54px; transform: translate(-50%, -100%); cursor: grab;">
          <!-- Pulse shadow ring -->
          <div style="
            position: absolute;
            left: 50%;
            bottom: 0;
            width: 20px;
            height: 8px;
            background: rgba(225,29,72,0.4);
            border-radius: 50%;
            transform: translateX(-50%);
            filter: blur(1.5px);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: absolute;
            left: 50%;
            bottom: 0;
            width: 14px;
            height: 6px;
            background: rgba(0,0,0,0.45);
            border-radius: 50%;
            transform: translateX(-50%);
            filter: blur(1px);
          "></div>
          <!-- Pin Body -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="42" height="54" style="filter: drop-shadow(0 6px 8px rgba(225,29,72,0.55));">
            <path fill="#E11D48" stroke="#FFFFFF" stroke-width="1.6" d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"/>
            <circle cx="12" cy="10" r="3.6" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [42, 54],
      iconAnchor: [21, 54],
    });
  }, []);

  // Listed Partner Restaurant Icon (matching admin panel style)
  const getListedRestaurantIcon = useCallback((name: string) => {
    if (!L) return undefined;
    const escapedName = name.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return L.divIcon({
      className: "listed-restaurant-pin",
      html: `
        <div class="group relative flex items-center justify-center cursor-pointer">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #FFFFFF;
            border: 2.5px solid #FF6B35;
            box-shadow: 0 4px 10px rgba(255, 107, 53, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FF6B35;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          " onmouseover="this.style.transform='scale(1.18)'; this.style.boxShadow='0 6px 14px rgba(255, 107, 53, 0.5)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 10px rgba(255, 107, 53, 0.35)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/>
              <path d="M6 2v20"/>
              <path d="M15 11v11"/>
            </svg>
          </div>
          <!-- Name label pill on hover -->
          <div style="
            position: absolute;
            bottom: 36px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background-color: rgba(17, 24, 39, 0.92);
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            z-index: 1000;
          " class="group-hover:opacity-100">
            ${escapedName}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[340px] flex items-center justify-center bg-gray-100 rounded-2xl">
        <LoadingSpinner size={36} color="#FF6B35" />
      </div>
    );
  }

  const center: [number, number] = [
    Number.isFinite(latitude) ? latitude : 24.7471,
    Number.isFinite(longitude) ? longitude : 90.4203,
  ];

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner group select-none">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", minHeight: "340px" }}
        ref={(instance: any) => {
          if (instance) {
            mapRef.current = instance;
            instance.off("click");
            instance.on("click", (e: any) => {
              if (e && e.latlng) {
                onPositionChange(e.latlng.lat, e.latlng.lng);
              }
            });
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. RENDER ACTIVE DELIVERY ZONES (If toggled on) */}
        {showZones &&
          loadedZones.map((zone) => {
            const zoneColor = zone.color || "#FF6B35";
            const shape = zone.shapeType || "circle";

            if (shape === "polygon" || shape === "rectangle") {
              if (zone.polygonCoordinates && zone.polygonCoordinates.length >= 3) {
                const polyCoords: [number, number][] = zone.polygonCoordinates.map((p) => [
                  p.latitude,
                  p.longitude,
                ]);
                return (
                  <Polygon
                    key={zone._id || zone.name}
                    positions={polyCoords}
                    pathOptions={{
                      color: zoneColor,
                      fillColor: zoneColor,
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: "5, 5",
                    }}
                  >
                    <Popup>
                      <div className="p-1 min-w-[140px]">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-orange-100 text-orange-900 tracking-wide">
                          Zone {zone.zoneId || 1}
                        </span>
                        <h4 className="font-bold text-xs text-gray-900 mt-1">{zone.name}</h4>
                        <p className="text-[11px] text-gray-500">{zone.city}, {zone.division}</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
            }

            if (zone.centerCoordinates?.latitude && zone.centerCoordinates?.longitude) {
              return (
                <Circle
                  key={zone._id || zone.name}
                  center={[zone.centerCoordinates.latitude, zone.centerCoordinates.longitude]}
                  radius={(zone.radiusKm || 5.0) * 1000}
                  pathOptions={{
                    color: zoneColor,
                    fillColor: zoneColor,
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: "5, 5",
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[150px]">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-orange-100 text-orange-900 tracking-wide">
                        Zone {zone.zoneId || 1} Geofence
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 mt-1">{zone.name}</h4>
                      <p className="text-[11px] text-gray-600 font-medium">{zone.city}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Coverage Radius: {zone.radiusKm || 5} km</p>
                    </div>
                  </Popup>
                </Circle>
              );
            }

            return null;
          })}

        {/* 2. RENDER SURROUNDING LISTED RESTAURANTS (If toggled on) */}
        {showRestaurants &&
          displayedRestaurants.map((rest) => {
            const distance = getDistanceKm(latitude, longitude, rest.latitude, rest.longitude);
            return (
              <Marker
                key={rest.id}
                position={[rest.latitude, rest.longitude]}
                icon={getListedRestaurantIcon(rest.name)}
              >
                <Popup>
                  <div className="p-1.5 min-w-[170px] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-orange-100 text-[#FF6B35] flex items-center justify-center shrink-0">
                        <Utensils className="w-3 h-3" />
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 leading-snug">{rest.name}</h4>
                    </div>

                    {rest.zoneName && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        📍 {rest.zoneName}
                      </span>
                    )}

                    {rest.cuisineTypes && rest.cuisineTypes.length > 0 && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {rest.cuisineTypes.slice(0, 3).join(", ")}
                      </p>
                    )}

                    <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-gray-500">From your pin:</span>
                      <span className="font-bold text-[#FF6B35]">{distance} km</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 3. VENDOR'S PROPOSED RESTAURANT PIN (Draggable) */}
        <Marker
          position={center}
          icon={vendorMarkerIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e: any) => {
              const marker = e.target;
              if (marker) {
                const pos = marker.getLatLng();
                onPositionChange(pos.lat, pos.lng);
              }
            },
          }}
        >
          <Popup>
            <div className="p-1 text-center min-w-[150px]">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 tracking-wide">
                Your Outlet Pin
              </span>
              <p className="text-xs font-bold text-gray-900 mt-1">Exact Pickup Spot</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Drag to reposition anytime</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* TOP-RIGHT CONTROLS: Toggle Nearby Restaurants & Zones */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 flex-wrap">
        {/* Toggle Listed Restaurants */}
        <button
          type="button"
          onClick={() => setShowRestaurants((prev) => !prev)}
          title="Toggle visibility of existing restaurants"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
            showRestaurants
              ? "bg-white text-[#FF6B35] border border-orange-200 hover:bg-orange-50"
              : "bg-gray-900/80 text-gray-300 border border-gray-700 hover:bg-gray-900"
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nearby Restaurants</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-[#FF6B35]">
            {displayedRestaurants.length}
          </span>
          {showRestaurants ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
        </button>

        {/* Toggle Delivery Zones */}
        <button
          type="button"
          onClick={() => setShowZones((prev) => !prev)}
          title="Toggle delivery coverage zones"
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
            showZones
              ? "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
              : "bg-gray-900/80 text-gray-300 border border-gray-700 hover:bg-gray-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delivery Zones</span>
          {showZones ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
        </button>
      </div>

      {/* TOP-LEFT: Drag Instruction Badge */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-bold text-gray-800 shadow-md border border-gray-200/80 pointer-events-none flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>Click anywhere or drag red pin</span>
      </div>

      {/* BOTTOM-LEFT: Compact Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-gray-700 shadow-md border border-gray-200/80 pointer-events-none hidden sm:flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
          <span>Your Pin</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] border border-white inline-block"></span>
          <span>Listed Partners ({displayedRestaurants.length})</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full border border-orange-500 border-dashed inline-block"></span>
          <span>Zone Geofence</span>
        </span>
      </div>

      {/* BOTTOM-RIGHT: Floating GPS Locate Me Button */}
      <button
        type="button"
        onClick={onLocateMe}
        disabled={isLocating}
        title="Use my current GPS location"
        className="absolute bottom-3 right-3 z-[400] bg-white hover:bg-rose-50 text-rose-600 p-2.5 rounded-full shadow-lg border border-gray-200 hover:border-rose-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
      >
        <Crosshair className={`w-5 h-5 ${isLocating ? "animate-spin text-rose-500" : ""}`} />
      </button>
    </div>
  );
}
