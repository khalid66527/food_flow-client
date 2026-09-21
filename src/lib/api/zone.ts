import { IZone, IZoneDetectionResponse, IZoneApiResponse } from "@/types/zone";
import { getAuthHeaders } from "@/lib/jwt";
import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Fetch all zones with optional filtering
 */
export async function getAllZones(params: Record<string, any> = {}): Promise<IZoneApiResponse<IZone[]>> {
  try {
    const url = new URL(`${getApiBaseUrl()}/zones`);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        url.searchParams.append(key, String(val));
      }
    });

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch zones: ${res.statusText}`);
    }

    const json = await res.json();
    return json;
  } catch (error: any) {
    console.error("Error fetching zones:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch zones",
      data: [],
    };
  }
}

/**
 * Get Single Zone by ID or Slug
 */
export async function getSingleZone(idOrSlug: string): Promise<IZoneApiResponse<IZone | null>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/zones/${encodeURIComponent(idOrSlug)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Zone not found");
    }

    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to fetch single zone",
      data: null,
    };
  }
}

/**
 * Create a new Zone (Admin)
 */
export async function createZone(zoneData: Partial<IZone>): Promise<IZoneApiResponse<IZone | null>> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/zones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(zoneData),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to create zone");
    }

    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to create zone",
      data: null,
    };
  }
}

/**
 * Update an existing Zone (Admin)
 */
export async function updateZone(
  id: string,
  zoneData: Partial<IZone>
): Promise<IZoneApiResponse<IZone | null>> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/zones/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(zoneData),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to update zone");
    }

    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update zone",
      data: null,
    };
  }
}

/**
 * Toggle Zone Status (Active / Inactive)
 */
export async function toggleZoneStatus(
  id: string,
  isActive: boolean
): Promise<IZoneApiResponse<IZone | null>> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/zones/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ isActive }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to toggle zone status");
    }

    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to toggle zone status",
      data: null,
    };
  }
}

/**
 * Delete Zone (Admin)
 */
export async function deleteZone(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/zones/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to delete zone");
    }

    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete zone",
    };
  }
}

/**
 * Detect User Zone and Candidate Adjacent Zones from GPS coordinates
 */
export async function detectZone(lat: number, lng: number): Promise<IZoneApiResponse<IZoneDetectionResponse | null>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/zones/detect?lat=${lat}&lng=${lng}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to detect user zone",
      data: null,
    };
  }
}
