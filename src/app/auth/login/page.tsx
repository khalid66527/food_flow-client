"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import type {
  LoginFormData,
  LoginFormErrors,
  MockLoginResponse,
  LoginFormFieldName,
  LoginTouchedFields,
  PublicRole,
} from "@/types/auth";

const REDIRECT_COUNTDOWN_SECONDS = 3;

const INITIAL_FORM: LoginFormData = {
  email: "",
  password: "",
  rememberMe: false,
};

const INITIAL_TOUCHED: LoginTouchedFields = {
  email: false,
  password: false,
};

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
// Mock login handler — replace with Better Auth signIn.email() later.
//
// TODO (Better Auth integration):
//   import { signIn } from "@/lib/auth-client";
//   const response = await signIn.email({
//     email: data.email,
//     password: data.password,
//   });
//   if (response.error) throw new Error(response.error.message);
//   return { success: true, user: response.data.user };
// ---------------------------------------------------------------------------
function mockLogin(data: LoginFormData): Promise<MockLoginResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("[Mock] Login payload:", {
        email: data.email,
        rememberMe: data.rememberMe,
      });
      resolve({
        success: true,
        message: "Signed in successfully!",
        user: {
          id: "mock_user_" + Date.now(),
          email: data.email,
          name: data.email.split("@")[0] || "User",
          role: "Customer",
        },
      });
    }, 1500);
  });
}

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

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<LoginFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [touched, setTouched] = useState<LoginTouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!isSuccess) return;

    if (redirectCountdown <= 0) {
      router.push("/dashboard/customer");
      return;
    }

    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, router]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, checked } = e.target;

      if (name === "rememberMe") {
        setForm((prev) => ({ ...prev, rememberMe: checked }));
        return;
      }

      setForm((prev) => ({ ...prev, [name]: value }));

      if (touched[name as keyof LoginTouchedFields]) {
        const fieldError = validateField(
          name as LoginFormFieldName,
          { ...form, [name]: value }
        );
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

      const allTouched: LoginTouchedFields = {
        email: true,
        password: true,
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
        // TODO (Better Auth integration):
        // Replace mockLogin() with real signIn call:
        //   const { data, error } = await signIn.email({
        //     email: form.email,
        //     password: form.password,
        //   });
        //   if (error) throw new Error(error.message);
        const response = await mockLogin(form);

        if (response.success && response.user) {
          setLoggedInUser({
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
          });
          setIsSuccess(true);
          setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS);
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Invalid email or password. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

  if (isSuccess && loggedInUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
        <div className="max-w-md w-full text-center space-y-7 animate-scale-in">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              You have successfully signed in to Food Flow.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {loggedInUser.name}
                </p>
                <p className="text-xs text-gray-500">{loggedInUser.email}</p>
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
              <span className="font-semibold text-gray-600">dashboard</span> in{" "}
              <span className="font-bold text-orange-500 tabular-nums">
                {redirectCountdown}
              </span>{" "}
              seconds…
            </p>

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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/customer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Sign In
          </h1>
          <p className="text-sm text-gray-500">
            Enter your credentials to access your Food Flow account
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
            style={{ animationDelay: "0.15s" }}
          />

          {/* Password */}
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
            disabled={isLoading}
            onChange={handleChange}
            onBlur={() => handleBlur("password")}
            style={{ animationDelay: "0.2s" }}
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

          {/* Remember Me & Forgot Password */}
          <div
            className="flex items-center justify-between animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 transition-transform duration-150 group-active:scale-90 disabled:opacity-40"
              />
              <span className="text-sm text-gray-600 font-medium select-none">
                Remember me
              </span>
            </label>

            <Link
              href="/auth/forgot-password"
              className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150"
            >
              Forgot password?
            </Link>
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center text-sm text-gray-500 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          Dont have an account?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}