"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Search,
    MapPin,
    Star,
    Clock3,
    Bike,
    Heart,
    SlidersHorizontal,
    X,
    ChevronDown,
    ChevronRight,
    Tag,
    Home,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Dummy data — replace with API data (GET /api/restaurants)           */
/* ------------------------------------------------------------------ */
const RESTAURANTS = [
    {
        id: "burger-house",
        name: "Burger House",
        image:
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
        cuisine: "Burgers, Fast Food",
        rating: 4.8,
        reviews: 320,
        eta: "20-30 min",
        deliveryFee: 40,
        priceRange: 2,
        hasOffer: true,
        offerText: "30% OFF",
        isOpen: true,
    },
    {
        id: "sushi-world",
        name: "Sushi World",
        image:
            "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80",
        cuisine: "Japanese, Sushi",
        rating: 4.9,
        reviews: 512,
        eta: "30-40 min",
        deliveryFee: 60,
        priceRange: 3,
        hasOffer: false,
        isOpen: true,
    },
    {
        id: "pizza-palace",
        name: "Pizza Palace",
        image:
            "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
        cuisine: "Italian, Pizza",
        rating: 4.6,
        reviews: 248,
        eta: "25-35 min",
        deliveryFee: 30,
        priceRange: 2,
        hasOffer: true,
        offerText: "Free Delivery",
        isOpen: true,
    },
    {
        id: "spice-affair",
        name: "Spice Affair",
        image:
            "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
        cuisine: "Indian, Curry",
        rating: 4.7,
        reviews: 189,
        eta: "35-45 min",
        deliveryFee: 50,
        priceRange: 2,
        hasOffer: false,
        isOpen: false,
    },
    {
        id: "green-bowl",
        name: "Green Bowl",
        image:
            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
        cuisine: "Healthy, Salads",
        rating: 4.5,
        reviews: 97,
        eta: "15-25 min",
        deliveryFee: 35,
        priceRange: 2,
        hasOffer: false,
        isOpen: true,
    },
    {
        id: "taco-fiesta",
        name: "Taco Fiesta",
        image:
            "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80",
        cuisine: "Mexican, Tacos",
        rating: 4.4,
        reviews: 156,
        eta: "20-30 min",
        deliveryFee: 45,
        priceRange: 1,
        hasOffer: true,
        offerText: "Buy 1 Get 1",
        isOpen: true,
    },
    {
        id: "noodle-street",
        name: "Noodle Street",
        image:
            "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80",
        cuisine: "Chinese, Noodles",
        rating: 4.3,
        reviews: 210,
        eta: "25-35 min",
        deliveryFee: 40,
        priceRange: 1,
        hasOffer: false,
        isOpen: true,
    },
    {
        id: "grill-master",
        name: "Grill Master",
        image:
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        cuisine: "BBQ, Grill",
        rating: 4.7,
        reviews: 275,
        eta: "30-40 min",
        deliveryFee: 55,
        priceRange: 3,
        hasOffer: false,
        isOpen: true,
    },
    {
        id: "sweet-treats",
        name: "Sweet Treats",
        image:
            "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=800&q=80",
        cuisine: "Desserts, Bakery",
        rating: 4.9,
        reviews: 402,
        eta: "15-20 min",
        deliveryFee: 25,
        priceRange: 1,
        hasOffer: true,
        offerText: "20% OFF",
        isOpen: false,
    },
];

const CUISINES = [
    "Burgers",
    "Japanese",
    "Italian",
    "Indian",
    "Healthy",
    "Mexican",
    "Chinese",
    "BBQ",
    "Desserts",
];

const DELIVERY_TIMES = [
    { label: "Under 20 min", value: 20 },
    { label: "Under 30 min", value: 30 },
    { label: "Under 45 min", value: 45 },
];

