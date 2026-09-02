"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Home,
  Briefcase,
  User,
  Phone,
  CheckCircle2,
  Star,
  Plus,
  X,
  Loader2,
  Building2,
  Compass,
} from "lucide-react";
import { TAddress } from "@/types/address";
import { setDefaultAddress } from "@/lib/api/address";

interface AddressQuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: TAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: TAddress) => void;
  userId: string;
  userEmail: string;
  onRefreshAddresses: () => Promise<void>;
}

export default function AddressQuickSwitcherModal({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  userId,
  userEmail,
  onRefreshAddresses,
}: AddressQuickSwitcherModalProps) {
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMakeDefault = async (e: React.MouseEvent, addr: TAddress) => {
    e.stopPropagation();
    const id = addr._id || addr.id;
    if (!id || !userId) return;

    setSettingDefaultId(String(id));
    const res = await setDefaultAddress(userId, userEmail, String(id));
    setSettingDefaultId(null);

    if (res.success) {
      setMsg("Default address updated!");
      onSelectAddress(addr);
      await onRefreshAddresses();
      setTimeout(() => setMsg(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">
                Select Delivery Address
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose a saved address for this order or set your default preference.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {msg}
          </div>
        )}

        {/* Address List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {addresses.length === 0 ? (
            <div className="py-12 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No saved addresses found</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Please add a delivery address to complete your checkout.
              </p>
              <Link
                href="/dashboard/customer/address"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B35] text-white text-xs font-bold shadow-md hover:bg-[#e85b27] transition"
              >
                <Plus className="w-4 h-4" /> Add New Address
              </Link>
            </div>
          ) : (
            addresses.map((addr) => {
              const addrId = String(addr._id || addr.id);
              const isSelected = selectedAddressId === addrId;
              const isSetting = settingDefaultId === addrId;

              // Parse address category tag
              let category = "Home";
              let buildingStr = addr.building || "";
              const match = buildingStr.match(/^\[(Home|Work|Other)\]\s*(.*)/i);
              if (match) {
                category = match[1];
                buildingStr = match[2];
              }

              return (
                <div
                  key={addrId}
                  onClick={() => {
                    onSelectAddress(addr);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? "border-[#FF6B35] bg-orange-50/40 ring-2 ring-[#FF6B35]/20 shadow-sm"
                      : "border-gray-200 hover:border-orange-300 hover:bg-gray-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                          isSelected
                            ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                            : "border-gray-300 group-hover:border-orange-400"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-white border border-gray-200 text-gray-700 shadow-xs">
                            {category === "Home" ? (
                              <Home className="w-3 h-3 text-blue-600" />
                            ) : category === "Work" ? (
                              <Briefcase className="w-3 h-3 text-purple-600" />
                            ) : (
                              <MapPin className="w-3 h-3 text-amber-600" />
                            )}
                            {category}
                          </span>

                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-bold">
                              <Star className="w-3 h-3 fill-current" /> Default
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 pt-0.5">
                          <User className="w-3.5 h-3.5 text-[#FF6B35]" />
                          {addr.fullName}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {addr.phoneNumber}
                        </p>

                        <p className="text-xs text-gray-700 font-medium pt-1">
                          {addr.streetAddress}, {addr.area}
                          {addr.postalCode ? ` - ${addr.postalCode}` : ""}
                        </p>
                        {buildingStr && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" /> {buildingStr}
                          </p>
                        )}
                        {addr.deliveryInstructions && (
                          <p className="text-[11px] text-gray-400 italic pt-0.5">
                            &quot;{addr.deliveryInstructions}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => handleMakeDefault(e, addr)}
                          disabled={isSetting}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:text-[#FF6B35] hover:border-[#FF6B35] hover:bg-orange-50 transition cursor-pointer flex items-center gap-1"
                        >
                          {isSetting ? (
                            <Loader2 className="w-3 h-3 animate-spin text-[#FF6B35]" />
                          ) : (
                            <Star className="w-3 h-3 text-amber-500" />
                          )}
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <Link
            href="/dashboard/customer/address"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline"
          >
            <Plus className="w-4 h-4" /> Add or Manage Addresses
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
