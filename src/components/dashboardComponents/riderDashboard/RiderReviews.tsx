"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Star,
  Bike,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Sparkles,
  RefreshCw,
  UserCheck,
  Calendar,
  ThumbsUp,
  Award,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getRiderReviewsApi, IReviewSummary } from "@/lib/api/review";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

export default function RiderReviews() {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const riderId = user?.id;

  const [data, setData] = useState<IReviewSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadReviews = useCallback(async () => {
    if (!riderId) return;
    setRefreshing(true);
    try {
      const res = await getRiderReviewsApi(riderId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load rider reviews:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [riderId]);

  useEffect(() => {
    if (riderId) {
      loadReviews();
    } else if (!sessionPending) {
      setLoading(false);
    }
  }, [riderId, sessionPending, loadReviews]);

  if (loading || sessionPending) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size={45} color="#f97316" />
      </div>
    );
  }

  const avgRating = data?.avgRating || 0;
  const totalReviews = data?.totalReviews || 0;
  const breakdown = data?.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-200">
      {/* 🟠 Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white border border-white/30">
              <Award className="w-3.5 h-3.5 text-amber-200" /> Performance & Feedback
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
              My Ratings & Reviews
            </h1>
            <p className="text-orange-100 text-sm max-w-lg">
              Customer ratings, star breakdown, and performance metrics from your completed deliveries.
            </p>
          </div>

          <button
            onClick={loadReviews}
            disabled={refreshing}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* 📊 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Average Rating */}
        <div className="p-6 rounded-3xl bg-white border border-orange-100/80 shadow-xs flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200/50">
            <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
              Average Rating
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-gray-900">
                {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
              </span>
              <span className="text-sm text-gray-400 font-bold">/ 5.0</span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Based on {totalReviews} delivery ratings
            </p>
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="p-6 rounded-3xl bg-white border border-orange-100/80 shadow-xs flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center shrink-0 border border-orange-200/50">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
              Total Reviews
            </span>
            <div className="text-3xl font-black text-gray-900 mt-1">
              {totalReviews}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">Recorded customer feedback</p>
          </div>
        </div>

        {/* Card 3: 5-Star Ratio */}
        <div className="p-6 rounded-3xl bg-white border border-orange-100/80 shadow-xs flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50">
            <ThumbsUp className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
              5-Star Satisfaction
            </span>
            <div className="text-3xl font-black text-gray-900 mt-1">
              {totalReviews > 0
                ? `${Math.round(((breakdown[5] || 0) / totalReviews) * 100)}%`
                : "100%"}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {breakdown[5] || 0} top ratings received
            </p>
          </div>
        </div>
      </div>

      {/* 📈 Rating Breakdown Bar */}
      <div className="p-6 rounded-3xl bg-white border border-orange-100/80 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF6B35]" /> Star Rating Distribution
        </h3>

        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = breakdown[star as keyof typeof breakdown] || 0;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 w-16 text-gray-700 font-extrabold shrink-0">
                  <span>{star}</span> <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#FF6B35] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-bold text-gray-500 shrink-0">
                  {count} ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🛡️ Information Notice Banner */}
      <div className="p-6 rounded-3xl bg-orange-50/70 border border-orange-200/80 text-gray-800 text-xs font-semibold flex items-center gap-3.5 shadow-xs">
        <ShieldCheck className="w-6 h-6 text-[#FF6B35] shrink-0" />
        <p className="leading-relaxed">
          Your total average rating score and star distribution are automatically updated in real-time based on verified customer post-delivery ratings. Individual feedback entries are monitored directly by the FoodFlow Admin team.
        </p>
      </div>
    </div>
  );
}
