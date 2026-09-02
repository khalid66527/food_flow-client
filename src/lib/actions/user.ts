import { ApiResponse, IUser } from "@/lib/api/user";

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * Update a user's role (Customer | Restaurant | Rider | Admin)
 */
export async function updateUserRole(
  userId: string,
  newRole: string
): Promise<ApiResponse<{ id: string; role: string }>> {
  try {
    if (!userId || !newRole) {
      return { success: false, message: "User ID and new role are required." };
    }

    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: newRole }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in updateUserRole action:", err);
    return {
      success: false,
      message: err.message || "Failed to update user role.",
    };
  }
}

/**
 * Update a user's status (active | blocked | suspended | inactive)
 */
export async function updateUserStatus(
  userId: string,
  newStatus: string
): Promise<ApiResponse<{ id: string; status: string }>> {
  try {
    if (!userId || !newStatus) {
      return { success: false, message: "User ID and new status are required." };
    }

    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in updateUserStatus action:", err);
    return {
      success: false,
      message: err.message || "Failed to update user status.",
    };
  }
}

/**
 * Update user general profile information
 */
export async function updateUserDetails(
  userId: string,
  payload: Partial<IUser>
): Promise<ApiResponse<IUser>> {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    // Try same-origin Next.js API route first to eliminate network CORS/fetch failures
    try {
      const localRes = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: userId,
          ...payload,
        }),
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.success) {
          return localData;
        }
      }
    } catch {
      // Fall through to express server if local fetch fails
    }

    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in updateUserDetails action:", err);
    return {
      success: false,
      message: err.message || "Failed to update user details.",
    };
  }
}

/**
 * Delete a user by ID
 */
export async function deleteUser(
  userId: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    const res = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error in deleteUser action:", err);
    return {
      success: false,
      message: err.message || "Failed to delete user.",
    };
  }
}
