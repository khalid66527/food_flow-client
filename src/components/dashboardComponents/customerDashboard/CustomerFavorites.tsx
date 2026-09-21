"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShoppingBag,
  Store,
  Star,
  Trash2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Clock,
  Sparkles,
  UtensilsCrossed,
  RefreshCw,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/contexts/CartContext";
import { getUserFavoritesApi, removeFavoriteApi } from "@/lib/api/favorite";
import { TFavoriteItem } from "@/types/favorite";
import { IGlobalFoodItem } from "@/types/restaurant";
import { toast } from "react-toastify";

export default function CustomerFavorites() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
  const userId = user?.id;
  const userEmail = user?.email;

  const { addItem, canAddToCart } = useCart();

  const [favorites, setFavorites] = useState<TFavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedCartIds, setAddedCartIds] = useState<Record<string, boolean>>({});

  // Fetch user favorites
  const fetchFavorites = async (isRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getUserFavoritesApi(userId, userEmail);
      if (res.success) {
        setFavorites(res.data || []);
      } else {
        toast.error(res.message || "Failed to load favorites.");
      }
    } catch {
      toast.error("Network error while loading favorites.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!sessionPending) {
      if (userId) {
        fetchFavorites();
      } else {
        setLoading(false);
      }
    }
  }, [userId, userEmail, sessionPending]);

  // Remove item from favorites
  const handleRemoveFavorite = async (foodId: string, foodName: string) => {
    if (!userId) return;
    setRemovingId(foodId);

    try {
      const res = await removeFavoriteApi(foodId, userId, userEmail);
      if (res.success) {
        setFavorites((prev) => prev.filter((f) => f.foodId !== foodId));
        toast.info(`Removed "${foodName}" from favorites.`);
      } else {
        toast.error(res.message || "Failed to remove favorite.");
      }
    } catch {
      toast.error("Failed to remove favorite.");
    } finally {
      setRemovingId(null);
    }
  };

  // Quick Add to Cart
  const handleAddToCart = (item: TFavoriteItem) => {
    const foodItemPayload = {
      _id: item.foodId,
      name: item.name,
      description: item.description || "",
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.image,
      images: item.images || [item.image],
      category: item.category,
      restaurantId: item.restaurantId || "default-restaurant",
      restaurantName: item.restaurantName || "Food Flow Partner",
      status: item.status || "available",
      isAvailable: item.isAvailable !== false,
      rating: item.rating ?? 4.5,
    } as unknown as IGlobalFoodItem;

    addItem(foodItemPayload);
    setAddedCartIds((prev) => ({ ...prev, [item.foodId]: true }));
    toast.success(`"${item.name}" added to cart! 🛒`);

    setTimeout(() => {
      setAddedCartIds((prev) => ({ ...prev, [item.foodId]: false }));
    }, 2000);
  };

  // Categories list derived from favorites
  const categories = useMemo(() => {
    const cats = new Set<string>(["All"]);
    favorites.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [favorites]);

  // Filtered favorites
  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [favorites, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Hero Header Banner (Signature Bright Orange Theme) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -translate-x-8 translate-y-8 w-48 h-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md border border-white/25">
              <Heart className="w-3.5 h-3.5 fill-white text-white" />
              <span>Saved Food Items</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              My Favorite Dishes
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm max-w-xl">
              Quickly reorder your beloved dishes, explore chef specials, and keep track of everything you love eating on Food Flow.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchFavorites(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-extrabold text-xs backdrop-blur-md border border-white/20 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-[#FF6B35] font-extrabold text-xs shadow-lg hover:bg-orange-50 active:scale-95 transition cursor-pointer"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Explore More Dishes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search favorite dishes or restaurants..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#FF6B35] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Favorite Dishes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-gray-100 p-4 space-y-3 animate-pulse shadow-xs"
            >
              <div className="h-44 bg-gray-200 rounded-2xl w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shadow-inner">
            <Heart className="w-10 h-10 text-[#FF6B35] fill-orange-200 stroke-[1.5]" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
              {searchQuery || selectedCategory !== "All"
                ? "No matching favorites found"
                : "No Favorite Dishes Saved Yet"}
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm">
              {searchQuery || selectedCategory !== "All"
                ? "Try searching for a different dish name or reset category filters."
                : "Browse our delicious menu, click the heart icon on any food item to save it here for instant ordering."}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Dishes & Restaurants</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFavorites.map((item) => {
            const hasDiscount =
              item.discountPrice !== undefined &&
              item.discountPrice !== null &&
              item.discountPrice < item.price;
            const currentPrice = hasDiscount ? item.discountPrice! : item.price;
            const isRemoving = removingId === item.foodId;
            const isAdded = addedCartIds[item.foodId];

            return (
              <div
                key={item.foodId || item._id}
                className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-48 w-full overflow-hidden bg-gray-50">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-extrabold text-white border border-white/20">
                      {item.category}
                    </span>

                    {/* Discount Badge */}
                    {hasDiscount && (
                      <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-[#FF6B35] text-[11px] font-black text-white shadow-md">
                        Save ৳{(item.price - item.discountPrice!).toFixed(0)}
                      </span>
                    )}

                    {/* Remove from Favorite Button */}
                    <button
                      onClick={() => handleRemoveFavorite(item.foodId, item.name)}
                      disabled={isRemoving}
                      title="Remove from favorites"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-rose-500 hover:text-rose-600 flex items-center justify-center backdrop-blur-md shadow-md active:scale-90 transition cursor-pointer border border-white/40"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    {/* Restaurant Link */}
                    <Link
                      href={`/restaurants/${item.restaurantId}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-[#FF6B35] transition"
                    >
                      <Store className="w-3.5 h-3.5 text-[#FF6B35]" />
                      <span className="truncate max-w-[180px]">
                        {item.restaurantName}
                      </span>
                    </Link>

                    {/* Dish Title */}
                    <Link
                      href={`/dashboard/customer/food-details?id=${item.foodId}`}
                      className="block font-extrabold text-gray-900 text-sm hover:text-[#FF6B35] transition line-clamp-1"
                    >
                      {item.name}
                    </Link>

                    {/* Rating & Prep Time */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{item.rating ? Number(item.rating).toFixed(1) : "4.8"}</span>
                      </div>

                      {item.prepTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{item.prepTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & Add to Cart Action */}
                <div className="p-4 pt-0 border-t border-gray-50 mt-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-black text-gray-900">
                      ৳{currentPrice.toFixed(0)}
                    </div>
                    {hasDiscount && (
                      <div className="text-[11px] text-gray-400 line-through">
                        ৳{item.price.toFixed(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/dashboard/customer/food-details?id=${item.foodId}`}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition"
                      title="View Dish Details"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition cursor-pointer ${
                        isAdded
                          ? "bg-emerald-500 text-white"
                          : "bg-[#FF6B35] hover:bg-[#ff7b49] text-white"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
