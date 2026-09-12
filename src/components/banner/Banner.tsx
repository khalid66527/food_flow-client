"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lottie } from "lottie-react";
import {
    ArrowRight,
    Clock3,
    Star,
    Bike,
    Sparkles,
    ShoppingBag,
    Store,
    LayoutGrid,
    MapPin,
    Leaf,
    Search,
    Navigation,
    ThumbsUp,
    Timer,
} from "lucide-react";

type FloatingCardConfig = {
    variant: "row" | "gradient" | "chip";
    position: "top-left" | "top-right" | "bottom-right" | "bottom-left";
    icon?: React.ComponentType<{ className?: string }>;
    iconClass?: string;
    iconWrap?: string;
    title: string;
    value: string;
    sub?: string;
    floatDuration: number;
    floatDelay?: number;
};

const cardPositions = {
    "top-left": "left-2 top-[20%] sm:left-[-10px]",
    "top-right": "right-2 top-[10%] sm:right-[-10px]",
    "bottom-right": "bottom-[10%] right-2 sm:right-0",
    "bottom-left": "bottom-[18%] left-2",
} as const;

const cardVariantClasses = {
    row: "flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md",
    gradient: "rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3.5 text-white shadow-xl shadow-orange-500/30",
    chip: "hidden items-center gap-2.5 rounded-xl border border-white/80 bg-white/90 px-3.5 py-2.5 shadow-lg backdrop-blur-md sm:flex",
};

const heroSlides = [
    {
        src: "/lottie/order-food.json",
        icon: ShoppingBag,
        caption: "Fast Food Ordering",
        sub: "Tap, order, and get your favorites delivered in minutes.",
        duration: 4000,
        cards: [
            {
                variant: "row" as const,
                position: "top-left" as const,
                icon: Bike,
                iconWrap: "bg-orange-100 text-orange-600 shadow-inner",
                iconClass: "h-6 w-6",
                title: "Delivery Speed",
                value: "20–30 min",
                floatDuration: 4,
            },
            {
                variant: "row" as const,
                position: "top-right" as const,
                icon: Star,
                iconWrap: "bg-amber-100 text-amber-500 shadow-inner",
                iconClass: "h-5 w-5 fill-amber-400",
                title: "Top Rated App",
                value: "4.8 / 5",
                floatDuration: 5,
                floatDelay: 1,
            },
            {
                variant: "gradient" as const,
                position: "bottom-right" as const,
                title: "Special Offer",
                value: "30% OFF",
                sub: "On your first food order",
                floatDuration: 4.5,
                floatDelay: 0.5,
            },
            {
                variant: "chip" as const,
                position: "bottom-left" as const,
                icon: Clock3,
                iconClass: "h-4 w-4 text-orange-500",
                title: "Fast & Fresh",
                floatDuration: 4.2,
                floatDelay: 1.5,
            },
        ],
    },
    {
        src: "/lottie/food-market.json",
        icon: Store,
        caption: "Live Market Tracking",
        sub: "Fresh groceries and market picks live at your fingertips.",
        duration: 4000,
        cards: [
            {
                variant: "row" as const,
                position: "top-left" as const,
                icon: Leaf,
                iconWrap: "bg-green-100 text-green-600 shadow-inner",
                iconClass: "h-6 w-6",
                title: "Live Menu",
                value: "Real-Time",
                floatDuration: 4,
            },
            {
                variant: "row" as const,
                position: "top-right" as const,
                icon: Star,
                iconWrap: "bg-amber-100 text-amber-500 shadow-inner",
                iconClass: "h-5 w-5 fill-amber-400",
                title: "Customer Rating",
                value: "4.9 / 5",
                floatDuration: 5,
                floatDelay: 1,
            },
            {
                variant: "gradient" as const,
                position: "bottom-right" as const,
                title: "Fresh Deals",
                value: "20% OFF",
                sub: "On your groceries week",
                floatDuration: 4.5,
                floatDelay: 0.5,
            },
            {
                variant: "chip" as const,
                position: "bottom-left" as const,
                icon: Store,
                iconClass: "h-4 w-4 text-green-500",
                title: "Farm Fresh",
                floatDuration: 4.2,
                floatDelay: 1.5,
            },
        ],
    },
    {
        src: "/lottie/food-choose.json",
        icon: LayoutGrid,
        caption: "Smart Menu Browsing",
        sub: "Discover the perfect dish with smart filters and recommendations.",
        duration: 5000,
        cards: [
            {
                variant: "row" as const,
                position: "top-left" as const,
                icon: Search,
                iconWrap: "bg-sky-100 text-sky-600 shadow-inner",
                iconClass: "h-6 w-6",
                title: "Smart Search",
                value: "AI Powered",
                floatDuration: 4,
            },
            {
                variant: "row" as const,
                position: "top-right" as const,
                icon: ThumbsUp,
                iconWrap: "bg-emerald-100 text-emerald-600 shadow-inner",
                iconClass: "h-5 w-5",
                title: "Personalized",
                value: "Top Picks For You",
                floatDuration: 5,
                floatDelay: 1,
            },
            {
                variant: "gradient" as const,
                position: "bottom-right" as const,
                title: "Welcome Offer",
                value: "10% OFF",
                sub: "On your first order",
                floatDuration: 4.5,
                floatDelay: 0.5,
            },
            {
                variant: "chip" as const,
                position: "bottom-left" as const,
                icon: Sparkles,
                iconClass: "h-4 w-4 text-orange-500",
                title: "Curated Picks",
                floatDuration: 4.2,
                floatDelay: 1.5,
            },
        ],
    },
    {
        src: "/lottie/rider-tracking.json",
        icon: MapPin,
        caption: "Real-Time Rider Tracking",
        sub: "Follow your delivery rider live from kitchen to doorstep.",
        duration: 5000,
        cards: [
            {
                variant: "row" as const,
                position: "top-left" as const,
                icon: Bike,
                iconWrap: "bg-indigo-100 text-indigo-600 shadow-inner",
                iconClass: "h-6 w-6",
                title: "Rider En Route",
                value: "2.4 km away",
                floatDuration: 4,
            },
            {
                variant: "row" as const,
                position: "top-right" as const,
                icon: Navigation,
                iconWrap: "bg-blue-100 text-blue-600 shadow-inner",
                iconClass: "h-5 w-5",
                title: "Live Tracking",
                value: "ETA 08:15",
                floatDuration: 5,
                floatDelay: 1,
            },
            {
                variant: "gradient" as const,
                position: "bottom-right" as const,
                title: "On-Time Rate",
                value: "95%",
                sub: "Delivered on-schedule",
                floatDuration: 4.5,
                floatDelay: 0.5,
            },
            {
                variant: "chip" as const,
                position: "bottom-left" as const,
                icon: Timer,
                iconClass: "h-4 w-4 text-orange-500",
                title: "Arriving Soon",
                floatDuration: 4.2,
                floatDelay: 1.5,
            },
        ],
    },
];

