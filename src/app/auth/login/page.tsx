"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { signIn } from "@/lib/auth-client";
import type {
  LoginFormData,
  LoginFormErrors,
  LoginFormFieldName,
  LoginTouchedFields,
  PublicRole,
  RoleRedirectMap,
} from "@/types/auth";

// ---------------------------------------------------------------------------
// Role-based destination after a successful sign-in.
// ---------------------------------------------------------------------------
function getDestination(role?: string | null, callbackUrl?: string | null): string {
  const normRole = (role || "Customer").toLowerCase();
  const defaultDashboard = normRole.includes("admin")
    ? "/dashboard/admin"
    : normRole.includes("restaurant")
    ? "/dashboard/restaurant"
    : normRole.includes("rider") || normRole.includes("delivery")
    ? "/dashboard/rider"
    : "/dashboard/customer";

  if (!callbackUrl) return defaultDashboard;

  try {
    const decoded = decodeURIComponent(callbackUrl);
    // Allow redirect to target callbackUrl if user has matching role or it's a general page
    if (decoded.startsWith("/dashboard/admin") && normRole.includes("admin")) return decoded;
    if (decoded.startsWith("/dashboard/restaurant") && normRole.includes("restaurant")) return decoded;
    if (decoded.startsWith("/dashboard/rider") && (normRole.includes("rider") || normRole.includes("delivery"))) return decoded;
    if (decoded.startsWith("/dashboard/customer") && normRole.includes("customer")) return decoded;
    if (!decoded.startsWith("/dashboard/")) return decoded;
  } catch {
    return defaultDashboard;
  }

  return defaultDashboard;
}

const REDIRECT_COUNTDOWN_SECONDS = 2;

const INITIAL_FORM: LoginFormData = {
  email: "",
  password: "",
  rememberMe: false,
};

