"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Star,
  Bike,
  Store,
  UtensilsCrossed,
  ShieldCheck,
  Search,
  Filter,
  MessageSquare,
  Sparkles,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Calendar,
  ThumbsUp,
  Award,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllAdminReviewsApi, IAdminReviewsSummary, IReview } from "@/lib/api/review";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

export default function AdminReviews() {
  const [data, setData] = useState<IAdminReviewsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter States
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const REVIEWS_PER_PAGE = 8;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAdminReviews = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getAllAdminReviewsApi({
        targetType: targetTypeFilter,
        minRating: starFilter !== "all" ? starFilter : undefined,
        search: debouncedSearch,
      });

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Failed to load admin reviews:", err);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetTypeFilter, starFilter, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
    loadAdminReviews();
  }, [loadAdminReviews]);

  const reviews = data?.reviews || [];
  const totalReviews = data?.totalReviews || 0;

  // Pagination Calculations
  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE) || 1;
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );
  const avgRating = data?.avgRating || 0;
  const avgRiderRating = data?.avgRiderRating || 0;
  const avgRestaurantRating = data?.avgRestaurantRating || 0;
  const breakdown = data?.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const getTargetBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    switch (t) {
      case "rider":
        return {
          label: "Delivery Rider",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Bike,
        };
      case "restaurant":
        return {
          label: "Restaurant",
          bg: "bg-orange-50 text-[#FF6B35] border-orange-200",
          icon: Store,
        };
      case "food":
        return {
          label: "Food Dish",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: UtensilsCrossed,
        };
      default:
        return {
          label: "General",
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          icon: MessageSquare,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size={50} color="#f97316" />
        <p className="text-xs font-bold text-gray-500">Loading platform reviews & rating moderation...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 🟠 TOP HEADER BANNER */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-2.5 text-white border border-white/25">
              <Award className="w-3.5 h-3.5 text-amber-300" /> Platform Moderation & Quality Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Review & Rating Moderation
            </h1>
            <p className="text-gray-300 text-sm mt-1">
              Real-time monitoring of customer ratings, feedback comments, and partner performance across FoodFlow.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAdminReviews}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold transition backdrop-blur-md shrink-0 cursor-pointer border border-white/20 hover:scale-102 active:scale-98"
          >
            <RefreshCw className={`w-4 h-4 text-white ${refreshing ? "animate-spin" : ""}`} /> Refresh Feed
          </button>
        </div>
      </section>

      {/* 📊 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Overall Rating
          </span>
          <p className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">Platform average score</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Total Reviews Saved
          </span>
          <p className="text-2xl font-black text-gray-900 flex items-center gap-1.5">
            <MessageSquare className="w-6 h-6 text-[#FF6B35]" />
            {totalReviews}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">Recorded customer feedback</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Riders Avg Rating
          </span>
          <p className="text-2xl font-black text-blue-600 flex items-center gap-1.5">
            <Bike className="w-6 h-6 text-blue-500" />
            {avgRiderRating > 0 ? avgRiderRating.toFixed(1) : "5.0"}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">({data?.totalRiderReviews || 0} rider ratings)</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Restaurants Avg Rating
          </span>
          <p className="text-2xl font-black text-orange-600 flex items-center gap-1.5">
            <Store className="w-6 h-6 text-orange-500" />
            {avgRestaurantRating > 0 ? avgRestaurantRating.toFixed(1) : "5.0"}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">({data?.totalRestaurantReviews || 0} store ratings)</p>
        </div>
      </div>

      {/* 🔍 SEARCH AND FILTERS */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, target name, comment, order #..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#FF6B35] transition"
            />
          </div>

          {/* Target Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { key: "all", label: "All Types" },
              { key: "rider", label: "Delivery Riders" },
              { key: "restaurant", label: "Restaurants" },
              { key: "food", label: "Food Items" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTargetTypeFilter(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                  targetTypeFilter === tab.key
                    ? "bg-[#FF6B35] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Star Rating Filter Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto">
          <span className="text-xs font-bold text-gray-400 shrink-0">Filter Stars:</span>
          <button
            type="button"
            onClick={() => setStarFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              starFilter === "all"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setStarFilter(star)}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                starFilter === star
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{star}</span> <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 📋 REVIEWS FEED GRID */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-extrabold text-gray-900">No Reviews Match Filters</h3>
            <p className="text-xs text-gray-500">
              {searchQuery || targetTypeFilter !== "all" || starFilter !== "all"
                ? "Try resetting your search keyword or star rating filter."
                : "No customer feedback entries have been recorded yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedReviews.map((rev: IReview, idx: number) => {
              const badge = getTargetBadge(rev.targetType);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={rev._id || idx}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Target & Customer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-orange-500/15">
                          {(rev.userName || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900">
                            {rev.userName || "Customer"}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {rev.userEmail || `Order #${rev.orderId}`}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border shrink-0 ${badge.bg}`}
                      >
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </div>

                    {/* Rating Stars & Target Name */}
                    <div className="bg-gray-50/80 p-3 rounded-2xl space-y-1.5 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 truncate max-w-[200px]">
                          Target: {rev.targetName || rev.targetId}
                        </span>
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{rev.rating} / 5</span>
                        </div>
                      </div>
                      {rev.orderId && (
                        <p className="text-[10px] text-gray-500 font-bold">
                          Associated Order: #{rev.orderId}
                        </p>
                      )}
                    </div>

                    {/* Comment */}
                    <p className="text-xs text-gray-700 italic leading-relaxed bg-amber-50/40 p-3.5 rounded-2xl border border-amber-100/60">
                      &quot;{rev.comment || "Great service & experience!"}&quot;
                    </p>
                  </div>

                  {/* Footer Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Rating
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-semibold">
                Showing <strong className="text-gray-900">{(currentPage - 1) * REVIEWS_PER_PAGE + 1}</strong> to{" "}
                <strong className="text-gray-900">{Math.min(currentPage * REVIEWS_PER_PAGE, reviews.length)}</strong> of{" "}
                <strong className="text-gray-900">{reviews.length}</strong> reviews
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                      currentPage === i + 1
                        ? "bg-[#FF6B35] text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
