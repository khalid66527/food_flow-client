'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  AlertCircle,
  X,
  SlidersHorizontal,
  Loader2,
  Leaf,
  Flame,
  Utensils,
  Pizza,
  Fish,
  CakeSlice,
  Salad,
  Sandwich,
  Drumstick,
  Coffee,
} from 'lucide-react';
import { IGlobalFoodItem, FoodSortOption, IPaginationMeta } from '@/types/restaurant';
import { getAllGlobalFoodItems, getFoodCategories } from '@/lib/api/restaurant';
import FoodCard from '@/components/restaurants/FoodCard';
import { useCart } from '@/contexts/CartContext';

// ---------------------------------------------------------------------------
// SIDEBAR CATEGORY DEFINITIONS (dynamic, fetched from database)
// ---------------------------------------------------------------------------
interface SidebarCategory {
  id: string;
  label: string;
  emoji: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  pizza: '🍕',
  burger: '🍔',
  sushi: '🍣',
  seafood: '🐟',
  dessert: '🍰',
  healthy: '🥗',
  salad: '🥗',
  mexican: '🌮',
  biryani: '🍛',
  rice: '🍛',
  bbq: '🍖',
  grill: '🍖',
  beverage: '🥤',
  drink: '🥤',
  appetizer: '🍴',
  starter: '🍴',
  main: '🍽️',
  snack: '🍿',
  sandwich: '🥪',
  chicken: '🍗',
  steak: '🥩',
  pasta: '🍝',
  noodle: '🍜',
  soup: '🍲',
  breakfast: '🥞',
  lunch: '☀️',
  dinner: '🌙',
  combo: '📦',
  side: '🥗',
  default: '🏷️',
};

function getCategoryEmoji(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (key !== 'default' && lower.includes(key)) return emoji;
  }
  return CATEGORY_EMOJIS.default;
}

// ---------------------------------------------------------------------------
// RESPONSIVE ITEMS-PER-PAGE HOOK
// ---------------------------------------------------------------------------
function useResponsiveLimit() {
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setLimit(3); // mobile: 1 column, 3 rows
      else if (w < 1024) setLimit(6); // tablet: 2 columns, 3 rows
      else setLimit(9); // desktop/laptop: 3 columns, 3 rows
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return limit;
}

