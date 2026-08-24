'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Filter,
  Star,
  Clock,
  Utensils,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Heart,
  Truck,
  DollarSign,
  Grid,
  List,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  Store,
  Check,
} from 'lucide-react';
import {
  IRestaurant,
  ICategory,
  SortOption,
  PriceRange,
  IPaginationMeta,
} from '@/types/restaurant';

// Default categories structure ready for dynamic API hydration
const CATEGORIES: ICategory[] = [
  { _id: 'all', name: 'All Cuisines', slug: 'all', icon: '🍽️' },
  { _id: 'pizza', name: 'Pizza', slug: 'pizza', icon: '🍕' },
  { _id: 'burger', name: 'Burgers', slug: 'burger', icon: '🍔' },
  { _id: 'asian', name: 'Asian', slug: 'asian', icon: '🍜' },
  { _id: 'sushi', name: 'Sushi', slug: 'sushi', icon: '🍣' },
  { _id: 'dessert', name: 'Desserts', slug: 'dessert', icon: '🍰' },
  { _id: 'healthy', name: 'Healthy', slug: 'healthy', icon: '🥗' },
  { _id: 'mexican', name: 'Mexican', slug: 'mexican', icon: '🌮' },
  { _id: 'beverages', name: 'Drinks', slug: 'beverages', icon: '🧃' },
];

