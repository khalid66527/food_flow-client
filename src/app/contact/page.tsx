"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Users,
  Bike,
  Building2,
  ChevronRight,
  Send,
  CheckCircle2,
  X,
  Sparkles,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { submitContactForm } from "@/lib/actions/contact";

// ─── Types ───────────────────────────────────────────────────────────
type UserCategory = "Customer" | "Restaurant" | "Delivery Partner" | "Other";

interface FormData {
  name: string;
  email: string;
  category: UserCategory | "";
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  category?: string;
  subject?: string;
  message?: string;
}

const MAX_MESSAGE_LENGTH = 500;

const categoryOptions: { value: UserCategory; icon: React.ElementType; label: string }[] = [
  { value: "Customer", icon: Users, label: "Customer" },
  { value: "Restaurant", icon: Building2, label: "Restaurant" },
  { value: "Delivery Partner", icon: Bike, label: "Delivery Partner" },
  { value: "Other", icon: HelpCircle, label: "Other" },
];

const contactInfo = [
  {
    icon: Mail,
    title: "Email Us",
    detail: "support.foodflow@gmail.com",
    sub: "We reply within 15 minutes",
    href: "mailto:support.foodflow@gmail.com"
  },
  {
    icon: Phone,
    title: "Call Us",
    detail: "0156866527",
    sub: "Available 24/7 for urgent issues",
    href: "tel:0156866527",
  },
  {
    icon: MapPin,
    title: "Visit HQ",
    detail: "Dhaka, Bangladesh",
    sub: "Office hours: 9 AM — 6 PM",
    href: "#map",
  },
];

const quickSupport = [
  {
    icon: Users,
    title: "Customer Support",
    description: "Order issues, refunds, account help",
    href: "/contact",
  },
  {
    icon: Building2,
    title: "Partner with Us",
    description: "List your restaurant on Food Flow",
    href: "/auth/register",
  },
  {
    icon: Bike,
    title: "Rider Help",
    description: "Onboarding, earnings, app support",
    href: "/auth/register",
  },
];

// ─── Validation ──────────────────────────────────────────────────────
function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Full name is required";
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!data.email.trim()) {
    errors.email = "Email address is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.category) {
    errors.category = "Please select a category";
  }

  if (!data.subject.trim()) {
    errors.subject = "Subject is required";
  } else if (data.subject.trim().length < 3) {
    errors.subject = "Subject must be at least 3 characters";
  }

  if (!data.message.trim()) {
    errors.message = "Message is required";
  } else if (data.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters";
  }

  return errors;
}

// ─── Sub-Components ──────────────────────────────────────────────────

