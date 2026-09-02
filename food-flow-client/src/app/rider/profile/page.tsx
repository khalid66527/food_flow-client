"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, User, Phone, Mail, Bike, MapPin, Star, Edit2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { riderProfileAPI } from "@/lib/api";
import { RiderProfile } from "@/types/rider";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", vehicleType: "", city: "" });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await riderProfileAPI.get();
      const data = res.data.data;
      setProfile(data);
      setForm({
        name: data?.name || "",
        phone: data?.phone || "",
        vehicleType: data?.vehicleType || "",
        city: data?.city || "",
      });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    try {
      await riderProfileAPI.update(form);
      setEditing(false);
      await fetchProfile();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:ml-0 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{profile?.name || "Rider"}</h2>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-semibold text-gray-700">{profile?.rating?.toFixed(1) || "5.0"}</span>
        </div>
        <div className="mt-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            profile?.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}>
            {profile?.status?.toUpperCase() || "PENDING"}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Details</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-full hover:bg-gray-100">
              <Edit2 className="w-4 h-4 text-gray-500" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSave} className="p-1.5 rounded-full hover:bg-green-100">
                <Save className="w-4 h-4 text-green-500" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-full hover:bg-red-100">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{profile?.email || "-"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-400" />
            {editing ? (
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1" />
            ) : (
              <span className="text-sm text-gray-700">{profile?.phone || "-"}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Bike className="w-4 h-4 text-gray-400" />
            {editing ? (
              <input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1" />
            ) : (
              <span className="text-sm text-gray-700">{profile?.vehicleType || "-"}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            {editing ? (
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1" />
            ) : (
              <span className="text-sm text-gray-700">{profile?.city || "-"}, {profile?.deliveryZone || ""}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h3 className="font-semibold text-gray-900">Statistics</h3>
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-600">Total Deliveries</span>
          <span className="text-sm font-bold text-gray-900">{profile?.totalDeliveries || 0}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">Total Earnings</span>
          <span className="text-sm font-bold text-green-600">&#2547;{profile?.totalEarnings || 0}</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
