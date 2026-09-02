export interface IUserStats {
  totalUsers: number;
  customers: number;
  restaurants: number;
  riders: number;
  admins: number;
}

export interface IRestaurantSnippet {
  _id?: string;
  restaurantName: string;
  slug?: string;
  logo?: string;
  bannerImage?: string;
  cuisineTypes?: string[];
  address?: {
    street?: string;
    city?: string;
    area?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  pricing?: {
    minOrderAmount?: number;
    deliveryFee?: number;
    estimatedDeliveryTime?: string;
    costForTwo?: number;
  };
  features?: {
    hasDelivery?: boolean;
    hasTakeaway?: boolean;
    hasDineIn?: boolean;
    isPureVeg?: boolean;
    isHalal?: boolean;
    freeDelivery?: boolean;
    openNow?: boolean;
  };
  status?: string;
  rating?: number;
  totalReviews?: number;
  contactNumber?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
  openingHours?: Record<string, { open: string; close: string; isOpen: boolean }>;
}

export interface IUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  role: 'Customer' | 'Restaurant' | 'Rider' | 'Admin' | 'customer' | 'restaurant' | 'rider' | 'admin' | string;
  phone?: string;
  status?: 'active' | 'blocked' | 'suspended' | 'inactive' | string;
  createdAt?: string;
  updatedAt?: string;
  restaurant?: IRestaurantSnippet | null;
}

export interface IUserQueryParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    stats?: IUserStats;
  };
  data?: T;
  error?: any;
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Get All Users with role filtering, search, pagination, and stats
 */
export async function getAllUsers(
  queryParams: IUserQueryParams = {}
): Promise<ApiResponse<IUser[]>> {
  try {
    const url = new URL(`${API_BASE_URL}/admin/users`);

    if (queryParams.role && queryParams.role !== "all") {
      url.searchParams.append("role", queryParams.role);
    }
    if (queryParams.status && queryParams.status !== "all") {
      url.searchParams.append("status", queryParams.status);
    }
    if (queryParams.search) {
      url.searchParams.append("search", queryParams.search.trim());
    }
    if (queryParams.page) {
      url.searchParams.append("page", queryParams.page.toString());
    }
    if (queryParams.limit) {
      url.searchParams.append("limit", queryParams.limit.toString());
    }
    if (queryParams.sortBy) {
      url.searchParams.append("sortBy", queryParams.sortBy);
    }
    if (queryParams.sortOrder) {
      url.searchParams.append("sortOrder", queryParams.sortOrder);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return {
      ...data,
      data: Array.isArray(data?.data) ? data.data : [],
    };
  } catch (err: any) {
    console.error("Error in getAllUsers API:", err);
    return {
      success: false,
      message: err.message || "Failed to fetch users.",
      data: [],
    };
  }
}

/**
 * Get single user by ID or Email
 */
export async function getUserById(
  userIdOrEmail: string
): Promise<ApiResponse<IUser>> {
  try {
    if (!userIdOrEmail) {
      return { success: false, message: "User identifier is required." };
    }

    // Try same-origin Next.js API route first to prevent network CORS/fetch errors
    try {
      const localRes = await fetch(`/api/user/profile?identifier=${encodeURIComponent(userIdOrEmail)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.success) {
          return localData;
        }
      }
    } catch {
      // Fall through to server API if local fetch is unavailable
    }

    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userIdOrEmail)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in getUserById API:", err);
    return {
      success: false,
      message: err.message || "Failed to fetch user details.",
    };
  }
}

/**
 * Get full restaurant details for a restaurant owner
 */
export async function getUserRestaurantDetails(
  emailOrId: string
): Promise<ApiResponse<IRestaurantSnippet>> {
  try {
    if (!emailOrId) {
      return { success: false, message: "Identifier is required." };
    }

    const res = await fetch(
      `${API_BASE_URL}/admin/restaurant-details/${encodeURIComponent(emailOrId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in getUserRestaurantDetails API:", err);
    return {
      success: false,
      message: err.message || "Failed to fetch restaurant details.",
    };
  }
}
