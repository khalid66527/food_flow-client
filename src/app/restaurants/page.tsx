'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Leaf,
  Flame,
  Compass,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { IGlobalFoodItem, FoodSortOption, IPaginationMeta } from '@/types/restaurant';
import { getAllGlobalFoodItems, getAllRestaurants } from '@/lib/api/restaurant';
import { getGlobalCategories } from '@/lib/api/category';
import FoodCard from '@/components/restaurants/FoodCard';
import { useCart } from '@/contexts/CartContext';
import LoadingSpinner from '@/lib/api/LoadingSpinner';
import { getRealTimeLocation, subscribeLocation, detectRealTimeLocation, ILocationInfo } from '@/lib/location';

// ---------------------------------------------------------------------------
// SIDEBAR CATEGORY DEFINITIONS
// ---------------------------------------------------------------------------
interface SidebarCategory {
  id: string;
  label: string;
  emoji: string;
}

const PREDEFINED_CATEGORIES: SidebarCategory[] = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'chinese', label: 'Chinese', emoji: '🍲' },
  { id: 'thai', label: 'Thai', emoji: '🌿' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'healthy', label: 'Healthy', emoji: '🥗' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤' },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  pizza: '🍕',
  burger: '🍔',
  burgers: '🍔',
  sushi: '🍣',
  seafood: '🐟',
  dessert: '🍰',
  desserts: '🍰',
  healthy: '🥗',
  salad: '🥗',
  mexican: '🌮',
  biryani: '🍛',
  rice: '🍛',
  bbq: '🍖',
  grill: '🍖',
  beverage: '🥤',
  drink: '🥤',
  drinks: '🥤',
  chinese: '🍲',
  thai: '🌿',
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
  const lower = categoryName.toLowerCase().trim();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (key !== 'default' && lower.includes(key)) return emoji;
  }
  return CATEGORY_EMOJIS.default;
}

// ---------------------------------------------------------------------------
// RESPONSIVE ITEMS-PER-PAGE HOOK
// ---------------------------------------------------------------------------
function useResponsiveLimit() {
  const [limit, setLimit] = useState(9);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const nextLimit = w < 768 ? 3 : w < 1024 ? 6 : 9;
      setLimit((prev) => (prev !== nextLimit ? nextLimit : prev));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return limit;
}

export type LocationTierType = 'upazila' | 'district' | 'division' | 'all';
export type LocationFilterMode = 'auto' | 'upazila' | 'district' | 'division' | 'all';

