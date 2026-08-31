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
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type {
  ForgotPasswordStep,
  ForgotPasswordFormData,
  ForgotPasswordFormErrors,
  OtpFormData,
  OtpFormErrors,
  ResetPasswordFormData,
  ResetPasswordFormErrors,
  ResetPasswordTouchedFields,
  PasswordStrength,
} from "@/types/auth";

const OTP_RESEND_SECONDS = 30;
const REDIRECT_COUNTDOWN_SECONDS = 3;

const INITIAL_FORGOT: ForgotPasswordFormData = { email: "" };
const INITIAL_FORGOT_ERRORS: ForgotPasswordFormErrors = {};
const INITIAL_OTP: OtpFormData = { otp: "" };
const INITIAL_OTP_ERRORS: OtpFormErrors = {};
const INITIAL_RESET: ResetPasswordFormData = {
  password: "",
  confirmPassword: "",
};
const INITIAL_RESET_ERRORS: ResetPasswordFormErrors = {};
const INITIAL_RESET_TOUCHED: ResetPasswordTouchedFields = {
  password: false,
  confirmPassword: false,
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email address is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return "Please enter a valid email address";
  return undefined;
}

function validateOtp(otp: string): string | undefined {
  if (!otp.trim()) return "Verification code is required";
  if (!/^\d{6}$/.test(otp.trim())) return "Please enter the 6-digit verification code";
  return undefined;
}

