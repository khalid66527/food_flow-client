import { TCart, TCartItem, TCartApiResponse } from "@/types/cart";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Get the full cart for a given user.
 */
export async function getUserCart(userId: string): Promise<TCartApiResponse> {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
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
      message: err.message || "Failed to fetch cart.",
    };
  }
}

export type { TCart, TCartItem };
