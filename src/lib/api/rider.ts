export type TVehicleType = "bicycle" | "bike" | "scooter" | "electric_bike";
export type TRiderStatus = "active" | "pending" | "suspended" | "inactive";

export interface TEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface TRiderAddress {
  street?: string;
  area?: string;
  city?: string;
  fullAddress?: string;
}

export interface IRiderProfile {
  _id?: string;
  id?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  nidNumber?: string;
  drivingLicenseNumber?: string;
  vehicleType: TVehicleType;
  vehicleBrand?: string;
  vehicleNumber?: string;
  deliveryZone: string;
  city: string;
  address?: TRiderAddress;
  emergencyContact?: TEmergencyContact;
  isAvailable: boolean;
  status: TRiderStatus;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Get the current rider's profile by email or user ID
 */
import { getAuthHeaders } from "@/lib/jwt";

export async function getMyRiderProfile(
  email?: string,
  userId?: string
): Promise<ApiResponse<IRiderProfile>> {
  try {
    const identifier = email || userId;
    if (!identifier) {
      return { success: false, message: "No rider email or ID provided." };
    }

    const url = new URL(`${API_BASE_URL}/rider/my-profile`);
    if (email) url.searchParams.append("email", email);
    if (userId) url.searchParams.append("userId", userId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(userId, email),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.message || `Server returned ${res.status}`,
      };
    }

    const data: ApiResponse<IRiderProfile> = await res.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching rider profile:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch rider profile",
    };
  }
}

/**
 * Get all riders (for discovery or platform overview)
 */
export async function getAllRiders(): Promise<ApiResponse<IRiderProfile[]>> {
  try {
    const res = await fetch(`${API_BASE_URL}/rider/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, message: `Server error: ${res.status}` };
    }

    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch riders",
    };
  }
}
