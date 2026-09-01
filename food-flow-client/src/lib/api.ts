import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("rider_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("rider_token");
      localStorage.removeItem("rider_user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

export const riderProfileAPI = {
  get: () => api.get("/rider/profile"),
  create: (data: Record<string, unknown>) => api.post("/rider/profile", data),
  update: (data: Record<string, unknown>) => api.patch("/rider/profile", data),
  toggleAvailability: (isAvailable: boolean) =>
    api.patch("/rider/profile/availability", { isAvailable }),
};

export const deliveryAPI = {
  getAvailable: (city?: string) =>
    api.get("/rider/deliveries/available", { params: city ? { city } : {} }),
  getActive: () => api.get("/rider/deliveries/active"),
  getHistory: (params?: { from?: string; to?: string; page?: number }) =>
    api.get("/rider/deliveries/history", { params }),
  accept: (orderId: string, data: { riderName: string; riderPhone: string; riderEmail: string }) =>
    api.post(`/rider/deliveries/${orderId}/accept`, data),
  pickup: (orderId: string) => api.post(`/rider/deliveries/${orderId}/pickup`),
  onTheWay: (orderId: string) => api.post(`/rider/deliveries/${orderId}/on-the-way`),
  delivered: (orderId: string) => api.post(`/rider/deliveries/${orderId}/delivered`),
  updateLocation: (orderId: string, lat: number, lng: number) =>
    api.patch(`/rider/deliveries/${orderId}/location`, { lat, lng }),
};

export const earningsAPI = {
  getStats: () => api.get("/rider/earnings/stats"),
  getEarnings: (period?: string) =>
    api.get("/rider/earnings", { params: period ? { period } : {} }),
  getChart: (period?: string) =>
    api.get("/rider/earnings/chart", { params: period ? { period } : {} }),
};

export const notificationAPI = {
  get: (userId: string) => api.get("/notifications", { params: { userId } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: (userId: string) => api.patch("/notifications/read-all", { params: { userId } }),
};

export default api;