const PRICE_LEVELS = [
    { label: "৳ Budget", value: 1 },
    { label: "৳৳ Moderate", value: 2 },
    { label: "৳৳৳ Premium", value: 3 },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const SectionTitle = ({ children }) => (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-800">
        {children}
    </h3>
);

const CheckboxRow = ({ label, checked, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900">
        <span>{label}</span>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
        />
    </label>
);

const RadioRow = ({ label, checked, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900">
        <span>{label}</span>
        <input
            type="radio"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 border-gray-300 text-orange-500 focus:ring-orange-400"
        />
    </label>
);

/* ------------------------------------------------------------------ */
/* Filter panel — shared between desktop sidebar & mobile drawer       */
/* ------------------------------------------------------------------ */
const FilterPanel = ({ filters, setFilters, onReset }) => {
    const toggleCuisine = (cuisine) => {
        setFilters((prev) => ({
            ...prev,
            cuisines: prev.cuisines.includes(cuisine)
                ? prev.cuisines.filter((c) => c !== cuisine)
                : [...prev.cuisines, cuisine],
        }));
    };

    return (
        <div className="space-y-7">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Filters</h2>
                <button
                    onClick={onReset}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                >
                    Reset all
                </button>
            </div>

            {/* Cuisine */}
            <div>
                <SectionTitle>Cuisine</SectionTitle>
                <div className="mt-3 space-y-0.5">
                    {CUISINES.map((cuisine) => (
                        <CheckboxRow
                            key={cuisine}
                            label={cuisine}
                            checked={filters.cuisines.includes(cuisine)}
                            onChange={() => toggleCuisine(cuisine)}
                        />
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Rating */}
            <div>
                <SectionTitle>Rating</SectionTitle>
                <div className="mt-3 space-y-0.5">
                    {[4.5, 4, 3.5].map((r) => (
                        <RadioRow
                            key={r}
                            label={`${r}+ Stars`}
                            checked={filters.minRating === r}
                            onChange={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    minRating: prev.minRating === r ? 0 : r,
                                }))
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Delivery time */}
            <div>
                <SectionTitle>Delivery Time</SectionTitle>
                <div className="mt-3 space-y-0.5">
                    {DELIVERY_TIMES.map((d) => (
                        <RadioRow
                            key={d.value}
                            label={d.label}
                            checked={filters.maxTime === d.value}
                            onChange={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    maxTime: prev.maxTime === d.value ? 0 : d.value,
                                }))
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Price */}
            <div>
                <SectionTitle>Price</SectionTitle>
                <div className="mt-3 space-y-0.5">
                    {PRICE_LEVELS.map((p) => (
                        <RadioRow
                            key={p.value}
                            label={p.label}
                            checked={filters.priceLevel === p.value}
                            onChange={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    priceLevel: prev.priceLevel === p.value ? 0 : p.value,
                                }))
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Offers & open now */}
            <div>
                <SectionTitle>Quick Filters</SectionTitle>
                <div className="mt-3 space-y-0.5">
                    <CheckboxRow
                        label="Offers available"
                        checked={filters.offersOnly}
                        onChange={() =>
                            setFilters((prev) => ({ ...prev, offersOnly: !prev.offersOnly }))
                        }
                    />
                    <CheckboxRow
                        label="Open now"
                        checked={filters.openNow}
                        onChange={() =>
                            setFilters((prev) => ({ ...prev, openNow: !prev.openNow }))
                        }
                    />
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Restaurant card                                                     */
/* ------------------------------------------------------------------ */
const RestaurantCard = ({ restaurant, isFavorite, onToggleFavorite }) => {
    const {
        id,
        name,
        image,
        cuisine,
        rating,
        reviews,
        eta,
        deliveryFee,
        hasOffer,
        offerText,
        isOpen,
    } = restaurant;

    return (
        <div className="group overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm shadow-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70">
            {/* Image */}
            <div className="relative h-44 w-full overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Closed overlay */}
                {!isOpen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/55">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800">
                            Currently Closed
                        </span>
                    </div>
                )}

                {/* Offer badge */}
                {hasOffer && isOpen && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md shadow-orange-500/30">
                        <Tag className="h-3 w-3" />
                        {offerText}
                    </span>
                )}

                {/* Favorite */}
                <button
                    onClick={() => onToggleFavorite(id)}
                    aria-label="Toggle favorite"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md backdrop-blur transition-colors hover:text-orange-500"
                >
                    <Heart
                        className={`h-4 w-4 ${isFavorite ? "fill-orange-500 text-orange-500" : ""
                            }`}
                    />
                </button>
            </div>

            {/* Body */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900">{name}</h3>
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
                        <Star className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                        {rating}
                    </div>
                </div>

                <p className="mt-1 text-sm text-gray-500">{cuisine}</p>
                <p className="text-xs text-gray-400">{reviews} reviews</p>

                <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-orange-500" />
                        {eta}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Bike className="h-3.5 w-3.5 text-orange-500" />
                        ৳{deliveryFee} delivery
                    </span>
                </div>

                <Link
                    href={isOpen ? `/restaurants/${id}` : "#"}
                    className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${isOpen
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
                            : "pointer-events-none bg-gray-100 text-gray-400"
                        }`}
                >
                    View Menu
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Skeleton card — loading state                                       */
/* ------------------------------------------------------------------ */
const RestaurantCardSkeleton = () => (
    <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm">
        <div className="h-44 w-full animate-pulse bg-gray-100" />
        <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            <div className="h-9 w-full animate-pulse rounded-full bg-gray-100" />
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
const EmptyState = ({ onReset }) => (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
            <Search className="h-6 w-6 text-orange-500" />
        </div>
        <h3 className="mt-4 text-base font-bold text-gray-900">
            No restaurants found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
            Try adjusting your filters or search term to see more results.
        </p>
        <button
            onClick={onReset}
            className="mt-5 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
        >
            Clear Filters
        </button>
    </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
const initialFilters = {
    cuisines: [],
    minRating: 0,
    maxTime: 0,
    priceLevel: 0,
    offersOnly: false,
    openNow: false,
};

const RestaurantsPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [location, setLocation] = useState("Savar, Dhaka");
    const [filters, setFilters] = useState(initialFilters);
    const [sortBy, setSortBy] = useState("recommended");
    const [favorites, setFavorites] = useState([]);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [isLoading] = useState(false); // wire this up to real fetch state

    const toggleFavorite = (id) => {
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
        );
    };

    const resetFilters = () => setFilters(initialFilters);

    const filteredRestaurants = useMemo(() => {
        let list = RESTAURANTS.filter((r) => {
            const matchesSearch =
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.cuisine.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCuisine =
                filters.cuisines.length === 0 ||
                filters.cuisines.some((c) =>
                    r.cuisine.toLowerCase().includes(c.toLowerCase())
                );

            const matchesRating = r.rating >= filters.minRating;

            const matchesTime =
                filters.maxTime === 0 ||
                parseInt(r.eta.split("-")[1], 10) <= filters.maxTime;

            const matchesPrice =
                filters.priceLevel === 0 || r.priceRange === filters.priceLevel;

            const matchesOffer = !filters.offersOnly || r.hasOffer;
            const matchesOpen = !filters.openNow || r.isOpen;

            return (
                matchesSearch &&
                matchesCuisine &&
                matchesRating &&
                matchesTime &&
                matchesPrice &&
                matchesOffer &&
                matchesOpen
            );
        });

        if (sortBy === "rating") {
            list = [...list].sort((a, b) => b.rating - a.rating);
        } else if (sortBy === "delivery-time") {
            list = [...list].sort(
                (a, b) => parseInt(a.eta) - parseInt(b.eta)
            );
        } else if (sortBy === "delivery-fee") {
            list = [...list].sort((a, b) => a.deliveryFee - b.deliveryFee);
        }

        return list;
    }, [searchTerm, filters, sortBy]);

    const activeFilterCount =
        filters.cuisines.length +
        (filters.minRating ? 1 : 0) +
        (filters.maxTime ? 1 : 0) +
        (filters.priceLevel ? 1 : 0) +
        (filters.offersOnly ? 1 : 0) +
        (filters.openNow ? 1 : 0);

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
                        <span className="font-medium text-gray-600">Restaurants</span>
                    </nav>
                </div>
            </div>

            {/* ============== Header / Search ============== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-b border-gray-100 bg-white"
            >
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Restaurants near you
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        {filteredRestaurants.length} restaurants delivering to your location
                    </p>

                    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full">
                        <div className="flex flex-1 items-center gap-2 border-b border-gray-100 px-3 py-2 sm:border-b-0 sm:border-r">
                            <MapPin className="h-5 w-5 shrink-0 text-orange-500" />
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Delivery location"
                                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-[2] items-center gap-2 px-3 py-2">
                            <Search className="h-5 w-5 shrink-0 text-gray-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search restaurant or cuisine"
                                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ============== Body ============== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            >
                <div className="flex gap-8">
                    {/* ---------- Desktop Sidebar ---------- */}
                    <aside className="hidden w-72 shrink-0 lg:block">
                        <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100">
                            <FilterPanel
                                filters={filters}
                                setFilters={setFilters}
                                onReset={resetFilters}
                            />
                        </div>
                    </aside>

                    {/* ---------- Results ---------- */}
                    <section className="flex-1">
                        {/* Toolbar */}
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <button
                                onClick={() => setMobileFilterOpen(true)}
                                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm lg:hidden"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            <div className="ml-auto flex items-center gap-2">
                                <span className="hidden text-sm text-gray-500 sm:inline">
                                    Sort by
                                </span>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="appearance-none rounded-full border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-gray-700 outline-none focus:border-orange-300"
                                    >
                                        <option value="recommended">Recommended</option>
                                        <option value="rating">Top Rated</option>
                                        <option value="delivery-time">Fastest Delivery</option>
                                        <option value="delivery-fee">Lowest Delivery Fee</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <RestaurantCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : filteredRestaurants.length === 0 ? (
                            <EmptyState onReset={resetFilters} />
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredRestaurants.map((restaurant) => (
                                    <RestaurantCard
                                        key={restaurant.id}
                                        restaurant={restaurant}
                                        isFavorite={favorites.includes(restaurant.id)}
                                        onToggleFavorite={toggleFavorite}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </motion.div>

            {/* ============== Mobile Filter Drawer ============== */}
            {mobileFilterOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                        onClick={() => setMobileFilterOpen(false)}
                    />
                    <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-2xl animate-in slide-in-from-right">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-base font-bold text-gray-900">
                                Filter Restaurants
                            </span>
                            <button
                                onClick={() => setMobileFilterOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <FilterPanel
                            filters={filters}
                            setFilters={setFilters}
                            onReset={resetFilters}
                        />

                        <button
                            onClick={() => setMobileFilterOpen(false)}
                            className="mt-8 w-full rounded-full bg-orange-500 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
                        >
                            Show {filteredRestaurants.length} Results
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
};

export default RestaurantsPage;