const SLIDE_DWELL = 3000;

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const leftVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

const rightVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.45,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

const Banner = () => {
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        const interval = heroSlides[activeSlide].duration + SLIDE_DWELL;
        const id = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % heroSlides.length);
        }, interval);
        return () => clearInterval(id);
    }, [activeSlide]);

    const ActiveIcon = heroSlides[activeSlide].icon;

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/40 via-white to-white py-12 lg:py-20">
            {/* Background Glowing Mesh Decorations */}
            <div className="pointer-events-none absolute -left-20 top-10 h-96 w-96 rounded-full bg-orange-200/30 blur-[100px]" />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-100/40 blur-[100px]" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
                >

                    {/* ================= LEFT CONTENT ================= */}
                    <motion.div variants={leftVariants} className="order-2 max-w-2xl lg:order-1">

                        {/* Small Badge */}
                        <motion.div variants={itemVariants}>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 shadow-sm sm:text-sm">
                                <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
                                Delicious food, delivered fast
                            </div>
                        </motion.div>

                        {/* Heading */}
                        <motion.div variants={itemVariants}>
                            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                                Your Favorite Food,
                                <span className="mt-1 block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                    Delivered to You.
                                </span>
                            </h1>
                        </motion.div>

                        {/* Description */}
                        <motion.div variants={itemVariants}>
                            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg sm:leading-8">
                                Discover the best restaurants around you, order your favorite
                                meals, and enjoy fresh food delivered right to your doorstep.
                                Fast, easy, and delicious with Food Flow.
                            </p>
                        </motion.div>

                        {/* CTA Buttons (Search bar removed completely) */}
                        <motion.div variants={itemVariants}>
                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <Link
                                    href="/dishes"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-orange-600/30 active:scale-95"
                                >
                                    Order Now
                                    <ArrowRight className="h-5 w-5" />
                                </Link>

                                <Link
                                    href="/dishes?featured=true"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-600 active:scale-95"
                                >
                                    Explore Offers
                                </Link>
                            </div>
                        </motion.div>

                        {/* Trust Stats */}
                        <motion.div variants={itemVariants}>
                            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-gray-100 pt-8">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">500+</p>
                                    <p className="text-xs font-medium text-gray-400">Restaurants</p>
                                </div>
                                <div className="h-10 w-px bg-gray-200" />
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">10K+</p>
                                    <p className="text-xs font-medium text-gray-400">Happy Customers</p>
                                </div>
                                <div className="h-10 w-px bg-gray-200" />
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                                        <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">4.8</p>
                                        <p className="text-xs font-medium text-gray-400">Customer Rating</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ================= RIGHT ANIMATION & FLOATING CARDS ================= */}
                    <motion.div variants={rightVariants} className="order-1 relative mx-auto w-full max-w-xl lg:order-2 lg:max-w-none">
                        
                        {/* Glowing backdrop circle behind animation */}
                        <div className="absolute inset-0 mx-auto my-auto h-[350px] w-[350px] rounded-full bg-gradient-to-tr from-orange-400/20 to-amber-300/30 blur-3xl sm:h-[450px] sm:w-[450px]" />

                        <div className="relative mx-auto aspect-square max-w-[500px]">

                            {/* Lottie Animation Carousel */}
                            <AnimatePresence>
                                <motion.div
                                    key={activeSlide}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.03 }}
                                    transition={{ duration: 0.55, ease: "easeInOut" }}
                                    className="absolute inset-0"
                                >
                                    <Lottie
                                        src={heroSlides[activeSlide].src}
                                        loop={true}
                                        autoplay={true}
                                        className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* ================= DYNAMIC FLOATING CARDS ================= */}
                            <AnimatePresence>
                                <motion.div
                                    key={`cards-${activeSlide}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="pointer-events-none absolute inset-0"
                                    aria-hidden="true"
                                >
                                    {heroSlides[activeSlide].cards.map((card) => (
                                        <motion.div
                                            key={card.title}
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{
                                                duration: 0.5,
                                                ease: [0.25, 0.46, 0.45, 0.94],
                                            }}
                                            className={`absolute ${cardPositions[card.position]}`}
                                        >
                                            <motion.div
                                                animate={{ y: [0, -9, 0] }}
                                                transition={{
                                                    duration: card.floatDuration,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: card.floatDelay ?? 0,
                                                }}
                                                className={cardVariantClasses[card.variant]}
                                            >
                                                {card.variant === "gradient" ? (
                                                    <>
                                                        <p className="text-[11px] font-medium tracking-wide text-orange-100 uppercase">
                                                            {card.title}
                                                        </p>
                                                        <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">
                                                            {card.value}
                                                        </p>
                                                        {card.sub && (
                                                            <p className="mt-0.5 text-[10px] text-orange-100/90">
                                                                {card.sub}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {card.variant === "row" && (
                                                            <div
                                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconWrap ?? ""}`}
                                                            >
                                                                <card.icon
                                                                    className={
                                                                        card.iconClass ?? "h-6 w-6"
                                                                    }
                                                                />
                                                            </div>
                                                        )}

                                                        {card.variant === "chip" && (
                                                            <card.icon
                                                                className={
                                                                    card.iconClass ??
                                                                    "h-4 w-4 text-orange-500"
                                                                }
                                                            />
                                                        )}

                                                        <div>
                                                            <p
                                                                className={
                                                                    card.variant === "chip"
                                                                        ? "text-xs font-semibold text-gray-700"
                                                                        : "text-xs font-medium text-gray-400"
                                                                }
                                                            >
                                                                {card.title}
                                                            </p>
                                                            {card.variant === "row" && (
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {card.value}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* ================= SLIDE CAPTION & INDICATORS ================= */}
                        <div className="mt-4 flex flex-col items-center justify-center gap-3 text-center sm:mt-6">
                            <div className="flex h-[76px] max-w-full items-center justify-center overflow-hidden sm:h-[68px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeSlide}
                                        initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="inline-flex flex-col items-center justify-center gap-1"
                                    >
                                        <p className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 sm:text-xl">
                                            <ActiveIcon className="h-5 w-5 text-orange-500" />
                                            {heroSlides[activeSlide].caption}
                                        </p>
                                        <p className="text-xs text-gray-500 sm:text-sm">
                                            {heroSlides[activeSlide].sub}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Clickable Slide Indicators */}
                            <div className="flex items-center gap-2">
                                {heroSlides.map((slide, i) => (
                                    <button
                                        key={slide.src}
                                        type="button"
                                        onClick={() => setActiveSlide(i)}
                                        aria-label={`Show slide ${i + 1}: ${slide.caption}`}
                                        className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                                            i === activeSlide
                                                ? "w-7 bg-orange-500"
                                                : "w-2 bg-orange-200 hover:bg-orange-300"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </section>
    );
};

export default Banner;