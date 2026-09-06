import { IMenuItem, IGlobalFoodItem } from "@/types/restaurant";

export type TOpeningHoursDay = {
  open: string;
  close: string;
  isOpen: boolean;
};

export type TOpeningHours = {
  monday?: TOpeningHoursDay;
  tuesday?: TOpeningHoursDay;
  wednesday?: TOpeningHoursDay;
  thursday?: TOpeningHoursDay;
  friday?: TOpeningHoursDay;
  saturday?: TOpeningHoursDay;
  sunday?: TOpeningHoursDay;
};

export type TAddress = {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
  area?: string;
};

export type TPricing = {
  minOrderAmount: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  costForTwo?: number;
};

export type TFeatures = {
  hasDelivery: boolean;
  hasTakeaway: boolean;
  hasDineIn: boolean;
  isPureVeg: boolean;
  isHalal: boolean;
};

export type TSocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
};

export interface IRestaurant {
  _id?: string;
  id?: string;
  ownerId?: string;
  ownerEmail: string;
  ownerName?: string;
  ownerPhone?: string;
  restaurantName: string;
  name?: string;
  slug?: string;
  tagline?: string;
  description: string;
  cuisineTypes: string[];
  cuisines?: string[];
  logo: string;
  bannerImage: string;
  contactNumber: string;
  contactEmail: string;
  website?: string;
  address: TAddress;
  openingHours?: TOpeningHours;
  generalOpenTime?: string;
  generalCloseTime?: string;
  pricing: TPricing;
  features?: TFeatures;
  socialLinks?: TSocialLinks;
  rating?: number;
  totalReviews?: number;
  reviewCount?: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
  deliveryFee?: number;
  minOrderAmount?: number;
  priceRange?: string;
  isOpen: boolean;
  status: "pending" | "active" | "suspended" | "closed";
  isFeatured?: boolean;
  discountOffer?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RestaurantFormData = {
  restaurantName: string;
  tagline: string;
  description: string;
  cuisineTypes: string[];
  logo: string;
  bannerImage: string;
  contactNumber: string;
  contactEmail: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  generalOpenTime: string;
  generalCloseTime: string;
  minOrderAmount: number | string;
  deliveryFee: number | string;
  estimatedDeliveryTime: string;
  costForTwo: number | string;
  hasDelivery: boolean;
  hasTakeaway: boolean;
  hasDineIn: boolean;
  isPureVeg: boolean;
  isHalal: boolean;
  facebook: string;
  instagram: string;
  twitter: string;
};

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  error?: any;
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

// -------------------------------------------------------------
// GET Requests / Queries for Restaurant
// -------------------------------------------------------------

/**
 * Fetch logged-in user's restaurant profile by owner email / id
 */
export async function getMyRestaurantProfile(
  ownerEmail: string,
  ownerId?: string
): Promise<ApiResponse<IRestaurant>> {
  try {
    const url = new URL(`${API_BASE_URL}/restaurants/my-profile`);
    if (ownerEmail) url.searchParams.append("ownerEmail", ownerEmail);
    if (ownerId) url.searchParams.append("ownerId", ownerId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": ownerEmail,
        ...(ownerId ? { "x-user-id": ownerId } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error fetching my restaurant profile:", err);
    return {
      success: false,
      message: err.message || "Could not connect to restaurant server.",
    };
  }
}

/**
 * Fetch all active restaurants for top-bar filter dropdown
 */
export async function getAllRestaurants(): Promise<ApiResponse<IRestaurant[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants?limit=100`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return { ...data, data: Array.isArray(data?.data) ? data.data : [] };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to fetch restaurants.",
      data: [],
    };
  }
}

/**
 * Get all global food items across all restaurants with filters/pagination
 */
export async function getAllGlobalFoodItems(
  query: Record<string, string> = {}
): Promise<ApiResponse<IGlobalFoodItem[]>> {
  try {
    const url = new URL(`${API_BASE_URL}/food`);
    Object.entries(query).forEach(([key, val]) => {
      if (val) url.searchParams.append(key, val);
    });

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return { ...data, data: Array.isArray(data?.data) ? data.data : [] };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to retrieve food items.",
      data: [],
    };
  }
}

/**
 * Get all distinct food categories from the database
 */
export async function getFoodCategories(): Promise<ApiResponse<string[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/food/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return { ...data, data: Array.isArray(data?.data) ? data.data : [] };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to fetch categories.",
      data: [],
    };
  }
}

/**
 * Get a single food item by ID
 */
export async function getSingleFoodItem(
  foodId: string
): Promise<ApiResponse<IGlobalFoodItem>> {
  try {
    if (!foodId) {
      return { success: false, message: "Food ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/food/${foodId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to fetch food item.",
    };
  }
}

/**
 * Get a single restaurant profile by ID or Slug
 */
export async function getSingleRestaurantById(
  restaurantId: string
): Promise<ApiResponse<IRestaurant>> {
  try {
    if (!restaurantId) {
      return { success: false, message: "Restaurant ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to fetch restaurant profile.",
    };
  }
}

/**
 * Get all menu items for a specific restaurant
 */
export async function getRestaurantMenuItems(
  restaurantId: string
): Promise<ApiResponse<IMenuItem[]>> {
  try {
    if (!restaurantId) {
      return { success: false, message: "Restaurant ID is required." };
    }

    const res = await fetch(
      `${API_BASE_URL}/restaurants/food/${restaurantId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await res.json();
    return { ...data, data: Array.isArray(data?.data) ? data.data : [] };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to fetch menu items.",
      data: [],
    };
  }
}
