"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
    Home,
    ChevronRight,
    Tag,
    Copy,
    Check,
    Percent,
    Truck,
    Gift,
    Sparkles,
    Clock3,
    Flame,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Dummy data — replace with API data (GET /api/offers)                */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
    { id: "all", label: "All Offers" },
    { id: "percentage", label: "% Off" },
    { id: "bogo", label: "Buy 1 Get 1" },
    { id: "free-delivery", label: "Free Delivery" },
    { id: "new-user", label: "New User" },
];

const OFFERS = [
    {
        id: "welcome30",
        code: "WELCOME30",
        type: "new-user",
        title: "30% off your first order",
        description: "New to Food Flow? Get 30% off, up to ৳150, on your first order.",
        restaurant: "All Restaurants",
        validTill: "31 Aug 2026",
        color: "orange",
    },
    {
        id: "freeship",
        code: "FREESHIP",
        type: "free-delivery",
        title: "Free delivery this weekend",
        description: "Zero delivery fee on orders above ৳500, Friday to Sunday.",
        restaurant: "All Restaurants",
        validTill: "23 Aug 2026",
        color: "green",
    },
    {
        id: "burger-bogo",
        code: "BURGERBOGO",
        type: "bogo",
        title: "Buy 1 Get 1 Free",
        description: "On all classic burgers at Burger House. Dine-in and delivery both.",
        restaurant: "Burger House",
        validTill: "28 Aug 2026",
        color: "purple",
    },
    {
        id: "pizza20",
        code: "PIZZA20",
        type: "percentage",
        title: "20% off on Pizza Palace",
        description: "Enjoy 20% off on all large and family-size pizzas.",
        restaurant: "Pizza Palace",
        validTill: "25 Aug 2026",
        color: "orange",
    },
    {
        id: "sweet15",
        code: "SWEET15",
        type: "percentage",
        title: "15% off desserts",
        description: "Treat yourself — 15% off everything at Sweet Treats.",
        restaurant: "Sweet Treats",
        validTill: "20 Aug 2026",
        color: "pink",
    },
    {
        id: "sushifree",
        code: "SUSHIFREE",
        type: "free-delivery",
        title: "Free delivery on Sushi World",
        description: "No delivery charge on orders above ৳800 from Sushi World.",
        restaurant: "Sushi World",
        validTill: "30 Aug 2026",
        color: "green",
    },
    {
        id: "taco2for1",
        code: "TACOTIME",
        type: "bogo",
        title: "2 Tacos for the price of 1",
        description: "Every Tuesday, get a second taco free at Taco Fiesta.",
        restaurant: "Taco Fiesta",
        validTill: "26 Aug 2026",
        color: "purple",
    },
    {
        id: "app10",
        code: "APP10",
        type: "new-user",
        title: "10% off on app orders",
        description: "Extra 10% off, up to ৳100, when you order from the Food Flow app.",
        restaurant: "All Restaurants",
        validTill: "31 Aug 2026",
        color: "orange",
    },
];

const COLOR_MAP = {
    orange: {
        badge: "bg-orange-50 text-orange-600",
        icon: "bg-orange-500",
        ribbon: "bg-orange-500",
    },
    green: {
        badge: "bg-green-50 text-green-600",
        icon: "bg-green-500",
        ribbon: "bg-green-500",
    },
    purple: {
        badge: "bg-purple-50 text-purple-600",
        icon: "bg-purple-500",
        ribbon: "bg-purple-500",
    },
    pink: {
        badge: "bg-pink-50 text-pink-600",
        icon: "bg-pink-500",
        ribbon: "bg-pink-500",
    },
};

const TYPE_ICON = {
    percentage: Percent,
    bogo: Gift,
    "free-delivery": Truck,
    "new-user": Sparkles,
};

/* ------------------------------------------------------------------ */
/* Offer card                                                          */
/* ------------------------------------------------------------------ */
const OfferCard = ({ offer }) => {
    const [copied, setCopied] = useState(false);
    const colors = COLOR_MAP[offer.color] ?? COLOR_MAP.orange;
    const Icon = TYPE_ICON[offer.type] ?? Tag;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(offer.code);
        } catch {
            /* clipboard not available — ignore */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="group relative overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm shadow-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70">
            {/* Ribbon */}
            <div className={`h-1.5 w-full ${colors.ribbon}`} />

            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colors.icon}`}
                    >
                        <Icon className="h-5 w-5 text-white" />
                    </div>

                    <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors.badge}`}
                    >
                        {offer.restaurant}
                    </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-gray-900">
                    {offer.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-gray-500">
                    {offer.description}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Valid till {offer.validTill}
                </div>

                {/* Coupon code row */}
                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5">
                    <span className="font-mono text-sm font-bold tracking-wider text-gray-700">
                        {offer.code}
                    </span>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${copied
                                ? "bg-green-500 text-white"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
            <Tag className="h-6 w-6 text-orange-500" />
        </div>
        <h3 className="mt-4 text-base font-bold text-gray-900">
            No offers in this category
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
            Check back soon, or browse another category for active deals.
        </p>
    </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
const OffersPage = () => {
    const [activeCategory, setActiveCategory] = useState("all");

    const filteredOffers = useMemo(() => {
        if (activeCategory === "all") return OFFERS;
        return OFFERS.filter((o) => o.type === activeCategory);
    }, [activeCategory]);

    const featuredOffer = OFFERS[0];

    return (
        <main className="bg-[#FFFDF8] pb-16">
            {/* ============== Breadcrumb ============== */}
            <div className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Link href="/" className="flex items-center gap-1 hover:text-orange-500">
                            <Home className="h-3.5 w-3.5" />
                            Home
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-600">Offers</span>
                    </nav>
                </div>
            </div>

            {/* ============== Hero ============== */}
            <section className="relative overflow-hidden bg-white">
                <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-orange-50 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 sm:text-sm">
                        <Flame className="h-4 w-4" />
                        {OFFERS.length} active deals right now
                    </div>

                    <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                        Offers &amp; Discounts
                        <span className="block text-orange-500">Save more on every order.</span>
                    </h1>

                    <p className="mt-4 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
                        Grab a coupon code below, apply it at checkout, and enjoy your
                        favorite meals for less.
                    </p>

                    {/* Featured offer strip */}
                    <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-gray-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-orange-300">
                                <Sparkles className="h-3.5 w-3.5" />
                                Featured
                            </span>
                            <h3 className="mt-2 text-lg font-bold sm:text-xl">
                                {featuredOffer.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-300">
                                {featuredOffer.description}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3">
                            <span className="font-mono text-base font-bold tracking-widest text-orange-300">
                                {featuredOffer.code}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============== Category Tabs ============== */}
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${activeCategory === cat.id
                                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                        : "border border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============== Offers Grid ============== */}
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {filteredOffers.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredOffers.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </div>
                )}
            </div>

            {/* ============== Newsletter CTA ============== */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-5 rounded-2xl bg-orange-50 px-6 py-10 text-center sm:px-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
                        <Tag className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                            Never miss a deal
                        </h3>
                        <p className="mt-1 max-w-md text-sm text-gray-500">
                            Subscribe to get exclusive offers and early access to
                            restaurant promotions straight to your inbox.
                        </p>
                    </div>

                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
                    >
                        <input
                            type="email"
                            required
                            placeholder="Enter your email"
                            className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-300"
                        />
                        <button
                            type="submit"
                            className="shrink-0 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default OffersPage;