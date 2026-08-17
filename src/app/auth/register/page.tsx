"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type {
  RegisterFormData,
  RegisterFormErrors,
  MockRegisterResponse,
  PublicRole,
  TouchedFields,
  PasswordStrength,
  FormFieldName,
} from "@/types/auth";

const ROLES: { value: PublicRole; label: string; icon: typeof Store }[] = [
  { value: "Customer", label: "Customer", icon: ShoppingBag },
  { value: "Restaurant Partner", label: "Restaurant Partner", icon: Store },
  { value: "Delivery Partner", label: "Delivery Partner", icon: Bike },
];

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
  onChange,
  onBlur,
  trailing,
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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  trailing?: React.ReactNode;
}) {
  const showError = touched && error;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
            showError ? "text-red-400" : "text-gray-400"
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
          className={`w-full pl-10 ${
            trailing ? "pr-11" : "pr-4"
          } py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
            showError
              ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          }`}
        />
        {trailing}
      </div>
      {showError && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

      if (hasErrors(validationErrors)) return;

      setIsLoading(true);
      try {
        const response = await mockRegister(form);
        if (response.success) {
          setIsSuccess(true);
        } else {
          setServerError(response.message);
        }
      } catch {
        setServerError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [form]
  );

  const passwordStrength = getPasswordStrength(form.password);

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100">
            <CheckCircle2 className="w-10 h-10 text-orange-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Registration Complete!
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account has been created as a{" "}
              <span className="font-semibold text-orange-600">
                {form.role}
              </span>
              . Welcome to Food Flow, {form.fullName}!
            </p>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all duration-200"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-gray-500">
            Join Food Flow and get started today
          </p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            I want to join as
          </label>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRoleSelect(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  form.role === value
                    ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    form.role === value ? "text-orange-500" : "text-gray-400"
                  }`}
                />
                <span className="text-xs font-semibold text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
          {errors.role && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.role}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
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
            onChange={handleChange}
            onBlur={() => handleBlur("fullName")}
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
            onChange={handleChange}
            onBlur={() => handleBlur("email")}
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
            onChange={handleChange}
            onBlur={() => handleBlur("phone")}
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
              onChange={handleChange}
              onBlur={() => handleBlur("password")}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1">
                  {([0, 1, 2, 3] as const).map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        i < passwordStrength
                          ? STRENGTH_COLORS[passwordStrength]
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p
                  className={`text-xs font-medium ${
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
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={form.agreeToTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500"
              />
              <span className="text-sm text-gray-600 leading-snug">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.agreeToTerms}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
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
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
