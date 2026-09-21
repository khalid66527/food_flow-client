"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sliders,
  Compass,
  Store,
  DollarSign,
  Clock,
  Sparkles,
  Info,
  Circle as CircleIcon,
  Square,
  Pentagon,
  Minus,
  RefreshCw,
} from "lucide-react";
import { IZone, TZoneShapeType, ICoordinates } from "@/types/zone";
import {
  getAllZones,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneStatus,
} from "@/lib/api/zone";
import { getAllRestaurants } from "@/lib/api/restaurant";
import ZoneMapDrawer from "./zones/ZoneMapDrawer";
import { BANGLADESH_LOCATIONS } from "@/data/bangladeshLocations";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

const COLOR_PALETTE = [
  { name: "Brand Orange", hex: "#FF6B35" },
  { name: "Royal Blue", hex: "#3B82F6" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Purple Hub", hex: "#8B5CF6" },
  { name: "Pink Rose", hex: "#EC4899" },
  { name: "Teal Cyan", hex: "#14B8A6" },
  { name: "Amber Gold", hex: "#F59E0B" },
  { name: "Indigo Night", hex: "#6366F1" },
];

export default function AdminZones() {
  const [zones, setZones] = useState<IZone[]>([]);
  const [restaurants, setRestaurants] = useState<
    Array<{ id: string; name: string; latitude: number; longitude: number; zoneName?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form & Drawer State
  const [isEditing, setIsEditing] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    name: string;
    shapeType: TZoneShapeType;
    color: string;
    centerCoordinates: ICoordinates;
    radiusKm: number;
    polygonCoordinates: ICoordinates[];
    city: string;
    division: string;
    district: string;
    upazila: string;
    maxDeliveryRadiusKm: number;
    baseDeliveryFee: number;
    perKmDeliveryFee: number;
    estimatedBaseDeliveryMinutes: number;
    isActive: boolean;
    description: string;
  }>({
    name: "",
    shapeType: "circle",
    color: "#FF6B35",
    centerCoordinates: { latitude: 23.8103, longitude: 90.4125 },
    radiusKm: 5.0,
    polygonCoordinates: [],
    city: "Dhaka",
    division: "Dhaka",
    district: "Dhaka",
    upazila: "Dhanmondi",
    maxDeliveryRadiusKm: 6.0,
    baseDeliveryFee: 35,
    perKmDeliveryFee: 10,
    estimatedBaseDeliveryMinutes: 25,
    isActive: true,
    description: "",
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch all zones & restaurants for map overlay
  const fetchZonesAndData = useCallback(async () => {
    setLoading(true);
    try {
      const [zoneRes, restRes] = await Promise.all([
        getAllZones(),
        getAllRestaurants({ limit: "100" }),
      ]);

      if (zoneRes.success && Array.isArray(zoneRes.data)) {
        setZones(zoneRes.data);
      }

      if (restRes.success && Array.isArray(restRes.data)) {
        const mapped = restRes.data
          .map((r: any) => ({
            id: r._id || r.id || "",
            name: r.restaurantName || r.name || "Restaurant",
            latitude: Number(r.address?.coordinates?.latitude || r.latitude || 0),
            longitude: Number(r.address?.coordinates?.longitude || r.longitude || 0),
            zoneName: r.zoneName,
          }))
          .filter((r: any) => r.latitude && r.longitude);
        setRestaurants(mapped);
      }
    } catch (err: any) {
      showNotification("error", err.message || "Failed to load delivery zones data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZonesAndData();
  }, [fetchZonesAndData]);

  // Handle updates from ZoneMapDrawer component
  const handleMapUpdateCoordinates = (data: {
    centerCoordinates: ICoordinates;
    radiusKm: number;
    polygonCoordinates: ICoordinates[];
    shapeType: TZoneShapeType;
  }) => {
    setFormData((prev) => ({
      ...prev,
      centerCoordinates: data.centerCoordinates,
      radiusKm: data.radiusKm,
      polygonCoordinates: data.polygonCoordinates,
      shapeType: data.shapeType,
    }));
  };

  const handleEditZone = (zone: IZone) => {
    setIsEditing(true);
    setEditingZoneId(zone._id || null);
    setFormData({
      name: zone.name || "",
      shapeType: zone.shapeType || "circle",
      color: zone.color || "#FF6B35",
      centerCoordinates: zone.centerCoordinates || { latitude: 23.8103, longitude: 90.4125 },
      radiusKm: zone.radiusKm || 5.0,
      polygonCoordinates: zone.polygonCoordinates || [],
      city: zone.city || "Dhaka",
      division: zone.division || "Dhaka",
      district: zone.district || "Dhaka",
      upazila: zone.upazila || "",
      maxDeliveryRadiusKm: zone.maxDeliveryRadiusKm || zone.radiusKm + 1.0,
      baseDeliveryFee: zone.baseDeliveryFee || 30,
      perKmDeliveryFee: zone.perKmDeliveryFee || 10,
      estimatedBaseDeliveryMinutes: zone.estimatedBaseDeliveryMinutes || 25,
      isActive: zone.isActive ?? true,
      description: zone.description || "",
    });

    // Scroll to map editor smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    setIsEditing(false);
    setEditingZoneId(null);
    setFormData({
      name: "",
      shapeType: "circle",
      color: "#FF6B35",
      centerCoordinates: { latitude: 23.8103, longitude: 90.4125 },
      radiusKm: 5.0,
      polygonCoordinates: [],
      city: "Dhaka",
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Dhanmondi",
      maxDeliveryRadiusKm: 6.0,
      baseDeliveryFee: 35,
      perKmDeliveryFee: 10,
      estimatedBaseDeliveryMinutes: 25,
      isActive: true,
      description: "",
    });
  };

  const handleSubmitZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification("error", "Please provide a Zone Name.");
      return;
    }

    setActionLoading(true);
    try {
      if (isEditing && editingZoneId) {
        const res = await updateZone(editingZoneId, formData);
        if (res.success) {
          showNotification("success", `Zone "${formData.name}" updated successfully!`);
          handleResetForm();
          fetchZonesAndData();
        } else {
          showNotification("error", res.message || "Failed to update zone");
        }
      } else {
        const res = await createZone(formData);
        if (res.success) {
          showNotification("success", `New Zone "${formData.name}" created successfully!`);
          handleResetForm();
          fetchZonesAndData();
        } else {
          showNotification("error", res.message || "Failed to create zone");
        }
      }
    } catch (err: any) {
      showNotification("error", err.message || "An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (zone: IZone) => {
    if (!zone._id) return;
    try {
      const nextStatus = !zone.isActive;
      const res = await toggleZoneStatus(zone._id, nextStatus);
      if (res.success) {
        showNotification(
          "success",
          `Zone "${zone.name}" is now ${nextStatus ? "Active" : "Inactive"}`
        );
        setZones((prev) =>
          prev.map((z) => (z._id === zone._id ? { ...z, isActive: nextStatus } : z))
        );
      }
    } catch {
      showNotification("error", "Failed to change zone status");
    }
  };

  const handleDeleteZone = async (zone: IZone) => {
    if (!zone._id) return;
    if (!window.confirm(`Are you sure you want to permanently delete the delivery zone "${zone.name}"?`)) {
      return;
    }

    try {
      const res = await deleteZone(zone._id);
      if (res.success) {
        showNotification("success", `Zone "${zone.name}" deleted successfully.`);
        setZones((prev) => prev.filter((z) => z._id !== zone._id));
      } else {
        showNotification("error", res.message || "Failed to delete zone");
      }
    } catch {
      showNotification("error", "Failed to delete zone");
    }
  };

  // Filtered Zones List
  const filteredZones = zones.filter((z) => {
    const matchesSearch =
      searchQuery === "" ||
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.division.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision =
      filterDivision === "all" || z.division.toLowerCase() === filterDivision.toLowerCase();

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && z.isActive) ||
      (filterStatus === "inactive" && !z.isActive);

    return matchesSearch && matchesDivision && matchesStatus;
  });

  // Calculate Overview Statistics
  const totalZonesCount = zones.length;
  const activeZonesCount = zones.filter((z) => z.isActive).length;
  const totalCoveredRestaurants = zones.reduce((sum, z) => sum + (z.totalRestaurants || 0), 0);
  const avgDeliveryRadius =
    zones.length > 0
      ? (zones.reduce((sum, z) => sum + (z.radiusKm || 5), 0) / zones.length).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold fixed top-6 right-6 z-50 ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-rose-50 border-rose-300 text-rose-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#FF6B35] uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Geofencing & Coverage Engine</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Delivery Zones & Radius Control
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Draw custom geometric delivery zones, configure maximum delivery distance limits, and prevent the border problem.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchZonesAndData}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#FF6B35]" : ""}`} />
          <span>Refresh Zones</span>
        </button>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF6B35]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Zones</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{totalZonesCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Zones</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{activeZonesCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Covered Restaurants</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{totalCoveredRestaurants}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Radius</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{avgDeliveryRadius} <span className="text-xs font-bold text-gray-400">KM</span></h3>
          </div>
        </div>
      </div>

      {/* SECTION: Interactive Map Drawer & Zone Configuration Form (Split Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Visual Map Drawer (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-[560px] bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <ZoneMapDrawer
            existingZones={zones}
            restaurants={restaurants}
            currentShapeType={formData.shapeType}
            currentCenter={formData.centerCoordinates}
            currentRadiusKm={formData.radiusKm}
            currentPolygon={formData.polygonCoordinates}
            currentColor={formData.color}
            onUpdateCoordinates={handleMapUpdateCoordinates}
          />
        </div>

        {/* Right: Zone Configuration Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6B35]" />
                {isEditing ? `Edit Zone: ${formData.name}` : "Create New Delivery Zone"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure delivery limits, base pricing, and geographic boundaries.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitZone} className="space-y-4 text-xs">
            {/* Zone Name */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Zone Title / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Dhanmondi Central Hub, Gulshan-Banani Zone"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-hidden text-gray-900 font-medium text-xs"
              />
            </div>

            {/* Shape Type Selector */}
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Shape & Boundary Model
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "circle", label: "Circle", icon: CircleIcon },
                  { id: "polygon", label: "Polygon", icon: Pentagon },
                  { id: "rectangle", label: "Square", icon: Square },
                  { id: "polyline", label: "Corridor", icon: Minus },
                ].map((s) => {
                  const Icon = s.icon;
                  const isSelected = formData.shapeType === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, shapeType: s.id as TZoneShapeType })
                      }
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? "bg-orange-50 border-[#FF6B35] text-[#FF6B35] font-bold shadow-xs"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Division & District */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Division</label>
                <select
                  value={formData.division}
                  onChange={(e) => {
                    const div = e.target.value;
                    const matchedDiv = BANGLADESH_LOCATIONS.find((d) => d.division === div);
                    const firstDist = matchedDiv?.districts[0]?.name || div;
                    setFormData({
                      ...formData,
                      division: div,
                      district: firstDist,
                      city: firstDist,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-hidden text-gray-900 text-xs"
                >
                  {BANGLADESH_LOCATIONS.map((d) => (
                    <option key={d.division} value={d.division}>
                      {d.division}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">District / City</label>
                <select
                  value={formData.district}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      district: e.target.value,
                      city: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-hidden text-gray-900 text-xs"
                >
                  {(
                    BANGLADESH_LOCATIONS.find((d) => d.division === formData.division)
                      ?.districts || []
                  ).map((dist) => (
                    <option key={dist.name} value={dist.name}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Center Lat & Lng */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <div>
                <span className="block font-bold text-gray-600 text-[10px] uppercase">
                  Center Latitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={formData.centerCoordinates.latitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      centerCoordinates: {
                        ...formData.centerCoordinates,
                        latitude: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono font-medium"
                />
              </div>
              <div>
                <span className="block font-bold text-gray-600 text-[10px] uppercase">
                  Center Longitude
                </span>
                <input
                  type="number"
                  step="any"
                  value={formData.centerCoordinates.longitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      centerCoordinates: {
                        ...formData.centerCoordinates,
                        longitude: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono font-medium"
                />
              </div>
            </div>

            {/* Radius & Max Delivery Distance Sliders */}
            <div className="space-y-3 bg-orange-50/50 p-3 rounded-xl border border-orange-200/60">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-800">
                    Zone Radius: <span className="text-[#FF6B35]">{formData.radiusKm} km</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Shape boundary size</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={formData.radiusKm}
                  onChange={(e) =>
                    setFormData({ ...formData, radiusKm: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#FF6B35] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-800">
                    Max Delivery Distance:{" "}
                    <span className="text-emerald-700 font-black">
                      {formData.maxDeliveryRadiusKm} km
                    </span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    (Solves Border Problem)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={formData.maxDeliveryRadiusKm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDeliveryRadiusKm: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Delivery Fees & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Base Fee (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.baseDeliveryFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseDeliveryFee: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Per KM Fee (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-bold">+</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.perKmDeliveryFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        perKmDeliveryFee: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">Map Display Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.hex })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      formData.color === c.hex
                        ? "ring-3 ring-offset-2 ring-gray-900 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Submit & Reset Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? "Save Changes" : "Save Delivery Zone"}</span>
                  </>
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* SECTION: All Zones Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search zone by name, city, division..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
            >
              <option value="all">All Divisions</option>
              {BANGLADESH_LOCATIONS.map((d) => (
                <option key={d.division} value={d.division}>
                  {d.division}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-100/70 text-gray-900 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Zone & Color</th>
                <th className="py-3 px-4">Region & City</th>
                <th className="py-3 px-4">Shape & Center</th>
                <th className="py-3 px-4">Radius & Max KM</th>
                <th className="py-3 px-4">Pricing</th>
                <th className="py-3 px-4 text-center">Restaurants</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filteredZones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold">No delivery zones found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredZones.map((zone) => {
                  const colorHex = zone.color || "#FF6B35";
                  return (
                    <tr key={zone._id || zone.name} className="hover:bg-gray-50/80 transition-colors">
                      {/* Name & Color */}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                            style={{ backgroundColor: colorHex }}
                          />
                          <div>
                            <p className="font-bold text-gray-900">{zone.name}</p>
                            {zone.description && (
                              <p className="text-[10px] text-gray-400 font-normal line-clamp-1 max-w-[180px]">
                                {zone.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* City & Division */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-800">{zone.city}</p>
                        <p className="text-[10px] text-gray-400">{zone.division} Division</p>
                      </td>

                      {/* Shape & Coordinates */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold uppercase text-[10px] mb-0.5">
                          {zone.shapeType || "circle"}
                        </span>
                        {zone.centerCoordinates && (
                          <p className="text-gray-500 text-[10px]">
                            {zone.centerCoordinates.latitude.toFixed(3)}, {zone.centerCoordinates.longitude.toFixed(3)}
                          </p>
                        )}
                      </td>

                      {/* Radius & Max Distance */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">
                          {zone.radiusKm || 5.0} km <span className="text-gray-400 font-normal">radius</span>
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Max: {zone.maxDeliveryRadiusKm || 6.0} km
                        </p>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-800">৳{zone.baseDeliveryFee || 30}</p>
                        <p className="text-[10px] text-gray-400">+৳{zone.perKmDeliveryFee || 10}/km</p>
                      </td>

                      {/* Restaurants */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-bold text-[11px] border border-orange-200">
                          <Store className="w-3 h-3" />
                          {zone.totalRestaurants || 0}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(zone)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                            zone.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              zone.isActive ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {zone.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditZone(zone)}
                            className="p-1.5 bg-white hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-lg border border-gray-200 transition-colors shadow-2xs"
                            title="Edit Zone"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteZone(zone)}
                            className="p-1.5 bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-lg border border-gray-200 transition-colors shadow-2xs"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
