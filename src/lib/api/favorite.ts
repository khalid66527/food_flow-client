import { TFavoriteApiResponse, TFavoriteItem } from "@/types/favorite";
import { getAuthHeaders } from "@/lib/jwt";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

function buildIdentityHeaders(userId?: string, userEmail?: string): Record<string, string> {
  return getAuthHeaders(userId, userEmail);
}

/**
 * Toggle a food in user's favorites
 */
export async function toggleFavoriteApi(
  foodId: string,
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; isFavorite?: boolean; message?: string }> {
  try {
    if (!foodId || !userId) {
      return { success: false, message: "User ID and Food ID are required." };
    }

    const res = await fetch(`${API_BASE_URL}/favorites/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify({ foodId, userId, userEmail }),
    });

    const data = await res.json();
    return {
      success: data.success ?? res.ok,
      isFavorite: data.data?.isFavorite ?? false,
      message: data.message || "Updated favorite status",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to toggle favorite.",
    };
  }
}

/**
 * Check if a food item is favorited by the user
 */
export async function checkIsFavoriteApi(
  foodId: string,
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; isFavorite: boolean }> {
  try {
    if (!foodId || !userId) {
      return { success: false, isFavorite: false };
    }

    const res = await fetch(`${API_BASE_URL}/favorites/check/${userId}/${foodId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, isFavorite: false };
    }

    const data = await res.json();
    return {
      success: true,
      isFavorite: !!data.data?.isFavorite,
    };
  } catch {
    return { success: false, isFavorite: false };
  }
}

/**
 * Get all favorite foods for user
 */
export async function getUserFavoritesApi(
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; data: TFavoriteItem[]; message?: string }> {
  try {
    if (!userId) {
      return { success: false, data: [], message: "User ID is required." };
    }

    const queryParams = userEmail ? `?email=${encodeURIComponent(userEmail)}` : "";
    const res = await fetch(`${API_BASE_URL}/favorites/user/${userId}${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        data: (data.data as TFavoriteItem[]) || [],
      };
    }

    return {
      success: false,
      data: [],
      message: data.message || "Failed to load favorites.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "Failed to fetch favorites.",
    };
  }
}

/**
 * Remove a food item from favorites
 */
export async function removeFavoriteApi(
  foodId: string,
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!foodId || !userId) {
      return { success: false, message: "User ID and Food ID are required." };
    }

    const res = await fetch(`${API_BASE_URL}/favorites/${userId}/${foodId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
    });

    const data = await res.json();
    return {
      success: data.success ?? res.ok,
      message: data.message || "Removed from favorites",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to remove favorite.",
    };
  }
}
