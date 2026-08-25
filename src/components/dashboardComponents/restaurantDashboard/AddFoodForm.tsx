"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UtensilsCrossed,
  DollarSign,
  Tag,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  UploadCloud,
  Trash2,
  Store,
  RotateCcw,
  Plus,
  ChevronDown,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AOS from "aos";
import { useSession } from "@/lib/auth-client";
import {
  getMyRestaurantProfile,
  getFoodCategories,
  IRestaurant,
} from "@/lib/api/restaurant";
import { createFoodItem } from "@/lib/actions/restaurant";

type FoodStatus = "available" | "unavailable";

interface FoodFormData {
  name: string;
  category: string;
  price: string;
  description: string;
  status: FoodStatus;
}

const MAX_IMAGE_SIZE_MB = 5;

const AddFoodForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [formData, setFormData] = useState<FoodFormData>({
    name: "",
    category: "",
    price: "",
    description: "",
    status: "available",
  });

  const [image, setImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AOS.refresh();
  }, []);

  useEffect(() => {
    getFoodCategories().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setExistingCategories(res.data);
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node) &&
        categoryInputRef.current &&
        !categoryInputRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveRestaurant = async () => {
      const cached =
        typeof window !== "undefined"
          ? localStorage.getItem("foodflow_restaurant_data")
          : null;

      if (cached) {
        try {
          if (isMounted) setRestaurant(JSON.parse(cached));
        } catch {
          // ignore malformed cache
        }
      }

      if (!user?.email && !cached) {
        if (isMounted) setProfileLoading(false);
        return;
      }

      try {
        const res = await getMyRestaurantProfile(user?.email || "", user?.id || "");
        if (!isMounted) return;
        if (res.success && res.data) {
          setRestaurant(res.data);
          localStorage.setItem("foodflow_restaurant_data", JSON.stringify(res.data));
        } else if (!cached) {
          setRestaurant(null);
        }
      } catch {
        // keep cached value (if any) on network failure
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    resolveRestaurant();
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setErrorMsg(null);

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG, PNG, WEBP, etc.).");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      setErrorMsg(
        "Image upload is not configured. Please set a valid NEXT_PUBLIC_IMGBB_API_KEY in your .env file, then restart the dev server."
      );
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("key", apiKey);
      body.append("image", file);

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body,
      });
      const json = await res.json();

      if (json?.success && json?.data?.url) {
        setImage(json.data.display_url || json.data.url);
      } else {
        setErrorMsg(
          json?.error?.message ||
            json?.status?.message ||
            `Image upload failed${res.status ? ` (HTTP ${res.status})` : ""}. Please try again.`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorMsg(message || "Image upload failed. Please check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    setFormData({ name: "", category: "", price: "", description: "", status: "available" });
    setCategorySearch("");
    setShowCategoryDropdown(false);
    removeImage();
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg("Please enter the Food Name.");
      return;
    }
    if (!formData.category) {
      setErrorMsg("Please select a Category for this item.");
      return;
    }
    const priceNum = Number(formData.price);
    if (!formData.price.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Please enter a valid Price greater than 0.");
      return;
    }

    setLoading(true);

    try {
      const res = await createFoodItem({
        restaurantId: restaurant?._id || restaurant?.id || "",
        name: formData.name.trim(),
        category: formData.category,
        price: priceNum,
        description: formData.description.trim(),
        image,
        status: formData.status,
      });

      if (res.success && res.data) {
        setSuccessMsg(`"${res.data.name}" has been added to your menu successfully!`);
        setFormData({ name: "", category: "", price: "", description: "", status: "available" });
        setCategorySearch("");
        removeImage();
        setTimeout(() => {
          router.push("/dashboard/restaurant/menu");
          router.refresh();
        }, 1200);
      } else {
        setErrorMsg(res.message || "Failed to add the food item. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorMsg(message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categorySearch.trim()
    ? existingCategories.filter((c) =>
        c.toLowerCase().includes(categorySearch.trim().toLowerCase())
      )
    : existingCategories;

  /* ---------------------------------------------------------- */
  /* Loading state while resolving owner's restaurant profile   */
  /* ---------------------------------------------------------- */
  if (profileLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
        <p className="text-sm font-medium text-gray-500">Loading your restaurant profile...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* Empty state: no restaurant profile found                   */
  /* ---------------------------------------------------------- */
  if (!restaurant) {
    return (
      <div className="w-full max-w-6xl mx-auto" data-aos="fade-up">
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-10 sm:p-14 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Store className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
            No Restaurant Profile Found
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            You need an active restaurant profile before you can start adding food items to your
            menu.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/restaurant/create-restaurant")}
            className="px-6 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 cursor-pointer"
          >
            <span>Create Your Restaurant First</span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* Main Add Food Form                                          */
  /* ---------------------------------------------------------- */
  return (
    <div className="w-full max-w-6xl mx-auto" data-aos="fade-up">
      {/* Header */}
      <div
        data-aos="zoom-in"
        data-aos-duration="600"
        className="bg-gradient-to-r from-orange-500 via-[#FF6B35] to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10 mb-8 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Menu Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Add New Food Item</h1>
          <p className="text-orange-100 text-sm max-w-xl">
            Publish a new dish to <span className="font-semibold">{restaurant.restaurantName}</span>{" "}
            menu. Items marked as Available will be instantly visible to customers.
          </p>
        </div>
      </div>

      {/* Banners */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Item Details */}
          <div
            className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-5"
            data-aos="fade-right"
            data-aos-delay="100"
          >
            <div className="border-b border-gray-100 pb-3">
              <h2 className="flex items-center gap-2 text-base font-black tracking-tight text-gray-900">
                <UtensilsCrossed className="w-4.5 h-4.5 text-[#FF6B35]" />
                Item Details
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Basic information customers will see on your menu.
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Food Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Kacchi Biryani Special"
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition"
              />
            </div>

            {/* Category + Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative" ref={categoryDropdownRef}>
                  <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    ref={categoryInputRef}
                    type="text"
                    value={showCategoryDropdown ? categorySearch : formData.category}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setShowCategoryDropdown(true);
                    }}
                    onFocus={() => {
                      setCategorySearch(formData.category);
                      setShowCategoryDropdown(true);
                    }}
                    placeholder="Select or type a category"
                    required
                    autoComplete="off"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition ${
                      formData.category ? "text-gray-900" : "text-gray-400"
                    }`}
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center pr-2 pointer-events-none">
                    {formData.category && !showCategoryDropdown ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, category: "" }));
                          setCategorySearch("");
                          setShowCategoryDropdown(true);
                          categoryInputRef.current?.focus();
                        }}
                        className="pointer-events-auto text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {showCategoryDropdown && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, category: cat }));
                              setCategorySearch("");
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-600 transition cursor-pointer ${
                              formData.category === cat
                                ? "bg-orange-50 text-orange-600 font-semibold"
                                : "text-gray-700"
                            }`}
                          >
                            {cat}
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const newCategory = categorySearch.trim();
                            if (newCategory) {
                              setFormData((prev) => ({ ...prev, category: newCategory }));
                              if (!existingCategories.includes(newCategory)) {
                                setExistingCategories((prev) =>
                                  [...prev, newCategory].sort((a, b) => a.localeCompare(b))
                                );
                              }
                              setCategorySearch("");
                              setShowCategoryDropdown(false);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition cursor-pointer flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create &quot;{categorySearch.trim()}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {formData.category && !existingCategories.includes(formData.category) && (
                  <p className="text-[11px] text-orange-500 mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    New custom category
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Price <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    name="price"
                    min="0.01"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 250"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the ingredients, taste, serving size and what makes this dish special..."
                className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-500/10 outline-none text-sm font-medium transition resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-200">
                {(
                  [
                    { value: "available", label: "Available" },
                    { value: "unavailable", label: "Unavailable" },
                  ] as { value: FoodStatus; label: string }[]
                ).map((option) => {
                  const isActive = formData.status === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, status: option.value }))
                      }
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                        isActive
                          ? "bg-white border border-[#FF6B35] text-[#FF6B35] shadow-sm"
                          : "bg-transparent border border-transparent text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {isActive ? "✓ " : ""}
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Unavailable items stay hidden from customer ordering.
              </p>
            </div>
          </div>

          {/* Right: Image Upload + Summary */}
          <div className="lg:col-span-5 space-y-6" data-aos="fade-left" data-aos-delay="150">
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="flex items-center gap-2 text-base font-black tracking-tight text-gray-900">
                  <ImageIcon className="w-4.5 h-4.5 text-[#FF6B35]" />
                  Food Image
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded securely to ImgBB. JPG, PNG or WEBP up to {MAX_IMAGE_SIZE_MB}MB.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={uploading}
                className="hidden"
              />

              {image ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Food preview" className="w-full h-52 object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={uploading}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-52 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF6B35] hover:bg-orange-50/40 bg-gray-50/50 transition flex flex-col items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
                      <span className="text-xs font-bold text-gray-500">
                        Uploading to ImgBB...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center">
                        <UploadCloud className="w-6 h-6 text-[#FF6B35]" />
                      </div>
                      <span className="text-xs font-bold text-gray-600">
                        Click to upload food photo
                      </span>
                      <span className="text-[11px] text-gray-400">
                        High quality photos attract more orders
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Live Preview Card */}
            {(formData.name || formData.price || image) && (
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h2 className="text-base font-black tracking-tight text-gray-900">
                    Customer Preview
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    How this item will appear on your public menu.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={formData.name || "Food"} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-orange-300" />
                    </div>
                  )}
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black tracking-tight text-gray-900 truncate">
                        {formData.name || "Untitled Dish"}
                      </h3>
                      <span className="text-sm font-black text-[#FF6B35] whitespace-nowrap">
                        ${Number(formData.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                        {formData.category || "Uncategorized"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          formData.status === "available"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-500"
                        }`}
                      >
                        {formData.status === "available" ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    {formData.description.trim() && (
                      <p className="text-xs text-gray-500 line-clamp-2 pt-0.5">
                        {formData.description.trim()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || uploading}
            className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs sm:text-sm font-bold hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-8 py-3 rounded-xl bg-[#FF6B35] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#e85b27] transition shadow-md shadow-[#FF6B35]/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding to Menu...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Food Item</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddFoodForm;
