"use client";

import React, { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Store,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AOS from "aos";
import { useSession } from "@/lib/auth-client";
import {
  getMyRestaurantProfile,
  getRestaurantMenuItems,
  IRestaurant,
} from "@/lib/api/restaurant";
import { IMenuItem } from "@/types/restaurant";

const RestaurantMenu = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [items, setItems] = useState<IMenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    AOS.refresh();
  }, []);

  /* ---------------------------------------------------------- */
  /* Resolve logged-in owner's restaurant profile               */
  /* ---------------------------------------------------------- */
  useEffect(() => {
    let isMounted = true;

    const resolveRestaurant = async () => {
      const cached =
        typeof window !== "undefined"
          ? localStorage.getItem("foodflow_restaurant_data")
          : null;

      if (cached) {
        try {
          if (isMounted) setRestaurant(JSON.parse(cached));
        } catch {
          // ignore malformed cache
        }
      }

      if (!user?.email && !cached) {
        if (isMounted) setProfileLoading(false);
        return;
      }

      try {
        const res = await getMyRestaurantProfile(user?.email || "", user?.id || "");
        if (!isMounted) return;
        if (res.success && res.data) {
          setRestaurant(res.data);
          localStorage.setItem("foodflow_restaurant_data", JSON.stringify(res.data));
        } else if (!cached) {
          setRestaurant(null);
        }
      } catch {
        // keep cached value (if any) on network failure
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    resolveRestaurant();
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.id]);

  /* ---------------------------------------------------------- */
  /* Fetch menu items whenever the resolved restaurant changes  */
  /* ---------------------------------------------------------- */
  const restaurantId = restaurant?._id || restaurant?.id || "";

  useEffect(() => {
    if (!restaurantId) return;
    let isMounted = true;

    const loadItems = async () => {
      setErrorMsg(null);
      setItemsLoading(true);
      try {
        const res = await getRestaurantMenuItems(restaurantId);
        if (!isMounted) return;
        if (res.success) {
          setItems(res.data || []);
        } else {
          setErrorMsg(res.message || "Failed to load your menu items.");
          setItems([]);
        }
      } finally {
        if (isMounted) setItemsLoading(false);
      }
    };

    loadItems();
    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const availableCount = items.filter((item) => item.isAvailable).length;

  const formatPrice = (price: number) =>
    `$${Number(price || 0).toFixed(2)}`;

  /* ---------------------------------------------------------- */
  /* Loading state while resolving owner's restaurant profile   */
  /* ---------------------------------------------------------- */
  if (profileLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading your restaurant profile...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* Empty state: no restaurant profile found                   */
  /* ---------------------------------------------------------- */
  if (!restaurant) {
    return (
      <div className="w-full max-w-6xl mx-auto" data-aos="fade-up">
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-10 sm:p-14 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Store className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
            No Restaurant Profile Found
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            You need an active restaurant profile before you can manage your food menu.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/restaurant/create-restaurant")}
            className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
          >
            <span>Create Your Restaurant First</span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* Main Menu Page                                              */
  /* ---------------------------------------------------------- */
  return (
    <div className="w-full max-w-6xl mx-auto" data-aos="fade-up">
      {/* Header */}
      <div
        data-aos="zoom-in"
        data-aos-duration="600"
        className="bg-gradient-to-r from-orange-500 via-[#FF6B35] to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 mb-8 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Menu Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {restaurant.restaurantName}&apos;s Menu
            </h1>
            <p className="text-orange-100 text-sm">
              {itemsLoading
                ? "Loading your food items..."
                : `${items.length} item${items.length === 1 ? "" : "s"} on your menu · ${availableCount} available`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              disabled={itemsLoading}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition backdrop-blur-md border border-white/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${itemsLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/restaurant/add-food")}
              className="px-5 py-2.5 rounded-xl bg-white text-[#FF6B35] text-xs font-bold flex items-center gap-1.5 hover:bg-orange-50 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Content */}
      {itemsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
          <p className="text-sm font-medium text-gray-500">Fetching menu items...</p>
        </div>
      ) : items.length === 0 && !errorMsg ? (
        /* Empty Menu State */
        <div
          className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-10 sm:p-14 flex flex-col items-center justify-center text-center gap-5"
          data-aos="fade-up"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
            Your Menu is Empty
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            Start building your menu by adding your first food item. It will appear here instantly
            for customers to see.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/restaurant/add-food")}
            className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Food Item</span>
          </button>
        </div>
      ) : (
        /* Items Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-aos="fade-up">
          {items.map((item) => (
            <div
              key={item._id}
              className="group bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
                    <UtensilsCrossed className="w-10 h-10 text-orange-300" />
                  </div>
                )}
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                    item.isAvailable
                      ? "bg-emerald-500/90 text-white"
                      : "bg-rose-500/90 text-white"
                  }`}
                >
                  {item.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-black tracking-tight text-gray-900 leading-snug line-clamp-1">
                    {item.name}
                  </h3>
                  <div className="text-right whitespace-nowrap">
                    {item.discountPrice ? (
                      <>
                        <span className="text-sm font-black text-[#FF6B35]">
                          {formatPrice(item.discountPrice)}
                        </span>
                        <span className="block text-[11px] text-gray-400 line-through">
                          {formatPrice(item.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-black text-[#FF6B35]">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                )}

                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                    {item.category || "General"}
                  </span>
                  {item.isVegetarian && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                      Veg
                    </span>
                  )}
                  {item.isSpicy && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[10px] font-bold uppercase tracking-wide">
                      Spicy
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
