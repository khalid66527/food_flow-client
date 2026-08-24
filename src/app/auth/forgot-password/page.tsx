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
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Smartphone,
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
  MockForgotPasswordResponse,
  PasswordStrength,
} from "@/types/auth";

// ---------------------------------------------------------------------------
// Mock OTP flow — replace with the real email/OTP API once the backend is
// available. The demo OTP is fixed to "123456" so the flow can be tested.
// ---------------------------------------------------------------------------
const DEMO_OTP = "123456";
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address";
  return undefined;
}

function validateOtp(otp: string): string | undefined {
  if (!otp.trim()) return "Verification code is required";
  if (!/^\d{6}$/.test(otp)) return "Enter the 6-digit verification code";
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
// Mock async handlers — swap with real API calls later
// ---------------------------------------------------------------------------
async function mockSendOtp(data: ForgotPasswordFormData): Promise<MockForgotPasswordResponse> {
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    const json = await res.json();
    if (json.success) return { success: true, message: json.message };
    return { success: false, message: json.message || "Failed to send code" };
  } catch {
    console.log("[Fallback Mock] OTP sent to:", data.email, "| Demo OTP:", DEMO_OTP);
    return { success: true, message: "Verification code sent! (Demo: 123456)" };
  }
}

async function mockVerifyOtp(data: OtpFormData): Promise<MockForgotPasswordResponse> {
  const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value || "";
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (window as unknown as { __forgotEmail?: string }).__forgotEmail || email, otp: data.otp }),
    });
    const json = await res.json();
    return { success: json.success, message: json.message };
  } catch {
    if (data.otp === DEMO_OTP) return { success: true, message: "Code verified!" };
    return { success: false, message: "Invalid verification code." };
  }
}

async function mockResetPassword(
  data: ResetPasswordFormData
): Promise<MockForgotPasswordResponse> {
  const email = (window as unknown as { __forgotEmail?: string }).__forgotEmail || "";
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: data.password }),
    });
    const json = await res.json();
    return { success: json.success, message: json.message };
  } catch {
    console.log("[Mock] Password reset for:", data.password);
    return { success: true, message: "Password reset successfully!" };
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
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-green-500",
};

// ---------------------------------------------------------------------------
// Shared input
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
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete="off"
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

