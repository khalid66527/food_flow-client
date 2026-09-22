"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  ArrowLeft,
  ShoppingBag,
  Zap,
  Check,
  CheckCircle2,
  Flame,
  Leaf,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Share2,
  Heart,
  Sparkles,
  UtensilsCrossed,
  Pizza,
  Layers,
  Soup,
  Drumstick,
  IceCream,
  Coffee,
  Sliders,
  ShieldCheck,
  Truck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Percent,
  Loader2,
  ExternalLink,
  Store,
  ChefHat,
  BadgePercent,
  Play,
  Pause,
  Lock,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "@/lib/auth-client";
import { IGlobalFoodItem } from "@/types/restaurant";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import { getFoodReviewsApi, IReviewSummary } from "@/lib/api/review";
import { toggleFavoriteApi, checkIsFavoriteApi } from "@/lib/api/favorite";
import { toast } from "react-toastify";

interface FoodDetailsProps {
  foodId?: string;
}

// Fallback high-quality food data matching user schema
const DEFAULT_FOOD_DATA = {
  _id: "6a8e9fe3df21c67ff05b84f2",
  id: "6a8e9fe3df21c67ff05b84f2",
  restaurantId: "6a8e9fe3df21c67ff05b84f2",
  name: "Truffle Pepperoni Gourmet Pizza",
  description:
    "Handcrafted artisanal pizza baked to crispy perfection in a stone hearth oven. Layered with rich San Marzano tomato marinara, melted Italian mozzarella & aged parmesan blend, savory pepperoni, and drizzled with fragrant black truffle oil.",
  price: 120,
  discountPrice: 100,
  category: "Pizza",
  image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
  images: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
  ],
  status: "available",
  isAvailable: true,
  isVegetarian: false,
  isSpicy: false,
  tags: ["Pizza", "Chef Special", "Stone Oven Baked", "Best Seller"],
  ingredients: [
    "Italian Tipo 00 Flour",
    "San Marzano Tomatoes",
    "Fresh Mozzarella",
    "Aged Parmesan",
    "Smoked Beef Pepperoni",
    "Black Truffle Glaze",
    "Fresh Basil",
  ],
  categoryDetails: {
    crustType: "Thin Italian Crust",
    pizzaSize: "12 Inch (Medium - 6 Slices)",
    sauceBase: "San Marzano Tomato Marinara",
    cheeseType: "Mozzarella & Parmesan Blend",
    sliceCount: "6 Slices",
  },
  createdAt: "2026-08-26T15:45:31.384Z",
  updatedAt: "2026-08-26T15:45:31.384Z",
};

