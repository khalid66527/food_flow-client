"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Sparkles,
  Bike,
  Store,
  UtensilsCrossed,
  X,
  CheckCircle2,
  Loader2,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { TOrder } from "@/types/order";
import { submitOrderReviewApi, IReviewItemPayload } from "@/lib/api/review";

interface PostDeliveryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: TOrder;
  userId: string;
  userName?: string;
  userEmail?: string;
  onSuccess?: () => void;
}

interface RatingState {
  rating: number;
  hover: number;
  comment: string;
}

export default function PostDeliveryReviewModal({
  isOpen,
  onClose,
  order,
  userId,
  userName,
  userEmail,
  onSuccess,
}: PostDeliveryReviewModalProps) {
  const riderId = order?.riderInfo?.riderId;
  const riderName = order?.riderInfo?.name || "Delivery Partner";
  
  // Restaurant ID and Name from items or order
  const restaurantId = order?.items?.[0]?.restaurantId || "default_restaurant";
  const restaurantName = order?.items?.[0]?.restaurantName || "Restaurant";

  // State for Rider rating
  const [riderRating, setRiderRating] = useState<RatingState>({
    rating: 5,
    hover: 0,
    comment: "",
  });

  // State for Restaurant rating
  const [restaurantRating, setRestaurantRating] = useState<RatingState>({
    rating: 5,
    hover: 0,
    comment: "",
  });

  // State for Food Items rating (map of foodId -> RatingState)
  const [foodRatings, setFoodRatings] = useState<Record<string, RatingState>>(() => {
    const initialMap: Record<string, RatingState> = {};
    if (order?.items) {
      order.items.forEach((item) => {
        initialMap[item.foodId] = { rating: 5, hover: 0, comment: "" };
      });
    }
    return initialMap;
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !order) return null;

  const handleStarClick = (
    category: "rider" | "restaurant" | "food",
    star: number,
    foodId?: string
  ) => {
    if (category === "rider") {
      setRiderRating((prev) => ({ ...prev, rating: star }));
    } else if (category === "restaurant") {
      setRestaurantRating((prev) => ({ ...prev, rating: star }));
    } else if (category === "food" && foodId) {
      setFoodRatings((prev) => ({
        ...prev,
        [foodId]: { ...prev[foodId], rating: star },
      }));
    }
  };

  const handleStarHover = (
    category: "rider" | "restaurant" | "food",
    star: number,
    foodId?: string
  ) => {
    if (category === "rider") {
      setRiderRating((prev) => ({ ...prev, hover: star }));
    } else if (category === "restaurant") {
      setRestaurantRating((prev) => ({ ...prev, hover: star }));
    } else if (category === "food" && foodId) {
      setFoodRatings((prev) => ({
        ...prev,
        [foodId]: { ...prev[foodId], hover: star },
      }));
    }
  };

  const handleCommentChange = (
    category: "rider" | "restaurant" | "food",
    text: string,
    foodId?: string
  ) => {
    if (category === "rider") {
      setRiderRating((prev) => ({ ...prev, comment: text }));
    } else if (category === "restaurant") {
      setRestaurantRating((prev) => ({ ...prev, comment: text }));
    } else if (category === "food" && foodId) {
      setFoodRatings((prev) => ({
        ...prev,
        [foodId]: { ...prev[foodId], comment: text },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const reviewsPayload: IReviewItemPayload[] = [];

      // 1. Rider Review
      if (riderId) {
        reviewsPayload.push({
          targetType: "rider",
          targetId: riderId,
          targetName: riderName,
          rating: riderRating.rating,
          comment: riderRating.comment.trim() || "Great delivery service!",
        });
      }

      // 2. Restaurant Review
      if (restaurantId) {
        reviewsPayload.push({
          targetType: "restaurant",
          targetId: restaurantId,
          targetName: restaurantName,
          rating: restaurantRating.rating,
          comment: restaurantRating.comment.trim() || "Delicious food & prompt preparation!",
        });
      }

      // 3. Food Items Reviews
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const fState = foodRatings[item.foodId] || { rating: 5, comment: "" };
          reviewsPayload.push({
            targetType: "food",
            targetId: item.foodId,
            targetName: item.name,
            rating: fState.rating,
            comment: fState.comment.trim() || `Awesome ${item.name}!`,
          });
        });
      }

      const response = await submitOrderReviewApi({
        orderId: order.orderId || (order as any)._id,
        userId,
        userName: userName || order.userName || "Customer",
        userEmail: userEmail || order.userEmail,
        reviews: reviewsPayload,
      });

      if (response.success) {
        setIsSubmitted(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(response.message || "Failed to submit ratings.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (
    category: "rider" | "restaurant" | "food",
    currentRating: number,
    hoverRating: number,
    foodId?: string
  ) => {
    const active = hoverRating > 0 ? hoverRating : currentRating;
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star, foodId)}
            onMouseEnter={() => handleStarHover(category, star, foodId)}
            onMouseLeave={() => handleStarHover(category, 0, foodId)}
            className="p-1 transition-transform hover:scale-125 focus:outline-none"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= active
                  ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : "text-zinc-600 dark:text-zinc-700 hover:text-amber-300"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-amber-500">
          {active} / 5
        </span>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto my-8 bg-white border border-orange-200 rounded-3xl shadow-2xl backdrop-blur-2xl text-gray-900 p-6 md:p-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-orange-50 transition cursor-pointer z-10"
            title="Skip and Close"
          >
            <X className="w-5 h-5" />
          </button>

          {isSubmitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 text-center flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Thank You for Your Feedback!
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
                Your ratings and review help us keep delivery fast, fresh, and top-tier!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2 pb-4 border-b border-orange-100">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Order Completed
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Rate Your Experience
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  Order #{order.orderId} • Delivered via OTP Verification
                </p>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* SECTION 1: Delivery Rider */}
              {riderId && (
                <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-orange-100 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-100/80 text-orange-600">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        Delivery Rider: <span className="text-orange-600">{riderName}</span>
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        How was the promptness & courtesy of your delivery?
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    {renderStars("rider", riderRating.rating, riderRating.hover)}
                  </div>

                  <textarea
                    rows={2}
                    value={riderRating.comment}
                    onChange={(e) => handleCommentChange("rider", e.target.value)}
                    placeholder="Write a quick comment for your rider (optional)..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-orange-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
                  />
                </div>
              )}

              {/* SECTION 2: Restaurant */}
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-orange-100 space-y-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-100/80 text-orange-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      Restaurant: <span className="text-orange-600">{restaurantName}</span>
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">
                      How was food packaging, temperature, and overall service?
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  {renderStars("restaurant", restaurantRating.rating, restaurantRating.hover)}
                </div>

                <textarea
                  rows={2}
                  value={restaurantRating.comment}
                  onChange={(e) => handleCommentChange("restaurant", e.target.value)}
                  placeholder="Share feedback on restaurant food preparation & packaging..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-orange-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
                />
              </div>

              {/* SECTION 3: Specific Food Items */}
              {order.items && order.items.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-orange-500" /> Rate Ordered Dishes
                  </h4>

                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const itemState = foodRatings[item.foodId] || { rating: 5, hover: 0, comment: "" };
                      return (
                        <div
                          key={item.foodId}
                          className="p-4 rounded-2xl bg-[#FFFDF8] border border-orange-100 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-orange-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                  <UtensilsCrossed className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <h5 className="font-bold text-sm text-gray-900">
                                  {item.name}
                                </h5>
                                <p className="text-xs text-gray-400 font-medium">
                                  Qty: {item.quantity} • Tk {item.price}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-1">
                            {renderStars("food", itemState.rating, itemState.hover, item.foodId)}
                          </div>

                          <input
                            type="text"
                            value={itemState.comment}
                            onChange={(e) => handleCommentChange("food", e.target.value, item.foodId)}
                            placeholder={`How was the taste & quality of ${item.name}?`}
                            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-orange-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit & Skip Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-orange-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-4 h-4" /> Submit Reviews
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
