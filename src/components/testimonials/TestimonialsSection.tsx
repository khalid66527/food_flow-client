"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, BadgeCheck, Quote, ChevronLeft, ChevronRight, Users, MapPin } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type RatingFilter = "all" | 5 | 4 | 3;

interface Review {
  id: number;
  name: string;
  avatar: string;
  tag: string;
  location: string;
  rating: number;
  text: string;
  food: string;
  verified: boolean;
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

const reviews: Review[] = [
  {
    id: 1,
    name: "Fatima Rahman",
    avatar: "FR",
    tag: "Student",
    location: "Sylhet",
    rating: 5,
    text: "FoodFlow is a lifesaver during exam week! The biryani arrives hot every time. I order at least 3x a week now. Absolutely love the speed and quality.",
    food: "Hyderabadi Biryani",
    verified: true,
  },
  {
    id: 2,
    name: "Arif Hasan",
    avatar: "AH",
    tag: "Software Engineer",
    location: "Dhaka",
    rating: 5,
    text: "Finally a delivery app that understands what 'extra spicy' means. The Butter Chicken from Taj Restaurant was restaurant-quality. My team orders through FoodFlow every Friday.",
    food: "Butter Chicken",
    verified: true,
  },
  {
    id: 3,
    name: "Nusrat Jahan",
    avatar: "NJ",
    tag: "Doctor",
    location: "Chattogram",
    rating: 4,
    text: "Great variety and the tracking feature is accurate. My only wish is more late-night dessert options. The FoodFlow Plus subscription saves me so much on delivery fees.",
    food: "Chocolate Lava Cake",
    verified: true,
  },
  {
    id: 4,
    name: "Sakib Ahmed",
    avatar: "SA",
    tag: "Entrepreneur",
    location: "Rajshahi",
    rating: 5,
    text: "I used FoodFlow for a 50-person office lunch event. Everything was delivered on time, perfectly packed. The bulk ordering feature is a game-changer for businesses.",
    food: "Combo Meal Box",
    verified: true,
  },
  {
    id: 5,
    name: "Tasnim Hossain",
    avatar: "TH",
    tag: "Designer",
    location: "Sylhet",
    rating: 4,
    text: "The UI is gorgeous and easy to navigate. I love how I can save my favorite orders and reorder with one tap. The vegetable khichuri is my comfort food go-to.",
    food: "Vegetable Khichuri",
    verified: true,
  },
  {
    id: 6,
    name: "Rafiq Uddin",
    avatar: "RU",
    tag: "Teacher",
    location: "Dhaka",
    rating: 5,
    text: "My family uses FoodFlow for weekend dinners. The kids love the pizza deals and I appreciate the detailed nutrition info for each dish. Truly family-friendly!",
    food: "Margherita Pizza",
    verified: true,
  },
  {
    id: 7,
    name: "Maliha Khan",
    avatar: "MK",
    tag: "Graduate Student",
    location: "Comilla",
    rating: 3,
    text: "Solid app overall. Delivery was slightly delayed once but customer service resolved it quickly and gave me a voucher. The pani puri from Street Bites was amazing though.",
    food: "Pani Puri",
    verified: true,
  },
  {
    id: 8,
    name: "Imran Sheikh",
    avatar: "IS",
    tag: "Content Creator",
    location: "Dhaka",
    rating: 5,
    text: "I film food reviews for a living and FoodFlow consistently delivers photogenic, restaurant-quality food. The Thai Green Curry from Bangkok Kitchen was stunning.",
    food: "Thai Green Curry",
    verified: true,
  },
  {
    id: 9,
    name: "Sumaiya Akter",
    avatar: "SA",
    tag: "Bank Officer",
    location: "Bogra",
    rating: 4,
    text: "The real-time order tracking gives me peace of mind during busy work hours. I also love the loyalty points system — I've already earned 3 free meals!",
    food: "Chicken Shawarma",
    verified: true,
  },
  {
    id: 10,
    name: "Zahid Hossain",
    avatar: "ZH",
    tag: "Student",
    location: "Dhaka",
    rating: 5,
    text: "As a broke college student, the student discount deals on FoodFlow are everything. The loaded fries combo for 199 taka is unbeatable. Best app on my phone!",
    food: "Loaded Fries Combo",
    verified: true,
  },
  {
    id: 11,
    name: "Farhana Begum",
    avatar: "FB",
    tag: "Homemaker",
    location: "Mymensingh",
    rating: 5,
    text: "When I don't feel like cooking, FoodFlow is my best friend. The family meal packages are affordable and the food is always fresh. My kids prefer the noodles!",
    food: "Family Noodle Pack",
    verified: true,
  },
  {
    id: 12,
    name: "Tanvir Alam",
    avatar: "TA",
    tag: "Freelancer",
    location: "Khulna",
    rating: 4,
    text: "Love the live cooking feature where you can watch chefs prepare your order. The grilled chicken steak from Western Bites was perfectly cooked. Great concept!",
    food: "Grilled Chicken Steak",
    verified: true,
  },
];

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
/*                              Review Card                                    */
/* -------------------------------------------------------------------------- */

function ReviewCard({
  review,
  index,
  isFeatured,
}: {
  review: Review;
  index: number;
  isFeatured?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, rotateX: -4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: index * 0.05,
      }}
      whileHover={{
        y: -6,
        rotateX: 2,
        rotateY: -1,
        transition: { duration: 0.3 },
      }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className={`group relative flex flex-col rounded-2xl border bg-white p-5 sm:p-6 transition-shadow duration-300 ${
        isFeatured
          ? "border-orange-200 shadow-lg shadow-orange-200/30"
          : "border-gray-100 shadow-sm hover:shadow-lg hover:shadow-orange-100/40"
      }`}
    >
      {/* Decorative quote */}
      <div className="absolute right-4 top-4 text-orange-100 transition-colors group-hover:text-orange-200">
        <Quote className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>

      {/* Header: Avatar + User Info */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-sm font-bold text-white shadow-md shadow-orange-300/30 sm:h-12 sm:w-12">
          {review.avatar}
          {review.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
            </span>
          )}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-900 sm:text-base">{review.name}</h4>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600 sm:text-xs">
              {review.tag}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 sm:text-xs">
              <MapPin className="h-3 w-3" />
              {review.location}
            </span>
          </div>
        </div>
      </div>

      {/* Rating + Verified */}
      <div className="mt-3.5 flex items-center gap-2">
        <StarRating rating={review.rating} />
        {review.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:text-[11px]">
            <BadgeCheck className="h-3 w-3" />
            Verified Order
          </span>
        )}
      </div>

