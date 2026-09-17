"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Eye,
  Store,
  DollarSign,
  Tag,
  Star,
  Sparkles,
  Flame,
  Leaf,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  Percent,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getAllGlobalFoodItems,
  getFoodCategories,
  getAllRestaurants,
  IRestaurant,
} from "@/lib/api/restaurant";
import {
  createFoodItem,
  updateFoodItemAction,
  toggleFoodItemAvailabilityAction,
  deleteFoodItemAction,
} from "@/lib/actions/restaurant";
import { IGlobalFoodItem, IMenuItem } from "@/types/restaurant";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

const SAMPLE_FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
];

export default function AdminFoods() {
  const [foods, setFoods] = useState<IGlobalFoodItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [restaurantFilter, setRestaurantFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "VEG" | "SPICY" | "DISCOUNT">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "rating">("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<IGlobalFoodItem | null>(null);
  const [viewingFood, setViewingFood] = useState<IGlobalFoodItem | null>(null);
  const [deletingFood, setDeletingFood] = useState<IGlobalFoodItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Data for Create / Edit
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    restaurantId: "",
    category: "Biryani",
    price: 0,
    discountPrice: 0,
    image: "",
    isAvailable: true,
    isVegetarian: false,
    isSpicy: false,
    tags: "" as string,
  });

  // Fetch all foods & metadata
  const fetchData = useCallback(async () => {
    try {
      const [foodsRes, catsRes, restsRes] = await Promise.all([
        getAllGlobalFoodItems({ limit: "200" }),
        getFoodCategories(),
        getAllRestaurants(),
      ]);

      if (foodsRes.success && Array.isArray(foodsRes.data)) {
        setFoods(foodsRes.data);
      } else {
        setFoods([]);
      }

      if (catsRes.success && Array.isArray(catsRes.data)) {
        setCategories(catsRes.data);
      }

      if (restsRes.success && Array.isArray(restsRes.data)) {
        setRestaurants(restsRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin food data:", err);
      toast.error("Failed to load global foods catalog.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      description: "",
      restaurantId: restaurants[0]?._id || restaurants[0]?.id || "",
      category: categories[0] || "Biryani",
      price: 250,
      discountPrice: 0,
      image: SAMPLE_FOOD_IMAGES[0],
      isAvailable: true,
      isVegetarian: false,
      isSpicy: false,
      tags: "Popular, Chef Special",
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (food: IGlobalFoodItem) => {
    setEditingFood(food);
    setFormData({
      name: food.name || "",
      description: food.description || "",
      restaurantId: food.restaurantId || "",
      category: food.category || "Biryani",
      price: food.price || 0,
      discountPrice: food.discountPrice || 0,
      image: food.image || "",
      isAvailable: food.isAvailable !== false,
      isVegetarian: Boolean(food.isVegetarian),
      isSpicy: Boolean(food.isSpicy),
      tags: Array.isArray(food.tags) ? food.tags.join(", ") : "",
    });
  };

  // Toggle Single Food Availability (In Stock / Out of Stock)
  const handleToggleAvailability = async (food: IGlobalFoodItem) => {
    const nextStatus = !food.isAvailable;
    setActionLoadingId(food._id);
    try {
      const res = await toggleFoodItemAvailabilityAction(food._id, nextStatus);
      if (res.success) {
        setFoods((prev) =>
          prev.map((f) => (f._id === food._id ? { ...f, isAvailable: nextStatus } : f))
        );
        toast.success(
          `"${food.name}" is now marked as ${nextStatus ? "In Stock 🟢" : "Out of Stock 🔴"}`
        );
      } else {
        toast.error(res.message || "Failed to update item availability.");
      }
    } catch {
      toast.error("Network error while updating status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Create / Edit Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Food Item Name is required.");
      return;
    }
    if (formData.price <= 0) {
      toast.error("Price must be greater than 0.");
      return;
    }

    setSubmitting(true);
    const parsedTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingFood) {
        // Update existing
        const payload: Partial<IMenuItem> = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: Number(formData.price),
          discountPrice: Number(formData.discountPrice) || undefined,
          image: formData.image.trim(),
          isAvailable: formData.isAvailable,
          isVegetarian: formData.isVegetarian,
          isSpicy: formData.isSpicy,
          tags: parsedTags,
        };

        const res = await updateFoodItemAction(editingFood._id, payload);
        if (res.success) {
          toast.success("Food item updated successfully!");
          setEditingFood(null);
          fetchData();
        } else {
          toast.error(res.message || "Failed to update food item.");
        }
      } else {
        // Create new
        const payload: Partial<IMenuItem> & { status?: "available" | "unavailable" } = {
          restaurantId: formData.restaurantId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: Number(formData.price),
          discountPrice: Number(formData.discountPrice) || undefined,
          image: formData.image.trim(),
          isAvailable: formData.isAvailable,
          status: formData.isAvailable ? "available" : "unavailable",
          isVegetarian: formData.isVegetarian,
          isSpicy: formData.isSpicy,
          tags: parsedTags,
        };

        const res = await createFoodItem(payload);
        if (res.success) {
          toast.success("New food item added to catalog!");
          setIsAddModalOpen(false);
          fetchData();
        } else {
          toast.error(res.message || "Failed to add food item.");
        }
      }
    } catch {
      toast.error("Error submitting food item.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Food Item
  const handleDeleteConfirm = async () => {
    if (!deletingFood) return;
    setSubmitting(true);
    try {
      const res = await deleteFoodItemAction(deletingFood._id);
      if (res.success) {
        setFoods((prev) => prev.filter((f) => f._id !== deletingFood._id));
        toast.success(`"${deletingFood.name}" removed from catalog.`);
        setDeletingFood(null);
      } else {
        toast.error(res.message || "Failed to delete food item.");
      }
    } catch {
      toast.error("Error deleting food item.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredFoods = useMemo(() => {
    return foods
      .filter((food) => {
        // 1. Search Query
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          food.name?.toLowerCase().includes(q) ||
          food.restaurantName?.toLowerCase().includes(q) ||
          food.category?.toLowerCase().includes(q) ||
          (Array.isArray(food.tags) && food.tags.some((t) => t.toLowerCase().includes(q)));

        // 2. Category Filter
        const matchesCategory =
          categoryFilter === "ALL" ||
          food.category?.toLowerCase() === categoryFilter.toLowerCase();

        // 3. Restaurant Filter
        const matchesRestaurant =
          restaurantFilter === "ALL" ||
          food.restaurantId === restaurantFilter ||
          food.restaurantName?.toLowerCase() === restaurantFilter.toLowerCase();

        // 4. Availability Filter
        const matchesAvailability =
          availabilityFilter === "ALL" ||
          (availabilityFilter === "AVAILABLE" && food.isAvailable !== false) ||
          (availabilityFilter === "UNAVAILABLE" && food.isAvailable === false);

        // 5. Dietary Filter
        let matchesDietary = true;
        if (dietaryFilter === "VEG") matchesDietary = Boolean(food.isVegetarian);
        else if (dietaryFilter === "SPICY") matchesDietary = Boolean(food.isSpicy);
        else if (dietaryFilter === "DISCOUNT")
          matchesDietary = Boolean(food.discountPrice && food.discountPrice < food.price);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesRestaurant &&
          matchesAvailability &&
          matchesDietary
        );
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        // Default newest
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [
    foods,
    searchQuery,
    categoryFilter,
    restaurantFilter,
    availabilityFilter,
    dietaryFilter,
    sortBy,
  ]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalCount = foods.length;
    const availableCount = foods.filter((f) => f.isAvailable !== false).length;
    const discountedCount = foods.filter(
      (f) => f.discountPrice && f.discountPrice < f.price
    ).length;
    const uniqueRestaurants = new Set(foods.map((f) => f.restaurantId).filter(Boolean)).size;

    return {
      totalCount,
      availableCount,
      discountedCount,
      uniqueRestaurants,
    };
  }, [foods]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredFoods.length / ITEMS_PER_PAGE) || 1;
  const paginatedFoods = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFoods.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFoods, currentPage]);

  if (loading) {
    return (
      <div className="min-h-[550px] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 font-semibold text-sm">
          Loading global food items catalog...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 text-gray-800 font-sans">
      {/* ========================================================================= */}
      {/* 🌟 1. HERO HEADER BANNER WITH SIGNATURE FOODFLOW BRAND GRADIENT */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 md:p-8 shadow-xl shadow-orange-500/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white/60 shadow-lg shrink-0 bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="w-9 h-9 text-white drop-shadow" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  Global Food Items Catalog
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30">
                  {stats.totalCount} Total Items
                </span>
              </div>
              <p className="text-white/95 text-sm max-w-xl font-medium">
                Comprehensive overview and control of all food items, pricing, availability & restaurant menu linkages.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/30 transition shadow-sm active:scale-95"
              title="Refresh food items"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={openAddModal}
              className="px-5 py-3 rounded-2xl bg-white text-[#FF6B35] hover:bg-orange-50 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-black/10 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Global Food Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📊 2. METRIC SUMMARY STAT CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Foods */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Menu Items
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {stats.totalCount} Items
            </h3>
            <span className="text-xs font-bold text-[#FF6B35] mt-1 block">
              Across all categories
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Available / In Stock
            </span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats.availableCount} Active
            </h3>
            <span className="text-xs font-bold text-gray-500 mt-1 block">
              {stats.totalCount - stats.availableCount} out of stock
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Discount Deals */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Promotional Deals
            </span>
            <h3 className="text-2xl font-black text-purple-600 mt-1">
              {stats.discountedCount} Deals
            </h3>
            <span className="text-xs font-bold text-purple-600 mt-1 block">
              Special discount prices
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Connected Kitchens */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Connected Kitchens
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {stats.uniqueRestaurants} Partners
            </h3>
            <span className="text-xs font-bold text-gray-500 mt-1 block">
              Offering active menus
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔍 3. ADVANCED SEARCH & MULTI-FILTER BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by food name, restaurant, or tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/20 outline-none text-xs md:text-sm font-medium transition"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-700 bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Restaurant Filter */}
          <div>
            <select
              value={restaurantFilter}
              onChange={(e) => {
                setRestaurantFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-700 bg-white truncate"
            >
              <option value="ALL">All Restaurants</option>
              {restaurants.map((r) => (
                <option key={r._id || r.id} value={r._id || r.id}>
                  {r.restaurantName || r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-700 bg-white"
            >
              <option value="newest">Sort: Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Rating: Highest First</option>
            </select>
          </div>
        </div>

        {/* Secondary Dietary / Status Quick Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
            </span>

            {/* Availability */}
            {[
              { id: "ALL", label: "All Stock" },
              { id: "AVAILABLE", label: "In Stock 🟢" },
              { id: "UNAVAILABLE", label: "Out of Stock 🔴" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setAvailabilityFilter(st.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  availabilityFilter === st.id
                    ? "bg-[#FF6B35] text-white shadow-2xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {st.label}
              </button>
            ))}

            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* Dietary */}
            {[
              { id: "ALL", label: "All Items" },
              { id: "VEG", label: "🥬 Veg Only" },
              { id: "SPICY", label: "🌶️ Spicy" },
              { id: "DISCOUNT", label: "🔥 Discounted" },
            ].map((diet) => (
              <button
                key={diet.id}
                onClick={() => {
                  setDietaryFilter(diet.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  dietaryFilter === diet.id
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {diet.label}
              </button>
            ))}
          </div>

          {(searchQuery ||
            categoryFilter !== "ALL" ||
            restaurantFilter !== "ALL" ||
            availabilityFilter !== "ALL" ||
            dietaryFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("ALL");
                setRestaurantFilter("ALL");
                setAvailabilityFilter("ALL");
                setDietaryFilter("ALL");
                setCurrentPage(1);
              }}
              className="text-xs text-rose-500 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📋 4. MAIN FOOD ITEMS DATA TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 pb-0 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Food Catalog Table
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Showing {paginatedFoods.length} of {filteredFoods.length} items
            </p>
          </div>
        </div>

        {filteredFoods.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B35] mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <h4 className="font-black text-gray-800 text-base">
              No Food Items Matched Your Filter
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Try adjusting your search terms, changing the category, or clicking &quot;Reset Filters&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-extrabold bg-gray-50/50">
                  <th className="py-3.5 px-4">Item Details</th>
                  <th className="py-3.5 px-4">Restaurant Partner</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price & Offers</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedFoods.map((food) => {
                  const hasDiscount = Boolean(
                    food.discountPrice && food.discountPrice < food.price
                  );
                  const isToggling = actionLoadingId === food._id;

                  return (
                    <tr
                      key={food._id}
                      className="hover:bg-orange-50/20 transition group"
                    >
                      {/* Item Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative">
                            {food.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={food.image}
                                alt={food.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <UtensilsCrossed className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-[#FF6B35] transition">
                                {food.name}
                              </h4>
                              {food.isVegetarian && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black"
                                  title="Vegetarian"
                                >
                                  VEG
                                </span>
                              )}
                              {food.isSpicy && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black"
                                  title="Spicy"
                                >
                                  🌶️ SPICY
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-[11px] line-clamp-1 max-w-[200px] mt-0.5">
                              {food.description || "Freshly cooked specialty"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Restaurant Partner */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-[#FF6B35] shrink-0" />
                          <span className="font-bold text-gray-800 truncate max-w-[140px]">
                            {food.restaurantName || "Partner Kitchen"}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-xl text-[11px] font-extrabold bg-gray-100 text-gray-700">
                          {food.category || "General"}
                        </span>
                      </td>

                      {/* Price & Offers */}
                      <td className="py-4 px-4">
                        {hasDiscount ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-[#FF6B35]">
                                ৳{food.discountPrice}
                              </span>
                              <span className="text-[11px] text-gray-400 line-through">
                                ৳{food.price}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 inline-block">
                              {Math.round(
                                ((food.price - (food.discountPrice || 0)) /
                                  food.price) *
                                  100
                              )}
                              % OFF
                            </span>
                          </div>
                        ) : (
                          <span className="font-black text-sm text-gray-900">
                            ৳{food.price}
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{food.rating ? Number(food.rating).toFixed(1) : "5.0"}</span>
                          <span className="text-gray-400 text-[10px]">
                            ({food.reviewCount || 0})
                          </span>
                        </div>
                      </td>

                      {/* Availability Switch */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleAvailability(food)}
                          disabled={isToggling}
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition ${
                            food.isAvailable !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          }`}
                          title="Click to toggle availability"
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                food.isAvailable !== false
                                  ? "bg-emerald-500"
                                  : "bg-rose-500"
                              }`}
                            />
                          )}
                          <span>
                            {food.isAvailable !== false
                              ? "In Stock"
                              : "Out of Stock"}
                          </span>
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingFood(food)}
                            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View full details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => openEditModal(food)}
                            className="p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit food item"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => setDeletingFood(food)}
                            className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete food item"
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-6 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Page {currentPage} of {totalPages} ({filteredFoods.length} total items)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🛑 MODAL 1: ADD / EDIT FOOD ITEM MODAL */}
      {/* ========================================================================= */}
      {(isAddModalOpen || editingFood) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-gray-100 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900">
                    {editingFood ? "Edit Food Item" : "Add New Food Item"}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Configure pricing, restaurant linkage, and dietary flags.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingFood(null);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Food Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Food Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Special Mutton Kacchi Platter"
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs md:text-sm font-bold text-gray-900"
                  />
                </div>

                {/* Restaurant Link (If Creating) */}
                {!editingFood && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Assign to Restaurant <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.restaurantId}
                      onChange={(e) =>
                        setFormData({ ...formData, restaurantId: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-900 bg-white"
                    >
                      {restaurants.map((r) => (
                        <option key={r._id || r.id} value={r._id || r.id}>
                          {r.restaurantName || r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Food Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-bold text-gray-900 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Regular Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Regular Price (৳) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">
                      ৳
                    </span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-black text-gray-900"
                    />
                  </div>
                </div>

                {/* Discount Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Discount Price (৳) (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold">
                      ৳
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={formData.discountPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountPrice: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0 for no discount"
                      className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-black text-[#FF6B35]"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Food Image URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.value })
                      }
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs font-mono text-gray-800"
                    />
                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      {formData.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  {/* Image Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-gray-400">
                      Presets:
                    </span>
                    {SAMPLE_FOOD_IMAGES.slice(0, 4).map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, image: img })}
                        className="w-7 h-7 rounded-lg overflow-hidden border border-gray-200 hover:border-[#FF6B35] opacity-70 hover:opacity-100 transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Description & Ingredients
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Short description of the dish, taste notes, and included sides..."
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-[#FF6B35] outline-none text-xs text-gray-900"
                  />
                </div>

                {/* Dietary Flags */}
                <div className="md:col-span-2 flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isVegetarian}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isVegetarian: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      🥬 Vegetarian Friendly
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isSpicy}
                      onChange={(e) =>
                        setFormData({ ...formData, isSpicy: e.target.checked })
                      }
                      className="w-4 h-4 accent-rose-600 rounded"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      🌶️ Spicy Dish
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isAvailable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#FF6B35] rounded"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      🟢 Available in Stock
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingFood(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-2xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#FF6B35] to-[#FF7843] hover:from-[#e85a26] hover:to-[#FF6B35] text-white font-black text-xs rounded-2xl shadow-md shadow-orange-500/25 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingFood ? "Save Changes" : "Create Food Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👁️ MODAL 2: VIEW FOOD ITEM DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-gray-100 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-orange-50 text-[#FF6B35]">
                {viewingFood.category}
              </span>
              <button
                onClick={() => setViewingFood(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Food Image Banner */}
            <div className="w-full h-44 rounded-2xl overflow-hidden bg-gray-100 relative">
              {viewingFood.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewingFood.image}
                  alt={viewingFood.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <UtensilsCrossed className="w-10 h-10" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">
                  {viewingFood.name}
                </h3>
                <div className="text-right">
                  {viewingFood.discountPrice &&
                  viewingFood.discountPrice < viewingFood.price ? (
                    <div>
                      <span className="text-lg font-black text-[#FF6B35]">
                        ৳{viewingFood.discountPrice}
                      </span>
                      <span className="text-xs text-gray-400 line-through ml-1.5">
                        ৳{viewingFood.price}
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-black text-gray-900">
                      ৳{viewingFood.price}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {viewingFood.description ||
                  "Freshly prepared food crafted with high culinary quality standards."}
              </p>
            </div>

            {/* Restaurant Badge & Rating */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#FF6B35]" />
                <span className="font-extrabold text-gray-900">
                  {viewingFood.restaurantName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>
                  {viewingFood.rating ? Number(viewingFood.rating).toFixed(1) : "5.0"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setViewingFood(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-2xl transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🛑 MODAL 3: DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-gray-100 shadow-2xl space-y-5 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">
                Delete Food Item?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to permanently delete &quot;
                <strong className="text-gray-800">{deletingFood.name}</strong>&quot; from the catalog?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFood(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-2xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-2xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
