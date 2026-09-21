import { getAuthHeaders } from "@/lib/jwt";

export interface IPublicStatsData {
  partnerRestaurants: number;
  successfulOrders: number;
  activeRiders: number;
  happyCustomers: number;
  avgRating: number;
  totalReviews: number;
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

/**
 * Fetch live dynamic platform statistics for homepage counters and badges
 */
export async function getPublicStatsApi(): Promise<{
  success: boolean;
  data?: IPublicStatsData;
  message?: string;
}> {
  try {
    const res = await fetch("/api/stats", {
      method: "GET",
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) return data;
    }

    // Fallback: fetch directly from Express server endpoint
    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/stats/public`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.data) return fallbackData;
    }

    return { success: false, message: "Failed to load platform statistics." };
  } catch (err: any) {
    console.error("getPublicStatsApi error:", err);
    return {
      success: false,
      message: err.message || "Failed to load platform statistics.",
    };
  }
}

export async function getRestaurantsCountApi(): Promise<number> {
  try {
    const res = await fetch("/api/stats/restaurants-count", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.count && json.data.count > 0) return json.data.count;
    }

    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/stats/restaurants-count`, { cache: "no-store" });
    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson?.data?.count) return fallbackJson.data.count;
    }

    return 0;
  } catch {
    return 0;
  }
}

export async function getOrdersDeliveredCountApi(): Promise<number> {
  try {
    const res = await fetch("/api/stats/orders-delivered-count", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.count && json.data.count > 0) return json.data.count;
    }

    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/stats/orders-delivered-count`, { cache: "no-store" });
    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson?.data?.count) return fallbackJson.data.count;
    }

    return 0;
  } catch {
    return 0;
  }
}

export async function getRidersCountApi(): Promise<number> {
  try {
    const res = await fetch("/api/stats/riders-count", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.count && json.data.count > 0) return json.data.count;
    }

    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/stats/riders-count`, { cache: "no-store" });
    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson?.data?.count) return fallbackJson.data.count;
    }

    return 0;
  } catch {
    return 0;
  }
}

export async function getHappyCustomersCountApi(): Promise<number> {
  try {
    const res = await fetch("/api/stats/happy-customers-count", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.count && json.data.count > 0) return json.data.count;
    }

    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/stats/happy-customers-count`, { cache: "no-store" });
    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson?.data?.count) return fallbackJson.data.count;
    }

    return 0;
  } catch {
    return 0;
  }
}
