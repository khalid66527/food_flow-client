export type PublicRole = "Customer" | "Restaurant Partner" | "Delivery Partner";

export type FormFieldName = "fullName" | "email" | "phone" | "password" | "confirmPassword" | "role" | "agreeToTerms";

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

export type TouchedFields = Record<Exclude<FormFieldName, "role" | "agreeToTerms">, boolean>;

export interface MockRegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface RoleOption {
  value: PublicRole;
  label: string;
  description: string;
  icon: string;
}

export type RoleRedirectMap = Record<PublicRole, string>;

export type LoginFormFieldName = "email" | "password";

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export type LoginTouchedFields = Record<LoginFormFieldName, boolean>;

export interface MockLoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: PublicRole;
  };
}

