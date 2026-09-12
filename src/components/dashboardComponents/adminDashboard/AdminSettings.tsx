"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Percent,
  DollarSign,
  Truck,
  ShieldCheck,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Gift,
  HelpCircle,
  UserCheck,
  TrendingUp,
  Receipt,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Pencil,
  X,
} from "lucide-react";
import { getPlatformSettings, updatePlatformSettings, TPlatformSettings } from "@/lib/api/settings";
import { getCoupons, createCoupon, updateCoupon, toggleCouponStatus, deleteCoupon, TCoupon } from "@/lib/api/coupon";
import LoadingSpinner from "@/lib/api/LoadingSpinner";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Platform Settings State
  const [settings, setSettings] = useState<TPlatformSettings>({
    vatPercentage: 5,
    restaurantCommissionPercentage: 15,
    deliveryFeeBase: 40,
    riderCommissionPercentage: 100,
    freeDeliveryThreshold: 500,
  });

  // Coupons State
  const [coupons, setCoupons] = useState<TCoupon[]>([]);
  const [editingCoupon, setEditingCoupon] = useState<TCoupon | null>(null);
  const [updatingCoupon, setUpdatingCoupon] = useState(false);

  // New Coupon Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "fixed" as "fixed" | "percentage",
    discountValue: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    isFirstOrderOnly: false,
    expiryDate: "",
    isActive: true,
  });

  // Load Settings and Coupons
  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, couponsRes] = await Promise.all([
        getPlatformSettings(),
        getCoupons(),
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }

      if (couponsRes.success && couponsRes.data) {
        setCoupons(couponsRes.data);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to load admin settings data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);

    const res = await updatePlatformSettings(settings);
    setSavingSettings(false);

    if (res.success && res.data) {
      setSettings(res.data);
      setMessage({ type: "success", text: "🎉 Platform financial settings updated globally!" });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: "error", text: res.message || "Failed to update platform settings." });
    }
  };

  // Create Coupon Handler
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      setMessage({ type: "error", text: "Please enter a coupon code." });
      return;
    }
    const val = Number(newCoupon.discountValue);
    if (isNaN(val) || val <= 0) {
      setMessage({ type: "error", text: "Please enter a valid discount value greater than 0." });
      return;
    }

    setCreatingCoupon(true);
    setMessage(null);

    const payload = {
      code: newCoupon.code,
      discountType: newCoupon.discountType,
      discountValue: val,
      minOrderValue: newCoupon.minOrderValue ? Number(newCoupon.minOrderValue) : 0,
      maxDiscountAmount: newCoupon.maxDiscountAmount ? Number(newCoupon.maxDiscountAmount) : undefined,
      isFirstOrderOnly: newCoupon.isFirstOrderOnly,
      expiryDate: newCoupon.expiryDate ? new Date(newCoupon.expiryDate).toISOString() : undefined,
      isActive: newCoupon.isActive,
    };

    const res = await createCoupon(payload);
    setCreatingCoupon(false);

    if (res.success && res.data) {
      setCoupons((prev) => [res.data!, ...prev]);
      setNewCoupon({
        code: "",
        discountType: "fixed",
        discountValue: "",
        minOrderValue: "",
        maxDiscountAmount: "",
        isFirstOrderOnly: false,
        expiryDate: "",
        isActive: true,
      });
      setMessage({ type: "success", text: `✨ Central Coupon "${res.data.code}" created successfully!` });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: "error", text: res.message || "Failed to create coupon." });
    }
  };

  // Open Edit Modal Handler
  const handleOpenEdit = (coupon: TCoupon) => {
    setEditingCoupon({
      ...coupon,
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "",
    });
  };

  // Update Coupon Handler
  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon || !editingCoupon._id) return;
    if (!editingCoupon.code.trim()) {
      setMessage({ type: "error", text: "Please enter a coupon code." });
      return;
    }
    const val = Number(editingCoupon.discountValue);
    if (isNaN(val) || val <= 0) {
      setMessage({ type: "error", text: "Please enter a valid discount value greater than 0." });
      return;
    }

    setUpdatingCoupon(true);
    setMessage(null);

    const payload = {
      code: editingCoupon.code.toUpperCase(),
      discountType: editingCoupon.discountType,
      discountValue: val,
      minOrderValue: editingCoupon.minOrderValue ? Number(editingCoupon.minOrderValue) : 0,
      maxDiscountAmount: editingCoupon.maxDiscountAmount ? Number(editingCoupon.maxDiscountAmount) : undefined,
      isFirstOrderOnly: editingCoupon.isFirstOrderOnly,
      expiryDate: editingCoupon.expiryDate ? new Date(editingCoupon.expiryDate).toISOString() : undefined,
      isActive: editingCoupon.isActive,
    };

    const res = await updateCoupon(editingCoupon._id, payload);
    setUpdatingCoupon(false);

    if (res.success && res.data) {
      setCoupons((prev) =>
        prev.map((c) => (c._id === res.data!._id ? res.data! : c))
      );
      setEditingCoupon(null);
      setMessage({ type: "success", text: `✨ Coupon "${res.data.code}" updated successfully!` });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: "error", text: res.message || "Failed to update coupon." });
    }
  };

  // Toggle Coupon Handler
  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    const res = await toggleCouponStatus(id, !currentStatus);
    if (res.success) {
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: !currentStatus } : c))
      );
    } else {
      setMessage({ type: "error", text: res.message || "Failed to toggle coupon status." });
    }
  };

  // Delete Coupon Handler
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    const res = await deleteCoupon(id);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      setMessage({ type: "success", text: "Coupon deleted successfully." });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: res.message || "Failed to delete coupon." });
    }
  };

  if (loading) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 space-y-8">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-[#FF6B35] to-amber-500 text-white p-7 sm:p-9 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Financial Settings & Management Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Admin Global Control Panel
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm max-w-2xl">
            Configure platform-wide VAT rates, restaurant commission percentages, delivery fee structures, and manage the central coupon discount engine.
          </p>
        </div>
      </div>

      {/* NOTIFICATION FEEDBACK */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-all shadow-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ======================================================= */}
        {/* 1. GLOBAL FINANCIAL SETTINGS FORM (5 COLS)               */}
        {/* ======================================================= */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Platform Financial Parameters</h2>
                <p className="text-xs text-gray-400">Global commission & tax rules</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchData}
              className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
              title="Refresh settings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Global VAT Percentage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Global VAT Rate (%)</span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                  Tax Fund Account
                </span>
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={settings.vatPercentage}
                  onChange={(e) => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                  placeholder="5"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Added automatically to all customer order bills and deposited into the tax fund account.
              </p>
            </div>

            {/* Global Restaurant Commission Percentage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Global Restaurant Commission (%)</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Platform Gross Income
                </span>
              </label>
              <div className="relative">
                <TrendingUp className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={settings.restaurantCommissionPercentage}
                  onChange={(e) =>
                    setSettings({ ...settings, restaurantCommissionPercentage: Number(e.target.value) })
                  }
                  placeholder="15"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Deducted from restaurant subtotal per order. Live preview is updated on restaurant &apos;Add Food&apos;.
              </p>
            </div>

            {/* Rider Delivery Fee & Rider Share */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Base Delivery Fee (Tk)
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    required
                    value={settings.deliveryFeeBase}
                    onChange={(e) => setSettings({ ...settings, deliveryFeeBase: Number(e.target.value) })}
                    placeholder="40"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Rider Fee Share (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={settings.riderCommissionPercentage}
                    onChange={(e) =>
                      setSettings({ ...settings, riderCommissionPercentage: Number(e.target.value) })
                    }
                    placeholder="100"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition"
                  />
                </div>
              </div>
            </div>

            {/* Free Delivery Threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Free Delivery Subtotal Threshold (Tk)</span>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                  Offer
                </span>
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })
                  }
                  placeholder="500"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-indigo-600 outline-none text-sm font-semibold transition"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Orders with food subtotal equal or above this amount receive 100% free delivery.
              </p>
            </div>

            {/* Save Action Button */}
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Financial Settings...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Update Platform Settings
                </>
              )}
            </button>
          </form>

          {/* FINANCIAL ARCHITECTURE SUMMARY BOX */}
          <div className="pt-4 border-t border-gray-100 space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              Settlement & Subsidy Architecture Rules
            </h3>
            <ul className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <span>
                  <strong>Coupon Subsidies</strong>: Deducted exclusively from Admin commission profit. Restaurant payout remains completely unaffected.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <span>
                  <strong>Restaurant Payout</strong>: Guaranteed <code>Subtotal - Commission Amount</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <span>
                  <strong>VAT Collection</strong>: Separated and logged into the Central Tax Fund.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ======================================================= */}
        {/* 2. CENTRAL COUPON CREATION & ENGINE (7 COLS)             */}
        {/* ======================================================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* CREATE NEW COUPON CARD */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Central Coupon Creation Engine</h2>
                  <p className="text-xs text-gray-400">Create promotional codes and first-order welcome offers</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-[#FF6B35] text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Offer Engine
              </span>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Coupon Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME50"
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-bold uppercase transition"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Discount Type
                  </label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, discountType: e.target.value as "fixed" | "percentage" })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-bold transition cursor-pointer"
                  >
                    <option value="fixed">Fixed Amount Discount (Tk)</option>
                    <option value="percentage">Percentage Discount (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Discount Value */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Discount Value <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                    placeholder={newCoupon.discountType === "fixed" ? "50 (Tk)" : "10 (%)"}
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-semibold"
                  />
                </div>

                {/* Min Order Value */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Min Order (Tk)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCoupon.minOrderValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: e.target.value })}
                    placeholder="200"
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-semibold"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newCoupon.expiryDate}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-medium"
                  />
                </div>
              </div>

              {/* FIRST-ORDER RESTRICTION TOGGLE */}
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#FF6B35]" />
                  <div>
                    <p className="text-xs font-black text-gray-900">First-Order Only Restriction</p>
                    <p className="text-[11px] text-gray-500">
                      Valid only for users with zero prior completed orders.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNewCoupon({ ...newCoupon, isFirstOrderOnly: !newCoupon.isFirstOrderOnly })}
                  className="cursor-pointer text-[#FF6B35]"
                >
                  {newCoupon.isFirstOrderOnly ? (
                    <ToggleRight className="w-8 h-8 text-[#FF6B35]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={creatingCoupon}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FF6B35] text-white text-xs font-black shadow-lg shadow-orange-500/20 hover:bg-[#e85b27] active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                {creatingCoupon ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Coupon...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Central Coupon Code
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ACTIVE & ALL COUPONS LIST TABLE */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-700" />
                <h3 className="text-sm font-black text-gray-900">
                  Active Coupons Engine ({coupons.length})
                </h3>
              </div>
            </div>

            {coupons.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                No coupons found. Create your first central coupon above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Discount</th>
                      <th className="py-2.5 px-3">Min Order</th>
                      <th className="py-2.5 px-3">Rules</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {coupons.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-3">
                          <span className="font-black text-gray-900 tracking-wider bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-800">
                          {c.discountType === "percentage" ? `${c.discountValue}%` : `Tk ${c.discountValue}`}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {c.minOrderValue ? `Tk ${c.minOrderValue}` : "None"}
                        </td>
                        <td className="py-3 px-3">
                          {c.isFirstOrderOnly ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                              <UserCheck className="w-3 h-3" /> First Order Only
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">All Users</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c._id!, c.isActive)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer transition ${
                              c.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {c.isActive ? "● Active" : "○ Inactive"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit Coupon"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(c._id!)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT COUPON MODAL */}
      {editingCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Edit Coupon Details</h3>
                  <p className="text-xs text-gray-400">Update promo logic, values, and restrictions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Coupon Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCoupon.code}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-bold uppercase transition"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Discount Type
                  </label>
                  <select
                    value={editingCoupon.discountType}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, discountType: e.target.value as "fixed" | "percentage" })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-bold transition cursor-pointer"
                  >
                    <option value="fixed">Fixed Amount Discount (Tk)</option>
                    <option value="percentage">Percentage Discount (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Discount Value */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Discount Value <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={editingCoupon.discountValue}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-semibold"
                  />
                </div>

                {/* Min Order Value */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Min Order (Tk)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingCoupon.minOrderValue ?? 0}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrderValue: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-semibold"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editingCoupon.expiryDate || ""}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-xs font-medium"
                  />
                </div>
              </div>

              {/* FIRST-ORDER RESTRICTION TOGGLE */}
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#FF6B35]" />
                  <div>
                    <p className="text-xs font-black text-gray-900">First-Order Only Restriction</p>
                    <p className="text-[11px] text-gray-500">
                      Valid only for users with zero prior completed orders.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingCoupon({ ...editingCoupon, isFirstOrderOnly: !editingCoupon.isFirstOrderOnly })
                  }
                  className="cursor-pointer text-[#FF6B35]"
                >
                  {editingCoupon.isFirstOrderOnly ? (
                    <ToggleRight className="w-8 h-8 text-[#FF6B35]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                </button>
              </div>

              {/* ACTIONS FOOTER */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="px-5 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCoupon}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#FF6B35] text-white text-xs font-black shadow-lg shadow-orange-500/20 hover:bg-[#e85b27] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {updatingCoupon ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Update Coupon
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
