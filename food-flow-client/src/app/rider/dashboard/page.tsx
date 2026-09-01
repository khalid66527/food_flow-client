"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, MapPin, Clock, Banknote, Package, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { deliveryAPI, earningsAPI, riderProfileAPI } from "@/lib/api";
import { DeliveryAssignment, RiderStats } from "@/types/rider";

export default function RiderDashboard() {
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryAssignment | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [availRes, activeRes, statsRes, profileRes] = await Promise.allSettled([
        deliveryAPI.getAvailable(),
        deliveryAPI.getActive(),
        earningsAPI.getStats(),
        riderProfileAPI.get(),
      ]);
      if (availRes.status === "fulfilled") setDeliveries(availRes.value.data.data || []);
      if (activeRes.status === "fulfilled") setActiveDelivery(activeRes.value.data.data);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.data);
      if (profileRes.status === "fulfilled") setIsOnline(profileRes.value.data.data?.isAvailable || false);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOnline = async () => {
    try {
      const newVal = !isOnline;
      await riderProfileAPI.toggleAvailability(newVal);
      setIsOnline(newVal);
    } catch {}
  };

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      const token = localStorage.getItem("rider_user");
      const user = token ? JSON.parse(token) : null;
      await deliveryAPI.accept(orderId, {
        riderName: user?.name || "Rider",
        riderPhone: "",
        riderEmail: user?.email || "",
      });
      await fetchData();
    } catch {}
    setAccepting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:ml-0 space-y-6">
      {/* Online Toggle + Stats */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rider Dashboard</h1>
            <p className="text-sm text-gray-500">Manage your deliveries</p>
          </div>
          <button onClick={toggleOnline} className="flex items-center gap-2">
            {isOnline ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-400" />
            )}
            <span className={`text-sm font-semibold ${isOnline ? "text-green-600" : "text-gray-500"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <Banknote className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{stats.todayEarnings}</p>
              <p className="text-[10px] text-gray-500">Today (&#2547;)</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <Package className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{stats.todayDeliveries}</p>
              <p className="text-[10px] text-gray-500">Deliveries</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
              <p className="text-[10px] text-gray-500">Rating</p>
            </div>
          </div>
        )}
      </div>

      {/* Active Delivery */}
      {activeDelivery && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Active Delivery</h2>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              {activeDelivery.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{activeDelivery.pickupRestaurant.name}</p>
                <p className="text-xs text-gray-500">{activeDelivery.pickupRestaurant.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{activeDelivery.dropoffCustomer.name}</p>
                <p className="text-xs text-gray-500">{activeDelivery.dropoffCustomer.address}</p>
              </div>
            </div>
            <Link
              href={`/rider/delivery/${activeDelivery.orderId}`}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              View Details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Available Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Available Deliveries</h2>
          <button onClick={fetchData} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {deliveries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No deliveries available right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.orderId} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{d.pickupRestaurant.name}</p>
                      <p className="text-xs text-gray-500">{d.pickupRestaurant.address}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">&#2547;{d.deliveryFee}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{d.dropoffCustomer.address}</span>
                </div>

                <button
                  onClick={() => handleAccept(d.orderId)}
                  disabled={accepting === d.orderId}
                  className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {accepting === d.orderId ? "Accepting..." : "Accept Delivery"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
