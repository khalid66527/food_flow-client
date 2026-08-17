"use client";

import React from "react";
import Link from "next/link";
import {
    ArrowRight,
    MapPin,
    Search,
    Clock3,
    Star,
    Bike,
    Sparkles,
} from "lucide-react";

const Banner = () => {
    return (
        <section className="relative overflow-hidden bg-white">
            {/* Background Decorations */}
            <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

                    {/* ================= LEFT CONTENT ================= */}
                    <div className="max-w-2xl">

                        {/* Small Badge */}
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-600 sm:text-sm">
                            <Sparkles className="h-4 w-4" />
                            Delicious food, delivered fast
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                            Your Favorite Food,
                            <span className="block text-orange-500">
                                Delivered to You.
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="mt-5 max-w-xl text-sm leading-7 text-gray-500 sm:text-base sm:leading-8">
                            Discover the best restaurants around you, order your favorite
                            meals, and enjoy fresh food delivered right to your doorstep.
                            Fast, easy, and delicious with Food Flow.
                        </p>

                        {/* Search Box */}
                        <div className="mt-7 flex max-w-xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-100 sm:flex-row sm:items-center sm:rounded-full">

                            <div className="flex flex-1 items-center gap-2 px-3">
                                <MapPin className="h-5 w-5 shrink-0 text-orange-500" />

                                <input
                                    type="text"
                                    placeholder="Enter your delivery location"
                                    className="w-full bg-transparent py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                />
                            </div>

                            <Link
                                href="/restaurants"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 sm:rounded-full"
                            >
                                Find Food
                                <Search className="h-4 w-4" />
                            </Link>
                        </div>

                        {/* CTA Buttons */}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                            <Link
                                href="/restaurants"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
                            >
                                Order Now
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <Link
                                href="/offers"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                            >
                                Explore Offers
                            </Link>

                        </div>

                        {/* Trust Stats */}
                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-gray-100 pt-6">

                            <div>
                                <p className="text-lg font-bold text-gray-800">500+</p>
                                <p className="text-xs text-gray-400">Restaurants</p>
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div>
                                <p className="text-lg font-bold text-gray-800">10K+</p>
                                <p className="text-xs text-gray-400">Happy Customers</p>
                            </div>

                            <div className="h-8 w-px bg-gray-200" />

                            <div className="flex items-center gap-1.5">
                                <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
                                <div>
                                    <p className="text-lg font-bold text-gray-800">4.8</p>
                                    <p className="text-xs text-gray-400">Customer Rating</p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ================= RIGHT IMAGE ================= */}
                    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">

                        {/* Main Image Background */}
                        <div className="relative mx-auto aspect-square max-w-[480px]">

                            {/* Orange Circle */}
                            <div className="absolute inset-[8%] rounded-full bg-orange-100" />

                            <div className="absolute inset-[14%] rounded-full border-[18px] border-white bg-orange-50 shadow-inner" />

                            {/* Main Food Image */}
                            <div className="absolute inset-[20%] overflow-hidden rounded-full border-8 border-white shadow-2xl shadow-orange-200/50">
                                <img
                                    src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85"
                                    alt="Delicious pizza"
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {/* ================= FLOATING CARD 1 ================= */}
                            <div className="absolute left-0 top-[22%] flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-xl shadow-gray-200/60 sm:px-4">

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                                    <Bike className="h-5 w-5 text-orange-500" />
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-gray-400">
                                        Delivery
                                    </p>
                                    <p className="text-sm font-bold text-gray-800">
                                        20–30 min
                                    </p>
                                </div>

                            </div>

                            {/* ================= FLOATING CARD 2 ================= */}
                            <div className="absolute right-0 top-[12%] flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-xl shadow-gray-200/60 sm:px-4 sm:py-3">

                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-50">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-gray-800">
                                        4.8/5
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        Top Rated
                                    </p>
                                </div>

                            </div>

                            {/* ================= FLOATING CARD 3 ================= */}
                            <div className="absolute bottom-[14%] right-0 rounded-2xl bg-orange-500 px-4 py-3 text-white shadow-xl shadow-orange-300/40 sm:px-5">

                                <p className="text-[11px] font-medium text-orange-100">
                                    Special Offer
                                </p>

                                <p className="mt-0.5 text-xl font-bold">
                                    30% OFF
                                </p>

                                <p className="mt-0.5 text-[10px] text-orange-100">
                                    On your first order
                                </p>

                            </div>

                            {/* ================= FLOATING CARD 4 ================= */}
                            <div className="absolute bottom-[20%] left-0 hidden items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lg shadow-gray-200/60 sm:flex">

                                <Clock3 className="h-4 w-4 text-orange-500" />

                                <span className="text-xs font-semibold text-gray-700">
                                    Fast Delivery
                                </span>

                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Banner;