// ---------------------------------------------------------------------------
// INNER CONTENT COMPONENT
// ---------------------------------------------------------------------------
function ExploreFoodContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || searchParams.get('cuisine');

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

  // Location Hierarchy Modes & Fallback State
  const [locationFilterMode, setLocationFilterMode] = useState<LocationFilterMode>('auto');
  const [activeMatchedTier, setActiveMatchedTier] = useState<LocationTierType>('all');
  const [fallbackNotice, setFallbackNotice] = useState<{
    tier: LocationTierType;
    title: string;
    description: string;
    badge: string;
  } | null>(null);

  // Restaurant dropdown (extracted from food items + DB)
  const [availableRestaurants, setAvailableRestaurants] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Cart feedback
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  // Mobile sidebar overlay
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dynamic Real-Time Location State
  const [locationInfo, setLocationInfo] = useState<ILocationInfo>(() => getRealTimeLocation());

  useEffect(() => {
    setLocationInfo(getRealTimeLocation());

    const unsubscribe = subscribeLocation(() => {
      setLocationInfo(getRealTimeLocation());
      setCurrentPage(1);
    });
    detectRealTimeLocation();
    return unsubscribe;
  }, []);

  // Dynamic categories list (starts with predefined home categories)
  const [categories, setCategories] = useState<SidebarCategory[]>(PREDEFINED_CATEGORIES);

  // ---------------------------------------------------------------------------
  // SYNC URL CATEGORY PARAMETER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (urlCategory) {
      const normCat = urlCategory.trim().toLowerCase();
      setSelectedCategory(normCat);
      setCurrentPage(1);
    }
  }, [urlCategory]);

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

  // Fetch dynamic global categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getGlobalCategories();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const fetchedCats: SidebarCategory[] = res.data.map((c) => ({
            id: c.name.toLowerCase(),
            label: c.name,
            emoji: c.emoji || getCategoryEmoji(c.name),
          }));

          setCategories([
            { id: 'all', label: 'All', emoji: '🍽️' },
            ...fetchedCats,
          ]);
        }
      } catch {
        setCategories(PREDEFINED_CATEGORIES);
      }
    };
    fetchCategories();
  }, []);

  // Fetch restaurants for the top-bar dropdown strictly filtered by active location
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const params: Record<string, any> = {};
        if (locationFilterMode === 'upazila' && locationInfo.upazila) {
          params.upazila = locationInfo.upazila;
        } else if (locationFilterMode === 'district' && locationInfo.district) {
          params.district = locationInfo.district;
        } else if (locationFilterMode === 'division' && locationInfo.division) {
          params.division = locationInfo.division;
        } else if (locationFilterMode === 'auto') {
          if (activeMatchedTier === 'upazila' && locationInfo.upazila) {
            params.upazila = locationInfo.upazila;
          } else if (activeMatchedTier === 'district' && locationInfo.district) {
            params.district = locationInfo.district;
          } else if (activeMatchedTier === 'division' && locationInfo.division) {
            params.division = locationInfo.division;
          } else if (locationInfo.district) {
            params.district = locationInfo.district;
          } else if (locationInfo.division) {
            params.division = locationInfo.division;
          }
        }

        const res = await getAllRestaurants(params);
        if (res.success && Array.isArray(res.data)) {
          const list = res.data
            .map((r) => ({
              id: r._id || r.id || '',
              name: r.restaurantName || r.name || 'Restaurant',
            }))
            .filter((r) => r.id);

          setAvailableRestaurants(list);
        } else {
          setAvailableRestaurants([]);
        }
      } catch {
        setAvailableRestaurants([]);
      }
    };
    fetchRestaurants();
  }, [locationInfo, activeMatchedTier, locationFilterMode]);

  // Reset to page 1 when responsive limit changes (viewport resize)
  useEffect(() => {
    setCurrentPage(1);
  }, [responsiveLimit]);

  // ---------------------------------------------------------------------------
  // CASCADING HIERARCHICAL FETCH ALGORITHM (উপজেলা -> জেলা -> বিভাগ -> All)
  // ---------------------------------------------------------------------------
  const fetchFoodItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    const baseQuery: Record<string, string> = {
      page: String(currentPage),
      limit: String(responsiveLimit),
      sortBy,
    };

    if (locationInfo.lat !== undefined && locationInfo.lng !== undefined) {
      baseQuery.lat = String(locationInfo.lat);
      baseQuery.lng = String(locationInfo.lng);
    }
    if (debouncedSearch.trim()) baseQuery.search = debouncedSearch.trim();
    if (selectedRestaurant !== 'all') baseQuery.restaurantId = selectedRestaurant;
    if (selectedCategory !== 'all') baseQuery.category = selectedCategory;
    if (isVegetarian) baseQuery.isVegetarian = 'true';
    if (isSpicy) baseQuery.isSpicy = 'true';

    try {
      // 1. User selected explicit Upazila filter
      if (locationFilterMode === 'upazila') {
        const query = { ...baseQuery, upazila: locationInfo.upazila || locationInfo.area || '' };
        const res = await getAllGlobalFoodItems(query);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setFoodItems(res.data);
          setActiveMatchedTier('upazila');
          setFallbackNotice({
            tier: 'upazila',
            title: `Showing Upazila Dishes`,
            description: `Showing dishes from restaurants in ${locationInfo.upazila || 'your Upazila'}.`,
            badge: 'Upazila / Area',
          });
          if ((res as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((res as unknown as { pagination: typeof pagination }).pagination);
          }
        } else {
          setFoodItems([]);
          setActiveMatchedTier('upazila');
          setFallbackNotice(null);
        }
        return;
      }

      // 2. User selected explicit District filter
      if (locationFilterMode === 'district') {
        const query = { ...baseQuery, district: locationInfo.district || locationInfo.city || '' };
        const res = await getAllGlobalFoodItems(query);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setFoodItems(res.data);
          setActiveMatchedTier('district');
          setFallbackNotice({
            tier: 'district',
            title: `Showing District Dishes`,
            description: `Showing dishes from restaurants across ${locationInfo.district || 'your District'}.`,
            badge: 'District / Zila',
          });
          if ((res as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((res as unknown as { pagination: typeof pagination }).pagination);
          }
        } else {
          setFoodItems([]);
          setActiveMatchedTier('district');
          setFallbackNotice(null);
        }
        return;
      }

      // 3. User selected explicit Division filter
      if (locationFilterMode === 'division') {
        const query = { ...baseQuery, division: locationInfo.division || locationInfo.city || '' };
        const res = await getAllGlobalFoodItems(query);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setFoodItems(res.data);
          setActiveMatchedTier('division');
          setFallbackNotice({
            tier: 'division',
            title: `Showing Division Dishes`,
            description: `Showing dishes from restaurants across ${locationInfo.division || 'your Division'}.`,
            badge: 'Division',
          });
          if ((res as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((res as unknown as { pagination: typeof pagination }).pagination);
          }
        } else {
          setFoodItems([]);
          setActiveMatchedTier('division');
          setFallbackNotice(null);
        }
        return;
      }

      // 4. User selected explicit All regions filter
      if (locationFilterMode === 'all') {
        const res = await getAllGlobalFoodItems(baseQuery);
        if (res.success && Array.isArray(res.data)) {
          setFoodItems(res.data);
          setActiveMatchedTier('all');
          setFallbackNotice(null);
          if ((res as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((res as unknown as { pagination: typeof pagination }).pagination);
          }
        } else {
          setFoodItems([]);
        }
        return;
      }

      // 5. DEFAULT SMART CASCADING MODE ('auto'):
      // Step A: Check Upazila (উপজেলা) if present and distinct from district
      const userUpazila = locationInfo.upazila?.trim();
      const userDistrict = (locationInfo.district || locationInfo.city || '').trim();
      const userDivision = (locationInfo.division || locationInfo.city || '').trim();

      if (userUpazila && userUpazila.toLowerCase() !== userDistrict.toLowerCase()) {
        const upazilaRes = await getAllGlobalFoodItems({
          ...baseQuery,
          upazila: userUpazila,
        });

        if (upazilaRes.success && Array.isArray(upazilaRes.data) && upazilaRes.data.length > 0) {
          setFoodItems(upazilaRes.data);
          setActiveMatchedTier('upazila');
          setFallbackNotice({
            tier: 'upazila',
            title: `Found in your Upazila: ${userUpazila}`,
            description: `Showing freshly prepared dishes from restaurants in ${userUpazila}.`,
            badge: 'Upazila Match',
          });
          if ((upazilaRes as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((upazilaRes as unknown as { pagination: typeof pagination }).pagination);
          }
          return;
        }
      }

      // Step B: Check District (জেলা)
      if (userDistrict) {
        const districtRes = await getAllGlobalFoodItems({
          ...baseQuery,
          district: userDistrict,
        });

        if (districtRes.success && Array.isArray(districtRes.data) && districtRes.data.length > 0) {
          setFoodItems(districtRes.data);
          setActiveMatchedTier('district');
          setFallbackNotice({
            tier: 'district',
            title: `Showing Dishes from ${userDistrict} District`,
            description: userUpazila && userUpazila.toLowerCase() !== userDistrict.toLowerCase()
              ? `No partner restaurants found in ${userUpazila} Upazila. Showing dishes from restaurants in ${userDistrict} District.`
              : `Showing dishes from partner restaurants in ${userDistrict} District.`,
            badge: 'District Match',
          });
          if ((districtRes as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((districtRes as unknown as { pagination: typeof pagination }).pagination);
          }
          return;
        }
      }

      // Step C: Check Division (বিভাগ) if 0 items in District
      if (userDivision) {
        const divisionRes = await getAllGlobalFoodItems({
          ...baseQuery,
          division: userDivision,
        });

        if (divisionRes.success && Array.isArray(divisionRes.data) && divisionRes.data.length > 0) {
          setFoodItems(divisionRes.data);
          setActiveMatchedTier('division');
          setFallbackNotice({
            tier: 'division',
            title: `Expanded to Division: ${userDivision}`,
            description: userDistrict
              ? `No partner restaurants found in ${userDistrict} District. Showing dishes available across ${userDivision} Division.`
              : `Showing dishes available in ${userDivision} Division.`,
            badge: 'Division Match',
          });
          if ((divisionRes as unknown as { pagination?: typeof pagination }).pagination) {
            setPagination((divisionRes as unknown as { pagination: typeof pagination }).pagination);
          }
          return;
        }
      }

      // Step D: If no restaurants exist in the user's division, do not mix unrelated cities
      setFoodItems([]);
      setActiveMatchedTier('all');
      setFallbackNotice(null);
    } catch {
      setFoodItems([]);
      setError('Something went wrong while fetching dishes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    selectedRestaurant,
    sortBy,
    selectedCategory,
    isVegetarian,
    isSpicy,
    responsiveLimit,
    locationFilterMode,
    locationInfo,
  ]);

  useEffect(() => {
    fetchFoodItems();
  }, [fetchFoodItems]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (catId === 'all') {
        url.searchParams.delete('category');
        url.searchParams.delete('cuisine');
      } else {
        url.searchParams.set('category', catId);
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const isCategoryActive = (catId: string) => {
    const s = selectedCategory.toLowerCase();
    const c = catId.toLowerCase();
    if (s === c) return true;
    if (s.endsWith('s') && s.slice(0, -1) === c) return true;
    if (c.endsWith('s') && c.slice(0, -1) === s) return true;
    return false;
  };

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
    setLocationFilterMode('auto');
    setCurrentPage(1);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('category');
      url.searchParams.delete('cuisine');
      window.history.replaceState(null, '', url.pathname);
    }
  };

  const activeFilterCount =
    (debouncedSearch.trim() ? 1 : 0) +
    (selectedRestaurant !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (isVegetarian ? 1 : 0) +
    (isSpicy ? 1 : 0) +
    (locationFilterMode !== 'auto' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // ---------------------------------------------------------------------------
  // SIDEBAR CONTENT (shared between desktop & mobile)
  // ---------------------------------------------------------------------------
  const sidebarContent = (
    <div className="flex flex-col gap-6">
      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</h3>
          <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
            {categories.length} Types
          </span>
        </div>

        <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isActive = isCategoryActive(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/20 border border-orange-500 scale-[1.01]'
                    : 'text-gray-700 hover:bg-orange-50/70 hover:text-orange-600 hover:border-orange-200 border border-transparent'
                }`}
              >
                <span className={`text-base p-1 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {cat.emoji}
                </span>
                <span className="flex-1 text-left">{cat.label}</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
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
            onClick={() => {
              setIsVegetarian((prev) => {
                const next = !prev;
                if (next) setIsSpicy(false);
                return next;
              });
              setCurrentPage(1);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isVegetarian
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className="flex-1 text-left">Vegetarian</span>
            <span className={`w-8 h-5 rounded-full transition-all relative ${isVegetarian ? 'bg-emerald-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isVegetarian ? 'left-[14px]' : 'left-0.5'}`} />
            </span>
          </button>
          {/* Spicy */}
          <button
            type="button"
            onClick={() => {
              setIsSpicy((prev) => {
                const next = !prev;
                if (next) setIsVegetarian(false);
                return next;
              });
              setCurrentPage(1);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              isSpicy
                ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-500" />
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
      {/* HEADER WITH LOCATION CONTEXT */}
      <section className="bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-100 mb-2">
                <Compass className="w-3.5 h-3.5 animate-spin text-amber-200" style={{ animationDuration: '10s' }} />
                <span>Smart Location Discovery</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Explore Dishes Near You
              </h1>
              <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-xl">
                Automatically checking restaurants in your <strong>Upazila</strong>, <strong>District</strong>, and <strong>Division</strong> for express doorstep delivery.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Location display badge */}
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-2.5 text-white text-xs font-medium shadow-inner">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-amber-200 uppercase font-extrabold tracking-wider">
                    Detected Location
                  </span>
                  <span className="truncate max-w-[200px] font-bold text-white text-xs">
                    {locationInfo.upazila ? `${locationInfo.upazila}, ` : ''}
                    {locationInfo.district || locationInfo.city}
                  </span>
                </div>
              </div>

              {/* Restaurant dropdown */}
              <div className="relative">
                <select
                  value={selectedRestaurant}
                  onChange={(e) => { setSelectedRestaurant(e.target.value); setCurrentPage(1); }}
                  className="appearance-none bg-white text-gray-800 text-xs sm:text-sm font-medium py-2.5 pl-3.5 pr-8 rounded-xl shadow-sm border border-orange-200 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                >
                  <option value="all">All Partner Restaurants</option>
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
              placeholder="Search dishes, cuisines, ingredients..."
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
              <option value="distance">Nearest First (GPS Proximity)</option>
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
            {locationFilterMode !== 'auto' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 font-bold rounded-full border border-orange-300 capitalize">
                Scope: {locationFilterMode}
                <button type="button" onClick={() => { setLocationFilterMode('auto'); setCurrentPage(1); }} className="text-orange-500 hover:text-orange-800 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 font-semibold rounded-full border border-orange-200 capitalize">
                Category: {categories.find((c) => isCategoryActive(c.id))?.label || selectedCategory}
                <button type="button" onClick={() => handleCategorySelect('all')} className="text-orange-400 hover:text-orange-700 cursor-pointer">
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
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* MAIN CONTENT: SIDEBAR + GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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
            {/* DYNAMIC SMART LOCATION NOTIFICATION BANNER */}
            {fallbackNotice && !loading && foodItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 rounded-2xl border flex items-start sm:items-center justify-between gap-4 shadow-xs ${
                  fallbackNotice.tier === 'upazila'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : fallbackNotice.tier === 'district'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : fallbackNotice.tier === 'division'
                    ? 'bg-orange-50/90 border-orange-200 text-orange-900'
                    : 'bg-blue-50/90 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    fallbackNotice.tier === 'upazila'
                      ? 'bg-emerald-500 text-white'
                      : fallbackNotice.tier === 'district'
                      ? 'bg-amber-500 text-white'
                      : fallbackNotice.tier === 'division'
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {fallbackNotice.tier === 'upazila' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm">{fallbackNotice.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border shadow-2xs">
                        {fallbackNotice.badge}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed max-w-xl">
                      {fallbackNotice.description}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-500 shrink-0">
                  <span>{pagination.totalItems} dishes available</span>
                </div>
              </motion.div>
            )}

            {/* LOADING WITH SPINNER */}
            {loading && (
              <div className="flex items-center justify-center min-h-[450px] w-full">
                <LoadingSpinner size={50} color="#f97316" />
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 mb-4">
                  <UtensilsCrossed className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">No dishes found in this area</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                  {locationFilterMode !== 'all'
                    ? `No partner restaurants have published dishes matching your search in ${locationFilterMode.toUpperCase()} scope. Try broadening your location to "All Locations".`
                    : 'Try adjusting your search keywords or clearing active filters.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {locationFilterMode !== 'all' && (
                    <button
                      type="button"
                      onClick={() => { setLocationFilterMode('all'); setCurrentPage(1); }}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Show All Locations
                    </button>
                  )}
                  <button type="button" onClick={handleResetFilters} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-orange-500/20">
                    Reset All Filters
                  </button>
                </div>
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

// ---------------------------------------------------------------------------
// MAIN EXPORT WITH SUSPENSE
// ---------------------------------------------------------------------------
export default function ExploreFoodPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFDF8]">
          <LoadingSpinner size={50} color="#f97316" />
        </div>
      }
    >
      <ExploreFoodContent />
    </Suspense>
  );
}
