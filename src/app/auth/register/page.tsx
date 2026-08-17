"use client";

import React, { useState } from "react";
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

function validate(form: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required";
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s/g, ""))) {
    errors.phone = "Enter a valid BD phone number (01XXXXXXXXX)";
  }

  if (!form.password) {
    errors.password = "Password is required";
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (!form.role) {
    errors.role = "Please select a role";
  }

  if (!form.agreeToTerms) {
    errors.agreeToTerms = "You must agree to the terms";
  }

  return errors;
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

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name as keyof RegisterFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleRoleSelect = (role: PublicRole) => {
    setForm((prev) => ({ ...prev, role }));
    if (errors.role) {
      setErrors((prev) => ({ ...prev, role: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

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
  };

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
              <span className="font-semibold text-orange-600">{form.role}</span>.
              {` `}Welcome to Food Flow, {form.fullName}!
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
                    form.role === value
                      ? "text-orange-500"
                      : "text-gray-400"
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
              <AlertCircle className="h-3 w-3" />
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
          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-gray-700"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
                  errors.fullName
                    ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
                  errors.email
                    ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                }`}
              />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="block text-sm font-semibold text-gray-700"
            >
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
                  errors.phone
                    ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
                  errors.password
                    ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                }`}
              />
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
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-gray-700"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
                  errors.confirmPassword
                    ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                }`}
              />
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
            </div>
            {errors.confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

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
                <AlertCircle className="h-3 w-3" />
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
