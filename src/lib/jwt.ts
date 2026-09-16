const TOKEN_KEY = "foodflow_jwt_token";

export interface TJwtUserPayload {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string;
}

/**
 * Get JWT token from browser localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Save JWT token in browser localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined" || !token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn("Could not save auth token to localStorage:", e);
  }
}

/**
 * Remove JWT token from browser localStorage (e.g. on logout)
 */
export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn("Could not remove auth token from localStorage:", e);
  }
}

/**
 * Client-side token helper (for offline fallback / instant storage)
 */
export function generateClientToken(payload: TJwtUserPayload): string {
  if (typeof window !== "undefined") {
    // In browser, JWT signing is handled safely via /api/auth/jwt
    return getAuthToken() || "";
  }
  try {
    const cleanPayload = {
      id: String(payload.id || payload.userId || ""),
      userId: String(payload.userId || payload.id || ""),
      email: String(payload.email || "").trim().toLowerCase(),
      name: payload.name || "User",
      role: payload.role || "Customer",
      phone: payload.phone || "",
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(cleanPayload));
    const token = `${encodedHeader}.${encodedPayload}.client_auth_token`;

    return token;
  } catch (err) {

    console.warn("Error generating client token:", err);
    return "";
  }
}

/**
 * Fetch / Request JWT token from backend or Next API
 */
export async function syncJwtToken(user: TJwtUserPayload): Promise<string | null> {
  if (!user?.email && !user?.id) return null;

  try {
    const res = await fetch("/api/auth/jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token) {
        setAuthToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn("syncJwtToken server request error, using client fallback:", err);
  }

  // Fallback if API fails
  const localToken = generateClientToken(user);
  return localToken || getAuthToken();
}

/**
 * Build unified authorization headers with JWT Bearer Token + identity headers
 */
export function getAuthHeaders(
  userId?: string,
  userEmail?: string,
  customHeaders?: Record<string, string>
): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (userId) {
    headers["x-user-id"] = userId;
  }

  if (userEmail) {
    headers["x-user-email"] = userEmail;
  }

  return headers;
}
