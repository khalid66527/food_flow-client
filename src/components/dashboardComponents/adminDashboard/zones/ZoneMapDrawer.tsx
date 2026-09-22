"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import {
  Circle as CircleIcon,
  Square,
  Pentagon,
  Minus,
  RotateCcw,
  CheckCircle,
  MapPin,
  Utensils,
  Layers,
  ZoomIn,
  MousePointer,
  Trash2,
} from "lucide-react";
import { IZone, TZoneShapeType, ICoordinates } from "@/types/zone";

const L = typeof window !== "undefined" ? require("leaflet") : null;

// Dynamically import react-leaflet components for SSR safety
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
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

// Map Event Handler Component (loaded dynamically or mounted internally)
interface MapEventsProps {
  onMapClick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapEventsProps) {
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click(e: any) {
      if (e?.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const { useMap } = require("react-leaflet");
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export interface ZoneMapDrawerProps {
  existingZones: IZone[];
  restaurants?: Array<{ id: string; name: string; latitude: number; longitude: number; zoneName?: string }>;
  currentShapeType: TZoneShapeType;
  currentCenter: ICoordinates;
  currentRadiusKm: number;
  currentPolygon: ICoordinates[];
  currentColor: string;
  onUpdateCoordinates: (data: {
    centerCoordinates: ICoordinates;
    radiusKm: number;
    polygonCoordinates: ICoordinates[];
    shapeType: TZoneShapeType;
  }) => void;
}

// Preset Coordinates for Bangladesh Major Cities / Hubs
const BD_CITY_PRESETS: Array<{ name: string; lat: number; lng: number; zoom: number }> = [
  { name: "Dhaka Central", lat: 23.8103, lng: 90.4125, zoom: 13 },
  { name: "Dhanmondi", lat: 23.7461, lng: 90.3742, zoom: 14 },
  { name: "Gulshan/Banani", lat: 23.7925, lng: 90.4078, zoom: 14 },
  { name: "Uttara", lat: 23.8759, lng: 90.3795, zoom: 14 },
  { name: "Chattogram GEC", lat: 22.3587, lng: 91.8215, zoom: 14 },
  { name: "Sylhet Zindabazar", lat: 24.8949, lng: 91.8687, zoom: 14 },
  { name: "Sreemangal", lat: 24.3065, lng: 91.7296, zoom: 14 },
  { name: "Rajshahi", lat: 24.3636, lng: 88.6241, zoom: 14 },
  { name: "Khulna", lat: 22.8456, lng: 89.5403, zoom: 13 },
  { name: "Barishal", lat: 22.701, lng: 90.3535, zoom: 14 },
];

export default function ZoneMapDrawer({
  existingZones,
  restaurants = [],
  currentShapeType,
  currentCenter,
  currentRadiusKm,
  currentPolygon,
  currentColor,
  onUpdateCoordinates,
}: ZoneMapDrawerProps) {
  const [activeTool, setActiveTool] = useState<TZoneShapeType | "pan">(currentShapeType);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    currentCenter?.latitude || 23.8103,
    currentCenter?.longitude || 90.4125,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [drawnPoints, setDrawnPoints] = useState<ICoordinates[]>(currentPolygon || []);
  const [rectCorner1, setRectCorner1] = useState<ICoordinates | null>(null);
  const [showExistingZones, setShowExistingZones] = useState<boolean>(true);
  const [showRestaurants, setShowRestaurants] = useState<boolean>(true);

  // Sync incoming shape or center changes
  useEffect(() => {
    if (currentCenter?.latitude && currentCenter?.longitude) {
      setMapCenter([currentCenter.latitude, currentCenter.longitude]);
    }
  }, [currentCenter?.latitude, currentCenter?.longitude]);

  useEffect(() => {
    if (Array.isArray(currentPolygon) && currentPolygon.length > 0) {
      setDrawnPoints(currentPolygon);
    }
  }, [currentPolygon]);

  // Handle map clicks based on active drawing tool
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const roundedLat = Math.round(lat * 100000) / 100000;
      const roundedLng = Math.round(lng * 100000) / 100000;
      const clickedCoord: ICoordinates = { latitude: roundedLat, longitude: roundedLng };

      if (activeTool === "circle") {
        // Center of circle selected
        onUpdateCoordinates({
          centerCoordinates: clickedCoord,
          radiusKm: currentRadiusKm || 5.0,
          polygonCoordinates: [],
          shapeType: "circle",
        });
      } else if (activeTool === "polygon") {
        // Add vertex to polygon
        const nextPoints = [...drawnPoints, clickedCoord];
        setDrawnPoints(nextPoints);

        // Compute average center from polygon points
        const avgLat = nextPoints.reduce((sum, p) => sum + p.latitude, 0) / nextPoints.length;
        const avgLng = nextPoints.reduce((sum, p) => sum + p.longitude, 0) / nextPoints.length;

        onUpdateCoordinates({
          centerCoordinates: { latitude: avgLat, longitude: avgLng },
          radiusKm: currentRadiusKm || 5.0,
          polygonCoordinates: nextPoints,
          shapeType: "polygon",
        });
      } else if (activeTool === "rectangle") {
        // Two-click rectangle corner selection
        if (!rectCorner1) {
          setRectCorner1(clickedCoord);
          setDrawnPoints([clickedCoord]);
        } else {
          // Construct 4 corners of rectangle [NW, NE, SE, SW]
          const c1 = rectCorner1;
          const c2 = clickedCoord;
          const minLat = Math.min(c1.latitude, c2.latitude);
          const maxLat = Math.max(c1.latitude, c2.latitude);
          const minLng = Math.min(c1.longitude, c2.longitude);
          const maxLng = Math.max(c1.longitude, c2.longitude);

          const rectVertices: ICoordinates[] = [
            { latitude: maxLat, longitude: minLng }, // Top-Left
            { latitude: maxLat, longitude: maxLng }, // Top-Right
            { latitude: minLat, longitude: maxLng }, // Bottom-Right
            { latitude: minLat, longitude: minLng }, // Bottom-Left
          ];

          setDrawnPoints(rectVertices);
          setRectCorner1(null);

          onUpdateCoordinates({
            centerCoordinates: {
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
            },
            radiusKm: currentRadiusKm || 5.0,
            polygonCoordinates: rectVertices,
            shapeType: "rectangle",
          });
        }
      } else if (activeTool === "polyline") {
        const nextPoints = [...drawnPoints, clickedCoord];
        setDrawnPoints(nextPoints);

        const avgLat = nextPoints.reduce((sum, p) => sum + p.latitude, 0) / nextPoints.length;
        const avgLng = nextPoints.reduce((sum, p) => sum + p.longitude, 0) / nextPoints.length;

        onUpdateCoordinates({
          centerCoordinates: { latitude: avgLat, longitude: avgLng },
          radiusKm: currentRadiusKm || 1.5,
          polygonCoordinates: nextPoints,
          shapeType: "polyline",
        });
      }
    },
    [activeTool, currentRadiusKm, drawnPoints, onUpdateCoordinates, rectCorner1]
  );

  const handleUndoPoint = () => {
    if (drawnPoints.length > 0) {
      const nextPoints = drawnPoints.slice(0, -1);
      setDrawnPoints(nextPoints);
      if (nextPoints.length > 0) {
        const avgLat = nextPoints.reduce((sum, p) => sum + p.latitude, 0) / nextPoints.length;
        const avgLng = nextPoints.reduce((sum, p) => sum + p.longitude, 0) / nextPoints.length;
        onUpdateCoordinates({
          centerCoordinates: { latitude: avgLat, longitude: avgLng },
          radiusKm: currentRadiusKm,
          polygonCoordinates: nextPoints,
          shapeType: activeTool === "pan" ? currentShapeType : activeTool,
        });
      }
    }
  };

  const handleClearShape = () => {
    setDrawnPoints([]);
    setRectCorner1(null);
    onUpdateCoordinates({
      centerCoordinates: currentCenter,
      radiusKm: currentRadiusKm,
      polygonCoordinates: [],
      shapeType: currentShapeType,
    });
  };

  // Custom DivIcon for Restaurant Pin
  const getRestaurantIcon = (name: string) => {
    if (!L) return undefined;
    return L.divIcon({
      className: "",
      html: `
        <div class="group relative flex items-center justify-center">
          <div class="w-7 h-7 rounded-full bg-white border-2 border-[#FF6B35] shadow-md flex items-center justify-center text-[#FF6B35] hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M6 2v20"/><path d="M15 11v11"/></svg>
          </div>
          <div class="absolute -top-6 whitespace-nowrap bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            ${name}
          </div>
        </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  // Custom Icon for Zone Center Pin
  const getCenterMarkerIcon = (color: string) => {
    if (!L) return undefined;
    return L.divIcon({
      className: "",
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <span class="absolute inline-flex h-full w-full rounded-full opacity-30 animate-ping" style="background-color: ${color}"></span>
          <div class="w-7 h-7 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white font-bold text-xs" style="background-color: ${color}">
            📍
          </div>
        </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-3 bg-gradient-to-r from-gray-50 to-orange-50/40 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        {/* Shape Drawing Tools */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-xs border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTool("pan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === "pan"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Pan / Navigate Map"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool("circle");
              onUpdateCoordinates({
                centerCoordinates: currentCenter,
                radiusKm: currentRadiusKm || 5.0,
                polygonCoordinates: [],
                shapeType: "circle",
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === "circle"
                ? "bg-[#FF6B35] text-white shadow-xs"
                : "text-gray-600 hover:bg-orange-50 hover:text-[#FF6B35]"
            }`}
            title="Click center on map to draw radius circle"
          >
            <CircleIcon className="w-3.5 h-3.5" />
            <span>Circle (Radius)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool("polygon");
              onUpdateCoordinates({
                centerCoordinates: currentCenter,
                radiusKm: currentRadiusKm,
                polygonCoordinates: drawnPoints,
                shapeType: "polygon",
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === "polygon"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            }`}
            title="Click multiple points on map to enclose custom polygon boundary"
          >
            <Pentagon className="w-3.5 h-3.5" />
            <span>Polygon (Boundary)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool("rectangle");
              setRectCorner1(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === "rectangle"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
            }`}
            title="Click 2 opposite corners on map to draw rectangle"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Square/Rectangle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("polyline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === "polyline"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-purple-50 hover:text-purple-600"
            }`}
            title="Draw highway or road delivery corridor"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Line/Corridor</span>
          </button>
        </div>

        {/* Action / Helper Controls */}
        <div className="flex items-center gap-2">
          {(activeTool === "polygon" || activeTool === "polyline" || drawnPoints.length > 0) && (
            <>
              <button
                type="button"
                onClick={handleUndoPoint}
                className="px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors"
                title="Undo last placed point"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Point</span>
              </button>

              <button
                type="button"
                onClick={handleClearShape}
                className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors"
                title="Clear all drawn points"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}

          {/* Overlays Toggle */}
          <button
            type="button"
            onClick={() => setShowExistingZones(!showExistingZones)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border shadow-xs transition-all ${
              showExistingZones
                ? "bg-amber-500/10 border-amber-300 text-amber-800 font-semibold"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showExistingZones ? "Hide Other Zones" : "Show All Zones"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRestaurants(!showRestaurants)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border shadow-xs transition-all ${
              showRestaurants
                ? "bg-orange-500/10 border-orange-300 text-orange-800 font-semibold"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>{showRestaurants ? "Hide Restaurants" : "Show Restaurants"}</span>
          </button>
        </div>
      </div>

      {/* Quick City Presets Bar */}
      <div className="px-3 py-1.5 bg-gray-100 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
        <span className="text-gray-500 font-bold whitespace-nowrap flex items-center gap-1 mr-1">
          <MapPin className="w-3 h-3 text-[#FF6B35]" /> Quick Jump:
        </span>
        {BD_CITY_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setMapCenter([preset.lat, preset.lng]);
              setMapZoom(preset.zoom);
            }}
            className="px-2 py-0.5 bg-white hover:bg-orange-50 hover:text-orange-600 text-gray-700 rounded-md border border-gray-200 whitespace-nowrap transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Drawing Instructions Banner */}
      <div className="px-3 py-1 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold uppercase tracking-wider bg-amber-200 px-1.5 py-0.2 rounded text-[10px]">
            Mode: {activeTool.toUpperCase()}
          </span>
          {activeTool === "circle" && "Click anywhere on the map to set zone center. Adjust radius using the slider."}
          {activeTool === "polygon" && "Click on map to add boundary points. Connect at least 3 points to complete the zone."}
          {activeTool === "rectangle" && "Click 1st corner, then click opposite 2nd corner to form a rectangular zone."}
          {activeTool === "polyline" && "Click consecutive road/street points along the delivery route."}
          {activeTool === "pan" && "Drag to move map, scroll to zoom in/out."}
        </div>
        {drawnPoints.length > 0 && (
          <span className="font-semibold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
            Points placed: {drawnPoints.length}
          </span>
        )}
      </div>

      {/* Leaflet Interactive Map Canvas */}
      <div className="relative flex-1 min-h-[420px] w-full bg-slate-100">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onMapClick={handleMapClick} />
          <MapCenterController center={mapCenter} zoom={mapZoom} />

          {/* Render Active Center Marker */}
          {currentCenter?.latitude && currentCenter?.longitude && (
            <Marker
              position={[currentCenter.latitude, currentCenter.longitude]}
              icon={getCenterMarkerIcon(currentColor || "#FF6B35")}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-xs text-gray-900">Current Zone Center</p>
                  <p className="text-[11px] text-gray-600">
                    Lat: {currentCenter.latitude.toFixed(4)}, Lng: {currentCenter.longitude.toFixed(4)}
                  </p>
                  <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
                    Radius: {currentRadiusKm} km
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render Current Drawn Circle */}
          {currentShapeType === "circle" && currentCenter?.latitude && currentCenter?.longitude && (
            <Circle
              center={[currentCenter.latitude, currentCenter.longitude]}
              radius={(currentRadiusKm || 5.0) * 1000} // Leaflet uses meters
              pathOptions={{
                color: currentColor || "#FF6B35",
                fillColor: currentColor || "#FF6B35",
                fillOpacity: 0.25,
                weight: 2.5,
              }}
            />
          )}

          {/* Render Current Drawn Polygon */}
          {currentShapeType === "polygon" && drawnPoints.length >= 3 && (
            <Polygon
              positions={drawnPoints.map((p) => [p.latitude, p.longitude])}
              pathOptions={{
                color: currentColor || "#3B82F6",
                fillColor: currentColor || "#3B82F6",
                fillOpacity: 0.28,
                weight: 2.5,
              }}
            />
          )}

          {/* Render Current Drawn Rectangle */}
          {currentShapeType === "rectangle" && drawnPoints.length === 4 && (
            <Polygon
              positions={drawnPoints.map((p) => [p.latitude, p.longitude])}
              pathOptions={{
                color: currentColor || "#10B981",
                fillColor: currentColor || "#10B981",
                fillOpacity: 0.25,
                weight: 2.5,
              }}
            />
          )}

          {/* Render In-Progress Polyline / Vertices Preview */}
          {drawnPoints.length >= 2 && (
            <Polyline
              positions={drawnPoints.map((p) => [p.latitude, p.longitude])}
              pathOptions={{
                color: currentColor || "#8B5CF6",
                weight: 3.5,
                dashArray: currentShapeType === "polygon" && drawnPoints.length < 3 ? "6, 6" : undefined,
              }}
            />
          )}

          {/* Render Polygon/Rectangle Vertex Marker Dots */}
          {drawnPoints.map((pt, idx) => (
            <Circle
              key={`vertex-${idx}`}
              center={[pt.latitude, pt.longitude]}
              radius={40} // 40 meters dot
              pathOptions={{
                color: "#1E293B",
                fillColor: "#FFFFFF",
                fillOpacity: 1,
                weight: 2,
              }}
            />
          ))}

          {/* Render Existing Active Zones Overlays */}
          {showExistingZones &&
            existingZones.map((zone) => {
              const zoneColor = zone.color || "#64748B";

              if (zone.shapeType === "polygon" && zone.polygonCoordinates && zone.polygonCoordinates.length >= 3) {
                return (
                  <Polygon
                    key={zone._id || zone.name}
                    positions={zone.polygonCoordinates.map((c) => [c.latitude, c.longitude])}
                    pathOptions={{
                      color: zoneColor,
                      fillColor: zoneColor,
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: "4, 4",
                    }}
                  >
                    <Popup>
                      <div className="p-1">
                        <span className="font-bold text-xs" style={{ color: zoneColor }}>
                          {zone.name}
                        </span>
                        <p className="text-[11px] text-gray-600">{zone.city}, {zone.division}</p>
                        <p className="text-[11px] text-gray-500">Max Delivery: {zone.maxDeliveryRadiusKm || zone.radiusKm} km</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }

              if (zone.shapeType === "rectangle" && zone.polygonCoordinates && zone.polygonCoordinates.length === 4) {
                return (
                  <Polygon
                    key={zone._id || zone.name}
                    positions={zone.polygonCoordinates.map((c) => [c.latitude, c.longitude])}
                    pathOptions={{
                      color: zoneColor,
                      fillColor: zoneColor,
                      fillOpacity: 0.15,
                      weight: 1.5,
                      dashArray: "4, 4",
                    }}
                  >
                    <Popup>
                      <div className="p-1">
                        <span className="font-bold text-xs" style={{ color: zoneColor }}>
                          {zone.name}
                        </span>
                        <p className="text-[11px] text-gray-600">{zone.city}</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }

              // Default circle for other zones
              if (zone.centerCoordinates?.latitude && zone.centerCoordinates?.longitude) {
                return (
                  <Circle
                    key={zone._id || zone.name}
                    center={[zone.centerCoordinates.latitude, zone.centerCoordinates.longitude]}
                    radius={(zone.radiusKm || 5.0) * 1000}
                    pathOptions={{
                      color: zoneColor,
                      fillColor: zoneColor,
                      fillOpacity: 0.12,
                      weight: 1.5,
                      dashArray: "4, 4",
                    }}
                  >
                    <Popup>
                      <div className="p-1">
                        <span className="font-bold text-xs" style={{ color: zoneColor }}>
                          {zone.name}
                        </span>
                        <p className="text-[11px] text-gray-600">{zone.city}, {zone.division}</p>
                        <p className="text-[11px] text-gray-500">Radius: {zone.radiusKm} km</p>
                      </div>
                    </Popup>
                  </Circle>
                );
              }

              return null;
            })}

          {/* Render Restaurant Markers */}
          {showRestaurants &&
            restaurants.map((rest) => {
              if (!rest.latitude || !rest.longitude) return null;
              return (
                <Marker
                  key={rest.id}
                  position={[rest.latitude, rest.longitude]}
                  icon={getRestaurantIcon(rest.name)}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <p className="font-bold text-gray-900">{rest.name}</p>
                      {rest.zoneName && (
                        <p className="text-[10px] text-orange-600 font-semibold">
                          Zone: {rest.zoneName}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}
