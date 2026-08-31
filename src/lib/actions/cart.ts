import { TCartApiResponse, TCartItem } from "@/types/cart";

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
 * Build the identity headers used by every cart action. The server uses these
 * to authenticate the caller and enforce customer-only access.
 */
function buildIdentityHeaders(userId: string, userEmail: string): IdentityHeaders {
  return {
    "x-user-id": userId,
    "x-user-email": userEmail,
  };
}

/**
 * Add an item to the user's cart.
 */
export async function addToCartAction(
  userId: string,
  userEmail: string,
  payload: Partial<TCartItem>
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add item to cart.",
    };
  }
}

/**
 * Update the quantity of a food item in the user's cart.
 *
 * `delta` is an atomic increment applied server-side (e.g. +1 / -1 per click),
 * so rapid clicks compose accurately on the backend.
 */
export async function updateCartQuantityAction(
  userId: string,
  userEmail: string,
  foodId: string,
  delta: number
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}/${foodId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify({ delta: Number(delta) }),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update cart item.",
    };
  }
}

/**
 * Remove a food item from the user's cart.
 */
export async function removeCartItemAction(
  userId: string,
  userEmail: string,
  foodId: string
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}/${foodId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to remove cart item.",
    };
  }
}

/**
 * Clear the user's entire cart.
 */
export async function clearCartAction(
  userId: string,
  userEmail: string
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to clear cart.",
    };
  }
}