// ---------------------------------------------------------------------------
// Step indicator
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
    <div className="flex items-center justify-center gap-2">
      {order.map((s, idx) => {
        const meta = STEP_META[s];
        const Icon = meta.icon;
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        return (
          <React.Fragment key={s}>
            {idx > 0 && (
              <div
                className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                  idx <= currentIndex ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isDone
                    ? "bg-orange-500 border-orange-500 text-white"
                    : isActive
                    ? "border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-500/10"
                    : "border-gray-200 text-gray-400 dark:border-gray-700"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isActive || isDone
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-400"
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
// Page
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_COUNTDOWN_SECONDS);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (step !== "done") return;
    if (redirectCountdown <= 0) {
      router.push("/auth/login");
      return;
    }
    const timer = setTimeout(
      () => setRedirectCountdown((prev) => prev - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [step, redirectCountdown, router]);

  // Step 1: send OTP to email
  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setForgotTouched(true);

      const emailError = validateEmail(forgotForm.email);
      setForgotErrors({ email: emailError });
      if (emailError) return;

      setIsLoading(true);
      try {
        (window as unknown as { __forgotEmail?: string }).__forgotEmail = forgotForm.email;
        const response = await mockSendOtp(forgotForm);
        if (response.success) {
          setOtpForm(INITIAL_OTP);
          setOtpErrors(INITIAL_OTP_ERRORS);
          setOtpTouched(false);
          setStep("otp");
          setResendCountdown(OTP_RESEND_SECONDS);
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Failed to send the verification code. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [forgotForm]
  );

  // Step 2: verify OTP
  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
      setOtpTouched(true);

      const otpError = validateOtp(otpForm.otp);
      setOtpErrors({ otp: otpError });
      if (otpError) return;

      setIsLoading(true);
      try {
        const response = await mockVerifyOtp(otpForm);
        if (response.success) {
          setResetForm(INITIAL_RESET);
          setResetErrors(INITIAL_RESET_ERRORS);
          setResetTouched(INITIAL_RESET_TOUCHED);
          setStep("reset");
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Verification failed. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [otpForm]
  );

  // Step 3: set new password
  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);
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
        const response = await mockResetPassword(resetForm);
        if (response.success) {
          setStep("done");
          setRedirectCountdown(REDIRECT_COUNTDOWN_SECONDS);
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Password reset failed. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [resetForm]
  );

  const handleResendOtp = useCallback(() => {
    if (resendCountdown > 0) return;
    setServerError(null);
    setResendCountdown(OTP_RESEND_SECONDS);
  }, [resendCountdown]);

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
  if (step === "done") {
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
              Password Reset!
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your password has been reset successfully. You can now sign in
              with your new password.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Redirecting to{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                Sign In
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

          <Link
            href="/auth/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95 transition-all duration-200"
          >
            Go to Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Flow states
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white dark:bg-gray-950">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 animate-scale-in">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight dark:text-gray-100">
            Forgot Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === "email" &&
              "Enter your email and we will send you a verification code"}
            {step === "otp" && `We sent a 6-digit code to ${forgotForm.email}`}
            {step === "reset" && "Choose a new password for your account"}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {/* STEP 1 — EMAIL */}
          {step === "email" && (
            <motion.form
              key="email"
              onSubmit={handleSendOtp}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-5"
            >
              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 animate-slide-down">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

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
                }}
                onBlur={() => {
                  setForgotTouched(true);
                  setForgotErrors({ email: validateEmail(forgotForm.email) });
                }}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* STEP 2 — OTP */}
          {step === "otp" && (
            <motion.form
              key="otp"
              onSubmit={handleVerifyOtp}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-5"
            >
              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 animate-slide-down">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-500">
                Code sent to your email — check inbox (and spam folder)
              </div>

              <InputField
                id="otp"
                name="otp"
                label="Verification Code"
                type="text"
                placeholder="6-digit code"
                icon={Smartphone}
                value={otpForm.otp}
                error={otpErrors.otp}
                touched={otpTouched}
                disabled={isLoading}
                maxLength={6}
                inputMode="numeric"
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
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {resendCountdown > 0 ? (
                  <>
                    Resend code in{" "}
                    <span className="font-bold text-orange-500 tabular-nums">
                      {resendCountdown}s
                    </span>
                  </>
                ) : (
                  <>
                    Did not receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150 dark:text-orange-500"
                    >
                      Resend
                    </button>
                  </>
                )}
              </p>
            </motion.form>
          )}

          {/* STEP 3 — NEW PASSWORD */}
          {step === "reset" && (
            <motion.form
              key="reset"
              onSubmit={handleResetPassword}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-5"
            >
              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 animate-slide-down">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <InputField
                id="new-password"
                name="password"
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
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

              {/* Password strength */}
              {resetForm.password && (
                <div className="space-y-1.5 -mt-2 animate-slide-down">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          bar <= getPasswordStrength(resetForm.password)
                            ? STRENGTH_COLORS[getPasswordStrength(resetForm.password)]
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Password strength:{" "}
                    <span
                      className={
                        getPasswordStrength(resetForm.password) >= 3
                          ? "text-green-600 dark:text-green-500"
                          : getPasswordStrength(resetForm.password) >= 2
                          ? "text-yellow-600 dark:text-yellow-500"
                          : "text-red-500"
                      }
                    >
                      {STRENGTH_LABELS[getPasswordStrength(resetForm.password)]}
                    </span>
                  </p>
                </div>
              )}

              <InputField
                id="confirm-password"
                name="confirmPassword"
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 active:scale-90 transition-all duration-150 disabled:opacity-40"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Back navigation */}
        <div className="flex items-center justify-between text-sm">
          {step === "otp" || step === "reset" ? (
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setStep(step === "otp" ? "email" : "otp");
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 font-semibold text-gray-500 hover:text-orange-600 transition-colors duration-150 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}

          <Link
            href="/auth/login"
            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-150 dark:text-orange-500 dark:hover:text-orange-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}