export default function ExploreRestaurantsPage() {
  // ---------------------------------------------------------------------------
  // REACT STATES (API-Ready)
  // ---------------------------------------------------------------------------
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [priceRange, setPriceRange] = useState<PriceRange | 'ALL'>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [freeDelivery, setFreeDelivery] = useState<boolean>(false);
  const [openNow, setOpenNow] = useState<boolean>(false);
  const [featuredOnly, setFeaturedOnly] = useState<boolean>(false);

  // Location & Header selection
  const [deliveryLocation, setDeliveryLocation] = useState<string>('Downtown, Manhattan, NY');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [tempLocationInput, setTempLocationInput] = useState<string>('');

  // Mobile Filter Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(9);
  const [paginationMeta, setPaginationMeta] = useState<IPaginationMeta>({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 9,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // ---------------------------------------------------------------------------
  // BACKEND API INTEGRATION HOOK
  // ---------------------------------------------------------------------------
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query string for Express/MongoDB Backend API
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedRestaurant !== 'all') params.append('restaurantId', selectedRestaurant);
      if (sortBy) params.append('sortBy', sortBy);
      if (priceRange !== 'ALL') params.append('priceRange', priceRange);
      if (minRating > 0) params.append('minRating', minRating.toString());
      if (freeDelivery) params.append('freeDelivery', 'true');
      if (openNow) params.append('openNow', 'true');
      if (featuredOnly) params.append('featuredOnly', 'true');
      if (deliveryLocation) params.append('location', deliveryLocation);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      // API Endpoint URL placeholder:
      // Replace URL with your actual backend endpoint e.g., `${process.env.NEXT_PUBLIC_API_URL}/api/v1/restaurants?${params.toString()}`
      const API_URL = `/api/v1/restaurants?${params.toString()}`;

      const res = await fetch(API_URL);

      if (!res.ok) {
        // If API endpoint is not yet connected to Express server, handle gracefully
        if (res.status === 404) {
          // Backend route not plugged in yet; keep restaurants array clean []
          setRestaurants([]);
          setPaginationMeta({
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
          setLoading(false);
          return;
        }
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setRestaurants(json.data);
        if (json.pagination) {
          setPaginationMeta(json.pagination);
        } else {
          setPaginationMeta({
            currentPage: json.currentPage || currentPage,
            totalPages: json.totalPages || Math.ceil((json.data.length || 0) / itemsPerPage),
            totalItems: json.totalItems || json.data.length || 0,
            itemsPerPage,
            hasNextPage: (json.currentPage || currentPage) < (json.totalPages || 1),
            hasPrevPage: (json.currentPage || currentPage) > 1,
          });
        }
      } else {
        setRestaurants([]);
      }
    } catch (err: unknown) {
      console.warn('Backend API connection pending or fetch error:', err);
      // Clean error state handling without injecting mock data
      setRestaurants([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch restaurants. Please ensure the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedRestaurant,
    sortBy,
    priceRange,
    minRating,
    freeDelivery,
    openNow,
    featuredOnly,
    deliveryLocation,
    currentPage,
    itemsPerPage,
  ]);

  // Trigger fetch when any query filter or page changes
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Reset to page 1 when search or filters change
  const handleFilterChange = (setter: () => void) => {
    setCurrentPage(1);
    setter();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedRestaurant('all');
    setSortBy('relevance');
    setPriceRange('ALL');
    setMinRating(0);
    setFreeDelivery(false);
    setOpenNow(false);
    setFeaturedOnly(false);
    setCurrentPage(1);
  };

  const toggleFavorite = (restaurantId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(restaurantId)
        ? prev.filter((id) => id !== restaurantId)
        : [...prev, restaurantId]
    );
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLocationInput.trim()) {
      setDeliveryLocation(tempLocationInput.trim());
      setTempLocationInput('');
      setIsLocationModalOpen(false);
      setCurrentPage(1);
    }
  };

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedRestaurant !== 'all' ? 1 : 0) +
    (priceRange !== 'ALL' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (freeDelivery ? 1 : 0) +
    (openNow ? 1 : 0) +
    (featuredOnly ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FFFDF8] text-slate-900 font-sans pb-20">
      {/* HEADER BAR & LOCATION SELECTOR */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-orange-100 text-xs font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Explore Local Flavors</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-heading">
                Discover Restaurants Nearby
              </h1>
              <p className="text-orange-100 text-sm mt-1 max-w-xl">
                Order online from top-rated restaurants, fast delivery straight to your doorstep.
              </p>
            </div>

            {/* LOCATION SELECTOR & DYNAMIC RESTAURANT SELECTOR */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Delivery Location Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 px-4 flex items-center gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MapPin className="w-4 h-4 text-amber-200" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] text-orange-100 uppercase tracking-wider font-semibold">
                    Delivery To
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate max-w-[160px] sm:max-w-[200px] block">
                    {deliveryLocation}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="ml-2 px-2.5 py-1 text-xs font-semibold bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors shadow-sm cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Dynamic Restaurant Dropdown Filter */}
              <div className="relative">
                <select
                  value={selectedRestaurant}
                  onChange={(e) =>
                    handleFilterChange(() => setSelectedRestaurant(e.target.value))
                  }
                  className="appearance-none bg-white text-slate-800 text-xs sm:text-sm font-medium py-2.5 pl-3.5 pr-8 rounded-xl shadow-sm border border-orange-200 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                >
                  <option value="all">All Partner Restaurants</option>
                  {restaurants.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR & CONTROLS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-1/2">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                handleFilterChange(() => setSearchQuery(e.target.value))
              }
              placeholder="Search by restaurant name, cuisine, dish..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => handleFilterChange(() => setSearchQuery(''))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls: Mobile Filter Button, Sort & View Toggle */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-colors relative"
            >
              <Filter className="w-4 h-4 text-orange-500" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Sort:
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    handleFilterChange(() => setSortBy(e.target.value as SortOption))
                  }
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium py-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating_desc">Highest Rated (★)</option>
                  <option value="delivery_time_asc">Fastest Delivery</option>
                  <option value="delivery_fee_asc">Lowest Delivery Fee</option>
                  <option value="min_order_asc">Min Order Amount</option>
                  <option value="popular">Most Popular</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER: SIDEBAR + RESTAURANT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* DESKTOP SIDEBAR FILTER */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 sticky top-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                  <h2 className="font-bold text-slate-900 font-heading text-lg">Filters</h2>
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset All
                  </button>
                )}
              </div>

              {/* Categories Section */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Categories
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat._id}
                        onClick={() =>
                          handleFilterChange(() => setSelectedCategory(cat.slug))
                        }
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-orange-500 text-white font-semibold shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Section */}
              <div className="mb-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Price Range
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['ALL', '$', '$$', '$$$', '$$$$'] as const).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() =>
                        handleFilterChange(() => setPriceRange(pr as PriceRange | 'ALL'))
                      }
                      className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                        priceRange === pr
                          ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Section */}
              <div className="mb-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Minimum Rating
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Any Rating', value: 0 },
                    { label: '3.5★ & above', value: 3.5 },
                    { label: '4.0★ & above', value: 4.0 },
                    { label: '4.5★ & above', value: 4.5 },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleFilterChange(() => setMinRating(r.value))}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        minRating === r.value
                          ? 'bg-amber-50 border border-amber-300 text-amber-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Star
                          className={`w-4 h-4 ${
                            r.value > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                        <span>{r.label}</span>
                      </div>
                      {minRating === r.value && (
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Feature Toggles */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Preferences
                </h3>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Free Delivery
                  </span>
                  <input
                    type="checkbox"
                    checked={freeDelivery}
                    onChange={(e) =>
                      handleFilterChange(() => setFreeDelivery(e.target.checked))
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Open Now Only
                  </span>
                  <input
                    type="checkbox"
                    checked={openNow}
                    onChange={(e) =>
                      handleFilterChange(() => setOpenNow(e.target.checked))
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Featured Partners
                  </span>
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(e) =>
                      handleFilterChange(() => setFeaturedOnly(e.target.checked))
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-slate-300 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </aside>

          {/* MAIN RESTAURANT DISPLAY AREA */}
          <main className="lg:col-span-3">
            {/* Active Filter Badges */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5 bg-orange-50/50 border border-orange-100 p-3 rounded-2xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Active Filters:
                </span>
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    Category: {selectedCategory}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setSelectedCategory('all'))}
                    />
                  </span>
                )}
                {priceRange !== 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    Price: {priceRange}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setPriceRange('ALL'))}
                    />
                  </span>
                )}
                {minRating > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    {minRating}+ ★
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setMinRating(0))}
                    />
                  </span>
                )}
                {freeDelivery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    Free Delivery
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setFreeDelivery(false))}
                    />
                  </span>
                )}
                {openNow && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    Open Now
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setOpenNow(false))}
                    />
                  </span>
                )}
                {featuredOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-full shadow-2xs">
                    Featured
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-orange-900"
                      onClick={() => handleFilterChange(() => setFeaturedOnly(false))}
                    />
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-orange-600 underline ml-auto hover:text-orange-800"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* ERROR STATE */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center my-6">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-red-800 font-heading">
                  Failed to Load Restaurants
                </h3>
                <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">{error}</p>
                <button
                  onClick={fetchRestaurants}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
              </div>
            )}

            {/* LOADING STATE: SKELETON CARDS */}
            {loading && !error && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs animate-pulse"
                  >
                    <div className="h-44 bg-slate-200 w-full" />
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-5 bg-slate-200 rounded w-2/3" />
                        <div className="h-4 bg-slate-200 rounded w-10" />
                      </div>
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY STATE: NO RESTAURANTS MATCHING FILTERS / STRICTLY NO DUMMY DATA */}
            {!loading && !error && restaurants.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-3xl p-12 text-center my-4 shadow-sm"
              >
                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 font-heading">
                  No Restaurants Found
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  We couldn&apos;t find any restaurants matching your current criteria or delivery location.
                  Try adjusting your search terms or clearing your active filters.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Change Delivery Location
                  </button>
                </div>
              </motion.div>
            )}

            {/* RESTAURANT CARDS GRID / LIST */}
            {!loading && !error && restaurants.length > 0 && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                <AnimatePresence>
                  {restaurants.map((restaurant, index) => {
                    const isFav = favoriteIds.includes(restaurant._id);

                    if (viewMode === 'list') {
                      return (
                        <motion.div
                          key={restaurant._id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col sm:flex-row"
                        >
                          <div className="relative sm:w-48 h-44 sm:h-auto shrink-0 overflow-hidden bg-slate-100">
                            {/* Restaurant Image */}
                            <img
                              src={restaurant.bannerImage || restaurant.logo || '/placeholder-restaurant.jpg'}
                              alt={restaurant.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            {restaurant.discountOffer && (
                              <span className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                {restaurant.discountOffer}
                              </span>
                            )}
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-slate-900 text-base group-hover:text-orange-600 transition-colors font-heading">
                                    {restaurant.name}
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                                    {restaurant.cuisines?.join(', ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavorite(restaurant._id, e)}
                                  className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                                >
                                  <Heart
                                    className={`w-5 h-5 ${
                                      isFav ? 'fill-red-500 text-red-500' : ''
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 flex-wrap">
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>{restaurant.rating.toFixed(1)}</span>
                                  <span className="text-slate-400 font-normal">
                                    ({restaurant.reviewCount})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                                  <span>
                                    {restaurant.deliveryTimeMin}-{restaurant.deliveryTimeMax} min
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-slate-500">
                                  <Truck className="w-3.5 h-3.5 text-orange-500" />
                                  <span>
                                    {restaurant.deliveryFee === 0
                                      ? 'Free Delivery'
                                      : `$${restaurant.deliveryFee.toFixed(2)}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs text-slate-400">
                                Min order: ${restaurant.minOrderAmount}
                              </span>
                              <Link
                                href={`/restaurants/${restaurant.slug || restaurant._id}`}
                                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1"
                              >
                                View Menu
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    // Grid View
                    return (
                      <motion.div
                        key={restaurant._id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Container */}
                          <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                            <img
                              src={restaurant.bannerImage || restaurant.logo || '/placeholder-restaurant.jpg'}
                              alt={restaurant.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60" />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                              <div className="flex flex-col gap-1 items-start">
                                {restaurant.isFeatured && (
                                  <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs pointer-events-auto flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Featured
                                  </span>
                                )}
                                {restaurant.discountOffer && (
                                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs pointer-events-auto">
                                    {restaurant.discountOffer}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(restaurant._id, e)}
                                className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-600 hover:text-red-500 shadow-sm transition-transform active:scale-90 pointer-events-auto cursor-pointer"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isFav ? 'fill-red-500 text-red-500' : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Bottom Overlay Info */}
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                              <span className="text-[11px] font-semibold bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                                {restaurant.isOpen ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Open Now
                                  </span>
                                ) : (
                                  <span className="text-slate-300">Closed</span>
                                )}
                              </span>
                              <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md">
                                {restaurant.priceRange}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-slate-900 text-base group-hover:text-orange-600 transition-colors font-heading truncate">
                                {restaurant.name}
                              </h3>
                              <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded-md text-xs font-bold shrink-0">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{restaurant.rating ? restaurant.rating.toFixed(1) : '4.5'}</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {restaurant.cuisines?.length
                                ? restaurant.cuisines.join(' • ')
                                : 'Various Cuisines'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <span>
                                  {restaurant.deliveryTimeMin || 20}-
                                  {restaurant.deliveryTimeMax || 35} min
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-end">
                                <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <span>
                                  {restaurant.deliveryFee === 0
                                    ? 'Free'
                                    : `$${restaurant.deliveryFee?.toFixed(2) || '1.99'}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Link */}
                        <div className="p-4 pt-0">
                          <Link
                            href={`/restaurants/${restaurant.slug || restaurant._id}`}
                            className="w-full py-2.5 bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 group/btn"
                          >
                            <span>View Restaurant Menu</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* PAGINATION SECTION */}
            {!loading && !error && paginationMeta.totalPages > 1 && (
              <div className="mt-10 bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">
                  Showing Page{' '}
                  <strong className="text-slate-800">{paginationMeta.currentPage}</strong> of{' '}
                  <strong className="text-slate-800">{paginationMeta.totalPages}</strong> (Total{' '}
                  {paginationMeta.totalItems} restaurants)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!paginationMeta.hasPrevPage}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: paginationMeta.totalPages }).map((_, pageIdx) => {
                    const pageNum = pageIdx + 1;
                    const isActive = pageNum === paginationMeta.currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={!paginationMeta.hasNextPage}
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, paginationMeta.totalPages)
                      )
                    }
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* LOCATION CHANGE MODAL */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold font-heading text-lg">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <span>Select Delivery Address</span>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLocationSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Enter New Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tempLocationInput}
                      onChange={(e) => setTempLocationInput(e.target.value)}
                      placeholder="e.g., Brooklyn, NY or 10001"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Popular Delivery Hubs
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Downtown, Manhattan',
                      'Midtown East, NY',
                      'Williamsburg, Brooklyn',
                      'Queens, NY',
                      'Jersey City, NJ',
                    ].map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => {
                          setDeliveryLocation(hub);
                          setIsLocationModalOpen(false);
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors"
                      >
                        {hub}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Save & Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE FILTERS DRAWER */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs lg:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-xs h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                    <h2 className="font-bold text-slate-900 font-heading text-lg">Filters</h2>
                  </div>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat.slug;
                      return (
                        <button
                          key={cat._id}
                          onClick={() => {
                            setSelectedCategory(cat.slug);
                            setCurrentPage(1);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-orange-500 text-white font-semibold'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Price Range
                  </h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['ALL', '$', '$$', '$$$', '$$$$'] as const).map((pr) => (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => {
                          setPriceRange(pr as PriceRange | 'ALL');
                          setCurrentPage(1);
                        }}
                        className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                          priceRange === pr
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {pr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">Free Delivery</span>
                    <input
                      type="checkbox"
                      checked={freeDelivery}
                      onChange={(e) => {
                        setFreeDelivery(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">Open Now Only</span>
                    <input
                      type="checkbox"
                      checked={openNow}
                      onChange={(e) => {
                        setOpenNow(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded text-orange-500"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-orange-500 text-white font-bold text-sm rounded-xl shadow-xs"
                >
                  Apply Filters ({activeFiltersCount})
                </button>
                <button
                  onClick={() => {
                    handleResetFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="w-full py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