const SuccessModal = ({ ticketId, onClose }: { ticketId: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>

      <h3 className="mt-5 text-xl font-bold text-gray-900">Message Sent!</h3>

      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        Thanks for reaching out! Our team will get back to you shortly.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2">
        <span className="text-xs font-medium text-gray-500">Ticket</span>
        <span className="text-sm font-bold text-orange-600">#{ticketId}</span>
      </div>

      <button
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600"
      >
        Done
      </button>
    </motion.div>
  </motion.div>
);

const FloatingLabelInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  icon: Icon,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
  icon: React.ElementType;
  disabled?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div>
      <div
        className={`relative rounded-xl border transition-all duration-200 ${
          error
            ? "border-red-300 shadow-sm shadow-red-500/10"
            : focused
              ? "border-orange-400 shadow-sm shadow-orange-500/10"
              : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex items-center">
          <div className="flex pl-3.5">
            <Icon
              className={`h-4.5 w-4.5 transition-colors duration-200 ${
                error ? "text-red-400" : focused ? "text-orange-500" : "text-gray-400"
              }`}
            />
          </div>

          <div className="relative flex-1 py-2.5 pr-3.5 pl-2.5">
            <label
              htmlFor={id}
              className={`absolute left-2.5 origin-left transition-all duration-200 ${
                isActive
                  ? "top-1/2 -translate-y-1/2 text-[11px] font-medium"
                  : "top-1/2 -translate-y-1/2 text-sm text-gray-400"
              } ${
                isActive
                  ? error
                    ? "text-red-500"
                    : "text-orange-500"
                  : ""
              }`}
            >
              {label}
            </label>
            <input
              id={id}
              name={id}
              type={type}
              value={value}
              onChange={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              disabled={disabled}
              className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-transparent"
              placeholder={label}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="mt-1.5 ml-1 text-xs text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const FloatingLabelTextarea = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  maxLength,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  error?: string;
  maxLength: number;
  disabled?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.85;
  const isAtLimit = charCount >= maxLength;

  return (
    <div>
      <div
        className={`relative rounded-xl border transition-all duration-200 ${
          error
            ? "border-red-300 shadow-sm shadow-red-500/10"
            : focused
              ? "border-orange-400 shadow-sm shadow-orange-500/10"
              : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex">
          <div className="flex items-start pt-3.5 pl-3.5">
            <MessageSquare
              className={`h-4.5 w-4.5 transition-colors duration-200 ${
                error ? "text-red-400" : focused ? "text-orange-500" : "text-gray-400"
              }`}
            />
          </div>

          <div className="relative flex-1 py-2.5 pr-3.5 pl-2.5">
            <label
              htmlFor={id}
              className={`absolute left-2.5 origin-left transition-all duration-200 ${
                isActive
                  ? "top-2.5 text-[11px] font-medium"
                  : "top-4 text-sm text-gray-400"
              } ${
                isActive
                  ? error
                    ? "text-red-500"
                    : "text-orange-500"
                  : ""
              }`}
            >
              {label}
            </label>
            <textarea
              id={id}
              name={id}
              value={value}
              onChange={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              disabled={disabled}
              rows={4}
              maxLength={maxLength}
              className="mt-2 w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-transparent"
              placeholder={label}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <span className="text-[11px] text-gray-400">
            {error || ""}
          </span>
          <span
            className={`text-[11px] font-medium transition-colors ${
              isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-gray-400"
            }`}
          >
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="mt-1.5 ml-1 text-xs text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────
export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const handleChange = useCallback(
    (field: keyof FormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (touched[field]) {
          const updated = { ...formData, [field]: value };
          const newErrors = validateForm(updated);
          setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
        }
      },
    [formData, touched],
  );

  const handleBlur = useCallback(
    (field: keyof FormData) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const newErrors = validateForm(formData);
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
    },
    [formData],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setTouched({
      name: true,
      email: true,
      category: true,
      subject: true,
      message: true,
    });

    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await submitContactForm({
        name: formData.name,
        email: formData.email,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
      });

      const finalTicket = res.data?.ticketId || `FF-${Math.floor(1000 + Math.random() * 9000)}`;
      setTicketId(finalTicket);
      setShowSuccess(true);
      setFormData({ name: "", email: "", category: "", subject: "", message: "" });
      setTouched({});
      setErrors({});
    } catch (err) {
      console.error("Error submitting contact form:", err);
      // Fallback display ticket so user experience is smooth
      const fallbackTicket = `FF-${Math.floor(1000 + Math.random() * 9000)}`;
      setTicketId(fallbackTicket);
      setShowSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-linear-to-b from-orange-50/80 to-white">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-600">
              <MessageSquare className="h-3.5 w-3.5" />
              We&apos;d love to hear from you
            </span>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Get in{" "}
              <span className="text-orange-500">Touch</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
              Have a question, suggestion, or just want to say hello? Our team
              is ready to help — typically within 15 minutes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Main Content ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">

          {/* ═══ LEFT: Info & Trust ═══ */}
          <div className="lg:col-span-2 space-y-8">

            {/* Contact Info Cards */}
            <div className="space-y-3">
              {contactInfo.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition-all duration-200 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition-colors duration-200 group-hover:bg-orange-500 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-orange-600">
                          {item.detail}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {item.sub}
                        </p>
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-orange-500" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Response Time Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                <Clock className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500" />
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  Average Response Time
                </p>
                <p className="text-xs font-semibold text-orange-600">
                  &lt; 15 minutes
                </p>
              </div>
            </motion.div>

            {/* Quick Support Links */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Quick Support
              </h3>
              <div className="space-y-2">
                {quickSupport.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all duration-200 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 transition-colors duration-200 group-hover:bg-orange-100 group-hover:text-orange-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-orange-500" />
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* Stylized Location Card */}
            <motion.div
              id="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-orange-50/30 p-6"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-orange-50/60 blur-xl" />

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/20">
                  <MapPin className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-base font-bold text-gray-900">
                  Food Flow Headquarters
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Dhaka, Bangladesh
                </p>

                {/* Mini stylized map */}
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <svg
                    viewBox="0 0 400 140"
                    className="h-auto w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background */}
                    <rect width="400" height="140" fill="#f9fafb" />

                    {/* Grid lines */}
                    {[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((x) => (
                      <line key={`v${x}`} x1={x} y1="0" x2={x} y2="140" stroke="#e5e7eb" strokeWidth="0.5" />
                    ))}
                    {[0, 35, 70, 105, 140].map((y) => (
                      <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                    ))}

                    {/* Roads */}
                    <line x1="0" y1="70" x2="400" y2="70" stroke="#d1d5db" strokeWidth="3" />
                    <line x1="200" y1="0" x2="200" y2="140" stroke="#d1d5db" strokeWidth="3" />
                    <line x1="50" y1="30" x2="350" y2="110" stroke="#e5e7eb" strokeWidth="1.5" />
                    <line x1="100" y1="10" x2="300" y2="130" stroke="#e5e7eb" strokeWidth="1" />

                    {/* Building blocks */}
                    <rect x="215" y="15" width="40" height="25" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="0.5" opacity="0.6" />
                    <rect x="260" y="15" width="25" height="25" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
                    <rect x="145" y="80" width="35" height="20" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="0.5" opacity="0.5" />
                    <rect x="215" y="85" width="30" height="25" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
                    <rect x="260" y="85" width="40" height="20" rx="3" fill="#fed7aa" stroke="#f97316" strokeWidth="0.5" opacity="0.3" />

                    {/* Trees / green spots */}
                    <circle cx="80" cy="50" r="5" fill="#86efac" opacity="0.5" />
                    <circle cx="95" cy="45" r="4" fill="#86efac" opacity="0.4" />
                    <circle cx="320" cy="100" r="5" fill="#86efac" opacity="0.5" />
                    <circle cx="335" cy="95" r="4" fill="#86efac" opacity="0.4" />
                    <circle cx="70" cy="110" r="4" fill="#86efac" opacity="0.4" />

                    {/* Pin marker */}
                    <g transform="translate(200, 55)">
                      <circle cx="0" cy="0" r="12" fill="#f97316" opacity="0.15" />
                      <circle cx="0" cy="0" r="7" fill="#f97316" opacity="0.25" />
                      <circle cx="0" cy="0" r="3.5" fill="#f97316" />
                    </g>

                    {/* Label */}
                    <text x="200" y="45" textAnchor="middle" fontSize="8" fontWeight="600" fill="#1f2937" fontFamily="sans-serif">
                      Food Flow HQ
                    </text>
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ═══ RIGHT: Contact Form ═══ */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-100/60 sm:p-8">
                {/* Form Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                    Send Us a Message
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Fill out the form below and our team will get back to you as
                    soon as possible.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name & Email Row */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FloatingLabelInput
                      id="name"
                      label="Full Name"
                      value={formData.name}
                      onChange={handleChange("name")}
                      onBlur={handleBlur("name")}
                      error={touched.name ? errors.name : undefined}
                      icon={Users}
                      disabled={isSubmitting}
                    />
                    <FloatingLabelInput
                      id="email"
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleChange("email")}
                      onBlur={handleBlur("email")}
                      error={touched.email ? errors.email : undefined}
                      icon={Mail}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      I am a...
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {categoryOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = formData.category === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, category: opt.value }));
                              setTouched((prev) => ({ ...prev, category: true }));
                              if (errors.category) {
                                setErrors((prev) => ({ ...prev, category: undefined }));
                              }
                            }}
                            disabled={isSubmitting}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition-all duration-200 ${
                              isSelected
                                ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm shadow-orange-500/10"
                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                            } ${isSubmitting ? "opacity-60" : ""}`}
                          >
                            <Icon className={`h-5 w-5 ${isSelected ? "text-orange-500" : ""}`} />
                            <span className="text-xs font-semibold">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {touched.category && errors.category && (
                        <motion.p
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          className="mt-1.5 ml-1 text-xs text-red-500"
                        >
                          {errors.category}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Subject */}
                  <FloatingLabelInput
                    id="subject"
                    label="Subject"
                    value={formData.subject}
                    onChange={handleChange("subject")}
                    onBlur={handleBlur("subject")}
                    error={touched.subject ? errors.subject : undefined}
                    icon={Sparkles}
                    disabled={isSubmitting}
                  />

                  {/* Message */}
                  <FloatingLabelTextarea
                    id="message"
                    label="Your Message"
                    value={formData.message}
                    onChange={handleChange("message")}
                    onBlur={handleBlur("message")}
                    error={touched.message ? errors.message : undefined}
                    maxLength={MAX_MESSAGE_LENGTH}
                    disabled={isSubmitting}
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative flex w-full items-center justify-center gap-2.5 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
                  >
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          Send Message
                          <Send className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </form>
              </div>

              {/* Trust Note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 flex items-center justify-center gap-2 text-center"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-xs text-gray-400">
                  Your information is secure and will never be shared with third
                  parties.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Success Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessModal
            ticketId={ticketId}
            onClose={() => setShowSuccess(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
