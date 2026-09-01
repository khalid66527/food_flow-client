"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { earningsAPI } from "@/lib/api";
import { RiderStats, EarningsChartData } from "@/types/rider";

export default function EarningsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [chartData, setChartData] = useState<EarningsChartData[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        earningsAPI.getStats(),
        earningsAPI.getChart(period === "today" ? "week" : period),
      ]);
      setStats(statsRes.data.data);
      setChartData(chartRes.data.data || []);
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:ml-0 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Earnings</h1>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-green-600">&#2547;{stats.todayEarnings}</p>
            <p className="text-[10px] text-gray-500 mt-1">Today</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-orange-600">&#2547;{stats.totalEarnings}</p>
            <p className="text-[10px] text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalDeliveries}</p>
            <p className="text-[10px] text-gray-500 mt-1">Total Deliveries</p>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(["week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              period === p ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"
            }`}
          >
            {p === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Earnings Overview</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="earnings" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            No data available
          </div>
        )}
      </div>

      {/* Stats Detail */}
      {stats && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold text-gray-900">Statistics</h3>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Today&apos;s Deliveries</span>
            <span className="text-sm font-bold text-gray-900">{stats.todayDeliveries}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Total Deliveries</span>
            <span className="text-sm font-bold text-gray-900">{stats.totalDeliveries}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Rating</span>
            <span className="text-sm font-bold text-gray-900">&#11088; {stats.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Average per Delivery</span>
            <span className="text-sm font-bold text-green-600">
              &#2547;{stats.totalDeliveries > 0 ? Math.round(stats.totalEarnings / stats.totalDeliveries) : 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
