"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, User, Bike } from "lucide-react";

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
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];

function getUserLocationMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="relative w-10 h-10 pointer-events-none">
        <span class="absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-25 animate-ping"></span>
        <span class="relative inline-flex h-full w-full rounded-full bg-[#3b82f6]/90 border-2 border-white shadow-lg"></span>
        <span class="absolute inset-0 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function getRiderMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="relative w-10 h-10">
        <span class="absolute -inset-1 rounded-full bg-orange-400/30 animate-ping"></span>
        <div class="relative w-10 h-10 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-r from-[#FF6B35] to-amber-500 border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18a5 5 0 1 0 10 0"/><path d="m21 8-9-3-4 9L4 21"/><path d="m9 18 3-10"/><path d="m13 18 4-2"/></svg>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 42],
  });
}

function getDestinationMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="relative">
        <div class="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border-2 border-[#FF6B35] shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#FF6B35" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
  });
}

function MapFollowCenter({
  position,
  mapRef,
}: {
  position: [number, number] | null;
  mapRef: React.RefObject<L.Map | null>;
}) {
  useEffect(() => {
    const map = mapRef.current;
    if (map && position) {
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1.2 });
    }
  }, [position, mapRef]);

  return null;
}

interface OrderTrackingMapProps {
  deliveryLat?: number;
  deliveryLng?: number;
  restaurantLat?: number;
  restaurantLng?: number;
  riderLat?: number;
  riderLng?: number;
  riderName?: string;
  active: boolean;
}

export default function OrderTrackingMap({
  deliveryLat,
  deliveryLng,
  restaurantLat,
  restaurantLng,
  riderLat,
  riderLng,
  riderName,
  active,
}: OrderTrackingMapProps) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const mapRef = React.useRef<L.Map | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // Geolocation denied/unavailable — fall back to delivery coords if present.
          if (deliveryLat && deliveryLng) {
            setUserPosition([deliveryLat, deliveryLng]);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else if (deliveryLat && deliveryLng) {
      setUserPosition([deliveryLat, deliveryLng]);
    }
  }, [deliveryLat, deliveryLng]);

  const riderPosition: [number, number] | null = useMemo(
    () => (riderLat && riderLng ? [riderLat, riderLng] : null),
    [riderLat, riderLng]
  );

  const center: [number, number] = useMemo(() => {
    if (userPosition) return userPosition;
    if (deliveryLat && deliveryLng) return [deliveryLat, deliveryLng];
    if (riderPosition) return riderPosition;
    if (restaurantLat && restaurantLng) return [restaurantLat, restaurantLng];
    return DEFAULT_CENTER;
  }, [userPosition, deliveryLat, deliveryLng, riderPosition, restaurantLat, restaurantLng]);

  const routePoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (restaurantLat && restaurantLng) pts.push([restaurantLat, restaurantLng]);
    if (riderPosition) {
      pts.push(riderPosition);
    } else if (deliveryLat && deliveryLng) {
      pts.push([deliveryLat, deliveryLng]);
    }
    if (deliveryLat && deliveryLng) pts.push([deliveryLat, deliveryLng]);
    return pts;
  }, [restaurantLat, restaurantLng, riderPosition, deliveryLat, deliveryLng]);

  const userIcon = useMemo(() => getUserLocationMarkerIcon(), []);
  const riderIcon = useMemo(() => getRiderMarkerIcon(), []);
  const destinationIcon = useMemo(() => getDestinationMarkerIcon(), []);

  const hasPoints = Boolean(userPosition || (deliveryLat && deliveryLng));

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gray-50">
      {/* Loading veil while the Leaflet map module loads on the client */}
      {(!mapReady || !hasPoints) && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-gray-50">
          <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
          <p className="text-xs font-bold text-gray-500">Loading live map...</p>
        </div>
      )}

      {hasPoints && (
        <MapContainer
          ref={mapRef}
          whenReady={() => setMapReady(true)}
          center={center}
          zoom={15}
          className="w-full h-full z-[1]"
          scrollWheelZoom={false}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {restaurantLat && restaurantLng && (
            <Marker
              position={[restaurantLat, restaurantLng]}
              icon={destinationIcon}
            >
              <Popup>
                <span className="text-xs font-bold text-gray-800">Restaurant</span>
              </Popup>
            </Marker>
          )}

          {deliveryLat && deliveryLng && (
            <Marker
              position={[deliveryLat, deliveryLng]}
              icon={destinationIcon}
            >
              <Popup>
                <span className="text-xs font-bold text-gray-800">Delivery Address</span>
              </Popup>
            </Marker>
          )}

          {active && riderPosition && (
            <Marker position={riderPosition} icon={riderIcon}>
              <Popup>
                <span className="text-xs font-bold text-gray-800">
                  {riderName ? `Rider: ${riderName}` : "Rider en route"}
                </span>
              </Popup>
            </Marker>
          )}

          {userPosition && (
            <Marker position={userPosition} icon={userIcon}>
              <Popup>
                <span className="text-xs font-bold text-gray-800">You are here</span>
              </Popup>
            </Marker>
          )}

          {routePoints.length > 1 && (
            <Polyline
              positions={routePoints}
              pathOptions={{ color: "#FF6B35", weight: 4, dashArray: "8 8", opacity: 0.8 }}
            />
          )}

          {userPosition && <MapFollowCenter position={deliveryLat && deliveryLng ? [deliveryLat, deliveryLng] : userPosition} mapRef={mapRef} />}
        </MapContainer>
      )}

      {!hasPoints && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-gray-50">
          <Bike className="w-10 h-10 text-gray-300" />
          <p className="text-xs font-bold text-gray-400 max-w-[220px] text-center">
            {mapReady && !hasPoints
              ? "Live map appears once delivery coordinates are available."
              : "Waiting for delivery coordinates..."}
          </p>
          {!active && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[#FF6B35] text-[11px] font-extrabold border border-orange-100">
              <User className="w-3.5 h-3.5" />
              Waiting for rider assignment
            </span>
          )}
        </div>
      )}
    </div>
  );
}