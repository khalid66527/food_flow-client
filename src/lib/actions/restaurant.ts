import { ApiResponse, IRestaurant } from "@/lib/api/restaurant";
import { IMenuItem } from "@/types/restaurant";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000/api";

// -------------------------------------------------------------
// Mutating Actions (POST, PATCH, DELETE) for Restaurant
// -------------------------------------------------------------

/**
 * Create a new restaurant profile
 */
export async function createRestaurantProfile(
  payload: Partial<IRestaurant>
): Promise<ApiResponse<IRestaurant>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error creating restaurant profile:", err);
    return {
      success: false,
      message: err.message || "Failed to submit restaurant form to server.",
    };
  }
}

/**
 * Update an existing restaurant profile
 */
export async function updateRestaurantProfile(
  ownerEmail: string,
  payload: Partial<IRestaurant>
): Promise<ApiResponse<IRestaurant>> {
  try {
    const url = new URL(`${API_BASE_URL}/restaurants/my-profile`);
    url.searchParams.append("ownerEmail", ownerEmail);

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error updating restaurant profile:", err);
    return {
      success: false,
      message: err.message || "Failed to update restaurant profile.",
    };
  }
}

/**
 * Toggle restaurant Open / Closed status
 */
export async function toggleRestaurantStatus(
  ownerEmail: string,
  isOpen: boolean
): Promise<ApiResponse<IRestaurant>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/toggle-status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerEmail, isOpen }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error toggling restaurant status:", err);
    return {
      success: false,
      message: err.message || "Failed to update restaurant status.",
    };
  }
}

/**
 * Add a new food item to the logged-in restaurant's menu
 */
export async function createFoodItem(
  payload: Partial<IMenuItem> & { status?: "available" | "unavailable" }
): Promise<ApiResponse<IMenuItem>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/food`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error adding food item:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add food item.",
    };
  }
}

/**
 * Delete restaurant profile
 */
export async function deleteRestaurantProfile(
  id: string,
  ownerEmail?: string
): Promise<ApiResponse<IRestaurant>> {
  try {
    const url = new URL(`${API_BASE_URL}/restaurants/${id}`);
    if (ownerEmail) url.searchParams.append("ownerEmail", ownerEmail);

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error deleting restaurant:", err);
    return {
      success: false,
      message: err.message || "Failed to delete restaurant.",
    };
  }
}

/**
 * Update an existing food item
 */
export async function updateFoodItemAction(
  foodId: string,
  payload: Partial<IMenuItem>
): Promise<ApiResponse<IMenuItem>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/food/${foodId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error updating food item:", err);
    return {
      success: false,
      message: err?.message || "Failed to update food item.",
    };
  }
}

/**
 * Toggle food item availability (In Stock / Out of Stock)
 */
export async function toggleFoodItemAvailabilityAction(
  foodId: string,
  isAvailable: boolean
): Promise<ApiResponse<IMenuItem>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/food/${foodId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isAvailable, status: isAvailable ? "available" : "unavailable" }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error toggling food availability:", err);
    return {
      success: false,
      message: err?.message || "Failed to update availability.",
    };
  }
}

/**
 * Delete a food item from menu
 */
export async function deleteFoodItemAction(
  foodId: string
): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/food/${foodId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error deleting food item:", err);
    return {
      success: false,
      message: err?.message || "Failed to delete food item.",
    };
  }
}

