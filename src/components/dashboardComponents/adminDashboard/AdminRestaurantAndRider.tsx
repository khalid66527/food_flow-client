"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Store,
  Bike,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Trash2,
  Power,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  CreditCard,
  FileText,
  Building,
  DollarSign,
  Star,
  Check,
  X,
} from "lucide-react";
import { IRestaurant } from "@/lib/api/restaurant";
import { IRiderProfile } from "@/lib/api/rider";
import {
  getAdminRestaurants,
  getAdminRiders,
  getAdminRestaurantRiderStats,
  IAdminRestaurantRiderStats,
} from "@/lib/api/admin";
import {
  updateRestaurantStatusAdmin,
  deleteRestaurantAdmin,
  updateRiderStatusAdmin,
  deleteRiderAdmin,
} from "@/lib/actions/admin";

type TActiveTab = "all" | "restaurants" | "riders" | "pending";

export default function AdminRestaurantAndRider() {
  const [activeTab, setActiveTab] = useState<TActiveTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Data states
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [riders, setRiders] = useState<IRiderProfile[]>([]);
  const [stats, setStats] = useState<IAdminRestaurantRiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [selectedRestaurant, setSelectedRestaurant] = useState<IRestaurant | null>(null);
  const [selectedRider, setSelectedRider] = useState<IRiderProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "restaurant" | "rider";
    id: string;
    name: string;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Stats & Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [restRes, riderRes, statsRes] = await Promise.all([
        getAdminRestaurants({
          status: activeTab === "pending" ? "pending" : statusFilter,
          search: searchQuery,
          limit: 50,
        }),
        getAdminRiders({
          status: activeTab === "pending" ? "pending" : statusFilter,
          search: searchQuery,
          limit: 50,
        }),
        getAdminRestaurantRiderStats(),
      ]);

      if (restRes.success && restRes.data) {
        setRestaurants(restRes.data);
      }
      if (riderRes.success && riderRes.data) {
        setRiders(riderRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error loading admin restaurant & rider data:", err);
      showToast("error", "Failed to load restaurant & rider data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Restaurant Status Change
  const handleRestaurantStatus = async (restaurant: IRestaurant, newStatus: string) => {
    const id = restaurant._id || restaurant.id || restaurant.ownerEmail || restaurant.slug || "";
    if (!id) return;

    setActionLoadingId(`rest-${id}`);
    try {
      const res = await updateRestaurantStatusAdmin(id, newStatus);
      if (res.success) {
        setRestaurants((prev) =>
          prev.map((r) =>
            (r._id && r._id === id) || r.ownerEmail === id || r.slug === id
              ? { ...r, status: newStatus as any }
              : r
          )
        );
        if (selectedRestaurant) {
          setSelectedRestaurant({ ...selectedRestaurant, status: newStatus as any });
        }
        showToast(
          "success",
          `Restaurant "${restaurant.restaurantName || restaurant.name}" is now ${newStatus.toUpperCase()}`
        );
        // Refresh stats
        getAdminRestaurantRiderStats().then((s) => s.data && setStats(s.data));
      } else {
        showToast("error", res.message || "Failed to update restaurant status");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Rider Status Change
  const handleRiderStatus = async (rider: IRiderProfile, newStatus: string) => {
    const id = rider._id || rider.id || rider.email || rider.userId || "";
    if (!id) return;

    setActionLoadingId(`rider-${id}`);
    try {
      const res = await updateRiderStatusAdmin(id, newStatus);
      if (res.success) {
        setRiders((prev) =>
          prev.map((r) =>
            (r._id && r._id === id) || r.email === id || r.userId === id
              ? { ...r, status: newStatus as any }
              : r
          )
        );
        if (selectedRider) {
          setSelectedRider({ ...selectedRider, status: newStatus as any });
        }
        showToast(
          "success",
          `Rider "${rider.name}" is now ${newStatus.toUpperCase()}`
        );
        // Refresh stats
        getAdminRestaurantRiderStats().then((s) => s.data && setStats(s.data));
      } else {
        showToast("error", res.message || "Failed to update rider status");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Confirmation Execution
  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    setActionLoadingId(`del-${id}`);

    try {
      if (type === "restaurant") {
        const res = await deleteRestaurantAdmin(id);
        if (res.success) {
          setRestaurants((prev) => prev.filter((r) => r._id !== id && r.ownerEmail !== id));
          showToast("success", `Restaurant "${name}" has been deleted.`);
        } else {
          showToast("error", res.message || "Failed to delete restaurant");
        }
      } else {
        const res = await deleteRiderAdmin(id);
        if (res.success) {
          setRiders((prev) => prev.filter((r) => r._id !== id && r.email !== id));
          showToast("success", `Rider "${name}" has been deleted.`);
        } else {
          showToast("error", res.message || "Failed to delete rider");
        }
      }
      getAdminRestaurantRiderStats().then((s) => s.data && setStats(s.data));
    } catch (err: any) {
      showToast("error", err.message || "Deletion failed");
    } finally {
      setActionLoadingId(null);
      setDeleteConfirm(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();
    switch (s) {
      case "active":
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active / Approved
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            Rejected
          </span>
        );
      case "suspended":
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const pendingRestaurants = restaurants.filter(
    (r) => (r.status || "").toLowerCase() === "pending"
  );
  const pendingRiders = riders.filter(
    (r) => (r.status || "").toLowerCase() === "pending"
  );
  const totalPending = (stats?.totalPendingApprovals ?? (pendingRestaurants.length + pendingRiders.length));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800 shadow-emerald-500/10"
                : "bg-white border-rose-200 text-rose-800 shadow-rose-500/10"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-orange-400 text-xs font-bold uppercase tracking-wider border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Partner Approval &amp; Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Restaurant &amp; Rider Control Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Review onboarding applications, verify vendor &amp; delivery partner credentials,
              approve newly created stores, and moderate platform active partners.
            </p>
          </div>

          {/* Pending Alerts Counter Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
              <span className="text-2xl font-black text-orange-400">
                {stats?.restaurants?.pending ?? pendingRestaurants.length}
              </span>
              <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Pending Stores</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
              <span className="text-2xl font-black text-amber-400">
                {stats?.riders?.pending ?? pendingRiders.length}
              </span>
              <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Pending Riders</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Restaurants */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Restaurants
            </span>
            <div className="p-2.5 rounded-xl bg-orange-50 text-[#FF6B35]">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {stats?.restaurants?.total ?? restaurants.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {stats?.restaurants?.active ?? 0} Active Stores
          </p>
        </div>

        {/* Pending Restaurants */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Pending Stores
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {stats?.restaurants?.pending ?? pendingRestaurants.length}
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Awaiting admin review</p>
        </div>

        {/* Total Riders */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Riders
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {stats?.riders?.total ?? riders.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {stats?.riders?.active ?? 0} Active Riders
          </p>
        </div>

        {/* Pending Riders */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Pending Riders
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600">
            {stats?.riders?.pending ?? pendingRiders.length}
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Awaiting verification</p>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100/80 overflow-x-auto">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "pending"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Approvals</span>
              {totalPending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-600">
                  {totalPending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("restaurants")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "restaurants"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Restaurants ({restaurants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("riders")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "riders"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Riders ({riders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>All Partners</span>
            </button>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, city..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {activeTab !== "pending" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh List"
              className="p-2.5 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-gray-100 p-12">
          <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
          <p className="text-xs font-bold text-gray-400">Loading partner applications...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. RESTAURANTS SECTION */}
          {(activeTab === "pending" || activeTab === "restaurants" || activeTab === "all") && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-50 text-[#FF6B35]">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Restaurant Applications &amp; Partners
                    </h2>
                    <p className="text-xs text-gray-400">
                      Showing{" "}
                      {activeTab === "pending"
                        ? `${pendingRestaurants.length} pending stores`
                        : `${restaurants.length} restaurants`}
                    </p>
                  </div>
                </div>
              </div>

              {restaurants.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Store className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">No restaurants found</p>
                  <p className="text-xs text-gray-400">
                    {activeTab === "pending"
                      ? "Great! There are no pending restaurant approval requests."
                      : "Try adjusting your search query or filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-extrabold text-[10px]">
                        <th className="py-3 px-3">Restaurant</th>
                        <th className="py-3 px-3">Owner Contact</th>
                        <th className="py-3 px-3">Location</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {restaurants.map((rest) => {
                        const id =
                          rest._id || rest.id || rest.ownerEmail || rest.slug || "";
                        const isPending = (rest.status || "").toLowerCase() === "pending";
                        const isActive = (rest.status || "").toLowerCase() === "active";
                        const isLoading = actionLoadingId === `rest-${id}`;

                        return (
                          <tr
                            key={id}
                            className="hover:bg-orange-50/20 transition-colors group"
                          >
                            {/* Restaurant Info */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    rest.logo ||
                                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=100&q=80"
                                  }
                                  alt={rest.restaurantName}
                                  className="w-10 h-10 rounded-2xl object-cover border border-gray-100 shrink-0"
                                />
                                <div>
                                  <span className="font-extrabold text-gray-900 block group-hover:text-orange-600 transition-colors">
                                    {rest.restaurantName || rest.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400 block truncate max-w-[180px]">
                                    {rest.tagline || rest.cuisineTypes?.join(", ") || "Restaurant"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Owner Contact */}
                            <td className="py-3.5 px-3 space-y-0.5">
                              <span className="font-bold text-gray-800 block">
                                {rest.ownerEmail || rest.contactEmail || "N/A"}
                              </span>
                              <span className="text-[11px] text-gray-400 block">
                                {rest.contactNumber || rest.ownerPhone || "No phone"}
                              </span>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-gray-800 block">
                                {rest.address?.city || "Dhaka"}
                              </span>
                              <span className="text-[11px] text-gray-400 block">
                                {rest.address?.area || rest.address?.street || "Area not set"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3">
                              {getStatusBadge(rest.status)}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Approve Button */}
                                {!isActive && (
                                  <button
                                    onClick={() => handleRestaurantStatus(rest, "active")}
                                    disabled={isLoading}
                                    title="Approve Restaurant"
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                )}

                                {/* Reject Button for Pending */}
                                {isPending && (
                                  <button
                                    onClick={() => handleRestaurantStatus(rest, "rejected")}
                                    disabled={isLoading}
                                    title="Reject Application"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                )}

                                {/* Suspend Button */}
                                {isActive && (
                                  <button
                                    onClick={() => handleRestaurantStatus(rest, "suspended")}
                                    disabled={isLoading}
                                    title="Suspend Restaurant"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </button>
                                )}

                                {/* View Details Modal */}
                                <button
                                  onClick={() => setSelectedRestaurant(rest)}
                                  title="View Full Details"
                                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: "restaurant",
                                      id,
                                      name: rest.restaurantName || rest.name || "Restaurant",
                                    })
                                  }
                                  title="Delete Restaurant"
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. RIDERS SECTION */}
          {(activeTab === "pending" || activeTab === "riders" || activeTab === "all") && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Rider Applications &amp; Delivery Partners
                    </h2>
                    <p className="text-xs text-gray-400">
                      Showing{" "}
                      {activeTab === "pending"
                        ? `${pendingRiders.length} pending riders`
                        : `${riders.length} riders`}
                    </p>
                  </div>
                </div>
              </div>

              {riders.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Bike className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">No riders found</p>
                  <p className="text-xs text-gray-400">
                    {activeTab === "pending"
                      ? "Awesome! All delivery partner profiles have been reviewed."
                      : "Try adjusting your search query or filter."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-extrabold text-[10px]">
                        <th className="py-3 px-3">Rider Name</th>
                        <th className="py-3 px-3">Vehicle &amp; License</th>
                        <th className="py-3 px-3">Zone &amp; City</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {riders.map((rider) => {
                        const id = rider._id || rider.id || rider.email || rider.userId || "";
                        const isPending = (rider.status || "").toLowerCase() === "pending";
                        const isActive = (rider.status || "").toLowerCase() === "active";
                        const isLoading = actionLoadingId === `rider-${id}`;

                        return (
                          <tr
                            key={id}
                            className="hover:bg-blue-50/20 transition-colors group"
                          >
                            {/* Rider Avatar + Name */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-100 font-bold text-orange-600 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                  {rider.avatar ? (
                                    <img
                                      src={rider.avatar}
                                      alt={rider.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{rider.name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-extrabold text-gray-900 block group-hover:text-blue-600 transition-colors">
                                    {rider.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400 block">
                                    {rider.email} • {rider.phone}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Vehicle Details */}
                            <td className="py-3.5 px-3 space-y-0.5">
                              <span className="font-bold text-gray-800 block capitalize">
                                {rider.vehicleType?.replace("_", " ") || "Motorcycle"} •{" "}
                                {rider.vehicleBrand || "Standard"}
                              </span>
                              <span className="text-[11px] text-gray-400 block uppercase">
                                Plate: {rider.vehicleNumber || "N/A"}
                              </span>
                            </td>

                            {/* Delivery Zone */}
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-gray-800 block">
                                {rider.deliveryZone || "Central Zone"}
                              </span>
                              <span className="text-[11px] text-gray-400 block">
                                {rider.city || "Dhaka"}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3">
                              {getStatusBadge(rider.status)}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {/* Approve Button */}
                                {!isActive && (
                                  <button
                                    onClick={() => handleRiderStatus(rider, "active")}
                                    disabled={isLoading}
                                    title="Approve Rider"
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                )}

                                {/* Reject Button for Pending */}
                                {isPending && (
                                  <button
                                    onClick={() => handleRiderStatus(rider, "rejected")}
                                    disabled={isLoading}
                                    title="Reject Application"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                )}

                                {/* Suspend Button */}
                                {isActive && (
                                  <button
                                    onClick={() => handleRiderStatus(rider, "suspended")}
                                    disabled={isLoading}
                                    title="Suspend Rider"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </button>
                                )}

                                {/* View Details Modal */}
                                <button
                                  onClick={() => setSelectedRider(rider)}
                                  title="View Full Details"
                                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: "rider",
                                      id,
                                      name: rider.name || "Rider",
                                    })
                                  }
                                  title="Delete Rider"
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RESTAURANT DETAILS MODAL */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={
                    selectedRestaurant.logo ||
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80"
                  }
                  alt={selectedRestaurant.restaurantName}
                  className="w-14 h-14 rounded-2xl object-cover border border-gray-100"
                />
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {selectedRestaurant.restaurantName || selectedRestaurant.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(selectedRestaurant.status)}
                    <span className="text-xs text-gray-400">
                      {selectedRestaurant.address?.city || "Dhaka"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRestaurant(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Restaurant Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Owner Email</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRestaurant.ownerEmail || selectedRestaurant.contactEmail || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Contact Phone</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRestaurant.contactNumber || selectedRestaurant.ownerPhone || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Cuisines / Categories</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRestaurant.cuisineTypes?.join(", ") ||
                    selectedRestaurant.cuisines?.join(", ") ||
                    "General Food"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Opening Hours</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRestaurant.generalOpenTime || "09:00 AM"} -{" "}
                  {selectedRestaurant.generalCloseTime || "10:00 PM"}
                </span>
              </div>

              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Full Address</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRestaurant.address?.street
                    ? `${selectedRestaurant.address.street}, ${selectedRestaurant.address.area || ""}, ${selectedRestaurant.address.city || ""}`
                    : "Address not specified"}
                </span>
              </div>

              {selectedRestaurant.description && (
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-gray-50 space-y-1">
                  <span className="text-gray-400 font-bold block">Description</span>
                  <p className="text-gray-700 leading-relaxed font-medium">
                    {selectedRestaurant.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Approval Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {(selectedRestaurant.status || "").toLowerCase() !== "active" && (
                <>
                  <button
                    onClick={() => handleRestaurantStatus(selectedRestaurant, "active")}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve &amp; Activate</span>
                  </button>

                  <button
                    onClick={() => handleRestaurantStatus(selectedRestaurant, "rejected")}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>
                </>
              )}

              {(selectedRestaurant.status || "").toLowerCase() === "active" && (
                <button
                  onClick={() => handleRestaurantStatus(selectedRestaurant, "suspended")}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  <span>Suspend Store</span>
                </button>
              )}

              <button
                onClick={() => setSelectedRestaurant(null)}
                className="px-5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIDER DETAILS MODAL */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 font-bold text-xl text-orange-600 flex items-center justify-center overflow-hidden border border-gray-100">
                  {selectedRider.avatar ? (
                    <img
                      src={selectedRider.avatar}
                      alt={selectedRider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedRider.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{selectedRider.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(selectedRider.status)}
                    <span className="text-xs text-gray-400 capitalize">
                      {selectedRider.vehicleType?.replace("_", " ") || "Motorcycle"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRider(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rider Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Email Address</span>
                <span className="font-extrabold text-gray-900 block">{selectedRider.email}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Phone Number</span>
                <span className="font-extrabold text-gray-900 block">{selectedRider.phone}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Vehicle Number / Plate</span>
                <span className="font-extrabold text-gray-900 block uppercase">
                  {selectedRider.vehicleNumber || "Not registered"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Driving License No</span>
                <span className="font-extrabold text-gray-900 block uppercase">
                  {selectedRider.drivingLicenseNumber || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">National ID (NID)</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRider.nidNumber || "Encrypted / Verified"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 space-y-1">
                <span className="text-gray-400 font-bold block">Operating Delivery Zone</span>
                <span className="font-extrabold text-gray-900 block">
                  {selectedRider.deliveryZone}, {selectedRider.city}
                </span>
              </div>

              {selectedRider.emergencyContact?.name && (
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                  <span className="text-amber-700 font-bold block">Emergency Contact</span>
                  <span className="font-extrabold text-gray-900 block">
                    {selectedRider.emergencyContact.name} ({selectedRider.emergencyContact.relation || "Family"}) •{" "}
                    {selectedRider.emergencyContact.phone}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Approval Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {(selectedRider.status || "").toLowerCase() !== "active" && (
                <>
                  <button
                    onClick={() => handleRiderStatus(selectedRider, "active")}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve &amp; Verify Rider</span>
                  </button>

                  <button
                    onClick={() => handleRiderStatus(selectedRider, "rejected")}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>
                </>
              )}

              {(selectedRider.status || "").toLowerCase() === "active" && (
                <button
                  onClick={() => handleRiderStatus(selectedRider, "suspended")}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  <span>Suspend Rider</span>
                </button>
              )}

              <button
                onClick={() => setSelectedRider(null)}
                className="px-5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirm Deletion</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-gray-900">{deleteConfirm.name}</strong> from the system?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
