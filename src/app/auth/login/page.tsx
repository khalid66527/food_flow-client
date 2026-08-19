"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Bike,
  Star,
  Home,
} from "lucide-react";
import { signIn } from "@/lib/auth-client";
import type {
  LoginFormData,
  LoginFormErrors,
  MockLoginResponse,
  LoginFormFieldName,
  LoginTouchedFields,
  PublicRole,
  RoleRedirectMap,
} from "@/types/auth";

// ---------------------------------------------------------------------------
// Role-based destination after a successful sign-in.
// Kept in sync with the public registration role selection.
// ---------------------------------------------------------------------------
const ROLE_REDIRECT_MAP: RoleRedirectMap = {
  Customer: "/dashboard/customer",
  "Restaurant Partner": "/dashboard/restaurant",
  "Delivery Partner": "/dashboard/delivery",
};

const REDIRECT_COUNTDOWN_SECONDS = 3;

type SocialProvider = "google" | "facebook";

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
// Sign-in handler — Better Auth first, mock fallback while the backend is
// not available so the frontend flow can be demoed end-to-end.
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
    }, 1200);
  });
}

async function attemptEmailSignIn(
  data: LoginFormData
): Promise<MockLoginResponse> {
  try {
    const { data: result, error } = await signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Invalid email or password",
      };
    }

    if (result?.user) {
      const authUser = result.user as unknown as {
        id: string;
        email: string;
        name: string;
        role?: string;
      };
      return {
        success: true,
        message: "Signed in successfully!",
        user: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name || authUser.email.split("@")[0],
          role: (authUser.role as PublicRole) || "Customer",
        },
      };
    }

    return {
      success: false,
      message: "Sign-in failed. Please check your credentials.",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid email or password. Please try again.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// ---------------------------------------------------------------------------
// Shared UI bits
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
        className={`block text-sm font-semibold transition-colors duration-200 ${
          showError
            ? "text-red-500"
            : "text-gray-700 group-focus-within:text-orange-600 dark:text-gray-300"
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
          } py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-950 ${
            showError
              ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 animate-shake dark:border-red-600"
              : "border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.08)] dark:border-gray-700 dark:hover:border-gray-600"
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

function SocialButton({
  provider,
  label,
  icon,
  onClick,
  disabled,
}: {
  provider: SocialProvider;
  label: string;
  icon: React.ReactNode;
  onClick: (provider: SocialProvider) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={disabled}
      className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-orange-500/50 dark:hover:bg-orange-500/10"
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Left brand panel — premium food-tech showcase
// ---------------------------------------------------------------------------
function BrandPanel() {
  const floatCard = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: "easeOut" as const },
  });

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#FF8A3D] to-[#FFB703] px-12 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      {/* Top: logo + tagline */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex items-center gap-3"
      >
        <img
          src="https://i.ibb.co.com/jPhnCNFt/Food-Flow-Logo.png"
          alt="Food Flow Logo"
          className="h-11 w-auto object-contain drop-shadow-lg"
        />
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
          Food Delivery Platform
        </span>
      </motion.div>

      {/* Middle: headline + food showcase */}
      <div className="relative z-10 my-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
          className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white"
        >
          Craving something
          <span className="block">delicious today?</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
          className="mt-4 max-w-md text-sm leading-7 text-white/85"
        >
          Sign in to explore the best restaurants near you, track your orders
          in real time and enjoy exclusive member-only offers.
        </motion.p>

        {/* Food image + floating cards */}
        <div className="relative mt-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="overflow-hidden rounded-[24px] shadow-2xl shadow-orange-900/30 ring-4 ring-white/20"
          >
            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900&auto=format&fit=crop"
              alt="Delicious burger with fries"
              className="h-64 w-full object-cover"
            />
          </motion.div>

          {/* Floating rating card */}
          <motion.div
            {...floatCard(0.5)}
            className="absolute -left-6 -top-6 flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900">4.9 Rating</p>
              <p className="text-[11px] font-medium text-gray-500">
                2.4k+ reviews
              </p>
            </div>
          </motion.div>

          {/* Floating delivery card */}
          <motion.div
            {...floatCard(0.65)}
            className="absolute -bottom-6 -left-8 flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
              <Bike className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900">30 min</p>
              <p className="text-[11px] font-medium text-gray-500">
                Fast delivery
              </p>
            </div>
          </motion.div>

          {/* Floating offer card */}
          <motion.div
            {...floatCard(0.8)}
            className="absolute -right-4 top-8 rounded-2xl bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur-sm"
          >
            <p className="text-xs font-extrabold text-orange-500">
              50% OFF
            </p>
            <p className="text-[11px] font-medium text-gray-500">
              first order
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom: stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-6"
      >
        {[
          { value: "500+", label: "Restaurants" },
          { value: "10k+", label: "Happy customers" },
          { value: "4.9", label: "Average rating" },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-xl font-extrabold text-white">{stat.value}</p>
            <p className="text-xs font-medium text-white/70">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign-in page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<LoginFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [touched, setTouched] = useState<LoginTouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<SocialProvider | null>(
    null
  );
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
      router.push(ROLE_REDIRECT_MAP[loggedInUser.role] ?? "/dashboard/customer");
      return;
    }

    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [isSuccess, loggedInUser, redirectCountdown, router]);

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
        const response = await attemptEmailSignIn(form);

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

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider) => {
      setServerError(null);
      setIsSocialLoading(provider);

      try {
        // TODO (Better Auth social providers):
        // Enable google / facebook providers in src/lib/auth.ts once the
        // OAuth credentials are available in the shared .env doc.
        const { error } = await signIn.social({
          provider,
          callbackURL: "/dashboard/customer",
        });
        if (error) {
          setServerError(
            `${provider} login is not configured yet. Please sign in with your email instead.`
          );
        }
      } catch {
        setServerError(
          `${provider} login is not configured yet. Please sign in with your email instead.`
        );
      } finally {
        setIsSocialLoading(null);
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  if (isSuccess && loggedInUser) {
    const dashboardRoute = ROLE_REDIRECT_MAP[loggedInUser.role] ?? "/dashboard/customer";

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full text-center space-y-7"
        >
          <div className="relative w-20 h-20 mx-auto">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-20 dark:bg-orange-500/20"
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
              className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20"
            >
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight dark:text-gray-100">
              Welcome Back!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              You have successfully signed in to Food Flow.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4 text-left dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
                  {loggedInUser.name}
                </p>
                <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                  {loggedInUser.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold dark:bg-orange-500/15 dark:text-orange-400">
                <Sparkles className="h-3 w-3" />
                {loggedInUser.role}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Redirecting to your{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                dashboard
              </span>{" "}
              in{" "}
              <span className="font-bold text-orange-500 tabular-nums">
                {redirectCountdown}
              </span>{" "}
              seconds…
            </p>

            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
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
              href={dashboardRoute}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Sign-in form
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-[80vh] bg-white dark:bg-gray-950">
      <div className="mx-auto grid min-h-[80vh] max-w-7xl lg:grid-cols-2">
        {/* Left brand panel */}
        <BrandPanel />

        {/* Right form panel */}
        <div className="flex items-center justify-center px-4 py-12 sm:px-8 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile logo */}
            <div className="flex items-center justify-center lg:hidden">
              <img
                src="https://i.ibb.co.com/jPhnCNFt/Food-Flow-Logo.png"
                alt="Food Flow Logo"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-3xl font-extrabold text-gray-900 tracking-tight dark:text-gray-100"
              >
                Sign In
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.5, ease: "easeOut" }}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                Enter your credentials to access your Food Flow account
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Social login */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <SocialButton
                    provider="google"
                    label="Google"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
                    }
                    onClick={handleSocialLogin}
                    disabled={isLoading || isSocialLoading !== null}
                  />
                  <SocialButton
                    provider="facebook"
                    label="Facebook"
                    icon={
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
                      </svg>
                    }
                    onClick={handleSocialLogin}
                    disabled={isLoading || isSocialLoading !== null}
                  />
                </div>

                {isSocialLoading && (
                  <p className="flex items-center justify-center gap-2 text-xs text-gray-500 animate-fade-in-up">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                    Connecting to {isSocialLoading}…
                  </p>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    or continue with email
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence>
                  {serverError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {serverError}
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  disabled={isLoading}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150 disabled:opacity-40"
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
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={form.rememberMe}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 transition-transform duration-150 group-active:scale-90 disabled:opacity-40"
                    />
                    <span className="text-sm text-gray-600 font-medium select-none dark:text-gray-300">
                      Remember me
                    </span>
                  </label>

                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150 dark:text-orange-500 dark:hover:text-orange-400"
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
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="space-y-3 pt-1">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150 dark:text-orange-500 dark:hover:text-orange-400"
                  >
                    Create account
                  </Link>
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Home className="h-3.5 w-3.5" />
                  <Link
                    href="/"
                    className="font-medium hover:text-orange-600 transition-colors duration-150"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}