export default function FoodDetails({ foodId }: FoodDetailsProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { addItem, canAddToCart } = useCart();

  const targetId =
    foodId ||
    (params?.id as string) ||
    searchParams.get("id") ||
    searchParams.get("foodId") ||
    "";

  const { data: session } = useSession();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;
  const userId = user?.id;
  const userEmail = user?.email;

  const [loading, setLoading] = useState<boolean>(true);
  const [food, setFood] = useState<any>(DEFAULT_FOOD_DATA);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [reviewsData, setReviewsData] = useState<IReviewSummary | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [addedToast, setAddedToast] = useState<boolean>(false);

  // Check initial favorite status for current logged-in user
  useEffect(() => {
    let isSubscribed = true;
    if (targetId && userId) {
      checkIsFavoriteApi(targetId, userId, userEmail)
        .then((res) => {
          if (isSubscribed && res.success) {
            setIsLiked(res.isFavorite);
          }
        })
        .catch(() => {});
    }
    return () => {
      isSubscribed = false;
    };
  }, [targetId, userId, userEmail]);

  const handleToggleFavorite = async () => {
    if (!userId) {
      toast.info("Please log in to add dishes to your favorites!");
      router.push(`/auth/login?callbackUrl=/dashboard/customer/food-details?id=${targetId}`);
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await toggleFavoriteApi(targetId, userId, userEmail);
      if (res.success) {
        const nextState = !!res.isFavorite;
        setIsLiked(nextState);
        if (nextState) {
          toast.success("Added to your favorites! ❤️");
        } else {
          toast.info("Removed from your favorites.");
        }
      } else {
        toast.error(res.message || "Failed to update favorites");
      }
    } catch {
      toast.error("An error occurred while updating favorites.");
    } finally {
      setIsLiking(false);
    }
  };

  // Initialize and refresh AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: false,
      offset: 30,
    });
    AOS.refresh();
  }, []);

  // Fetch food item and restaurant info
  useEffect(() => {
    let isMounted = true;
    const SERVER_BASE_URL = (
      process.env.NEXT_PUBLIC_SERVER_API_URL ||
      process.env.NEXT_PUBLIC_SERVER_URL ||
      "http://localhost:5000"
    ).replace(/\/api\/?$/, "").replace(/\/$/, "");

    const API_BASE_URL = `${SERVER_BASE_URL}/api`;

    async function loadDetails() {
      if (!targetId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Try single food details endpoint with restaurant populated
        const res = await fetch(`${API_BASE_URL}/restaurants/food/item/${targetId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (isMounted) {
              setFood(json.data);
              if (json.data.restaurant) {
                setRestaurant(json.data.restaurant);
              } else if (json.data.restaurantId) {
                fetchRestaurant(json.data.restaurantId);
              }
            }
          }
        } else {
          // 2. If targetId is restaurant ID, check restaurant endpoint
          const restRes = await fetch(`${API_BASE_URL}/restaurants/${targetId}`);
          if (restRes.ok) {
            const restJson = await restRes.json();
            if (restJson.success && restJson.data && isMounted) {
              setRestaurant(restJson.data);
              if (Array.isArray(restJson.data.menu) && restJson.data.menu.length > 0) {
                setFood(restJson.data.menu[0]);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Using default food preview state:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => AOS.refresh(), 100);
        }
      }

      // Unconditionally fetch real-time food reviews for targetId
      if (targetId) {
        getFoodReviewsApi(targetId).then((revRes) => {
          if (revRes.success && revRes.data && isMounted) {
            setReviewsData(revRes.data);
          }
        }).catch(() => {});
      }
    }

    async function fetchRestaurant(restId: string) {
      try {
        const res = await fetch(`${API_BASE_URL}/restaurants/${restId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            setRestaurant(json.data);
            setTimeout(() => AOS.refresh(), 100);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [targetId]);

  // Restaurant name: the single-food endpoint returns the joined restaurant doc,
  // while the listing endpoint puts the name directly on the food item. Use
  // whichever we actually have — never a stand-in for a different restaurant.
  const restaurantName: string =
    restaurant?.restaurantName || restaurant?.name || food?.restaurantName || "";

  // Gallery Photos Resolution
  const photosList: string[] =
    food?.images && Array.isArray(food.images) && food.images.length > 0
      ? food.images
      : food?.image
        ? [food.image]
        : DEFAULT_FOOD_DATA.images;

  // 🔄 Automatic Photo Cycling Animation (Changes photo every 3.5 seconds)
  useEffect(() => {
    if (photosList.length <= 1 || isAutoPlayPaused) return;

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % photosList.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [photosList.length, isAutoPlayPaused]);

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % photosList.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
  };

  const currentPhoto = photosList[activeImageIndex] || photosList[0];

  // Pricing calculations
  const originalPrice = Number(food?.price || 0);
  const discountPrice = food?.discountPrice ? Number(food.discountPrice) : null;
  const unitEffectivePrice = discountPrice !== null && discountPrice < originalPrice ? discountPrice : originalPrice;
  const totalPrice = unitEffectivePrice * quantity;
  const discountPercent =
    discountPrice !== null && originalPrice > 0
      ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
      : 0;

  // Category Icon Resolver
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Pizza":
        return <Pizza className="w-4 h-4 text-[#FF6B35]" />;
      case "Burger":
        return <Layers className="w-4 h-4 text-[#FF6B35]" />;
      case "Biryani":
        return <Soup className="w-4 h-4 text-[#FF6B35]" />;
      case "Pasta":
        return <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />;
      case "BBQ & Grill":
        return <Drumstick className="w-4 h-4 text-[#FF6B35]" />;
      case "Desserts":
        return <IceCream className="w-4 h-4 text-[#FF6B35]" />;
      case "Drinks":
        return <Coffee className="w-4 h-4 text-[#FF6B35]" />;
      default:
        return <Sliders className="w-4 h-4 text-[#FF6B35]" />;
    }
  };

  // Convert current food to Cart Global Food Item
  const getCartFoodItem = (): IGlobalFoodItem => {
    return {
      _id: String(food._id || food.id || targetId),
      restaurantId: String(food.restaurantId || restaurant?._id || ""),
      restaurantName: restaurantName || "Restaurant",
      restaurantSlug: restaurant?.slug || "restaurant",
      restaurantLogo: restaurant?.logo || "",
      restaurantIsOpen: restaurant?.isOpen !== false,
      restaurantRating: Number(restaurant?.rating || 4.8),
      restaurantReviewCount: Number(restaurant?.reviewCount || 142),
      name: food.name,
      category: food.category,
      price: originalPrice,
      discountPrice: discountPrice || undefined,
      image: currentPhoto || food.image || "",
      images: photosList,
      description: food.description || "",
      status: food.status || "available",
      isAvailable: food.isAvailable !== false && food.status !== "unavailable",
      isVegetarian: Boolean(food.isVegetarian),
      isSpicy: Boolean(food.isSpicy),
      tags: food.tags,
      ingredients: food.ingredients,
      categoryDetails: food.categoryDetails,
    };
  };

  // Button 1: Add to Cart Action
  const handleAddToCart = () => {
    if (!canAddToCart) return;
    const item = getCartFoodItem();
    addItem(item, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  // Button 2: Instant Order Now / Direct Checkout Action (Single Item Buy Now)
  const handleOrderNow = () => {
    if (!canAddToCart) return;
    const item = getCartFoodItem();
    const buyNowPayload = {
      foodItem: item,
      quantity,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("foodflow_buy_now_item", JSON.stringify(buyNowPayload));
    }
    router.push("/dashboard/customer/checkout?buyNow=true");
  };

  // Render Dynamic Category Specifications matching AddFoodForm.tsx
  const renderCategorySpecifications = () => {
    const details = food.categoryDetails || {};
    const cat = food.category || "General";

    if (!details || Object.keys(details).length === 0) {
      return null;
    }

    return (
      <div
        data-aos="zoom-in"
        data-aos-delay="200"
        className="rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 border border-orange-200/80 p-4 sm:p-5 space-y-3 shadow-xs"
      >
        <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-orange-100/80 text-[#FF6B35] flex items-center justify-center">
              {getCategoryIcon(cat)}
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 tracking-wide uppercase">
                {cat} Recipe Specifications
              </h4>
              <span className="text-[10px] text-gray-400 font-medium">
                Chef & Kitchen Pre-configured Recipe
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#FF6B35] bg-orange-100/90 border border-orange-200/80 px-2 py-0.5 rounded-md">
            {cat} Specialty
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.entries(details).map(([key, val]) => {
            if (!val) return null;
            const label = key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase());

            return (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-orange-100 shadow-2xs hover:border-[#FF6B35]/40 transition-colors"
              >
                <span className="text-[11px] font-bold text-gray-500">{label}:</span>
                <span className="text-[11px] font-black text-gray-900 text-right">
                  {String(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center">
        <LoadingSpinner size={50} color="#f97316" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 overflow-hidden">

      {/* 🟠 THEMATIC HEADER SECTION with AOS (fade-down) */}
      <section
        data-aos="fade-down"
        data-aos-duration="600"
        className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Left Header Title & Breadcrumb */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-100">
                <Link href="/restaurants" className="hover:text-white transition flex items-center gap-1">
                  <span>Explore Dishes</span>
                </Link>
                <span>/</span>
                <span className="text-white font-bold truncate max-w-[200px]">{food.name}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <span>{food.name}</span>
                <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/30 text-white">
                  {food.category}
                </span>
              </h1>
              <p className="text-orange-100 text-xs sm:text-sm max-w-xl line-clamp-1 font-medium">
                Prepared with culinary excellence by {restaurantName || "Kitchen"}
              </p>
            </div>

            {/* Right Quick Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3.5 py-2 text-white text-xs font-bold shadow-xs">
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                <span>{restaurant?.pricing?.estimatedDeliveryTime || "25-35 mins"}</span>
              </div>

              <button
                type="button"
                onClick={() => router.push("/restaurants")}
                className="inline-flex items-center gap-1.5 bg-white text-gray-800 hover:text-[#FF6B35] text-xs font-black px-4 py-2 rounded-xl shadow-xs transition cursor-pointer hover:shadow-md hover:scale-102 active:scale-98"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dishes</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 🍱 MAIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ======================================================= */}
        {/* 🍱 MAIN PRODUCT GRID: GALLERY & FOOD INFORMATION        */}
        {/* ======================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* 📸 LEFT COLUMN (6 COLS): MULTI-IMAGE SPOTLIGHT GALLERY with AOS (fade-right) */}
          <div
            data-aos="fade-right"
            data-aos-duration="700"
            className="lg:col-span-6 space-y-4"
          >

            {/* Main Spotlight Photo with Auto-Cycle Animation */}
            <div
              onMouseEnter={() => setIsAutoPlayPaused(true)}
              onMouseLeave={() => setIsAutoPlayPaused(false)}
              className="relative rounded-3xl overflow-hidden aspect-4/3 sm:aspect-16/11 bg-gray-950 shadow-xl border border-orange-100/90 group select-none"
            >
              {/* Framer Motion Animated Image Transition */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageIndex}
                  src={currentPhoto}
                  alt={food.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Badges on Top Left of Photo */}
              <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2 z-10">
                <span className="bg-black/75 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-xl shadow-xs flex items-center gap-1.5 border border-white/10">
                  {getCategoryIcon(food.category)}
                  <span>{food.category}</span>
                </span>

                {discountPercent > 0 && (
                  <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white text-[11px] font-black px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-white/20 animate-pulse">
                    <BadgePercent className="w-3.5 h-3.5" />
                    <span>{discountPercent}% OFF</span>
                  </span>
                )}
              </div>

              {/* Stock Availability & Diet Badges Top Right */}
              <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1.5 z-10">
                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-xl backdrop-blur-md shadow-md flex items-center gap-1.5 ${food.status === "available" || food.isAvailable !== false
                      ? "bg-emerald-500/90 text-white"
                      : "bg-rose-500/90 text-white"
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>{food.status === "available" || food.isAvailable !== false ? "In Stock" : "Out of Stock"}</span>
                </span>

                {food.isVegetarian && (
                  <span className="bg-emerald-600/90 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg backdrop-blur-md shadow-xs flex items-center gap-1">
                    <Leaf className="w-3 h-3" /> Veg
                  </span>
                )}

                {food.isSpicy && (
                  <span className="bg-rose-600/90 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg backdrop-blur-md shadow-xs flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Spicy Hot 🔥
                  </span>
                )}
              </div>

              {/* Left / Right Carousel Controls on Hover */}
              {photosList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 shadow-md"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110 shadow-md"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Bottom Carousel Progress Dots & Auto-cycle Pill */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
                {/* Dots indicator */}
                {photosList.length > 1 ? (
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full pointer-events-auto">
                    {photosList.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => setActiveImageIndex(dotIdx)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeImageIndex === dotIdx ? "w-5 bg-[#FF6B35]" : "w-1.5 bg-white/50 hover:bg-white"
                          }`}
                      />
                    ))}
                  </div>
                ) : (
                  <div />
                )}

                {/* Photo Counter Tag */}
                {photosList.length > 1 && (
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 pointer-events-auto">
                    {isAutoPlayPaused ? <Pause className="w-2.5 h-2.5 text-amber-300" /> : <Play className="w-2.5 h-2.5 text-emerald-300 animate-pulse" />}
                    <span>
                      Photo {activeImageIndex + 1} of {photosList.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Clickable Multi-Photo Thumbnails */}
            {photosList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1.5">
                {photosList.map((thumbUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-16 sm:w-24 sm:h-18 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer shadow-xs ${activeImageIndex === idx
                        ? "border-[#FF6B35] ring-2 ring-orange-500/40 scale-105 shadow-md"
                        : "border-orange-100 opacity-60 hover:opacity-100 hover:border-orange-300 bg-white"
                      }`}
                  >
                    <img src={thumbUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-[#FF6B35] text-white text-[7px] font-black px-1 rounded shadow-2xs">
                        Cover
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Guarantee Badges with AOS staggered delay */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div
                data-aos="fade-up"
                data-aos-delay="100"
                className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-orange-100/90 shadow-2xs hover:shadow-sm transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block leading-tight">Fresh Prep</span>
                  <span className="text-[9px] text-gray-400">Made to order</span>
                </div>
              </div>

              <div
                data-aos="fade-up"
                data-aos-delay="200"
                className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-orange-100/90 shadow-2xs hover:shadow-sm transition-all"
              >
                <Truck className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block leading-tight">Fast Delivery</span>
                  <span className="text-[9px] text-gray-400">{restaurant?.pricing?.estimatedDeliveryTime || "30 mins"}</span>
                </div>
              </div>

              <div
                data-aos="fade-up"
                data-aos-delay="300"
                className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-orange-100/90 shadow-2xs hover:shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block leading-tight">Top Quality</span>
                  <span className="text-[9px] text-gray-400">Artisan recipe</span>
                </div>
              </div>
            </div>

          </div>

          {/* 📋 RIGHT COLUMN (6 COLS): FOOD DETAILS, DYNAMIC SPECS & 2 ACTION BUTTONS with AOS (fade-left) */}
          <div
            data-aos="fade-left"
            data-aos-duration="700"
            className="lg:col-span-6 space-y-6"
          >

            {/* Header & Restaurant Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/restaurants/${restaurant?._id || restaurant?.id || food.restaurantId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200/60 transition-all hover:bg-orange-100"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{restaurantName || "Kitchen"}</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>
                      {reviewsData?.avgRating ? reviewsData.avgRating.toFixed(1) : food?.rating ? Number(food.rating).toFixed(1) : "New"}
                    </span>
                    <span className="text-gray-500 font-bold text-[11px]">
                      ({reviewsData?.totalReviews ?? food?.reviewCount ?? 0} {((reviewsData?.totalReviews ?? food?.reviewCount ?? 0) === 1) ? "review" : "reviews"})
                    </span>
                  </div>

                  {/* Favorite Like button */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={isLiking}
                    className={`p-2 rounded-xl border transition-all duration-300 shadow-xs cursor-pointer active:scale-95 ${
                      isLiked
                        ? "bg-rose-50 border-rose-200 text-rose-500 shadow-rose-100"
                        : "bg-white border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50"
                    } ${isLiking ? "opacity-70 cursor-wait" : ""}`}
                    title={isLiked ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {food.name}
              </h2>
            </div>

            {/* Pricing Row */}
            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="flex items-baseline gap-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white border border-orange-200/80 shadow-2xs"
            >
              {discountPrice !== null && discountPrice < originalPrice ? (
                <>
                  <span className="text-3xl sm:text-4xl font-black text-[#FF6B35]">
                    Tk {discountPrice.toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-gray-400 line-through">
                    Tk {originalPrice.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg ml-auto">
                    Save Tk {(originalPrice - discountPrice).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-[#FF6B35]">
                  Tk {originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Appetizing Description */}
            <div
              data-aos="fade-up"
              data-aos-delay="150"
              className="space-y-1.5 bg-white p-4 rounded-2xl border border-orange-100/80 shadow-2xs"
            >
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>About This Dish</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                {food.description || "Freshly made with wholesome ingredients and authentic culinary technique."}
              </p>
            </div>

            {/* 🍕 Dynamic Category-Specific Specifications Card */}
            {renderCategorySpecifications()}

            {/* 🌿 Key Ingredients */}
            {food.ingredients && food.ingredients.length > 0 && (
              <div data-aos="fade-up" data-aos-delay="250" className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Key Ingredients
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {food.ingredients.map((ing: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-white border border-orange-100 text-gray-800 text-xs font-semibold shadow-2xs hover:border-[#FF6B35]/50 transition-colors"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 🏷️ Tags */}
            {food.tags && food.tags.length > 0 && (
              <div data-aos="fade-up" data-aos-delay="300" className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Tags & Flavors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {food.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-orange-50 border border-orange-200/70 text-[#FF6B35] text-[11px] font-bold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* 🛒 QUANTITY & 2 ACTION BUTTONS (ADD TO CART + ORDER NOW) */}
            {/* ======================================================= */}
            <div data-aos="fade-up" data-aos-delay="350" className="pt-2 space-y-4">

              {/* Quantity Selector & Live Total Price */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Select Quantity
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    Subtotal: <strong className="text-gray-900 font-black text-sm">Tk {totalPrice.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-orange-50/80 p-1.5 rounded-2xl border border-orange-200/80">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-orange-100 text-gray-700 hover:text-[#FF6B35] font-bold flex items-center justify-center shadow-xs transition cursor-pointer"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-gray-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-orange-100 text-gray-700 hover:text-[#FF6B35] font-bold flex items-center justify-center shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Added to Cart Feedback Toast */}
              {addedToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Added {quantity}x &ldquo;{food.name}&rdquo; to your Cart!</span>
                  </div>
                  <Link
                    href="/dashboard/customer/cart"
                    className="text-emerald-700 underline text-[11px] font-black"
                  >
                    View Cart
                  </Link>
                </div>
              )}

              {/* 2 ACTION BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">

                {/* BUTTON 1: Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={food.status === "unavailable" || food.isAvailable === false || !canAddToCart}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-105 text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-101 active:scale-99"
                >
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <span>Add to Cart (Tk {totalPrice.toFixed(2)})</span>
                </button>

                {/* BUTTON 2: Instant Order Now */}
                <button
                  type="button"
                  onClick={handleOrderNow}
                  disabled={food.status === "unavailable" || food.isAvailable === false || !canAddToCart}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-gray-900/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-101 active:scale-99"
                >
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Order Now (Fast Checkout)</span>
                </button>

              </div>

              {!canAddToCart && (
                <p className="mt-3 text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  Only customer accounts can add items to the cart.
                </p>
              )}

            </div>

          </div>

        </div>

        {/* 🌟 CUSTOMER RATINGS & REVIEWS SECTION */}
        <div
          data-aos="fade-up"
          className="bg-white rounded-3xl border border-orange-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-orange-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Customer Feedback
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Customer Ratings & Reviews
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="flex items-center gap-1 text-2xl font-extrabold text-gray-900">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  <span>{reviewsData?.avgRating ? reviewsData.avgRating.toFixed(1) : (food?.rating || 4.9)}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {reviewsData?.totalReviews || food?.reviewCount || 0} Total Reviews
                </span>
              </div>
            </div>
          </div>

          {/* List of Dish Reviews */}
          {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsData.reviews.map((rev, idx) => (
                <div
                  key={rev._id || idx}
                  className="p-5 rounded-2xl bg-[#FFFDF8] border border-orange-100 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs">
                        {(rev.userName || "C")[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">
                          {rev.userName || "Verified Customer"}
                        </h4>
                        <span className="text-[10px] text-gray-400">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full text-amber-600 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rev.rating} / 5</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 italic bg-white p-3 rounded-xl border border-orange-100/60">
                    "{rev.comment || "Extremely delicious and fresh!"}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <Star className="w-8 h-8 text-amber-300 mx-auto opacity-50" />
              <p className="text-sm font-bold text-gray-600">No Customer Reviews Yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Be the first to rate and review this recipe after your next delivery!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
