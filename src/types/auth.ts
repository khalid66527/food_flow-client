export type PublicRole = "Customer" | "Restaurant Partner" | "Delivery Partner";

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: PublicRole | "";
  agreeToTerms: boolean;
}

export interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  agreeToTerms?: string;
}

export interface MockRegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
}
