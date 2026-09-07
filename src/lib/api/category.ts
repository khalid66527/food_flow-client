const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface IGlobalCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Fetch global categories (Public active list or all for Admin)
 */
export async function getGlobalCategories(
  all = false
): Promise<IApiResponse<IGlobalCategory[]>> {
  try {
    const url = all ? `${API_BASE_URL}/categories?all=true` : `${API_BASE_URL}/categories`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    return {
      success: data.success ?? true,
      message: data.message || "",
      data: Array.isArray(data.data) ? data.data : [],
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to fetch global categories.",
      data: [],
    };
  }
}

/**
 * Create a new global category (Admin)
 */
export async function createGlobalCategory(payload: {
  name: string;
  emoji?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}): Promise<IApiResponse<IGlobalCategory>> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to create category.",
    };
  }
}

/**
 * Update an existing global category (Admin)
 */
export async function updateGlobalCategory(
  id: string,
  payload: {
    name?: string;
    emoji?: string;
    description?: string;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<IApiResponse<IGlobalCategory>> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to update category.",
    };
  }
}

/**
 * Delete a global category (Admin)
 */
export async function deleteGlobalCategory(
  id: string
): Promise<IApiResponse<null>> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to delete category.",
    };
  }
}
