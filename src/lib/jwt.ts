import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "Ermde6JRPK1BwSjUnCI4H7gBKmTdq6WU";

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
 * Generate client-side JWT token (or request from API)
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
    };

    const token = jwt.sign(cleanPayload, JWT_SECRET, {
      expiresIn: "7d",
    });

    return token;
  } catch (err) {
    console.warn("Error signing token:", err);
    return "";
  }
}

/**
 * Fetch / Request JWT token from backend or Next API
 */
export async function syncJwtToken(user: TJwtUserPayload): Promise<string | null> {
  if (!user?.email && !user?.id) return null;

  // Try generating directly or fetching from API
  try {
    const localToken = generateClientToken(user);
    if (localToken) return localToken;

    const res = await fetch("/api/auth/jwt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
      return data.token;
    }
  } catch (err) {
    console.warn("syncJwtToken error:", err);
  }

  return getAuthToken();
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
