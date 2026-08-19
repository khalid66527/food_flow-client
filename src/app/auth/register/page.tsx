"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Bike,
  Store,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type {
  RegisterFormData,
  RegisterFormErrors,
  MockRegisterResponse,
  PublicRole,
  TouchedFields,
  PasswordStrength,
  FormFieldName,
  RoleRedirectMap,
} from "@/types/auth";
import { signUp } from "@/lib/auth-client";

// ---------------------------------------------------------------------------
// Role configuration displayed in the public registration UI.
// Admin is intentionally excluded — it must never appear here.
// ---------------------------------------------------------------------------
const ROLES: {
  value: PublicRole;
  label: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    value: "Customer",
    label: "Customer",
    description: "Order food from your favorite restaurants",
    icon: ShoppingBag,
  },
  {
    value: "Restaurant Partner",
    label: "Restaurant Partner",
    description: "List your restaurant and reach more customers",
    icon: Store,
  },
  {
    value: "Delivery Partner",
    label: "Delivery Partner",
    description: "Deliver orders and earn on your own schedule",
    icon: Bike,
  },
];

// Maps each public role to its post-registration dashboard route.
const ROLE_REDIRECT_MAP: RoleRedirectMap = {
  Customer: "/dashboard/customer",
  "Restaurant Partner": "/dashboard/restaurant",
  "Delivery Partner": "/dashboard/delivery",
};

// Seconds to wait before auto-redirecting after successful registration.
const REDIRECT_COUNTDOWN_SECONDS = 5;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const INITIAL_FORM: RegisterFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "",
  agreeToTerms: false,
};

const INITIAL_TOUCHED: TouchedFields = {
  fullName: false,
  email: false,
  phone: false,
  password: false,
  confirmPassword: false,
};

// ---------------------------------------------------------------------------
// Password strength helper
// ---------------------------------------------------------------------------
function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return Math.min(score, 4) as PasswordStrength;
}

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: "Too short",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  0: "bg-gray-200",
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-green-500",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateField(
  name: FormFieldName,
  form: RegisterFormData
): string | undefined {
  switch (name) {
    case "fullName":
      if (!form.fullName.trim()) return "Full name is required";
      if (form.fullName.trim().length < 2)
        return "Name must be at least 2 characters";
      return undefined;
    case "email":
      if (!form.email.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return "Enter a valid email address";
      return undefined;
    case "phone":
      if (!form.phone.trim()) return "Phone number is required";
      if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, "")))
        return "Enter a valid BD phone number (01XXXXXXXXX)";
      return undefined;
    case "password":
      if (!form.password) return "Password is required";
      if (form.password.length < 6)
        return "Password must be at least 6 characters";
      return undefined;
    case "confirmPassword":
      if (!form.confirmPassword) return "Please confirm your password";
      if (form.password !== form.confirmPassword)
        return "Passwords do not match";
      return undefined;
    default:
      return undefined;
  }
}

function validateAll(form: RegisterFormData): RegisterFormErrors {
  return {
    fullName: validateField("fullName", form),
    email: validateField("email", form),
    phone: validateField("phone", form),
    password: validateField("password", form),
    confirmPassword: validateField("confirmPassword", form),
    role: !form.role ? "Please select a role" : undefined,
    agreeToTerms: !form.agreeToTerms
      ? "You must agree to the terms"
      : undefined,
  };
}

function hasErrors(errors: RegisterFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// ---------------------------------------------------------------------------
// Mock registration handler — replace with Better Auth signUp() later.
//
// TODO (Better Auth integration):
//   import { signUp } from "@/lib/auth-client";
//   const response = await signUp.email({
//     name: data.fullName,
//     email: data.email,
//     password: data.password,
//     // phone & role stored via a separate API call or callback
//   });
//   if (response.error) throw new Error(response.error.message);
//   return { success: true, userId: response.data.user.id };
// ---------------------------------------------------------------------------
function mockRegister(
  data: RegisterFormData
): Promise<MockRegisterResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("[Mock] Registration payload:", {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
      });
      resolve({
        success: true,
        message: `Registration successful! Welcome ${data.fullName}.`,
        userId: "mock_user_" + Date.now(),
      });
    }, 2000);
  });
}

