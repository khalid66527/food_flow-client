export type TContactCategory = 'Customer' | 'Restaurant' | 'Delivery Partner' | 'Other';
export type TContactStatus = 'pending' | 'in-progress' | 'replied' | 'resolved' | 'closed';

export interface IContactReply {
  id?: string;
  replyMessage: string;
  repliedBy: string;
  repliedAt: string | Date;
}

export interface IContactMessage {
  _id: string;
  ticketId: string;
  name: string;
  email: string;
  phone?: string;
  category: TContactCategory | string;
  subject: string;
  message: string;
  status: TContactStatus;
  replies?: IContactReply[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IContactStats {
  total: number;
  pending: number;
  inProgress: number;
  replied: number;
  resolved: number;
}

export interface IContactFilterParams {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    stats?: IContactStats;
  };
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

/**
 * 1. Fetch all contact messages with search, filter, pagination
 */
export async function getContactMessages(
  params: IContactFilterParams = {}
): Promise<ApiResponse<IContactMessage[]>> {
  try {
    const url = new URL(`${API_BASE_URL}/contacts`);
    if (params.status && params.status !== "all") url.searchParams.append("status", params.status);
    if (params.category && params.category !== "all") url.searchParams.append("category", params.category);
    if (params.search && params.search.trim()) url.searchParams.append("search", params.search.trim());
    if (params.page) url.searchParams.append("page", String(params.page));
    if (params.limit) url.searchParams.append("limit", String(params.limit));
    if (params.sortBy) url.searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) url.searchParams.append("sortOrder", params.sortOrder);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || `Failed to fetch messages: ${res.statusText}`,
        data: [],
      };
    }

    const data: ApiResponse<IContactMessage[]> = await res.json();
    return data;
  } catch (err: any) {
    console.error("Error fetching contact messages:", err);
    return {
      success: false,
      message: err.message || "Network error fetching contact messages.",
      data: [],
    };
  }
}

/**
 * 2. Get single contact message by ID or Ticket ID
 */
export async function getContactMessageById(
  id: string
): Promise<ApiResponse<IContactMessage>> {
  try {
    const res = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.message || `Failed to fetch message: ${res.statusText}`,
      };
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error fetching contact message:", err);
    return {
      success: false,
      message: err.message || "Network error fetching contact message.",
    };
  }
}

/**
 * 3. Get contact message stats overview
 */
export async function getContactStats(): Promise<ApiResponse<IContactStats>> {
  try {
    const res = await fetch(`${API_BASE_URL}/contacts/stats`, {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to fetch stats",
      };
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error fetching contact stats:", err);
    return {
      success: false,
      message: err.message || "Network error fetching contact stats.",
    };
  }
}