// ---------------------------------------------------------------------------
// PAGE COMPONENT
// ---------------------------------------------------------------------------
export default function ExploreFoodPage() {
  const { addItem, canAddToCart } = useCart();
  const responsiveLimit = useResponsiveLimit();

  // Data
  const [foodItems, setFoodItems] = useState<IGlobalFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<IPaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters — sidebar
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);

  // Filters — top bar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [sortBy, setSortBy] = useState<FoodSortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Restaurant dropdown (extracted from food items)
  const [availableRestaurants, setAvailableRestaurants] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Cart feedback
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  // Mobile sidebar overlay
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dynamic categories from database
  const [categories, setCategories] = useState<SidebarCategory[]>([]);

  // ---------------------------------------------------------------------------
  // DEBOUNCE SEARCH
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch dynamic categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getFoodCategories();
        if (res.success && Array.isArray(res.data)) {
          const dynamicCategories: SidebarCategory[] = [
            { id: 'all', label: 'All Cuisines', emoji: '🍽️' },
            ...res.data.map((cat) => ({
              id: cat,
              label: cat,
              emoji: getCategoryEmoji(cat),
            })),
          ];
          setCategories(dynamicCategories);
        }
      } catch {
        // Silently fall back to empty list
      }
    };
    fetchCategories();
  }, []);

  // Reset to page 1 when the responsive limit changes (viewport resize)
  useEffect(() => {
    setCurrentPage(1);
  }, [responsiveLimit]);

  // ---------------------------------------------------------------------------
  // BUILD QUERY & FETCH
  // ---------------------------------------------------------------------------
  const fetchFoodItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: Record<string, string> = {
      page: String(currentPage),
      limit: String(responsiveLimit),
      sortBy,
    };

    if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
    if (selectedRestaurant !== 'all') query.restaurantId = selectedRestaurant;
    if (selectedCategory !== 'all') query.category = selectedCategory;
    if (isVegetarian) query.isVegetarian = 'true';
    if (isSpicy) query.isSpicy = 'true';

    try {
      const res = await getAllGlobalFoodItems(query);
      if (res.success && Array.isArray(res.data)) {
        setFoodItems(res.data);
        if ((res as unknown as { pagination?: typeof pagination }).pagination) {
          setPagination((res as unknown as { pagination: typeof pagination }).pagination);
        }

        const restaurantMap = new Map<string, string>();
        res.data.forEach((item) => {
          if (item.restaurantId && item.restaurantName) {
            restaurantMap.set(item.restaurantId, item.restaurantName);
          }
        });
        const restaurants = Array.from(restaurantMap.entries()).map(([id, name]) => ({ id, name }));
        setAvailableRestaurants((prev) => {
          const merged = new Map<string, string>(prev.map((r) => [r.id, r.name]));
          restaurants.forEach((r) => merged.set(r.id, r.name));
          return Array.from(merged.entries()).map(([id, name]) => ({ id, name }));
        });
      } else {
        setFoodItems([]);
        setError(res.message || 'Failed to load dishes.');
      }
    } catch {
      setFoodItems([]);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedRestaurant, sortBy, selectedCategory, isVegetarian, isSpicy, responsiveLimit]);

  useEffect(() => {
    fetchFoodItems();
  }, [fetchFoodItems]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddToCart = (item: IGlobalFoodItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item, 1);
    setAddedItemId(item._id);
    setTimeout(() => setAddedItemId(null), 1500);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRestaurant('all');
    setSelectedCategory('all');
    setIsVegetarian(false);
    setIsSpicy(false);
    setSortBy('newest');
    setCurrentPage(1);
  };

  const activeFilterCount =
    (debouncedSearch.trim() ? 1 : 0) +
    (selectedRestaurant !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (isVegetarian ? 1 : 0) +
    (isSpicy ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // ---------------------------------------------------------------------------
  // SIDEBAR CONTENT (shared between desktop & mobile)
  // ---------------------------------------------------------------------------
  const sidebarContent = (
    <div className="flex flex-col gap-6">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Categories</h3>
        <div className="space-y-0.5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                }`}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="flex-1 text-left">{cat.label}</span>
                {isActive && cat.id !== 'all' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dietary Preferences */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Dietary Preferences</h3>
        <div className="space-y-2">
          {/* Vegetarian */}
          <button
            type="button"
            onClick={() => { setIsVegetarian((v) => !v); setCurrentPage(1); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isVegetarian
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span className="flex-1 text-left">Vegetarian</span>
            <span className={`w-8 h-5 rounded-full transition-all relative ${isVegetarian ? 'bg-emerald-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isVegetarian ? 'left-[14px]' : 'left-0.5'}`} />
            </span>
          </button>
          {/* Spicy */}
          <button
            type="button"
            onClick={() => { setIsSpicy((s) => !s); setCurrentPage(1); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isSpicy
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="flex-1 text-left">Spicy</span>
            <span className={`w-8 h-5 rounded-full transition-all relative ${isSpicy ? 'bg-rose-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isSpicy ? 'left-[14px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleResetFilters}
          className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer"
        >
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FFFDF8] text-gray-900 font-sans pb-20">
      {/* HEADER */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Explore Dishes
              </h1>
              <p className="text-orange-100 text-sm mt-1 max-w-md">
                Browse dishes from our partner restaurants, fast delivery to your doorstep.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Location display */}
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-200" />
                <span className="truncate max-w-[140px]">Downtown, Manhattan, NY</span>
              </div>

              {/* Restaurant dropdown */}
              <div className="relative">
                <select
                  value={selectedRestaurant}
                  onChange={(e) => { setSelectedRestaurant(e.target.value); setCurrentPage(1); }}
                  className="appearance-none bg-white text-gray-800 text-xs sm:text-sm font-medium py-2.5 pl-3.5 pr-8 rounded-xl shadow-sm border border-orange-200 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                >
                  <option value="all">All Restaurants</option>
                  {availableRestaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH + CONTROLS BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Mobile Filters button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, cuisines..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as FoodSortOption); setCurrentPage(1); }}
              className="appearance-none bg-white text-gray-700 text-sm font-medium py-2.5 pl-3.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 font-semibold rounded-full border border-orange-200">
                {categories.find((c) => c.id === selectedCategory)?.label || selectedCategory}
                <button type="button" onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }} className="text-orange-400 hover:text-orange-700 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isVegetarian && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                Vegetarian
                <button type="button" onClick={() => { setIsVegetarian(false); setCurrentPage(1); }} className="text-emerald-400 hover:text-emerald-700 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isSpicy && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 font-semibold rounded-full border border-rose-200">
                Spicy
                <button type="button" onClick={() => { setIsSpicy(false); setCurrentPage(1); }} className="text-rose-400 hover:text-rose-700 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedRestaurant !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 font-semibold rounded-full border border-orange-200">
                {availableRestaurants.find((r) => r.id === selectedRestaurant)?.name || 'Restaurant'}
                <button type="button" onClick={() => { setSelectedRestaurant('all'); setCurrentPage(1); }} className="text-orange-400 hover:text-orange-700 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeFilterCount > 1 && (
              <button type="button" onClick={handleResetFilters} className="text-orange-500 hover:text-orange-700 font-medium underline cursor-pointer">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* MAIN CONTENT: SIDEBAR + GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex gap-8">

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {sidebarContent}
            </div>
          </aside>

          {/* MOBILE SIDEBAR OVERLAY */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] bg-white shadow-2xl lg:hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">Filters</h2>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    {sidebarContent}
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="w-full py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/20 cursor-pointer"
                    >
                      Show {pagination.totalItems || 0} Results
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* RIGHT CONTENT */}
          <main className="flex-1 min-w-0">
            {/* LOADING */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 mb-4">
                  <AlertCircle className="w-7 h-7 text-rose-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-4">{error}</p>
                <button type="button" onClick={fetchFoodItems} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                  Try Again
                </button>
              </motion.div>
            )}

            {/* EMPTY */}
            {!loading && !error && foodItems.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 mb-4">
                  <UtensilsCrossed className="w-7 h-7 text-orange-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">No dishes found</p>
                <p className="text-xs text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button type="button" onClick={handleResetFilters} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                  Reset Filters
                </button>
              </motion.div>
            )}

            {/* FOOD CARDS — Responsive grid */}
            {!loading && !error && foodItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {foodItems.map((item, index) => (
                    <FoodCard
                      key={item._id}
                      item={item}
                      index={index}
                      viewMode="grid"
                      onAddToCart={handleAddToCart}
                      addedFeedbackId={addedItemId}
                      canAddToCart={canAddToCart}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* PAGINATION */}
            {!loading && !error && pagination.totalPages > 1 && (
              <div className="mt-10 bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <span className="text-xs text-gray-500 font-medium">
                  Page <strong className="text-gray-800">{pagination.currentPage}</strong> of{' '}
                  <strong className="text-gray-800">{pagination.totalPages}</strong> ({pagination.totalItems} dishes)
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={!pagination.hasPrevPage} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: pagination.totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === pagination.currentPage;
                    return (
                      <button key={pageNum} type="button" onClick={() => setCurrentPage(pageNum)} className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button type="button" disabled={!pagination.hasNextPage} onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
