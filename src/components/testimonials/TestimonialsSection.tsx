"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, BadgeCheck, Quote, ChevronLeft, ChevronRight, Users, MapPin, Sparkles } from "lucide-react";
import { getPublicTestimonialsApi, IReview } from "@/lib/api/review";
import { formatNumber } from "@/lib/utils/formatNumber";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type RatingFilter = "all" | 5 | 4 | 3;

interface NormalizedReview {
  id: string | number;
  name: string;
  avatar: string;
  tag: string;
  location: string;
  rating: number;
  text: string;
  food: string;
  verified: boolean;
  isFeatured?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const FILTER_OPTIONS: { value: RatingFilter; label: string; icon?: React.ReactNode }[] = [
  { value: "all", label: "All Reviews", icon: <Users className="h-3.5 w-3.5" /> },
  { value: 5, label: "5 Stars" },
  { value: 4, label: "4 Stars" },
  { value: 3, label: "3 Stars" },
];

/**
 * Helper to normalize raw database API review into presentation model
 */
function normalizeReview(raw: IReview | any, idx: number): NormalizedReview {
  const name = raw.userName || raw.name || "Customer";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "C";

  let tag = "Foodie";
  if (raw.targetType === "rider") tag = "Delivery Rider";
  else if (raw.targetType === "restaurant") tag = "Restaurant Partner";
  else if (raw.targetType === "food") tag = "Food Order";

  return {
    id: raw._id || raw.id || idx,
    name,
    avatar: initials,
    tag,
    location: raw.location || "Verified Order",
    rating: Math.max(1, Math.min(5, Number(raw.rating) || 5)),
    text: raw.comment || raw.text || "Delicious meal, prompt delivery, and amazing customer service!",
    food: raw.targetName || raw.food || "FoodFlow Order",
    verified: true,
    isFeatured: Boolean(raw.isFeatured),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Star Rating                                  */
/* -------------------------------------------------------------------------- */

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${px} ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             3D Carousel Slider                             */
/* -------------------------------------------------------------------------- */

function Carousel3D({ reviews: filteredReviews }: { reviews: NormalizedReview[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const total = filteredReviews.length;

  useEffect(() => {
    setCurrent(0);
  }, [total]);

  const paginate = useCallback(
    (dir: number) => {
      if (total === 0) return;
      setDirection(dir);
      setCurrent((prev) => (prev + dir + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(() => paginate(1), 5000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [paginate, total]);

  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (total > 1) {
      autoPlayRef.current = setInterval(() => paginate(1), 5000);
    }
  }, [paginate, total]);

  const handlePrev = () => {
    paginate(-1);
    resetAutoPlay();
  };

  const handleNext = () => {
    paginate(1);
    resetAutoPlay();
  };

  if (total === 0) return null;

  const featuredReview = filteredReviews[current] || filteredReviews[0];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 200 : -200,
      opacity: 0,
      rotateY: dir > 0 ? 8 : -8,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 200 : -200,
      opacity: 0,
      rotateY: dir < 0 ? 8 : -8,
      scale: 0.95,
    }),
  };

  return (
    <div className="relative">
      <div
        className="relative mx-auto max-w-2xl overflow-hidden"
        style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={featuredReview.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-xl shadow-orange-100/40 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <Quote className="h-8 w-8 text-orange-400 sm:h-10 sm:w-10" />
              </div>

              <p className="text-base leading-relaxed text-gray-800 font-medium sm:text-lg sm:leading-8">
                &ldquo;{featuredReview.text}&rdquo;
              </p>

              <div className="mt-4 flex items-center gap-2">
                <StarRating rating={featuredReview.rating} size="md" />
                <span className="text-xs font-black text-gray-800">{featuredReview.rating}.0 / 5.0</span>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-md shadow-orange-300/30">
                  {featuredReview.avatar}
                  {featuredReview.verified && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-xs">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-extrabold text-gray-900 sm:text-base">{featuredReview.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-orange-600">{featuredReview.tag}</span>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 font-medium">
                      <MapPin className="h-3 w-3" />
                      {featuredReview.location}
                    </span>
                  </div>
                </div>
                {featuredReview.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>

              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                  🍽️ Ordered: {featuredReview.food}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 sm:h-11 sm:w-11 sm:-translate-x-4 cursor-pointer"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 translate-x-2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 sm:h-11 sm:w-11 sm:translate-x-4 cursor-pointer"
            aria-label="Next review"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {filteredReviews.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
                resetAutoPlay();
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === current
                  ? "w-7 bg-orange-500"
                  : "w-2 bg-gray-200 hover:bg-gray-300"
              }`}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Main Section                                    */
/* -------------------------------------------------------------------------- */

export default function TestimonialsSection() {
  const [activeFilter, setActiveFilter] = useState<RatingFilter>("all");
  const [reviewsList, setReviewsList] = useState<NormalizedReview[]>([]);
  const [avgRating, setAvgRating] = useState<string>("4.8");
  const [happyCustomersCount, setHappyCustomersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getPublicTestimonialsApi(activeFilter)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          const raw = res.data.reviews || [];
          const normalized = raw.map((r: any, idx: number) => normalizeReview(r, idx));
          setReviewsList(normalized);
          if (res.data.avgRating) {
            setAvgRating(res.data.avgRating.toFixed(1));
          }
          if (typeof res.data.happyCustomers === "number") {
            setHappyCustomersCount(res.data.happyCustomers);
          }
        }
      })
      .catch((err) => console.error("Error loading testimonials:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      {/* Decorative blurs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-600 sm:text-sm">
            <Quote className="h-3.5 w-3.5" />
            Featured Testimonials
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            What Our <span className="text-orange-500">Foodies</span> Say
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
            Verified customer reviews selected and featured directly from our moderation team.
          </p>
        </motion.div>

        {/* Star Rating Filter Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActiveFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 cursor-pointer sm:text-sm ${
                activeFilter === opt.value
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </motion.div>

        {/* Clean 3D Featured Slider */}
        {reviewsList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
            className="mt-10 sm:mt-12"
          >
            <Carousel3D reviews={reviewsList} />
          </motion.div>
        )}

        {/* Empty State Fallback if no admin-featured reviews match */}
        {!loading && reviewsList.length === 0 && (
          <div className="mt-12 text-center text-sm text-gray-500 py-10 bg-orange-50/50 rounded-3xl border border-orange-100 max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <Quote className="w-6 h-6" />
            </div>
            <p className="font-extrabold text-gray-800">No featured reviews for this rating filter.</p>
            <p className="text-xs text-gray-500">
              Select and toggle &quot;Feature on Home&quot; on customer reviews from the Admin Moderation Dashboard.
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="mt-12 text-center sm:mt-16"
        >
          <p className="mb-4 text-sm text-gray-500 font-medium">Have a food story to share?</p>
          <a
            href="/dashboard/customer/orders"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
          >
            Write a Review
            <ChevronRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