      {/* Review text */}
      <p className="mt-3 flex-1 truncate whitespace-nowrap text-[13px] text-gray-600 sm:text-sm" title={review.text}>{review.text}</p>

      {/* Food ordered badge */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50/80 px-2.5 py-1 text-[11px] font-medium text-orange-600 sm:text-xs">
          🍽️ {review.food}
        </span>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Infinite Marquee Row                               */
/* -------------------------------------------------------------------------- */

function MarqueeRow({
  items,
  speed,
  reverse,
}: {
  items: Review[];
  speed: number;
  reverse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />

      <motion.div
        className="flex gap-4 sm:gap-5"
        animate={{
          x: reverse ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          x: {
            duration: speed,
            ease: "linear",
            repeat: Infinity,
          },
        }}
        style={{ width: "max-content" }}
      >
        {[...items, ...items].map((review, i) => (
          <div key={`${review.id}-${i}`} className="w-[280px] shrink-0 sm:w-[320px]">
            <ReviewCard review={review} index={i} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             3D Carousel                                    */
/* -------------------------------------------------------------------------- */

function Carousel3D({ reviews: filteredReviews }: { reviews: Review[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const total = filteredReviews.length;

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrent((prev) => (prev + dir + total) % total);
    },
    [total]
  );

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(() => paginate(1), 5000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [paginate, total]);

  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => paginate(1), 5000);
  }, [paginate]);

  const handlePrev = () => {
    paginate(-1);
    resetAutoPlay();
  };

  const handleNext = () => {
    paginate(1);
    resetAutoPlay();
  };

  if (total === 0) return null;

  const featuredReview = filteredReviews[current];

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
            <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-xl shadow-orange-100/30 sm:p-8">
              {/* Quote icon */}
              <Quote className="mb-4 h-8 w-8 text-orange-300 sm:h-10 sm:w-10" />

              {/* Review text */}
              <p className="text-base leading-relaxed text-gray-700 sm:text-lg sm:leading-8">
                &ldquo;{featuredReview.text}&rdquo;
              </p>

              {/* Rating */}
              <div className="mt-4">
                <StarRating rating={featuredReview.rating} size="md" />
              </div>

              {/* User info */}
              <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-sm font-bold text-white shadow-md shadow-orange-300/30">
                  {featuredReview.avatar}
                  {featuredReview.verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 sm:text-base">{featuredReview.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{featuredReview.tag}</span>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {featuredReview.location}
                    </span>
                  </div>
                </div>
                {featuredReview.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified Order
                  </span>
                )}
              </div>

              {/* Food badge */}
              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                  🍽️ Ordered: {featuredReview.food}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 sm:h-11 sm:w-11 sm:-translate-x-4"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 translate-x-2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 sm:h-11 sm:w-11 sm:translate-x-4"
            aria-label="Next review"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
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
              className={`h-2 rounded-full transition-all duration-300 ${
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

  const filteredReviews = useMemo(() => {
    if (activeFilter === "all") return reviews;
    return reviews.filter((r) => r.rating === activeFilter);
  }, [activeFilter]);

  // Split for marquee rows
  const row1 = useMemo(() => filteredReviews.filter((_, i) => i % 2 === 0), [filteredReviews]);
  const row2 = useMemo(() => filteredReviews.filter((_, i) => i % 2 === 1), [filteredReviews]);

  // Average rating
  const avgRating = useMemo(() => {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, []);

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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600 sm:text-sm">
            <Quote className="h-3.5 w-3.5" />
            Testimonials
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            What Our <span className="text-orange-500">Foodies</span> Say
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
            Real reviews from real customers who trust FoodFlow for delicious meals,
            fast delivery, and unforgettable experiences.
          </p>

          {/* Quick stats row */}
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-900">{avgRating}</span>
              <span className="text-xs text-gray-500">average</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-gray-900">{reviews.length.toLocaleString()}+</span>
              <span className="text-xs text-gray-500">happy customers</span>
            </div>
          </div>
        </motion.div>

        {/* Filter Buttons */}
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
              onClick={() => setActiveFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
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

        {/* 3D Featured Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
          className="mt-12 sm:mt-14"
        >
          <Carousel3D reviews={filteredReviews} />
        </motion.div>

        {/* Infinite Marquee Rows */}
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-5">
          <AnimatePresence mode="wait">
            {row1.length > 0 && (
              <motion.div
                key={`row1-${activeFilter}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MarqueeRow items={row1} speed={35} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {row2.length > 0 && (
              <motion.div
                key={`row2-${activeFilter}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MarqueeRow items={row2} speed={40} reverse />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="mt-12 text-center sm:mt-16"
        >
          <p className="mb-4 text-sm text-gray-500">Have a food story to share?</p>
          <a
            href="#"
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
