import { ApiResponse } from "@/lib/api/admin";
import { IRestaurant } from "@/lib/api/restaurant";
import { IRiderProfile } from "@/lib/api/rider";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * 1. Approve or Update Restaurant Status (active, suspended, pending, rejected)
 */
export async function updateRestaurantStatusAdmin(
  restaurantId: string,
  newStatus: string
): Promise<ApiResponse<IRestaurant>> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/restaurants/${encodeURIComponent(restaurantId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data: ApiResponse<IRestaurant> = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error updating restaurant status:", err);
    return {
      success: false,
      message: err.message || "Failed to update restaurant status.",
    };
  }
}

/**
 * 2. Delete Restaurant
 */
export async function deleteRestaurantAdmin(
  restaurantId: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/restaurants/${encodeURIComponent(restaurantId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return await res.json();
  } catch (err: any) {
    console.error("Error deleting restaurant:", err);
    return {
      success: false,
      message: err.message || "Failed to delete restaurant.",
    };
  }
}

/**
 * 3. Approve or Update Rider Status (active, suspended, pending, rejected)
 */
export async function updateRiderStatusAdmin(
  riderId: string,
  newStatus: string
): Promise<ApiResponse<IRiderProfile>> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/riders/${encodeURIComponent(riderId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data: ApiResponse<IRiderProfile> = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error updating rider status:", err);
    return {
      success: false,
      message: err.message || "Failed to update rider status.",
    };
  }
}

/**
 * 4. Delete Rider
 */
export async function deleteRiderAdmin(
  riderId: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/riders/${encodeURIComponent(riderId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return await res.json();
  } catch (err: any) {
    console.error("Error deleting rider:", err);
    return {
      success: false,
      message: err.message || "Failed to delete rider.",
    };
  }
}
