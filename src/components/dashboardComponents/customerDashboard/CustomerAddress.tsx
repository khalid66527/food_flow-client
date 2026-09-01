"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  fullName: z.string().min(1, "Full name is required").min(2, "Enter a valid name"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^[+\d][\d\s-]{7,15}$/,
      "Enter a valid phone number"
    ),
  streetAddress: z.string().min(1, "Street address is required"),
  area: z.string().min(1, "Area is required"),
  building: z.string().optional(),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const emptyForm: AddressFormValues = {
  fullName: "",
  phoneNumber: "",
  streetAddress: "",
  area: "",
  building: "",
  postalCode: "",
  deliveryInstructions: "",
  isDefault: false,
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
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyForm,
  });

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

  // Initial load: fetch the user's addresses whenever the session changes.
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

  // Auto-dismiss the success toast after a short delay.
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
    reset({
      fullName: addr.fullName,
      phoneNumber: addr.phoneNumber,
      streetAddress: addr.streetAddress,
      area: addr.area,
      building: addr.building || "",
      postalCode: addr.postalCode || "",
      deliveryInstructions: addr.deliveryInstructions || "",
      isDefault: addr.isDefault,
    });
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

    const payload: Partial<TAddress> = {
      fullName: values.fullName,
      phoneNumber: values.phoneNumber,
      streetAddress: values.streetAddress,
      area: values.area,
      building: values.building || undefined,
      postalCode: values.postalCode || undefined,
      deliveryInstructions: values.deliveryInstructions || undefined,
      isDefault: values.isDefault === true,
    };

    const res =
      editingId && editingId !== ""
        ? await updateAddress(userId, userEmail, editingId, payload)
        : await createAddress(userId, userEmail, payload);

    setIsSaving(false);

    if (!res.success) {
      setError(res.message || "Failed to save address.");
      return;
    }

    setSuccessMsg(
      editingId ? "Address updated successfully." : "Address added successfully."
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
    setSuccessMsg("Default address updated successfully.");
    await refreshAddresses();
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
      hasError ? "border-red-300 focus:border-red-400" : "border-gray-200"
    } focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition`;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Delivery Addresses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the addresses you use for delivery.
          </p>
        </div>
        {!showForm && addresses.length > 0 && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B35] text-white text-sm font-semibold shadow-md shadow-[#FF6B35]/20 hover:bg-[#e85b27] transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? "Edit Address" : "Add New Address"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={inputClass(!!errors.fullName)}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+880 1XXX-XXXXXX"
                  className={inputClass(!!errors.phoneNumber)}
                  {...register("phoneNumber")}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500 mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  className={inputClass(!!errors.streetAddress)}
                  {...register("streetAddress")}
                />
                {errors.streetAddress && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.streetAddress.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Area
                </label>
                <input
                  type="text"
                  placeholder="Gulshan"
                  className={inputClass(!!errors.area)}
                  {...register("area")}
                />
                {errors.area && (
                  <p className="text-xs text-red-500 mt-1">{errors.area.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Building <span className="text-gray-400 normal-case font-medium">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Apt / House / Plot"
                  className={inputClass()}
                  {...register("building")}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Postal Code <span className="text-gray-400 normal-case font-medium">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="1212"
                  className={inputClass()}
                  {...register("postalCode")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Delivery Instructions{" "}
                <span className="text-gray-400 normal-case font-medium">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Ring the bell twice, leave at the front desk"
                className={`${inputClass()} resize-none`}
                {...register("deliveryInstructions")}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                {...register("isDefault")}
              />
              <span className="text-sm font-medium text-gray-700">
                Set as default delivery address
              </span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FF6B35] text-white text-sm font-bold shadow-md shadow-[#FF6B35]/25 hover:bg-[#e85b27] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Add Address"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : sortedAddresses.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-sm px-6">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
            <MapPin className="w-9 h-9 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No saved addresses</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Add a delivery address to get started.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF6B35] text-white text-sm font-semibold shadow-md shadow-[#FF6B35]/20 hover:bg-[#e85b27] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>
      ) : (
        /* Address list */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedAddresses.map((addr) => {
            const isBusy = busyId === addr._id;
            return (
              <div
                key={addr._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#FF6B35]" />
                    </div>
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {addr.fullName}
                    </p>
                  </div>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-bold border border-[#FF6B35]/20 shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      Default
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 flex-1">
                  <p className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{addr.phoneNumber}</span>
                  </p>
                  <p className="pl-6">
                    {addr.streetAddress}
                    {addr.area ? `, ${addr.area}` : ""}
                  </p>
                  {(addr.building || addr.postalCode) && (
                    <p className="pl-6 text-gray-400">
                      {[addr.building, addr.postalCode].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {addr.deliveryInstructions && (
                    <p className="pl-6 text-gray-400 line-clamp-2">
                      {addr.deliveryInstructions}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  {addr.isDefault ? (
                    <span className="text-xs text-gray-400 font-medium">
                      Default address
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSetDefault(addr._id!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:text-[#e85b27] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5" />
                      )}
                      Set as Default
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      aria-label="Edit address"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === addr._id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                        <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                          Delete?
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(addr._id!)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(addr._id || null)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
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

          {!showForm && (
            <button
              type="button"
              onClick={openCreate}
              className="min-h-[180px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF6B35]/40 hover:bg-orange-50/30 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#FF6B35] cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold">Add New Address</span>
            </button>
          )}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF6B35] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
