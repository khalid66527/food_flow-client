"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  RefreshCw,
  BadgeCheck,
  Save,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getUserById, IUser } from "@/lib/api/user";
import { updateUserDetails } from "@/lib/actions/user";

export default function CustomerProfile() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [profileData, setProfileData] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Toast Notification State
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const user = session?.user as {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    image?: string;
  } | undefined;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch real customer profile from MongoDB
  const fetchCustomerProfile = useCallback(async () => {
    const identifier = user?.email || user?.id;
    if (!identifier) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getUserById(identifier);
      if (res.success && res.data) {
        setProfileData(res.data);
        setName(res.data.name || user?.name || "");
        setPhone(res.data.phone || "");
        const fetchedPhoto =
          res.data.image ||
          (res.data as any).photo ||
          (res.data as any).avatar ||
          user?.image ||
          "";
        setPhotoUrl(fetchedPhoto);
      } else {
        setName(user?.name || "");
        setPhotoUrl(user?.image || "");
      }
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      showToast("error", "Failed to load customer profile details.");
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id, user?.name, user?.image]);

  useEffect(() => {
    fetchCustomerProfile();
  }, [fetchCustomerProfile]);

  // Handle Profile Image Upload & Auto-Save to MongoDB
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image file size must be less than 5 MB.");
      return;
    }

    const identifier = user?.email || profileData?.email || user?.id || profileData?._id;
    if (!identifier) {
      showToast("error", "User identifier not found.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const imgbbKey =
        process.env.NEXT_PUBLIC_IMGBB_API_KEY ||
        "1df7c1808e4ce1d5ed45c19880ec2082";

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && (data.data?.url || data.data?.display_url)) {
        const uploadedUrl = data.data.display_url || data.data.url;
        setPhotoUrl(uploadedUrl);

        // Auto-save the uploaded image URL directly into MongoDB Atlas
        const saveRes = await updateUserDetails(identifier, {
          image: uploadedUrl,
          photo: uploadedUrl,
          avatar: uploadedUrl,
        });

        if (saveRes.success) {
          showToast("success", "Image uploaded successfully!");
          await fetchCustomerProfile();
        } else {
          showToast("error", saveRes.message || "Failed to save profile picture.");
        }
      } else {
        showToast("error", "Failed to upload image.");
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      showToast("error", "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // Handle Form Submit (Save Updated Name, Phone & Photo to MongoDB)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const identifier = user?.email || profileData?.email || user?.id || profileData?._id;
    if (!identifier) {
      showToast("error", "User identifier not found.");
      return;
    }

    if (!name.trim()) {
      showToast("error", "Full name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        image: photoUrl,
        photo: photoUrl,
        avatar: photoUrl,
      };

      const res = await updateUserDetails(identifier, payload);

      if (res.success) {
        showToast("success", "Profile updated successfully!");
        await fetchCustomerProfile();
      } else {
        showToast("error", res.message || "Failed to update profile.");
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      showToast("error", err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading State
  if (sessionLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-gray-500 animate-pulse">
          Loading customer profile...
        </p>
      </div>
    );
  }

  const currentEmail = profileData?.email || user?.email || "";
  const currentRole = profileData?.role || user?.role || "Customer";
  const currentStatus = profileData?.status || "active";

  return (
    <div className="relative w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Centered Toast Notification Modal Overlay */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className={`flex items-center gap-3.5 px-6 py-4 rounded-2xl shadow-2xl border text-sm font-bold max-w-md w-full sm:w-auto bg-white transition-all transform scale-100 ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-900 shadow-emerald-500/10"
                : "border-rose-200 text-rose-900 shadow-rose-500/10"
            }`}
          >
            {toast.type === "success" ? (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Signature Bright Orange Gradient Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 border border-orange-400/30">
        {/* Subtle Decorative Background Flares */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* User Avatar & Identity Details */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {/* Avatar Container with Blinking Active Status Dot */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white/40 bg-white/10 backdrop-blur-md shadow-2xl relative flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name || "Customer Profile Picture"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-4xl text-white drop-shadow-sm">
                  {(name || "C").charAt(0).toUpperCase()}
                </span>
              )}
              {/* Eye-catching Blinking/Pulsing Active Dot */}
              <div
                title="Status: Active"
                className="absolute bottom-2 right-2 flex items-center justify-center"
              >
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white shadow-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
                  {name || "Customer Name"}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md text-white border border-white/30 capitalize shadow-xs">
                  <BadgeCheck className="w-3.5 h-3.5 text-white" />
                  {currentRole}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-orange-50 font-medium">
                <span className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full backdrop-blur-xs">
                  <Mail className="w-3.5 h-3.5 text-orange-200" />
                  {currentEmail}
                </span>
                {phone && (
                  <span className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full backdrop-blur-xs">
                    <Phone className="w-3.5 h-3.5 text-orange-200" />
                    {phone}
                  </span>
                )}
                {/* Status Badge with Blinking Dot */}
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-100 border border-emerald-300/40 backdrop-blur-md capitalize">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Refresh Data Action Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={fetchCustomerProfile}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-white" : ""}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Form & Image Upload Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="p-2.5 rounded-2xl bg-orange-50 text-[#FF6B35]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Edit Profile Information
            </h2>
            <p className="text-xs text-gray-400">
              Update your name, phone number, and profile picture
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Area */}
          <div className="p-5 rounded-2xl bg-orange-50/40 border border-orange-100/80 space-y-4">
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
              Profile Picture
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Image Preview Box */}
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-orange-200 bg-white shadow-xs flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile Avatar Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 space-y-1">
                    <ImageIcon className="w-7 h-7" />
                    <span className="text-[10px] font-semibold">No Image</span>
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-300" />
                  </div>
                )}
              </div>

              {/* Upload Button & Guidance */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <label
                    htmlFor="profile-image-input"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer active:scale-95 ${
                      isUploadingImage ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {isUploadingImage ? "Uploading..." : "Upload New Picture"}
                    </span>
                  </label>
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Select an image file from your device (JPG, PNG, or WebP, max 5 MB).
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name Field (Editable) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/70 border border-gray-200 text-gray-900 text-xs font-medium focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Phone Number Field (Editable) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/70 border border-gray-200 text-gray-900 text-xs font-medium focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Email Address Field (Read-Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Email Address
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Lock className="w-3 h-3" />
                  Read-Only
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={currentEmail}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-100 border border-gray-200 text-gray-500 text-xs font-medium cursor-not-allowed select-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">
                Email address cannot be modified for security reasons.
              </p>
            </div>

            {/* Account Role & Status (Read-Only Info) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Account Role &amp; Status
              </label>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="text-xs font-extrabold text-[#FF6B35] uppercase">
                    {currentRole}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 capitalize">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {currentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Submit Button */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving || isUploadingImage}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] text-white font-bold text-xs shadow-lg shadow-orange-500/25 hover:opacity-95 transition-all cursor-pointer active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? "Saving Profile..." : "Update Profile"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
