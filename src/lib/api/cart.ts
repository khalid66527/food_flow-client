import { TCart, TCartItem, TCartApiResponse } from "@/types/cart";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

interface IdentityHeaders {
  "x-user-id": string;
  "x-user-email": string;
}

/**
 * Build the identity headers used by every cart API call. The server uses
 * these (per the codebase convention) to authenticate the caller and enforce
 * customer-only access.
 */
export function buildIdentityHeaders(
  userId: string,
  userEmail: string
): IdentityHeaders {
  return {
    "x-user-id": userId,
    "x-user-email": userEmail,
  };
}

/**
 * Get the full cart for a given user.
 */
export async function getUserCart(
  userId: string,
  userEmail: string
): Promise<TCartApiResponse> {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch cart.",
    };
  }
}

export type { TCart, TCartItem };