function validateResetField(
  name: "password" | "confirmPassword",
  form: ResetPasswordFormData
): string | undefined {
  switch (name) {
    case "password":
      if (!form.password) return "New password is required";
      if (form.password.length < 6)
        return "Password must be at least 6 characters";
      return undefined;
    case "confirmPassword":
      if (!form.confirmPassword) return "Please confirm your new password";
      if (form.confirmPassword !== form.password)
        return "Passwords do not match";
      return undefined;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// API Handlers
// ---------------------------------------------------------------------------
async function sendOtpApi(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const json = await res.json();
    return {
      success: !!json.success,
      message: json.message || (json.success ? "Code sent!" : "Failed to send code"),
    };
  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}

async function verifyOtpApi(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
    const json = await res.json();
    return {
      success: !!json.success,
      message: json.message || (json.success ? "Code verified!" : "Invalid code"),
    };
  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}

async function resetPasswordApi(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const json = await res.json();
    return {
      success: !!json.success,
      message: json.message || (json.success ? "Password updated!" : "Failed to update password"),
    };
  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}

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
// Reusable InputField
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
  maxLength,
  inputMode,
  className,
}: {
  id: string;
  name: string;
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
  maxLength?: number;
  inputMode?: "numeric" | "text" | "email";
  className?: string;
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
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete="off"
          className={`w-full pl-10 ${
            trailing ? "pr-11" : "pr-4"
          } py-3 rounded-xl border text-sm text-gray-900 bg-white placeholder:text-gray-400 outline-none transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 ${
            showError
              ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.08)]"
          } ${className || ""}`}
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
// Step Indicator
// ---------------------------------------------------------------------------
const STEP_META: Record<
  Exclude<ForgotPasswordStep, "done">,
  { label: string; icon: typeof Mail }
> = {
  email: { label: "Email", icon: Mail },
  otp: { label: "Verification", icon: Smartphone },
  reset: { label: "New Password", icon: KeyRound },
};

function StepIndicator({ step }: { step: Exclude<ForgotPasswordStep, "done"> }) {
  const order: Exclude<ForgotPasswordStep, "done">[] = ["email", "otp", "reset"];
  const currentIndex = order.indexOf(step);

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {order.map((s, idx) => {
        const meta = STEP_META[s];
        const Icon = meta.icon;
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        return (
          <React.Fragment key={s}>
            {idx > 0 && (
              <div
                className={`h-0.5 w-6 sm:w-10 rounded-full transition-colors duration-300 ${
                  idx <= currentIndex ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isDone
                    ? "bg-orange-500 border-orange-500 text-white shadow-xs"
                    : isActive
                    ? "border-orange-500 text-orange-600 bg-orange-50 font-bold shadow-xs"
                    : "border-gray-200 text-gray-400 bg-white"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold ${
                  isActive || isDone ? "text-orange-600" : "text-gray-400"
                }`}
              >
                {meta.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ForgotPasswordPage Component
// ---------------------------------------------------------------------------
export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<ForgotPasswordStep>("email");

  const [forgotForm, setForgotForm] = useState<ForgotPasswordFormData>(INITIAL_FORGOT);
  const [forgotErrors, setForgotErrors] = useState<ForgotPasswordFormErrors>(INITIAL_FORGOT_ERRORS);
  const [forgotTouched, setForgotTouched] = useState(false);

  const [otpForm, setOtpForm] = useState<OtpFormData>(INITIAL_OTP);
  const [otpErrors, setOtpErrors] = useState<OtpFormErrors>(INITIAL_OTP_ERRORS);
  const [otpTouched, setOtpTouched] = useState(false);

  const [resetForm, setResetForm] = useState<ResetPasswordFormData>(INITIAL_RESET);
  const [resetErrors, setResetErrors] = useState<ResetPasswordFormErrors>(INITIAL_RESET_ERRORS);
  const [resetTouched, setResetTouched] = useState<ResetPasswordTouchedFields>(INITIAL_RESET_TOUCHED);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_COUNTDOWN_SECONDS);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Auto-Redirect to Login on Success
  useEffect(() => {
    if (step !== "done") return;
    if (redirectCountdown <= 0) {
      router.push("/auth/login");
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, redirectCountdown, router]);

  // Step 1: Send OTP to Email
  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setInfoMessage(null);
      setForgotTouched(true);

      const emailError = validateEmail(forgotForm.email);
      setForgotErrors({ email: emailError });
      if (emailError) return;

      setIsLoading(true);
      try {
        const response = await sendOtpApi(forgotForm.email);
        if (response.success) {
          setOtpForm(INITIAL_OTP);
          setOtpErrors(INITIAL_OTP_ERRORS);
          setOtpTouched(false);
          setStep("otp");
          setResendCountdown(OTP_RESEND_SECONDS);
          setInfoMessage("Verification code has been sent to your email.");
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Failed to send verification code. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [forgotForm]
  );

  // Step 2: Verify OTP
  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setInfoMessage(null);
      setOtpTouched(true);

      const otpError = validateOtp(otpForm.otp);
      setOtpErrors({ otp: otpError });
      if (otpError) return;

      setIsLoading(true);
      try {
        const response = await verifyOtpApi(forgotForm.email, otpForm.otp);
        if (response.success) {
          setResetForm(INITIAL_RESET);
          setResetErrors(INITIAL_RESET_ERRORS);
          setResetTouched(INITIAL_RESET_TOUCHED);
          setStep("reset");
          setInfoMessage("Verification successful! Please enter your new password.");
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Verification failed. Please check the code and try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [forgotForm.email, otpForm]
  );

  // Resend OTP Action
  const handleResendOtp = useCallback(async () => {
    if (resendCountdown > 0 || isResending) return;
    setServerError(null);
    setInfoMessage(null);
    setIsResending(true);

    try {
      const response = await sendOtpApi(forgotForm.email);
      if (response.success) {
        setResendCountdown(OTP_RESEND_SECONDS);
        setInfoMessage("A new verification code has been sent to your email!");
      } else {
        setServerError(response.message);
      }
    } catch {
      setServerError("Failed to resend verification code. Please try again.");
    } finally {
      setIsResending(false);
    }
  }, [forgotForm.email, resendCountdown, isResending]);

  // Step 3: Reset Password in Database
  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setInfoMessage(null);
      setResetTouched({ password: true, confirmPassword: true });

      const passwordError = validateResetField("password", resetForm);
      const confirmError = validateResetField("confirmPassword", resetForm);
      const errors: ResetPasswordFormErrors = {
        password: passwordError,
        confirmPassword: confirmError,
      };
      setResetErrors(errors);
      if (passwordError || confirmError) return;

      setIsLoading(true);
      try {
        const response = await resetPasswordApi(forgotForm.email, resetForm.password);
        if (response.success) {
          setStep("done");
          setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS);
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Password reset failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [forgotForm.email, resetForm]
  );

  // -------------------------------------------------------------------------
  // Done / Success State
  // -------------------------------------------------------------------------
  if (step === "done") {
    return (
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 sm:py-16 overflow-hidden bg-white">
        {/* Background Decorative Blur Orbs */}
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

        <div className="relative max-w-md w-full text-center space-y-7 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-25" />
            <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
              <CheckCircle2 className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Password Reset!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your password has been successfully updated in the database. You can now sign in with your new password.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Redirecting to{" "}
              <span className="font-semibold text-gray-700">Sign In</span> in{" "}
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
              href="/auth/login"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main Multi-step Card
  // -------------------------------------------------------------------------
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-16 overflow-hidden bg-white">
      {/* Background Decorative Blur Orbs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50/70 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-10 space-y-7">
          
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Account Recovery
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Forgot Password
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {step === "email" && "Enter your registered email to receive a verification code"}
              {step === "otp" && `We sent a 6-digit code to ${forgotForm.email}`}
              {step === "reset" && "Choose a strong new password for your account"}
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator step={step} />

          {/* Feedback Messages */}
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-600 animate-slide-down">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {infoMessage && !serverError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-700 animate-slide-down">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <InputField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={Mail}
                value={forgotForm.email}
                error={forgotErrors.email}
                touched={forgotTouched}
                disabled={isLoading}
                onChange={(e) => {
                  setForgotForm((prev) => ({ ...prev, email: e.target.value }));
                  if (forgotTouched) {
                    setForgotErrors({ email: validateEmail(e.target.value) });
                  }
                  setServerError(null);
                  setInfoMessage(null);
                }}
                onBlur={() => {
                  setForgotTouched(true);
                  setForgotErrors({ email: validateEmail(forgotForm.email) });
                }}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3.5 text-xs text-orange-800 space-y-1">
                <p className="font-semibold">✉️ Check your inbox</p>
                <p className="text-orange-700/90 leading-relaxed">
                  We sent a 6-digit code to <strong className="text-orange-950">{forgotForm.email}</strong>. Please check your Inbox and Spam folder.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="• • • • • •"
                    value={otpForm.otp}
                    disabled={isLoading}
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpForm({ otp: digits });
                      if (otpTouched) setOtpErrors({ otp: validateOtp(digits) });
                      setServerError(null);
                    }}
                    onBlur={() => {
                      setOtpTouched(true);
                      setOtpErrors({ otp: validateOtp(otpForm.otp) });
                    }}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-center tracking-[8px] text-xl font-bold text-gray-900 bg-white placeholder:text-gray-300 placeholder:tracking-widest focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all duration-200"
                  />
                </div>
                {otpTouched && otpErrors.otp && (
                  <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {otpErrors.otp}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpForm.otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setServerError(null);
                    setInfoMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-gray-600 hover:text-orange-600 font-medium transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change email
                </button>

                <div>
                  {resendCountdown > 0 ? (
                    <span className="text-gray-500 font-medium">
                      Resend in{" "}
                      <span className="font-bold text-orange-500 tabular-nums">
                        {resendCountdown}s
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors disabled:opacity-50"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Resend code</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <InputField
                id="new-password"
                name="password"
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 6 characters"
                icon={Lock}
                value={resetForm.password}
                error={resetErrors.password}
                touched={resetTouched.password}
                disabled={isLoading}
                onChange={(e) => {
                  const value = e.target.value;
                  setResetForm((prev) => ({ ...prev, password: value }));
                  if (resetTouched.password) {
                    setResetErrors((prev) => ({
                      ...prev,
                      password: validateResetField("password", {
                        ...resetForm,
                        password: value,
                      }),
                    }));
                  }
                  setServerError(null);
                }}
                onBlur={() => {
                  setResetTouched((prev) => ({ ...prev, password: true }));
                  setResetErrors((prev) => ({
                    ...prev,
                    password: validateResetField("password", resetForm),
                  }));
                }}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
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

              {/* Password strength */}
              {resetForm.password && (
                <div className="space-y-1 pt-0.5 animate-slide-down">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ease-out ${
                          bar <= getPasswordStrength(resetForm.password)
                            ? STRENGTH_COLORS[getPasswordStrength(resetForm.password)]
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Strength:</span>
                    <span
                      className={`font-semibold ${
                        getPasswordStrength(resetForm.password) <= 1
                          ? "text-red-500"
                          : getPasswordStrength(resetForm.password) === 2
                          ? "text-orange-500"
                          : getPasswordStrength(resetForm.password) === 3
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {STRENGTH_LABELS[getPasswordStrength(resetForm.password)]}
                    </span>
                  </div>
                </div>
              )}

              <InputField
                id="confirm-password"
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                icon={Lock}
                value={resetForm.confirmPassword}
                error={resetErrors.confirmPassword}
                touched={resetTouched.confirmPassword}
                disabled={isLoading}
                onChange={(e) => {
                  const value = e.target.value;
                  setResetForm((prev) => ({ ...prev, confirmPassword: value }));
                  if (resetTouched.confirmPassword) {
                    setResetErrors((prev) => ({
                      ...prev,
                      confirmPassword: validateResetField("confirmPassword", {
                        ...resetForm,
                        confirmPassword: value,
                      }),
                    }));
                  }
                  setServerError(null);
                }}
                onBlur={() => {
                  setResetTouched((prev) => ({ ...prev, confirmPassword: true }));
                  setResetErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateResetField("confirmPassword", resetForm),
                  }));
                }}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}