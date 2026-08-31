import { TCartApiResponse, TCartItem } from "@/types/cart";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Add an item to the user's cart.
 */
export async function addToCartAction(
  userId: string,
  payload: Partial<TCartItem>
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to add item to cart.",
    };
  }
}

/**
 * Update the quantity of a food item in the user's cart.
 */
export async function updateCartQuantityAction(
  userId: string,
  foodId: string,
  quantity: number
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}/${foodId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update cart item.",
    };
  }
}

/**
 * Remove a food item from the user's cart.
 */
export async function removeCartItemAction(
  userId: string,
  foodId: string
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}/${foodId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to remove cart item.",
    };
  }
}

/**
 * Clear the user's entire cart.
 */
export async function clearCartAction(
  userId: string
): Promise<TCartApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to clear cart.",
    };
  }
}
