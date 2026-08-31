"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, MapPin, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { DeliveryAssignment } from "@/types/rider";

function groupByDate(items: DeliveryAssignment[]) {
  const groups: Record<string, DeliveryAssignment[]> = {};
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  items.forEach((item) => {
    const date = item.deliveredAt?.slice(0, 10) || item.createdAt?.slice(0, 10) || "Unknown";
    let label = date;
    if (date === today) label = "Today";
    else if (date === yesterday) label = "Yesterday";

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return groups;
}

export default function HistoryPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await deliveryAPI.getHistory({ page: 1 });
      setDeliveries(res.data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const grouped = groupByDate(deliveries);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:ml-0 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Delivery History</h1>
        </div>
        <button onClick={fetchData} className="p-2 rounded-full hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No delivery history yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">{date}</h3>
            <div className="space-y-2">
              {items.map((d) => (
                <div key={d.orderId} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {d.status === "delivered" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{d.orderId}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">&#2547;{d.totalEarning || d.deliveryFee}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{d.pickupRestaurant.name} → {d.dropoffCustomer.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2">
                    <span>{d.estimatedDistance ? `${d.estimatedDistance} km` : ""}</span>
                    <span>{d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
