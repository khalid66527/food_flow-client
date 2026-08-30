"use client";

import React, { useState } from "react";
import {
  Bike,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  Info,
  Zap,
} from "lucide-react";
import { IRiderProfile, TVehicleType } from "@/lib/api/rider";
import { createRiderProfile, updateRiderProfile } from "@/lib/actions/rider";

interface CreateRiderProfileProps {
  initialData?: IRiderProfile | null;
  userEmail: string;
  userName: string;
  userId?: string;
  isEditMode?: boolean;
  onSuccess: (rider: IRiderProfile) => void;
  onCancel?: () => void;
}

const VEHICLE_OPTIONS: {
  id: TVehicleType;
  label: string;
  desc: string;
  icon: typeof Bike;
}[] = [
  {
    id: "bike",
    label: "Motorcycle / Motorbike",
    desc: "Fastest option for long-range city deliveries",
    icon: Bike,
  },
  {
    id: "scooter",
    label: "Scooter",
    desc: "Great maneuverability and fuel economy",
    icon: Bike,
  },
  {
    id: "electric_bike",
    label: "Electric Bike / E-Bike",
    desc: "Eco-friendly, quiet, and highly cost-effective",
    icon: Zap,
  },
  {
    id: "bicycle",
    label: "Bicycle",
    desc: "Ideal for short-distance neighborhood deliveries",
    icon: Bike,
  },
];

