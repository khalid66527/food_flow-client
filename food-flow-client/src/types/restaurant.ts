export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export type SortOption =
  | 'relevance'
  | 'rating_desc'
  | 'delivery_time_asc'
  | 'delivery_fee_asc'
  | 'min_order_asc'
  | 'popular';

export interface ILocation {
  id?: string;
  label?: string; // e.g. "Home", "Work", "Current Location"
  address: string;
  city: string;
  area?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  restaurantCount?: number;
  isActive?: boolean;
}

export interface IMenuItem {
  _id: string;
  id?: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  images?: string[];
  isAvailable: boolean;
  status?: string;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  tags?: string[];
  rating?: number;
  ingredients?: string[];
  sizeOptions?: { id: string; name: string; label?: string; priceDelta: number; popular?: boolean }[];
  extras?: { id: string; name: string; price: number; icon?: string }[];
  categoryDetails?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type FoodSortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'newest';

export interface IGlobalFoodItem {
  _id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  image: string;
  images?: string[];
  status: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  tags?: string[];
  ingredients?: string[];
  sizeOptions?: { id: string; name: string; label?: string; priceDelta: number; popular?: boolean }[];
  extras?: { id: string; name: string; price: number; icon?: string }[];
  categoryDetails?: Record<string, any>;
  restaurantName: string;
  restaurantSlug: string;
  restaurantLogo: string;
  restaurantIsOpen: boolean;
  restaurantRating: number;
  restaurantReviewCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IFoodFilterParams {
  searchQuery: string;
  category: string;
  restaurantId: string;
  sortBy: FoodSortOption;
  isVegetarian: boolean;
  isSpicy: boolean;
  minPrice: number;
  maxPrice: number;
  openNow: boolean;
  featuredOnly: boolean;
  currentPage: number;
  limit: number;
}

export interface IRestaurant {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  bannerImage: string;
  description?: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  deliveryFee: number;
  minOrderAmount: number;
  priceRange: PriceRange;
  address: {
    street: string;
    city: string;
    area: string;
    state?: string;
    zipCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  distanceKm?: number;
  isOpen: boolean;
  isFeatured?: boolean;
  hasFreeDelivery?: boolean;
  discountOffer?: string; // e.g. "20% OFF up to $5"
  tags?: string[];
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'pending' | 'closed';
  createdAt?: string;
  updatedAt?: string;
}

export interface IRestaurantFilterParams {
  searchQuery: string;
  category: string;
  sortBy: SortOption;
  priceRange: PriceRange | 'ALL';
  minRating: number; // 0, 3.5, 4.0, 4.5
  freeDelivery: boolean;
  openNow: boolean;
  featuredOnly: boolean;
  deliveryLocation: string;
  currentPage: number;
  limit: number;
}

export interface IPaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IRestaurantApiResponse {
  success: boolean;
  message?: string;
  data: IRestaurant[];
  pagination: IPaginationMeta;
  categories?: ICategory[];
}
