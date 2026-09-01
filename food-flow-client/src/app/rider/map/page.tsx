"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { DeliveryAssignment } from "@/types/rider";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function RiderMapPage() {
  const router = useRouter();
  const { latitude, longitude } = useGeolocation();
  const [activeDelivery, setActiveDelivery] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await deliveryAPI.getActive();
      setActiveDelivery(res.data.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (typeof window === "undefined") return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const center: [number, number] = latitude && longitude ? [latitude, longitude] : [23.8103, 90.4125];
      const map = L.map(mapRef.current!).setView(center, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapInstance.current = map;
    };

    initMap();
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapInstance.current || typeof window === "undefined") return;

    const updateMarkers = async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstance.current;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (latitude && longitude) {
        const riderIcon = L.divIcon({
          html: `<div style="background:#f97316;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const riderMarker = L.marker([latitude, longitude], { icon: riderIcon })
          .addTo(map)
          .bindPopup("Your Location");
        markersRef.current.push(riderMarker);
      }

      if (activeDelivery) {
        const restaurantIcon = L.divIcon({
          html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px">🏪</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const customerIcon = L.divIcon({
          html: `<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px">🏠</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const rMarker = L.marker(
          [activeDelivery.pickupRestaurant.lat, activeDelivery.pickupRestaurant.lng],
          { icon: restaurantIcon }
        )
          .addTo(map)
          .bindPopup(activeDelivery.pickupRestaurant.name);
        markersRef.current.push(rMarker);

        const cMarker = L.marker(
          [activeDelivery.dropoffCustomer.lat, activeDelivery.dropoffCustomer.lng],
          { icon: customerIcon }
        )
          .addTo(map)
          .bindPopup(activeDelivery.dropoffCustomer.name);
        markersRef.current.push(cMarker);

        const points: [number, number][] = [
          [activeDelivery.pickupRestaurant.lat, activeDelivery.pickupRestaurant.lng],
        ];
        if (latitude && longitude) points.push([latitude, longitude]);
        points.push([activeDelivery.dropoffCustomer.lat, activeDelivery.dropoffCustomer.lng]);

        L.polyline(points, { color: "#f97316", weight: 3, dashArray: "8 6" }).addTo(map);

        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    updateMarkers();
  }, [activeDelivery, latitude, longitude]);

  return (
    <div className="h-[calc(100vh-14rem)] md:h-[calc(100vh-3.5rem)] md:ml-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900">Live Map</h1>
        </div>
        <button onClick={fetchData} className="p-1.5 rounded-full hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Delivery Info Bar */}
      {activeDelivery && (
        <div className="bg-white border-t border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{activeDelivery.orderId}</p>
              <p className="text-xs text-gray-500">
                {activeDelivery.pickupRestaurant.name} → {activeDelivery.dropoffCustomer.name}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              &#2547;{activeDelivery.deliveryFee}
            </span>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
