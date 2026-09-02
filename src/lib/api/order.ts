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

/**
 * Fetch orders belonging to a restaurant (contains items with matching restaurantId or name).
 * @param userId  - The restaurant owner's auth user id (x-user-id header)
 * @param userEmail - The restaurant owner's auth email
 * @param opts.restaurantId - Filter items by restaurant ID
 * @param opts.restaurantName - Filter items by restaurant name
 * @param opts.status - Comma-separated status filter
 */
export async function getRestaurantOrdersApi(
  userId: string,
  userEmail: string,
  opts?: {
    restaurantId?: string;
    restaurantName?: string;
    status?: string;
  }
): Promise<TOrderApiResponse> {
  try {
    const params = new URLSearchParams();
    if (opts?.restaurantId) params.set("restaurantId", opts.restaurantId);
    if (opts?.restaurantName) params.set("restaurantName", opts.restaurantName);
    if (opts?.status) params.set("status", opts.status);
    const qs = params.toString();
    const endpoint = `/api/orders/restaurant-orders${qs ? `?${qs}` : ""}`;
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
      message: err instanceof Error ? err.message : "Failed to fetch restaurant orders.",
    };
  }
}

/**
 * Fetch rider orders: available (unassigned "Out for Delivery"), assigned/active, or all.
 * @param userId  - The rider's auth user id
 * @param userEmail - The rider's auth email
 * @param opts.mode - "available" | "assigned" | "active"
 * @param opts.status - Comma-separated status filter (used when mode is not set)
 */
export async function getRiderOrdersApi(
  userId: string,
  userEmail: string,
  opts?: {
    mode?: "available" | "assigned" | "active";
    status?: string;
  }
): Promise<TOrderApiResponse> {
  try {
    const params = new URLSearchParams();
    if (opts?.mode) params.set("mode", opts.mode);
    if (opts?.status) params.set("status", opts.status);
    const qs = params.toString();
    const endpoint = `/api/orders/rider-orders${qs ? `?${qs}` : ""}`;
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
      message: err instanceof Error ? err.message : "Failed to fetch rider orders.",
    };
  }
}

/**
 * Update order status (and optionally riderInfo) via PATCH /api/orders/:id
 * The backend handles: status transition logic, payment status, and rider info merge.
 */
export async function updateOrderStatusApi(
  orderId: string,
  payload: {
    orderStatus?: string;
    riderInfo?: { riderId?: string; name?: string; phone?: string; vehicleNumber?: string };
    paymentStatus?: string;
  },
  userId?: string,
  userEmail?: string
): Promise<TOrderApiResponse> {
  try {
    const endpoint = `/api/orders/${orderId}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (userId && userEmail) {
      headers["x-user-id"] = userId;
      headers["x-user-email"] = userEmail;
    }
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data as TOrderApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}