const INITIAL_TOUCHED: LoginTouchedFields = {
  email: false,
  password: false,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateField(
  name: LoginFormFieldName,
  form: LoginFormData
): string | undefined {
  switch (name) {
    case "email":
      if (!form.email.trim()) return "Email address is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return "Enter a valid email address";
      return undefined;
    case "password":
      if (!form.password) return "Password is required";
      if (form.password.length < 6)
        return "Password must be at least 6 characters";
      return undefined;
    default:
      return undefined;
  }
}

function validateAll(form: LoginFormData): LoginFormErrors {
  return {
    email: validateField("email", form),
    password: validateField("password", form),
  };
}

function hasErrors(errors: LoginFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

// ---------------------------------------------------------------------------
// InputField
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
}: {
  id: string;
  name: LoginFormFieldName;
  label: string;
  type: string;
  placeholder: string;
  icon: typeof Mail;
  value: string;
  error?: string;
  touched: boolean;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  trailing?: React.ReactNode;
}) {
  const showError = touched && error;
  return (
    <div className="space-y-1.5 group">
      <label
        htmlFor={id}
        className={`block text-xs sm:text-sm font-semibold transition-colors duration-200 ${
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
          } py-3 rounded-xl border text-sm text-gray-900 bg-white placeholder:text-gray-400 outline-none transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 ${
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

// ---------------------------------------------------------------------------
// LoginPage
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [form, setForm] = useState<LoginFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [touched, setTouched] = useState<LoginTouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{
    name: string;
    email: string;
    role: PublicRole;
  } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(
    REDIRECT_COUNTDOWN_SECONDS
  );

  useEffect(() => {
    if (shakeSubmit) {
      const timer = setTimeout(() => setShakeSubmit(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shakeSubmit]);

  useEffect(() => {
    if (!isSuccess || !loggedInUser) return;

    if (redirectCountdown <= 0) {
      const destination = getDestination(loggedInUser.role, callbackUrl);
      router.push(destination);
      return;
    }

    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [isSuccess, loggedInUser, redirectCountdown, router, callbackUrl]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, checked } = e.target;

      if (name === "rememberMe") {
        setForm((prev) => ({ ...prev, rememberMe: checked }));
        return;
      }

      setForm((prev) => ({ ...prev, [name]: value }));

      if (touched[name as keyof LoginTouchedFields]) {
        const fieldError = validateField(name as LoginFormFieldName, {
          ...form,
          [name]: value,
        });
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
      }

      setServerError(null);
    },
    [form, touched]
  );

  const handleBlur = useCallback(
    (name: LoginFormFieldName) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const fieldError = validateField(name, form);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    },
    [form]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);

      const allTouched: LoginTouchedFields = { email: true, password: true };
      setTouched(allTouched);

      const validationErrors = validateAll(form);
      setErrors(validationErrors);

      if (hasErrors(validationErrors)) {
        setShakeSubmit(true);
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await signIn.email({
          email: form.email,
          password: form.password,
        });

        if (error) {
          setServerError(error.message || "Invalid email or password");
        } else if (data?.user) {
          const authUser = data.user as unknown as {
            id: string;
            email: string;
            name: string;
            role?: string;
          };
          setLoggedInUser({
            name: authUser.name || authUser.email.split("@")[0],
            email: authUser.email,
            role: (authUser.role as PublicRole) || "Customer",
          });
          setIsSuccess(true);
          setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS);
        } else {
          setServerError("Sign in failed. Please try again.");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Invalid email or password. Please try again.";
        setServerError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

  const handleGoogleLogin = useCallback(async () => {
    setServerError(null);
    setIsGoogleLoading(true);

    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard/customer",
      });
      if (error) {
        setServerError(
          error.message ||
            "Google sign in is not configured yet. Please sign in with email."
        );
      }
    } catch {
      setServerError(
        "Google sign in failed. Please try again or use email."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  if (isSuccess && loggedInUser) {
    const dashboardRoute = getDestination(loggedInUser.role, callbackUrl);

    return (
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16 overflow-hidden bg-white">
        {/* Background Decorative Blur Orbs */}
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

        <div className="relative max-w-md w-full text-center space-y-7 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 animate-scale-in">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-25" />
            <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              You have successfully signed in to Food Flow.
            </p>
          </div>

          <div className="bg-orange-50/60 rounded-2xl border border-orange-100 p-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {loggedInUser.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {loggedInUser.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                <Sparkles className="h-3 w-3" />
                {loggedInUser.role}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Redirecting to your{" "}
              <span className="font-semibold text-gray-700">
                dashboard
              </span>{" "}
              in{" "}
              <span className="font-bold text-orange-500 tabular-nums">
                {redirectCountdown}
              </span>{" "}
              seconds…
            </p>

            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

          <div className="pt-2">
            <Link
              href={dashboardRoute}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Sign-in form
  // -------------------------------------------------------------------------
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-16 overflow-hidden bg-white">
      {/* Background Decorative Blur Orbs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-10 space-y-7 animate-fade-in-up">
          
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome Back
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Sign In to Food Flow
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Social Sign In (Google) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-xs hover:border-orange-200 hover:bg-orange-50/40 hover:text-orange-600 hover:shadow-md hover:shadow-orange-500/5 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29a7.19 7.19 0 0 1 0-4.58V6.62H1.29a12.04 12.04 0 0 0 0 10.76l3.98-3.09Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600 animate-slide-down">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

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
              disabled={isLoading || isGoogleLoading}
              onChange={handleChange}
              onBlur={() => handleBlur("email")}
            />

            <InputField
              id="password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              icon={Lock}
              value={form.password}
              error={errors.password}
              touched={touched.password}
              disabled={isLoading || isGoogleLoading}
              onChange={handleChange}
              onBlur={() => handleBlur("password")}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isGoogleLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 transition-transform duration-150 group-active:scale-90"
                />
                <span className="text-xs sm:text-sm text-gray-600">
                  Remember me
                </span>
              </label>

              <Link
                href="/auth/forgot-password"
                className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out ${
                shakeSubmit ? "animate-shake" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer & Register Link */}
          <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Safe & Secure login credentials</span>
            </div>

            <p className="text-center text-xs sm:text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors duration-150"
              >
                Create Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