export default function CreateRiderProfile({
  initialData,
  userEmail,
  userName,
  userId,
  isEditMode = false,
  onSuccess,
  onCancel,
}: CreateRiderProfileProps) {
  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || userName || "",
    email: initialData?.email || userEmail || "",
    phone: initialData?.phone || "",
    avatar:
      initialData?.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    vehicleType: (initialData?.vehicleType || "bike") as TVehicleType,
    vehicleBrand: initialData?.vehicleBrand || "",
    vehicleNumber: initialData?.vehicleNumber || "",
    drivingLicenseNumber: initialData?.drivingLicenseNumber || "",
    nidNumber: initialData?.nidNumber || "",
    deliveryZone: initialData?.deliveryZone || "Dhanmondi, Dhaka",
    city: initialData?.city || "Dhaka",
    streetAddress: initialData?.address?.street || "",
    emergencyName: initialData?.emergencyContact?.name || "",
    emergencyRelation: initialData?.emergencyContact?.relation || "Family",
    emergencyPhone: initialData?.emergencyContact?.phone || "",
    bio: initialData?.bio || "Passionate and dedicated delivery partner delivering happiness quickly and safely.",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = "Full name is required";
    if (!formData.email.trim()) errs.email = "Email address is required";
    if (!formData.phone.trim()) errs.phone = "Contact phone number is required";
    if (!formData.deliveryZone.trim()) errs.deliveryZone = "Preferred delivery zone is required";
    if (!formData.city.trim()) errs.city = "City is required";

    if (formData.vehicleType !== "bicycle") {
      if (!formData.vehicleNumber.trim()) {
        errs.vehicleNumber = "Vehicle registration number is required";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError("Please fill in all mandatory fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<IRiderProfile> = {
        userId: userId || initialData?.userId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar.trim(),
        vehicleType: formData.vehicleType,
        vehicleBrand: formData.vehicleBrand.trim(),
        vehicleNumber: formData.vehicleNumber.trim(),
        drivingLicenseNumber: formData.drivingLicenseNumber.trim(),
        nidNumber: formData.nidNumber.trim(),
        deliveryZone: formData.deliveryZone.trim(),
        city: formData.city.trim(),
        address: {
          street: formData.streetAddress.trim(),
          city: formData.city.trim(),
          area: formData.deliveryZone.trim(),
          fullAddress: `${formData.streetAddress.trim()}, ${formData.deliveryZone.trim()}, ${formData.city.trim()}`,
        },
        emergencyContact: {
          name: formData.emergencyName.trim(),
          relation: formData.emergencyRelation.trim(),
          phone: formData.emergencyPhone.trim(),
        },
        bio: formData.bio.trim(),
        isAvailable: initialData?.isAvailable !== undefined ? initialData.isAvailable : true,
        status: initialData?.status || "active",
      };

      let res;
      if (isEditMode && initialData?.email) {
        res = await updateRiderProfile(initialData.email, payload);
      } else {
        res = await createRiderProfile(payload);
      }

      if (res.success && res.data) {
        onSuccess(res.data);
      } else {
        setFormError(res.message || "Failed to save rider profile. Please check details.");
      }
    } catch (err: any) {
      console.error("Profile submission error:", err);
      setFormError(err.message || "An unexpected error occurred while saving profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#FF6B35] to-[#E85A26] rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-500/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEditMode ? "Update Delivery Account" : "Rider Onboarding"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isEditMode ? "Edit Your Rider Profile" : "Create Your Rider Profile"}
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl leading-relaxed">
              {isEditMode
                ? "Update your vehicle details, operating zones, and emergency contacts."
                : "Set up your delivery account to start receiving nearby restaurant delivery requests and earn on your schedule."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 self-start sm:self-auto">
            <Bike className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Form Error Alert */}
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Personal & Account Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-orange-50 text-[#FF6B35]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-500">Your public rider identity and contact info</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sourav Nath"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all ${
                    errors.name ? "border-rose-300 ring-2 ring-rose-500/10" : "border-gray-200"
                  }`}
                />
              </div>
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  disabled={Boolean(userEmail)}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rider@foodflow.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-100/70 text-gray-600 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all ${
                    errors.phone ? "border-rose-300 ring-2 ring-rose-500/10" : "border-gray-200"
                  }`}
                />
              </div>
              {errors.phone && <p className="text-xs text-rose-500">{errors.phone}</p>}
            </div>

            {/* Profile Avatar URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Profile Photo URL</label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>

            {/* Rider Bio */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">About Me / Bio</label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share a short introduction about your delivery experience..."
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Vehicle & Verification Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Vehicle & Verification Info</h2>
              <p className="text-xs text-gray-500">Select delivery transport mode and verify credentials</p>
            </div>
          </div>

          {/* Vehicle Type Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Select Primary Vehicle Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {VEHICLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = formData.vehicleType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setFormData({ ...formData, vehicleType: opt.id })}
                    className={`cursor-pointer p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-[#FF6B35] bg-orange-50/40 shadow-sm ring-2 ring-orange-500/20"
                        : "border-gray-100 hover:border-gray-200 bg-gray-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? "bg-[#FF6B35] text-white" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B35]">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-xs font-bold text-gray-900">{opt.label}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
            {/* Vehicle Model/Brand */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Vehicle Brand / Model</label>
              <input
                type="text"
                value={formData.vehicleBrand}
                onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                placeholder="e.g. Yamaha FZ-S / Honda Activa"
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>

            {/* Vehicle Plate Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Vehicle Registration / Plate Number
              </label>
              <input
                type="text"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                placeholder="e.g. DHAKA METRO-HA-12-3456"
                className={`w-full px-4 py-2.5 text-sm rounded-2xl border bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all uppercase ${
                  errors.vehicleNumber ? "border-rose-300 ring-2 ring-rose-500/10" : "border-gray-200"
                }`}
              />
              {errors.vehicleNumber && (
                <p className="text-xs text-rose-500">{errors.vehicleNumber}</p>
              )}
            </div>

            {/* Driving License Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Driving License Number (Optional)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.drivingLicenseNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, drivingLicenseNumber: e.target.value })
                  }
                  placeholder="e.g. DL-84729104"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all uppercase"
                />
              </div>
            </div>

            {/* National ID / NID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">National ID (NID) Number</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.nidNumber}
                  onChange={(e) => setFormData({ ...formData, nidNumber: e.target.value })}
                  placeholder="e.g. 19941234567890"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Service Zone & Operating Location */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Delivery Zone & Address</h2>
              <p className="text-xs text-gray-500">Your preferred delivery region and operational base</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Preferred Delivery Zone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Operating Delivery Zone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.deliveryZone}
                  onChange={(e) => setFormData({ ...formData, deliveryZone: e.target.value })}
                  placeholder="e.g. Dhanmondi, Gulshan, Banani"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all ${
                    errors.deliveryZone ? "border-rose-300 ring-2 ring-rose-500/10" : "border-gray-200"
                  }`}
                />
              </div>
              {errors.deliveryZone && <p className="text-xs text-rose-500">{errors.deliveryZone}</p>}
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Dhaka"
                className={`w-full px-4 py-2.5 text-sm rounded-2xl border bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all ${
                  errors.city ? "border-rose-300 ring-2 ring-rose-500/10" : "border-gray-200"
                }`}
              />
              {errors.city && <p className="text-xs text-rose-500">{errors.city}</p>}
            </div>

            {/* Street Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Home / Street Address</label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="House #12, Road #4, Sector 7..."
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Emergency Contact Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Emergency Contact</h2>
              <p className="text-xs text-gray-500">Contact person for emergencies during deliveries</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Contact Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Contact Person Name</label>
              <input
                type="text"
                value={formData.emergencyName}
                onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                placeholder="e.g. Relative / Friend Name"
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>

            {/* Relationship */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Relationship</label>
              <input
                type="text"
                value={formData.emergencyRelation}
                onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                placeholder="e.g. Brother / Parent / Spouse"
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Emergency Phone</label>
              <input
                type="tel"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                placeholder="018XXXXXXXX"
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Submit / Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E85A26] hover:from-[#e85a27] hover:to-[#d04918] text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>{isEditMode ? "Save Changes" : "Complete Rider Setup"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
