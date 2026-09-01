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
  slug?: string;
  tagline?: string;
  description: string;
  cuisineTypes: string[];
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
  isOpen: boolean;
  status: "pending" | "active" | "suspended" | "closed";
  isFeatured?: boolean;
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000/api";

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
 * Get single restaurant by ID or slug
 */
export async function getRestaurantById(
  idOrSlug: string
): Promise<ApiResponse<IRestaurant>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/${idOrSlug}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to fetch restaurant.",
    };
  }
}

/**
 * Get all restaurants with filter/search queries
 */
export async function getAllRestaurants(
  query: Record<string, string> = {}
): Promise<ApiResponse<IRestaurant[]>> {
  try {
    const url = new URL(`${API_BASE_URL}/restaurants`);
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
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to retrieve restaurants.",
    };
  }
}
