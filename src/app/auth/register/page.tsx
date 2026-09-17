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
  ShieldCheck,
} from "lucide-react";
import type {
  RegisterFormData,
  RegisterFormErrors,
  PublicRole,
  TouchedFields,
  PasswordStrength,
  FormFieldName,
  RoleRedirectMap,
} from "@/types/auth";
import { signUp, signIn, signOut } from "@/lib/auth-client";
import {
  saveRegisterDraft,
  readRegisterDraft,
  clearRegisterDraft,
} from "@/lib/registerDraft";

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
    description: "Order delicious food from top restaurants",
    icon: ShoppingBag,
  },
  {
    value: "Restaurant Partner",
    label: "Restaurant Partner",
    description: "List your restaurant and grow your business",
    icon: Store,
  },
  {
    value: "Delivery Partner",
    label: "Delivery Partner",
    description: "Deliver orders and earn on your schedule",
    icon: Bike,
  },
];

// Maps each public role to its post-registration dashboard route.
const ROLE_REDIRECT_MAP: RoleRedirectMap = {
  Customer: "/dashboard/customer",
  "Restaurant Partner": "/dashboard/restaurant",
  "Delivery Partner": "/dashboard/rider",
};

// Seconds to wait before auto-redirecting after successful registration.
const REDIRECT_COUNTDOWN_SECONDS = 4;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const INITIAL_FORM: RegisterFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "Customer",
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
  1: "bg-red-500",
  2: "bg-orange-400",
  3: "bg-amber-400",
  4: "bg-emerald-500",
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
// InputField — reusable, accessible form field
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeSubmit, setShakeSubmit] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(
    REDIRECT_COUNTDOWN_SECONDS
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Rehydrate the draft parked before the user clicked through to /terms or
  // /privacy. This has to be a post-mount effect rather than a useState
  // initialiser — reading sessionStorage during render would not match the
  // server-rendered output. Same constraint (and same lint suppression) as
  // AddFoodForm.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = readRegisterDraft();

    if (draft) {
      setForm((prev) => ({
        ...prev,
        fullName: draft.fullName,
        email: draft.email,
        phone: draft.phone,
        role: draft.role,
        agreeToTerms: draft.agreeToTerms,
      }));
      setDraftNotice(
        "We restored your details — please re-enter your password."
      );
    }

    // `touched` is intentionally not restored: it would immediately paint
    // "Password is required" under the deliberately blank password fields.
    // The draft is also not cleared here — autosave means it has to survive
    // repeated round trips. It is cleared once registration succeeds.
    setDraftRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Autosave, debounced. Gated on `draftRestored` so the first render cannot
  // write INITIAL_FORM over a stored draft before the effect above reads it.
  useEffect(() => {
    if (!draftRestored || isSuccess) return;
    const timer = setTimeout(() => saveRegisterDraft(form), 300);
    return () => clearTimeout(timer);
  }, [form, draftRestored, isSuccess]);

  // Restore notice auto-dismiss
  useEffect(() => {
    if (!draftNotice) return;
    const timer = setTimeout(() => setDraftNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [draftNotice]);

  // Shake animation reset
  useEffect(() => {
    if (shakeSubmit) {
      const timer = setTimeout(() => setShakeSubmit(false), 400);
      return () => clearTimeout(timer);
    }
  }, [shakeSubmit]);

  // Auto-redirect countdown after successful registration -> redirect to Login for OTP verification
  useEffect(() => {
    if (!isSuccess || !form.role) return;

    if (redirectCountdown <= 0) {
      const destination = `/auth/login?registered=true&email=${encodeURIComponent(form.email)}`;
      router.push(destination);
      return;
    }

    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, form.role, form.email, router]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, checked } = e.target;

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

  // Google Social Sign Up / Sign In
  const handleGoogleSignUp = useCallback(async () => {
    setServerError(null);
    setIsGoogleLoading(true);

    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: ROLE_REDIRECT_MAP[form.role as PublicRole] || "/dashboard/customer",
      });

      if (error) {
        setServerError(
          error.message ||
            "Google sign up is not configured yet. Please register with email instead."
        );
      }
    } catch {
      setServerError(
        "Google sign up failed. Please try again or create an account with email."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }, [form.role]);

  // Email Submit
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
          try {
            await signOut();
          } catch {
            // ignore
          }
          // The account exists now — the draft is stale and must not resurface
          // on a later visit to /auth/register in this tab.
          clearRegisterDraft();
          router.push(`/auth/login?registered=true&email=${encodeURIComponent(form.email)}`);
        } else {
          setServerError("Could not complete registration.");
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
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
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16 overflow-hidden bg-white">
        {/* Background Decorative Blur Orbs */}
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

        <div className="relative max-w-md w-full text-center space-y-7 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 animate-scale-in">
          {/* Animated checkmark */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-25" />
            <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Account Created!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Please sign in with your email to verify with OTP and activate your account.
            </p>
          </div>

          {/* User details card */}
          <div className="bg-orange-50/60 rounded-2xl border border-orange-100 p-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <RoleIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {form.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">{form.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                <Sparkles className="h-3 w-3" />
                {role}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500">{form.phone}</span>
            </div>
          </div>

          {/* Redirect countdown */}
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Redirecting to{" "}
              <span className="font-semibold text-gray-700">
                Sign In & OTP Verification
              </span>{" "}
              in{" "}
              <span className="font-bold text-orange-500 tabular-nums">
                {redirectCountdown}
              </span>{" "}
              seconds…
            </p>

            {/* Progress bar */}
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/auth/login?registered=true&email=${encodeURIComponent(form.email)}`}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              Proceed to Sign In & Verify
              <ArrowRight className="h-4 w-4" />
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
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-16 overflow-hidden bg-white">
      {/* Background Decorative Blur Orbs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

      <div className="relative w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-10 space-y-7 animate-fade-in-up">
          
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Join Food Flow Today
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Sign up to explore top restaurants, manage food menus, or deliver
            </p>
          </div>

          {/* Social Sign Up (Google) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
                or sign up with email
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-semibold text-gray-800">
                I want to join as
              </label>
              <span className="text-[11px] text-gray-400">
                Select your account role
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ROLES.map(({ value, label, description, icon: Icon }) => {
                const isActive = form.role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRoleSelect(value)}
                    disabled={isLoading || isGoogleLoading}
                    className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 text-center transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? "border-orange-500 bg-orange-50/70 shadow-xs scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30 hover:-translate-y-0.5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white animate-pop shadow-xs">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-0.5">
                      <span
                        className={`block text-xs sm:text-sm font-bold leading-tight transition-colors duration-200 ${
                          isActive
                            ? "text-orange-600"
                            : "text-gray-800"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="block text-[11px] text-gray-500 leading-snug line-clamp-2">
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
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {draftNotice && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-700 animate-slide-down">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{draftNotice}</span>
              </div>
            )}

            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600 animate-slide-down">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Full Name */}
            <InputField
              id="fullName"
              name="fullName"
              label="Full Name"
              type="text"
              placeholder="e.g. Shakib Al Hasan"
              icon={User}
              value={form.fullName}
              error={errors.fullName}
              touched={touched.fullName}
              disabled={isLoading || isGoogleLoading}
              onChange={handleChange}
              onBlur={() => handleBlur("fullName")}
            />

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <InputField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                icon={Mail}
                value={form.email}
                error={errors.email}
                touched={touched.email}
                disabled={isLoading || isGoogleLoading}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
              />

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
                disabled={isLoading || isGoogleLoading}
                onChange={handleChange}
                onBlur={() => handleBlur("phone")}
              />
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                {/* Password Strength Indicator */}
                {form.password.length > 0 && (
                  <div className="space-y-1 pt-0.5 animate-slide-down">
                    <div className="flex gap-1">
                      {([0, 1, 2, 3] as const).map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ease-out ${
                            i < passwordStrength
                              ? STRENGTH_COLORS[passwordStrength]
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">Strength:</span>
                      <span
                        className={`font-semibold ${
                          passwordStrength <= 1
                            ? "text-red-500"
                            : passwordStrength === 2
                            ? "text-orange-500"
                            : passwordStrength === 3
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {STRENGTH_LABELS[passwordStrength]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <InputField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                icon={Lock}
                value={form.confirmPassword}
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
                disabled={isLoading || isGoogleLoading}
                onChange={handleChange}
                onBlur={() => handleBlur("confirmPassword")}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    disabled={isLoading || isGoogleLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
            </div>

            {/* Terms Checkbox */}
            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={form.agreeToTerms}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500 transition-transform duration-150 group-active:scale-90 disabled:opacity-40"
                />
                <span className="text-xs sm:text-sm text-gray-600 leading-snug">
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

            {/* Submit CTA Button */}
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
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Safe Badge & Footer */}
          <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secure SSL encrypted registration</span>
            </div>

            <p className="text-center text-xs sm:text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors duration-150"
              >
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
