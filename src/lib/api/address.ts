import { TAddress, TAddressApiResponse } from "@/types/address";

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
 * Build the identity headers used by every address API call. The server uses
 * these (per the codebase convention) to authenticate the caller and enforce
 * customer-only access.
 */
function buildIdentityHeaders(userId: string, userEmail: string): IdentityHeaders {
  return {
    "x-user-id": userId,
    "x-user-email": userEmail,
  };
}

/**
 * Get all delivery addresses for the authenticated user.
 */
export async function getAddresses(
  userId: string,
  userEmail: string
): Promise<TAddressApiResponse> {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/addresses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      cache: "no-store",
    });

    const data = await res.json();
    return data as TAddressApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch addresses.",
    };
  }
}

/**
 * Create a new delivery address for the authenticated user.
 */
export async function createAddress(
  userId: string,
  userEmail: string,
  payload: Partial<TAddress>
): Promise<TAddressApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data as TAddressApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add address.",
    };
  }
}

/**
 * Update an existing delivery address for the authenticated user.
 */
export async function updateAddress(
  userId: string,
  userEmail: string,
  id: string,
  payload: Partial<TAddress>
): Promise<TAddressApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/addresses/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data as TAddressApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update address.",
    };
  }
}

/**
 * Delete a delivery address for the authenticated user.
 */
export async function deleteAddress(
  userId: string,
  userEmail: string,
  id: string
): Promise<TAddressApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/addresses/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
    });

    const data = await res.json();
    return data as TAddressApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete address.",
    };
  }
}

/**
 * Set a delivery address as the authenticated user's default.
 */
export async function setDefaultAddress(
  userId: string,
  userEmail: string,
  id: string
): Promise<TAddressApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/addresses/${id}/default`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildIdentityHeaders(userId, userEmail),
      },
    });

    const data = await res.json();
    return data as TAddressApiResponse;
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to set default address.",
    };
  }
}
