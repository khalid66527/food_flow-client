import { TCreateOrderPayload, TOrderApiResponse } from "@/types/order";

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

function buildIdentityHeaders(userId: string, userEmail: string): IdentityHeaders {
  return {
    "x-user-id": userId,
    "x-user-email": userEmail,
  };
}

/**
 * Create a new order (COD or Stripe) via POST /api/orders
 */
export async function createOrderApi(
  userId: string,
  userEmail: string,
  payload: TCreateOrderPayload
): Promise<TOrderApiResponse> {
  try {
    // Try calling internal Next.js API route first for Better Auth session sync,
    // fallback to SERVER_BASE_URL if needed.
    const endpoint = "/api/orders";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data as TOrderApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to process order.",
    };
  }
}

/**
 * Get single order by orderId or MongoDB _id
 */
export async function getOrderByIdApi(
  orderId: string,
  userId?: string,
  userEmail?: string,
  sessionId?: string
): Promise<TOrderApiResponse> {
  try {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    const endpoint = `/api/orders/${orderId}${query}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (userId && userEmail) {
      headers["x-user-id"] = userId;
      headers["x-user-email"] = userEmail;
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await res.json();
    return data as TOrderApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch order details.",
    };
  }
}

/**
 * Get all orders for current user
 */
export async function getUserOrdersApi(
  userId: string,
  userEmail: string
): Promise<TOrderApiResponse> {
  try {
    const endpoint = `/api/orders?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data as TOrderApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch user orders.",
    };
  }
}
