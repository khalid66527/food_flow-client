import { IRestaurant } from "@/lib/api/restaurant";
import { IRiderProfile } from "@/lib/api/rider";

export interface IAdminRestaurantRiderStats {
  restaurants: {
    total: number;
    pending: number;
    active: number;
  };
  riders: {
    total: number;
    pending: number;
    active: number;
  };
  totalPendingApprovals: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    stats?: {
      total: number;
      pending: number;
      active: number;
      suspended: number;
    };
  };
}

import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Get all restaurants for Admin management with search, filter, pagination
 */
import { getAuthHeaders } from "@/lib/jwt";

export async function getAdminRestaurants(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<IRestaurant[]>> {
  try {
    const url = new URL(`${getApiBaseUrl()}/admin/restaurants`);
    if (params.status && params.status !== "all") url.searchParams.append("status", params.status);
    if (params.search && params.search.trim()) url.searchParams.append("search", params.search.trim());
    if (params.page) url.searchParams.append("page", String(params.page));
    if (params.limit) url.searchParams.append("limit", String(params.limit));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching admin restaurants:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch restaurants",
      data: [],
    };
  }
}

/**
 * Get all riders for Admin management with search, filter, pagination
 */
export async function getAdminRiders(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<IRiderProfile[]>> {
  try {
    const url = new URL(`${getApiBaseUrl()}/admin/riders`);
    if (params.status && params.status !== "all") url.searchParams.append("status", params.status);
    if (params.search && params.search.trim()) url.searchParams.append("search", params.search.trim());
    if (params.page) url.searchParams.append("page", String(params.page));
    if (params.limit) url.searchParams.append("limit", String(params.limit));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching admin riders:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch riders",
      data: [],
    };
  }
}

/**
 * Get combined Restaurant and Rider approval stats
 */
export async function getAdminRestaurantRiderStats(): Promise<ApiResponse<IAdminRestaurantRiderStats>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/admin/restaurant-rider-stats`, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    return await res.json();
  } catch (error: any) {
    console.error("Error fetching admin approval stats:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch stats",
    };
  }
}
