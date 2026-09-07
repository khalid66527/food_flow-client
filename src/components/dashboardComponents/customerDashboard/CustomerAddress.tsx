"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  MapPin,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  Phone,
  ChevronLeft,
  X,
  CheckCircle2,
  Home,
  Briefcase,
  User,
  Navigation,
  Compass,
  FileText,
  Building2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TAddress } from "@/types/address";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/api/address";

const addressSchema = z.object({
  addressType: z.enum(["Home", "Work", "Other"]),
  fullName: z
    .string()
    .min(1, "Recipient name is required")
    .min(2, "Enter a valid recipient name"),
  phoneNumber: z
    .string()
    .min(1, "Contact phone number is required")
    .regex(
      /^[+\d][\d\s-]{7,15}$/,
      "Enter a valid phone number (e.g. +880 1712-345678)"
    ),
  streetAddress: z
    .string()
    .min(1, "Street address / House & Road number is required"),
  area: z.string().min(1, "Area / Neighborhood is required"),
  building: z.string().optional(),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const emptyForm: AddressFormValues = {
  addressType: "Home",
  fullName: "",
  phoneNumber: "",
  streetAddress: "",
  area: "",
  building: "",
  landmark: "",
  postalCode: "",
  deliveryInstructions: "",
  isDefault: false,
};

// Helper to parse stored TAddress into UI form values
const parseAddressToForm = (addr: TAddress): AddressFormValues => {
  let addressType: "Home" | "Work" | "Other" = "Home";
  let buildingStr = addr.building || "";

  const tagMatch = buildingStr.match(/^\[(Home|Work|Other)\]\s*(.*)/i);
  if (tagMatch) {
    const tag = tagMatch[1].toUpperCase();
    if (tag === "HOME") addressType = "Home";
    else if (tag === "WORK") addressType = "Work";
    else addressType = "Other";
    buildingStr = tagMatch[2];
  }

  let landmarkStr = "";
  let instructionsStr = addr.deliveryInstructions || "";

  const landmarkMatch = instructionsStr.match(
    /^Landmark:\s*([^.\n]+)(?:\.\s*Note:\s*([\s\S]*))?$/
  );
  if (landmarkMatch) {
    landmarkStr = landmarkMatch[1].trim();
    instructionsStr = (landmarkMatch[2] || "").trim();
  }

  return {
    addressType,
    fullName: addr.fullName || "",
    phoneNumber: addr.phoneNumber || "",
    streetAddress: addr.streetAddress || "",
    area: addr.area || "",
    building: buildingStr,
    landmark: landmarkStr,
    postalCode: addr.postalCode || "",
    deliveryInstructions: instructionsStr,
    isDefault: !!addr.isDefault,
  };
};

// Helper to format UI form values into TAddress payload for backend API
const formatFormToPayload = (values: AddressFormValues): Partial<TAddress> => {
  const buildingText = values.building?.trim() || "";
  const buildingWithTag = buildingText
    ? `[${values.addressType}] ${buildingText}`
    : `[${values.addressType}]`;

  let combinedInstructions = "";
  const landmark = values.landmark?.trim();
  const notes = values.deliveryInstructions?.trim();

  if (landmark && notes) {
    combinedInstructions = `Landmark: ${landmark}. Note: ${notes}`;
  } else if (landmark) {
    combinedInstructions = `Landmark: ${landmark}`;
  } else if (notes) {
    combinedInstructions = notes;
  }

  return {
    fullName: values.fullName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    streetAddress: values.streetAddress.trim(),
    area: values.area.trim(),
    building: buildingWithTag,
    postalCode: values.postalCode?.trim() || undefined,
    deliveryInstructions: combinedInstructions || undefined,
    isDefault: values.isDefault === true,
  };
};

// Helper to extract clean card details for rendering
const getAddressCardDetails = (addr: TAddress) => {
  let addressType: "Home" | "Work" | "Other" = "Home";
  let buildingClean = addr.building || "";

  const tagMatch = buildingClean.match(/^\[(Home|Work|Other)\]\s*(.*)/i);
  if (tagMatch) {
    const tag = tagMatch[1].toUpperCase();
    if (tag === "HOME") addressType = "Home";
    else if (tag === "WORK") addressType = "Work";
    else addressType = "Other";
    buildingClean = tagMatch[2];
  }

  let landmark = "";
  let instructions = addr.deliveryInstructions || "";
  const landmarkMatch = instructions.match(
    /^Landmark:\s*([^.\n]+)(?:\.\s*Note:\s*([\s\S]*))?$/
  );
  if (landmarkMatch) {
    landmark = landmarkMatch[1].trim();
    instructions = (landmarkMatch[2] || "").trim();
  }

  return {
    addressType,
    buildingClean,
    landmark,
    instructions,
  };
};

export default function CustomerAddress() {
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; email?: string; role?: string }
    | null
    | undefined;

  const userId = sessionUser?.id || "";
  const userEmail = sessionUser?.email || "";

  const [addresses, setAddresses] = useState<TAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyForm,
  });

  const selectedAddressType = watch("addressType");

  const refreshAddresses = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    const res = await getAddresses(userId, userEmail);
    if (res.success && Array.isArray(res.data)) {
      setAddresses(res.data as TAddress[]);
    } else {
      setError(res.message || "Failed to load addresses.");
    }
    setIsLoading(false);
  }, [userId, userEmail]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        if (!cancelled) setAddresses([]);
        setIsLoading(false);
        return;
      }

      const res = await getAddresses(userId, userEmail);
      if (cancelled) return;

      if (res.success && Array.isArray(res.data)) {
        setAddresses(res.data as TAddress[]);
      } else {
        if (res.message) setError(res.message);
      }
      setIsLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 2600);
    return () => clearTimeout(t);
  }, [successMsg]);

  const openCreate = () => {
    setEditingId(null);
    reset(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (addr: TAddress) => {
    setEditingId(addr._id || null);
    reset(parseAddressToForm(addr));
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset(emptyForm);
    setError(null);
  };

  const onSubmit = async (values: AddressFormValues) => {
    if (!userId) return;
    setIsSaving(true);
    setError(null);

    const payload = formatFormToPayload(values);

    const res =
      editingId && editingId !== ""
        ? await updateAddress(userId, userEmail, editingId, payload)
        : await createAddress(userId, userEmail, payload);

    setIsSaving(false);

    if (!res.success) {
      setError(res.message || "Failed to save delivery address.");
      return;
    }

    setSuccessMsg(
      editingId
        ? "Delivery address updated successfully."
        : "New delivery address added successfully."
    );
    closeForm();
    await refreshAddresses();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    setBusyId(id);
    setError(null);
    const res = await deleteAddress(userId, userEmail, id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.success) {
      setError(res.message || "Failed to delete address.");
      return;
    }
    setSuccessMsg("Address deleted successfully.");
    await refreshAddresses();
  };

  const handleSetDefault = async (id: string) => {
    if (!userId) return;
    setBusyId(id);
    setError(null);
    const res = await setDefaultAddress(userId, userEmail, id);
    setBusyId(null);
    if (!res.success) {
      setError(res.message || "Failed to set default address.");
      return;
    }
    setSuccessMsg("Default delivery address updated.");
    setAddresses((prev) =>
      prev.map((addr) => {
        const addrId = addr._id ?? addr.id;
        const isMatched = addrId != null && String(addrId) === String(id);
        return {
          ...addr,
          isDefault: isMatched,
        };
      })
    );
  };

  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort((a, b) =>
        b.isDefault === a.isDefault ? 0 : b.isDefault ? 1 : -1
      ),
    [addresses]
  );

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-3 rounded-xl bg-gray-50/80 border ${
      hasError ? "border-red-300 focus:border-red-500 ring-1 ring-red-300" : "border-gray-200 focus:border-[#FF6B35]"
    } focus:bg-white outline-none text-sm font-medium transition text-gray-800 placeholder-gray-400 shadow-sm`;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="mb-8 bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin className="w-3.5 h-3.5" /> Parcel & Food Delivery
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Delivery Addresses
            </h1>
            <p className="text-orange-100 text-sm mt-1 max-w-xl">
              Save your home, office, and parcel drop-off locations with recipient details and rider instructions.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#FF6B35] hover:bg-orange-50 text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
              Add New Address
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-3">
          <X className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 px-4 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Form Modal/Card */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 mb-8 transition-all">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fill in the accurate recipient and location details for seamless parcel delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="p-2.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Address Label / Type Tag */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                Address Tag / Category
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setValue("addressType", "Home")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-bold transition cursor-pointer ${
                    selectedAddressType === "Home"
                      ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35] shadow-sm"
                      : "border-gray-200 bg-gray-50/70 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => setValue("addressType", "Work")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-bold transition cursor-pointer ${
                    selectedAddressType === "Work"
                      ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35] shadow-sm"
                      : "border-gray-200 bg-gray-50/70 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Work
                </button>

                <button
                  type="button"
                  onClick={() => setValue("addressType", "Other")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-bold transition cursor-pointer ${
                    selectedAddressType === "Other"
                      ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35] shadow-sm"
                      : "border-gray-200 bg-gray-50/70 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Other
                </button>
              </div>
            </div>

            {/* Section 2: Recipient Details */}
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <User className="w-4 h-4" /> Recipient Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Recipient Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahim Ahmed"
                    className={inputClass(!!errors.fullName)}
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +880 1712-345678"
                      className={inputClass(!!errors.phoneNumber)}
                      {...register("phoneNumber")}
                    />
                  </div>
                  {errors.phoneNumber ? (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      {errors.phoneNumber.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Rider will call this number when delivering your parcel.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Delivery Location Details */}
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Delivery Location
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Street Address / House & Road No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. House #12, Road #5, Block B"
                    className={inputClass(!!errors.streetAddress)}
                    {...register("streetAddress")}
                  />
                  {errors.streetAddress && (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      {errors.streetAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Area / Neighborhood / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gulshan-1, Dhaka"
                    className={inputClass(!!errors.area)}
                    {...register("area")}
                  />
                  {errors.area && (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      {errors.area.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Building / Flat / Suite / Floor{" "}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 4B, 4th Floor, Crescent Tower"
                    className={inputClass()}
                    {...register("building")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>
                      Nearby Landmark / Reference Point{" "}
                      <span className="text-gray-400 font-normal">(Optional)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite to City Bank / Near Jamuna Future Park"
                    className={inputClass()}
                    {...register("landmark")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Postal Code / Zip{" "}
                    <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1212"
                    className={inputClass()}
                    {...register("postalCode")}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Rider & Parcel Delivery Notes */}
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Rider Delivery Instructions
              </h3>
              <textarea
                rows={3}
                placeholder="e.g. Leave parcel at front desk security. Ring bell twice upon arrival. Do not call after 10 PM."
                className={`${inputClass()} resize-none`}
                {...register("deliveryInstructions")}
              />
              <p className="text-[11px] text-gray-400">
                Special instructions for courier delivery riders when bringing your package.
              </p>
            </div>

            {/* Section 5: Default Preference Toggle */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-orange-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6B35]">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Set as default delivery address
                  </p>
                  <p className="text-xs text-gray-500">
                    This address will be automatically selected during checkout.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                {...register("isDefault")}
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-amber-500 text-white text-sm font-extrabold shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-98 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Address...
                  </>
                ) : editingId ? (
                  "Update Address"
                ) : (
                  "Save Delivery Address"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <LoadingSpinner size={50} minHeight="300px" />
      ) : sortedAddresses.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm px-6">
          <div className="w-20 h-20 rounded-full bg-orange-100/80 flex items-center justify-center mb-5 text-[#FF6B35] shadow-inner">
            <Compass className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">No Delivery Addresses Found</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mb-6">
            You haven&apos;t added any delivery addresses yet. Add one now to order parcels and food items easily.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-[#e85b27] transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add First Address
          </button>
        </div>
      ) : (
        /* Address Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedAddresses.map((addr) => {
            const isBusy = busyId === addr._id;
            const { addressType, buildingClean, landmark, instructions } =
              getAddressCardDetails(addr);

            return (
              <div
                key={addr._id}
                className={`bg-white rounded-3xl border transition-all duration-200 p-6 flex flex-col justify-between relative shadow-sm hover:shadow-md ${
                  addr.isDefault
                    ? "border-[#FF6B35]/40 ring-2 ring-[#FF6B35]/15"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div>
                  {/* Card Header: Category & Default Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                          addressType === "Home"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : addressType === "Work"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {addressType === "Home" ? (
                          <Home className="w-3.5 h-3.5" />
                        ) : addressType === "Work" ? (
                          <Briefcase className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                        {addressType}
                      </span>
                    </div>

                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-extrabold shadow-sm">
                        <Star className="w-3 h-3 fill-current" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Recipient Details */}
                  <div className="mb-4">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#FF6B35]" />
                      {addr.fullName}
                    </h3>
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {addr.phoneNumber}
                    </p>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100/80 mb-4">
                    <p className="font-bold text-gray-800 flex items-start gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-[#FF6B35] shrink-0 mt-0.5" />
                      <span>
                        {addr.streetAddress}, {addr.area}
                        {addr.postalCode ? ` - ${addr.postalCode}` : ""}
                      </span>
                    </p>

                    {buildingClean && (
                      <p className="flex items-center gap-1.5 pl-5 text-gray-600 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {buildingClean}
                      </p>
                    )}

                    {landmark && (
                      <p className="flex items-start gap-1.5 pl-5 text-amber-700 font-semibold bg-amber-50/80 p-2 rounded-xl border border-amber-100">
                        <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Landmark: {landmark}</span>
                      </p>
                    )}

                    {instructions && (
                      <p className="flex items-start gap-1.5 pl-5 text-gray-500 italic">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span>&quot;{instructions}&quot;</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                  {addr.isDefault ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Primary Address
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetDefault(addr._id!)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:text-[#e85b27] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5" />
                      )}
                      Make Default
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition cursor-pointer"
                      title="Edit address"
                      aria-label="Edit address"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {confirmDeleteId === addr._id ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
                        <span className="text-xs text-red-600 font-bold">
                          Delete?
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(addr._id!)}
                          className="text-xs font-extrabold text-red-600 hover:text-red-700 px-1 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-1 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(addr._id || null)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete address"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Add Card Button */}
          {!showForm && (
            <button
              type="button"
              onClick={openCreate}
              className="min-h-[220px] rounded-3xl border-2 border-dashed border-gray-200 hover:border-[#FF6B35]/50 hover:bg-orange-50/20 transition flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-[#FF6B35] cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 group-hover:bg-[#FF6B35] text-[#FF6B35] group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-extrabold">Add New Delivery Location</span>
            </button>
          )}
        </div>
      )}

      {/* Back to Dashboard Navigation */}
      <div className="mt-10">
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#FF6B35] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Customer Dashboard
        </Link>
      </div>
    </div>
  );
}
