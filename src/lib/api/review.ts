import { getAuthHeaders } from "@/lib/jwt";

export type TReviewTargetType = "rider" | "restaurant" | "food";

export interface IReviewItemPayload {
  targetType: TReviewTargetType;
  targetId: string;
  targetName?: string;
  rating: number; // 1 to 5
  comment: string;
}

export interface IBatchReviewPayload {
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  reviews: IReviewItemPayload[];
}

export interface IReview {
  _id?: string;
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  targetType: TReviewTargetType;
  targetId: string;
  targetName?: string;
  rating: number;
  comment: string;
  isFeatured?: boolean;
  createdAt: string;
}

export interface IReviewSummary {
  avgRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  reviews: IReview[];
  foodReviews?: IReview[];
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Submit post-delivery reviews (Rider, Restaurant, Food Items)
 */
export async function submitOrderReviewApi(payload: IBatchReviewPayload): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}> {
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(payload.userId, payload.userEmail),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("submitOrderReviewApi error:", err);
    return {
      success: false,
      message: err.message || "Failed to submit feedback.",
    };
  }
}

/**
 * Get reviews for a delivery rider
 */
export async function getRiderReviewsApi(riderId: string): Promise<{
  success: boolean;
  data?: IReviewSummary;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/reviews/rider/${riderId}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("getRiderReviewsApi error:", err);
    return { success: false, message: err.message || "Failed to fetch rider reviews" };
  }
}

/**
 * Get reviews for a restaurant
 */
export async function getRestaurantReviewsApi(restaurantId: string): Promise<{
  success: boolean;
  data?: IReviewSummary;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/reviews/restaurant/${restaurantId}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("getRestaurantReviewsApi error:", err);
    return { success: false, message: err.message || "Failed to fetch restaurant reviews" };
  }
}

/**
 * Get reviews for a food item
 */
export async function getFoodReviewsApi(foodId: string): Promise<{
  success: boolean;
  data?: IReviewSummary;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/reviews/food/${foodId}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("getFoodReviewsApi error:", err);
    return { success: false, message: err.message || "Failed to fetch food reviews" };
  }
}

/**
 * Check if order has been reviewed
 */
export async function getOrderReviewStatusApi(orderId: string): Promise<{
  success: boolean;
  data?: { orderId: string; isReviewed: boolean; reviews: IReview[] };
  message?: string;
}> {
  try {
    const res = await fetch(`/api/reviews/order/${orderId}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("getOrderReviewStatusApi error:", err);
    return { success: false, message: err.message || "Failed to check order review status" };
  }
}

export interface IAdminReviewsSummary {
  totalReviews: number;
  avgRating: number;
  avgRiderRating: number;
  avgRestaurantRating: number;
  totalRiderReviews: number;
  totalRestaurantReviews: number;
  totalFoodReviews: number;
  ratingBreakdown: Record<number, number>;
  reviews: IReview[];
}

/**
 * Get All Reviews for Admin Moderation Panel
 */
export async function getAllAdminReviewsApi(params?: {
  targetType?: string;
  minRating?: number;
  search?: string;
}): Promise<{
  success: boolean;
  data?: IAdminReviewsSummary;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.targetType) query.set("targetType", params.targetType);
    if (params?.minRating) query.set("minRating", String(params.minRating));
    if (params?.search) query.set("search", params.search);

    const res = await fetch(`/api/reviews/admin/all?${query.toString()}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("getAllAdminReviewsApi error:", err);
    return { success: false, message: err.message || "Failed to fetch admin reviews" };
  }
}

/**
 * Toggle Admin Featured Status for a Customer Review
 */
export async function toggleFeaturedReviewApi(
  reviewId: string,
  isFeatured?: boolean
): Promise<{
  success: boolean;
  isFeatured?: boolean;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/reviews/feature/${reviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ isFeatured }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("toggleFeaturedReviewApi error:", err);
    return { success: false, message: err.message || "Failed to toggle feature status." };
  }
}

export interface IPublicTestimonialsData {
  reviews: IReview[];
  avgRating: number;
  happyCustomers: number;
  totalReviews: number;
}

/**
 * Fetch DB-Driven Featured Testimonials & Rating Stats for Homepage
 */
export async function getPublicTestimonialsApi(starFilter?: string | number): Promise<{
  success: boolean;
  data?: IPublicTestimonialsData;
  message?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (starFilter && starFilter !== "all") {
      query.set("starFilter", String(starFilter));
    }

    const res = await fetch(`/api/reviews/testimonials?${query.toString()}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) return data;
    }

    // Fallback: Fetch directly from Express server endpoint
    const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/reviews/testimonials?${query.toString()}`, {
      method: "GET",
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.data) return fallbackData;
    }

    return { success: false, message: "Failed to fetch homepage testimonials." };
  } catch (err: any) {
    console.error("getPublicTestimonialsApi error:", err);
    return { success: false, message: err.message || "Failed to fetch homepage testimonials." };
  }
}