// ---------------------------------------------------------------------------
// InputField — reusable, animated form field
// ---------------------------------------------------------------------------
function InputField({
  id,
  name,
  label,
  type,
  placeholder,
  icon: Icon,
  value,
  error,
  touched,
  disabled,
  onChange,
  onBlur,
  trailing,
  style,
}: {
  id: string;
  name: FormFieldName;
  label: string;
  type: string;
  placeholder: string;
  icon: typeof User;
  value: string;
  error?: string;
  touched: boolean;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  trailing?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const showError = touched && error;
  return (
    <div className="space-y-1.5 group" style={style}>
      <label
        htmlFor={id}
        className={`block text-sm font-semibold transition-colors duration-200 ${
          showError
            ? "text-red-500"
            : "text-gray-700 group-focus-within:text-orange-600"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
            showError
              ? "text-red-400"
              : "text-gray-400 group-focus-within:text-orange-500"
          }`}
        />
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full pl-10 ${
            trailing ? "pr-11" : "pr-4"
          } py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 ${
            showError
              ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 animate-shake"
              : "border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.08)]"
          }`}
        />
        {trailing}
      </div>
      {showError && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5 animate-slide-down">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// RegisterPage
// ===========================================================================
export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(
    REDIRECT_COUNTDOWN_SECONDS
  );

  // Shake animation reset
  useEffect(() => {
    if (shakeSubmit) {
      const timer = setTimeout(() => setShakeSubmit(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shakeSubmit]);

  // Auto-redirect countdown after successful registration
  useEffect(() => {
    if (!isSuccess || !form.role) return;

    if (redirectCountdown <= 0) {
      const destination = ROLE_REDIRECT_MAP[form.role as PublicRole];
      router.push(destination);
      return;
    }

    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, form.role, router]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;

      if (name === "agreeToTerms") {
        setForm((prev) => ({ ...prev, agreeToTerms: checked }));
        if (errors.agreeToTerms) {
          setErrors((prev) => ({ ...prev, agreeToTerms: undefined }));
        }
        return;
      }

      setForm((prev) => ({ ...prev, [name]: value }));

      if (touched[name as keyof TouchedFields]) {
        const fieldError = validateField(
          name as FormFieldName,
          { ...form, [name]: value }
        );
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
      }

      setServerError(null);
    },
    [form, errors, touched]
  );

  const handleBlur = useCallback(
    (name: FormFieldName) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const fieldError = validateField(name, form);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    },
    [form]
  );

  const handleRoleSelect = useCallback(
    (role: PublicRole) => {
      setForm((prev) => ({ ...prev, role }));
      if (errors.role) {
        setErrors((prev) => ({ ...prev, role: undefined }));
      }
    },
    [errors.role]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);

      const allTouched: TouchedFields = {
        fullName: true,
        email: true,
        phone: true,
        password: true,
        confirmPassword: true,
      };
      setTouched(allTouched);

      const validationErrors = validateAll(form);
      setErrors(validationErrors);

      if (hasErrors(validationErrors)) {
        setShakeSubmit(true);
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await signUp.email({
          email: form.email,
          password: form.password,
          name: form.fullName,
          // @ts-expect-error - role and phone are additionalFields in better-auth
          role: form.role,
          phone: form.phone,
        });

        if (error) {
          setServerError(error.message || "Registration failed. Please try again.");
        } else if (data) {
          setIsSuccess(true);
          setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS);
        } else {
          setServerError("Could not complete registration.");
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setServerError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

  const passwordStrength = getPasswordStrength(form.password);

  // -----------------------------------------------------------------------
  // SUCCESS STATE — shown after registration
  // -----------------------------------------------------------------------
  if (isSuccess && form.role) {
    const role = form.role as PublicRole;
    const dashboardRoute = ROLE_REDIRECT_MAP[role];
    const RoleIcon =
      ROLES.find((r) => r.value === role)?.icon ?? ShoppingBag;

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
        <div className="max-w-md w-full text-center space-y-7 animate-scale-in">
          {/* Animated checkmark */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Welcome to Food Flow!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account has been created successfully.
            </p>
          </div>

          {/* User details card */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <RoleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {form.fullName}
                </p>
                <p className="text-xs text-gray-500">{form.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                <Sparkles className="h-3 w-3" />
                {role}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{form.phone}</span>
            </div>
          </div>

          {/* Redirect countdown */}
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Redirecting to your{" "}
              <span className="font-semibold text-gray-600">
                {role.toLowerCase()} dashboard
              </span>{" "}
              in{" "}
              <span className="font-bold text-orange-500 tabular-nums">
                {redirectCountdown}
              </span>{" "}
              seconds…
            </p>

            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${
                    ((REDIRECT_COUNTDOWN_SECONDS - redirectCountdown) /
                      REDIRECT_COUNTDOWN_SECONDS) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={dashboardRoute}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all duration-200"
            >
              Sign in Instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // REGISTRATION FORM
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-gray-500">
            Join Food Flow and get started today
          </p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3 animate-fade-in-up-delay">
          <label className="block text-sm font-semibold text-gray-700">
            I want to join as
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLES.map(({ value, label, description, icon: Icon }, index) => {
              const isActive = form.role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRoleSelect(value)}
                  disabled={isLoading}
                  style={{ animationDelay: `${0.15 + index * 0.07}s` }}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center animate-fade-in-up transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? "border-orange-500 bg-orange-50 shadow-sm shadow-orange-500/10 scale-[1.02]"
                      : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40 hover:shadow-md hover:shadow-orange-500/5 hover:-translate-y-0.5 active:scale-[0.98]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 animate-pop">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ease-out ${
                      isActive
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                        : "bg-gray-100 text-gray-400 group-hover:bg-orange-100"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="space-y-1">
                    <span
                      className={`block text-sm font-semibold leading-tight transition-colors duration-200 ${
                        isActive ? "text-orange-600" : "text-gray-700"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="block text-xs text-gray-500 leading-snug">
                      {description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p className="flex items-center gap-1 text-xs text-red-500 animate-slide-down">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.role}
            </p>
          )}
          <p className="text-xs text-gray-400 text-center pt-1">
            Admin registration is not available through public signup.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 animate-slide-down">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Full Name */}
          <InputField
            id="fullName"
            name="fullName"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={User}
            value={form.fullName}
            error={errors.fullName}
            touched={touched.fullName}
            disabled={isLoading}
            onChange={handleChange}
            onBlur={() => handleBlur("fullName")}
            style={{ animationDelay: "0.25s" }}
          />

          {/* Email */}
          <InputField
            id="email"
            name="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={form.email}
            error={errors.email}
            touched={touched.email}
            disabled={isLoading}
            onChange={handleChange}
            onBlur={() => handleBlur("email")}
            style={{ animationDelay: "0.3s" }}
          />

          {/* Phone */}
          <InputField
            id="phone"
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="01XXXXXXXXX"
            icon={Phone}
            value={form.phone}
            error={errors.phone}
            touched={touched.phone}
            disabled={isLoading}
            onChange={handleChange}
            onBlur={() => handleBlur("phone")}
            style={{ animationDelay: "0.35s" }}
          />

          {/* Password */}
          <div className="space-y-1.5">
            <InputField
              id="password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              icon={Lock}
              value={form.password}
              error={errors.password}
              touched={touched.password}
              disabled={isLoading}
              onChange={handleChange}
              onBlur={() => handleBlur("password")}
              style={{ animationDelay: "0.4s" }}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150 disabled:opacity-40"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Password Strength Indicator */}
            {form.password.length > 0 && (
              <div className="space-y-1.5 pt-1 animate-fade-in-up">
                <div className="flex gap-1">
                  {([0, 1, 2, 3] as const).map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ease-out ${
                        i < passwordStrength
                          ? `${STRENGTH_COLORS[passwordStrength]} scale-y-150`
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs font-medium transition-colors duration-300 ${
                    passwordStrength <= 1
                      ? "text-red-500"
                      : passwordStrength === 2
                      ? "text-orange-500"
                      : passwordStrength === 3
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {STRENGTH_LABELS[passwordStrength]}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <InputField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter your password"
            icon={Lock}
            value={form.confirmPassword}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            disabled={isLoading}
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            style={{ animationDelay: "0.45s" }}
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150 disabled:opacity-40"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          {/* Terms Checkbox */}
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={form.agreeToTerms}
                onChange={handleChange}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 transition-transform duration-150 group-active:scale-90 disabled:opacity-40"
              />
              <span className="text-sm text-gray-600 leading-snug">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors duration-150"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2 transition-colors duration-150"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="flex items-center gap-1 text-xs text-red-500 animate-slide-down">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.agreeToTerms}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 transition-all duration-200 ease-out ${
              shakeSubmit ? "animate-shake" : ""
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center text-sm text-gray-500 animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
