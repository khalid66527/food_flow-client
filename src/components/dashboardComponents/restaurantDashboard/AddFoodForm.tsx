"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Flame,
  Leaf,
  Percent,
  Sliders,
  Pizza,
  Coffee,
  IceCream,
  Drumstick,
  Soup,
  Layers,
  Check,
  X,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  ShoppingBag,
  Star,
  Calculator,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getMyRestaurantProfile, IRestaurant } from "@/lib/api/restaurant";
import { createFoodItem } from "@/lib/actions/restaurant";
import { getGlobalCategories, IGlobalCategory } from "@/lib/api/category";
import { getPlatformSettings } from "@/lib/api/settings";
import LoadingSpinner from "@/lib/api/LoadingSpinner";
import {
  saveAiImageEditHandoff,
  getAiImageEditHandoff,
  clearAiImageEditHandoff,
} from "@/lib/aiImageEdit";
import {
  saveAddFoodDraft,
  readAddFoodDraft,
  clearAddFoodDraft,
} from "@/lib/addFoodDraft";
import RestaurantAiButton from "./RestaurantAiButton";

type CategoryType = string;

type FoodStatus = "available" | "unavailable";

const MAX_IMAGE_SIZE_MB = 10;
const IMGBB_API_KEY =
  process.env.NEXT_PUBLIC_IMGBB_API_KEY || "203d60bb9fab7d8774cd2e6e230ff932";

// Preset sample photos mapping per category
const CATEGORY_SAMPLE_PHOTOS: Record<string, string[]> = {
  Pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1000&q=80",
  ],
  Burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1000&q=80",
  ],
  Biryani: [
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=1000&q=80",
  ],
  Pasta: [
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1000&q=80",
  ],
  "BBQ & Grill": [
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1000&q=80",
  ],
  Desserts: [
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80",
  ],
  Drinks: [
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1000&q=80",
  ],
};

export default function AddFoodForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Category State
  const [category, setCategory] = useState<CategoryType>("Pizza");
  const [customCategory, setCustomCategory] = useState("");
  const [globalCategories, setGlobalCategories] = useState<IGlobalCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Commission Percentage State
  const [commissionPercentage, setCommissionPercentage] = useState<number>(15);

  // Fetch admin approved global categories & platform settings
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, settingsRes] = await Promise.all([
          getGlobalCategories(),
          getPlatformSettings(),
        ]);
        if (
          catRes.success &&
          Array.isArray(catRes.data) &&
          catRes.data.length > 0
        ) {
          setGlobalCategories(catRes.data);
        }
        if (settingsRes.success && settingsRes.data) {
          setCommissionPercentage(
            settingsRes.data.restaurantCommissionPercentage,
          );
        }
      } catch {
        // fallback
      }
    };
    loadData();
  }, []);

  // Common General Food Fields
  const [commonData, setCommonData] = useState({
    name: "",
    price: "",
    discountPrice: "",
    description: "",
    status: "available" as FoodStatus,
    isVegetarian: false,
    isSpicy: false,
    tags: "" as string,
    ingredients: "" as string,
  });

  // Dynamic Category-Specific Specifications State
  const [dynamicData, setDynamicData] = useState<Record<string, string>>({
    crustType: "Thin Italian Crust",
    pizzaSize: "12 Inch (Medium)",
    sauceBase: "San Marzano Tomato Marinara",
    cheeseType: "Mozzarella & Parmesan Blend",
    sliceCount: "6 Slices",
  });

  // Multiple Images State
  const [images, setImages] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">(
    "upload",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore the draft parked by the trip to the AI image editor.
  //
  // Restore-once: the draft is dropped as soon as it is read, so this only ever
  // rehydrates the round trip — a later plain visit to Add Food is a blank form.
  //
  // sessionStorage does not exist while rendering on the server, so seeding this
  // through useState initialisers would mismatch on hydration — it has to be a
  // post-mount effect, which is what set-state-in-effect is disabled for here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = readAddFoodDraft();
    if (!draft) return;

    setCategory(draft.category);
    setCustomCategory(draft.customCategory);
    if (Object.keys(draft.commonData).length > 0) {
      setCommonData((prev) => ({
        ...prev,
        ...(draft.commonData as Partial<typeof prev>),
      }));
    }
    if (Object.keys(draft.dynamicData).length > 0) {
      setDynamicData(draft.dynamicData);
    }
    setImageInputMode(draft.imageInputMode);

    // The editor writes the edited cover into the draft on Apply. If the gallery
    // was dropped to fit the storage quota, the hand-off still holds the photo.
    const handoff = getAiImageEditHandoff();
    const restoredImages =
      draft.images.length > 0
        ? draft.images
        : handoff?.image
          ? [handoff.image]
          : [];

    setImages(restoredImages);
    setActivePreviewIndex(
      Math.min(draft.activePreviewIndex, Math.max(0, restoredImages.length - 1)),
    );

    clearAddFoodDraft();
    clearAiImageEditHandoff();

    setSuccessMsg(
      draft.coverEdited
        ? "✓ Your draft was restored with the AI-edited cover photo."
        : "✓ Your draft was restored.",
    );
    setTimeout(() => setSuccessMsg(""), 4000);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Resolve Logged-in Restaurant
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
          // ignore cache error
        }
      }

      if (!user?.email && !cached) {
        if (isMounted) setProfileLoading(false);
        return;
      }

      try {
        const res = await getMyRestaurantProfile(
          user?.email || "",
          user?.id || "",
        );
        if (!isMounted) return;
        if (res.success && res.data) {
          setRestaurant(res.data);
          localStorage.setItem(
            "foodflow_restaurant_data",
            JSON.stringify(res.data),
          );
        } else if (!cached) {
          setRestaurant(null);
        }
      } catch {
        // keep cached
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    resolveRestaurant();
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.id]);

  // Handle General Input Change
  const handleCommonChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setCommonData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Category Change (Sets Default Dynamic Fields per Category)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CategoryType;
    setCategory(selected);

    switch (selected) {
      case "Pizza":
        setDynamicData({
          crustType: "Thin Italian Crust",
          pizzaSize: "12 Inch (Medium)",
          sauceBase: "San Marzano Tomato Marinara",
          cheeseType: "Mozzarella & Parmesan Blend",
          sliceCount: "6 Slices",
        });
        break;
      case "Burger":
        setDynamicData({
          pattyType: "Double Angus Beef",
          pattyCount: "2x Patties (300g)",
          bunType: "Toasted Golden Brioche Bun",
          cheeseType: "Melted Wisconsin Cheddar",
          comboOptions: "Burger + Seasoned Waffle Fries",
        });
        break;
      case "Biryani":
        setDynamicData({
          meatType: "Mutton Kacchi (Dum Cooked)",
          portionSize: "Duo Feast (1:2) - 2 Persons",
          riceType: "Shahi Basmati Rice",
          complimentarySides: "Chilled Mint Borhani + Salad",
        });
        break;
      case "Pasta":
        setDynamicData({
          pastaShape: "Fettuccine Ribbons",
          sauceType: "Creamy Garlic Parmesan Alfredo",
          protein: "Seasoned Grilled Chicken",
          garlicBreadIncluded: "Yes (2 Slices Cheesy Garlic Bread)",
        });
        break;
      case "BBQ & Grill":
        setDynamicData({
          cutType: "Charcoal Chicken Quarter (Leg/Breast)",
          spiceLevel: "Peri-Peri Spicy Hot 🔥",
          marinadeStyle: "Smoky Charcoal Grill",
          servingSide: "Warm Garlic Butter Naan + Mint Dip",
        });
        break;
      case "Desserts":
        setDynamicData({
          servingTemp: "Warm & Gooey with Cold Gelato",
          sweetnessLevel: "Regular Sweetness",
          iceCreamScoop: "Vanilla Bean Gelato Scoop Included",
          dietOption: "Regular",
        });
        break;
      case "Drinks":
        setDynamicData({
          cupSize: "Large Cup (500ml)",
          iceLevel: "Normal Crushed Ice",
          sugarLevel: "Regular 100% Sweetness",
          beverageType: "Fresh Fruit Juice / Mocktail",
        });
        break;
      default:
        setDynamicData({});
    }
  };

  // Handle Dynamic Field Change
  const handleDynamicChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setDynamicData((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-Load 3-4 High Quality Preset Photos for active category
  const handleAutoFillCategoryPhotos = () => {
    const samples =
      CATEGORY_SAMPLE_PHOTOS[category] || CATEGORY_SAMPLE_PHOTOS.Pizza;
    setImages(samples);
    setActivePreviewIndex(0);
    setSuccessMsg(
      `✓ Auto-loaded ${samples.length} high-resolution ${category} photos!`,
    );
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // AI photo editing — hand the cover photo to the editor page and navigate there.
  //
  // Navigating unmounts this form, so the whole draft is parked in sessionStorage
  // first and rehydrated by the mount effect above on the way back.
  const handleAiImageEdit = () => {
    const coverImage = images[0];
    if (!coverImage) return;

    saveAddFoodDraft({
      category,
      customCategory,
      commonData,
      dynamicData,
      images,
      imageInputMode,
      activePreviewIndex,
    });

    saveAiImageEditHandoff({
      image: coverImage,
      foodName: commonData.name.trim() || undefined,
      category,
    });
    router.push("/dashboard/restaurant/ai-image-edit");
  };

  // Helper: Read and compress image locally so it NEVER fails
  const compressAndReadFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (typeof window === "undefined") {
          return resolve(rawResult || "");
        }
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            resolve(compressed || rawResult);
          } catch {
            resolve(rawResult);
          }
        };
        img.onerror = () => resolve(rawResult);
        img.src = rawResult;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  // Multi-Image Upload from Device / Gallery (Guaranteed 100% Reliable via /api/upload + Local Fallback)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    // Convert to array before touching the input element
    const files = Array.from(rawFiles);

    // Clear input value so selecting the same file again later will still fire onChange
    if (e.target) e.target.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";

    setErrorMsg("");
    setUploading(true);
    setUploadProgress(`Processing ${files.length} photo(s)...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }

      // Call our Next.js server upload route (handles ImgBB + base64 fallback)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success && Array.isArray(json.urls) && json.urls.length > 0) {
        setImages((prev) => [...prev, ...json.urls]);
        setActivePreviewIndex(0);
        setSuccessMsg(
          `✓ Successfully added ${json.urls.length} photo(s) from your device!`,
        );
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        // Fallback: Read & compress locally in client so it NEVER fails
        const fallbackUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await compressAndReadFile(files[i]);
          if (url) fallbackUrls.push(url);
        }
        if (fallbackUrls.length > 0) {
          setImages((prev) => [...prev, ...fallbackUrls]);
          setActivePreviewIndex(0);
          setSuccessMsg(
            `✓ Successfully added ${fallbackUrls.length} photo(s)!`,
          );
          setTimeout(() => setSuccessMsg(""), 3000);
        } else {
          setErrorMsg("Could not process the selected image files.");
        }
      }
    } catch {
      // Client-side fallback on any fetch/network error
      try {
        const fallbackUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await compressAndReadFile(files[i]);
          if (url) fallbackUrls.push(url);
        }
        if (fallbackUrls.length > 0) {
          setImages((prev) => [...prev, ...fallbackUrls]);
          setActivePreviewIndex(0);
          setSuccessMsg(
            `✓ Successfully added ${fallbackUrls.length} photo(s)!`,
          );
          setTimeout(() => setSuccessMsg(""), 3000);
        } else {
          setErrorMsg("Failed to process images.");
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to process images.");
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Drag & drop files handler
  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (droppedFiles.length === 0) return;

    // Trigger synthetic file selection
    const dataTransfer = new DataTransfer();
    droppedFiles.forEach((file) => dataTransfer.items.add(file));
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      const event = {
        target: fileInputRef.current,
      } as React.ChangeEvent<HTMLInputElement>;
      handleImageSelect(event);
    }
  };

  // Add Direct URL Image
  const handleAddUrlImage = () => {
    const url = imageUrlInput.trim();
    if (url) {
      const urlsToAdd = url
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
      setImages((prev) => [...prev, ...urlsToAdd]);
      setActivePreviewIndex(0);
      setImageUrlInput("");
      setSuccessMsg(`✓ Added ${urlsToAdd.length} photo URL(s) to gallery!`);
      setTimeout(() => setSuccessMsg(""), 2000);
    }
  };

  // Remove specific image
  const removeImage = (indexToRemove: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      if (activePreviewIndex >= filtered.length) {
        setActivePreviewIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Set specific image as main cover
  const setAsCoverImage = (index: number) => {
    setImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [selected, ...rest];
    });
    setActivePreviewIndex(0);
  };

  // Category Icon Indicator
  const getCategoryIcon = () => {
    switch (category) {
      case "Pizza":
        return <Pizza className="w-4 h-4 text-[#FF6B35]" />;
      case "Burger":
        return <Layers className="w-4 h-4 text-[#FF6B35]" />;
      case "Biryani":
        return <Soup className="w-4 h-4 text-[#FF6B35]" />;
      case "Pasta":
        return <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />;
      case "BBQ & Grill":
        return <Drumstick className="w-4 h-4 text-[#FF6B35]" />;
      case "Desserts":
        return <IceCream className="w-4 h-4 text-[#FF6B35]" />;
      case "Drinks":
        return <Coffee className="w-4 h-4 text-[#FF6B35]" />;
      default:
        return <Sliders className="w-4 h-4 text-[#FF6B35]" />;
    }
  };

  // Render Category-Specific Dynamic Specification Fields
  const renderDynamicFields = () => {
    switch (category) {
      case "Pizza":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Crust Type
              </label>
              <select
                name="crustType"
                required
                value={dynamicData.crustType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Thin Italian Crust">Thin Italian Crust</option>
                <option value="Pan Crust">Fluffy Pan Crust</option>
                <option value="Cheese Stuffed Crust">
                  Cheese Stuffed Crust (+Cheese)
                </option>
                <option value="Chicago Deep Dish">Chicago Deep Dish</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Pizza Size (Inches / Slices)
              </label>
              <select
                name="pizzaSize"
                required
                value={dynamicData.pizzaSize || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="8 Inch (Personal - 4 Slices)">
                  8 Inch (Personal - 4 Slices)
                </option>
                <option value="12 Inch (Medium - 6 Slices)">
                  12 Inch (Medium - 6 Slices)
                </option>
                <option value="16 Inch (Large - 8 Slices)">
                  16 Inch (Large - 8 Slices)
                </option>
                <option value="20 Inch (Party Feast - 12 Slices)">
                  20 Inch (Party Feast - 12 Slices)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Sauce Base
              </label>
              <select
                name="sauceBase"
                required
                value={dynamicData.sauceBase || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="San Marzano Tomato Marinara">
                  San Marzano Tomato Marinara
                </option>
                <option value="Spicy BBQ Sauce">Spicy BBQ Sauce</option>
                <option value="White Garlic Parmesan Cream">
                  White Garlic Parmesan Cream
                </option>
                <option value="Basil Pesto Herb Sauce">
                  Basil Pesto Herb Sauce
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Cheese & Topping Blend
              </label>
              <input
                type="text"
                name="cheeseType"
                placeholder="e.g. 100% Mozzarella, Pepperoni, Fresh Basil"
                required
                value={dynamicData.cheeseType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Burger":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Patty Style & Meat
              </label>
              <select
                name="pattyType"
                required
                value={dynamicData.pattyType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Double Angus Beef">Double Angus Beef</option>
                <option value="Single Angus Beef">Single Angus Beef</option>
                <option value="Crispy Golden Fried Chicken">
                  Crispy Golden Fried Chicken
                </option>
                <option value="Grilled Chicken Breast">
                  Grilled Chicken Breast
                </option>
                <option value="Smash Beef Patty">Smash Beef Patty</option>
                <option value="Plant-based Veggie Patty">
                  Plant-based Veggie Patty
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Patty Count / Serving
              </label>
              <select
                name="pattyCount"
                required
                value={dynamicData.pattyCount || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="1x Single Patty (150g)">
                  1x Single Patty (150g)
                </option>
                <option value="2x Double Stack (300g)">
                  2x Double Stack (300g)
                </option>
                <option value="3x Triple Monster (450g)">
                  3x Triple Monster (450g)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Bun Type
              </label>
              <select
                name="bunType"
                required
                value={dynamicData.bunType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Toasted Golden Brioche Bun">
                  Toasted Golden Brioche Bun
                </option>
                <option value="Sesame Seed Bun">Sesame Seed Bun</option>
                <option value="Soft Potato Bun">Soft Potato Bun</option>
                <option value="Gluten Free Bun">Gluten Free Bun</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Combo & Add-ons
              </label>
              <input
                type="text"
                name="comboOptions"
                placeholder="e.g. Served with Seasoned Waffle Fries & Iced Soda"
                required
                value={dynamicData.comboOptions || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Biryani":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Meat & Biryani Recipe
              </label>
              <select
                name="meatType"
                required
                value={dynamicData.meatType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Mutton Kacchi (Dum Cooked)">
                  Traditional Mutton Kacchi (Dum Cooked)
                </option>
                <option value="Chicken Roast Morog Polao">
                  Shahi Chicken Roast & Morog Polao
                </option>
                <option value="Old Dhaka Beef Tehari">
                  Old Dhaka Mustard Beef Tehari
                </option>
                <option value="Hydrabadi Dum Biryani">
                  Hydrabadi Dum Biryani
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Portion / Platter Size
              </label>
              <select
                name="portionSize"
                required
                value={dynamicData.portionSize || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Single Serving (1:1) - 1 Person">
                  Single Serving (1:1) - 1 Person
                </option>
                <option value="Duo Feast (1:2) - 2 Persons">
                  Duo Feast (1:2) - 2 Persons
                </option>
                <option value="Family Feast Tray (1:4) - 4-5 Persons">
                  Family Feast Tray (1:4) - 4-5 Persons
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Rice Type
              </label>
              <select
                name="riceType"
                required
                value={dynamicData.riceType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Shahi Basmati Long Grain">
                  Shahi Basmati Long Grain
                </option>
                <option value="Aromatic Chinigura Rice">
                  Aromatic Chinigura Rice
                </option>
                <option value="Kalijira Fragrant Rice">
                  Kalijira Fragrant Rice
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Complimentary Sides
              </label>
              <input
                type="text"
                name="complimentarySides"
                placeholder="e.g. Borhani (250ml) + Shahi Egg + Cucumber Salad"
                required
                value={dynamicData.complimentarySides || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Pasta":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Pasta Shape
              </label>
              <select
                name="pastaShape"
                required
                value={dynamicData.pastaShape || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Fettuccine Ribbons">Fettuccine Ribbons</option>
                <option value="Penne Rigate">Penne Rigate</option>
                <option value="Classic Spaghetti">Classic Spaghetti</option>
                <option value="Fusilli Spirals">Fusilli Spirals</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Sauce Choice
              </label>
              <select
                name="sauceType"
                required
                value={dynamicData.sauceType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Creamy Garlic Parmesan Alfredo">
                  Creamy Garlic Parmesan Alfredo
                </option>
                <option value="Spicy Tomato Arrabbiata">
                  Spicy Tomato Arrabbiata
                </option>
                <option value="Pink Rosa Sauce (Cream + Tomato)">
                  Pink Rosa Sauce (Cream + Tomato)
                </option>
                <option value="Basil Pine Nut Pesto">
                  Basil Pine Nut Pesto
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Protein Choice
              </label>
              <input
                type="text"
                name="protein"
                placeholder="e.g. Sliced Grilled Chicken Breast / Garlic Shrimp"
                required
                value={dynamicData.protein || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Garlic Bread Included
              </label>
              <select
                name="garlicBreadIncluded"
                required
                value={dynamicData.garlicBreadIncluded || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Yes (2 Slices Cheesy Garlic Bread)">
                  Yes (2 Slices Cheesy Garlic Bread)
                </option>
                <option value="No (Pasta Bowl Only)">
                  No (Pasta Bowl Only)
                </option>
              </select>
            </div>
          </>
        );

      case "BBQ & Grill":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Cut & Meat Type
              </label>
              <select
                name="cutType"
                required
                value={dynamicData.cutType || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Charcoal Chicken Quarter (Leg/Breast)">
                  Charcoal Chicken Quarter (Leg/Breast)
                </option>
                <option value="Boneless Chicken Tikka Boti">
                  Boneless Chicken Tikka Boti
                </option>
                <option value="Smoked Beef Short Ribs">
                  Smoked Beef Short Ribs
                </option>
                <option value="Mutton Seekh Kebab Skewers">
                  Mutton Seekh Kebab Skewers
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Marinade & Spice Level
              </label>
              <select
                name="spiceLevel"
                required
                value={dynamicData.spiceLevel || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Peri-Peri Spicy Hot 🔥">
                  Peri-Peri Spicy Hot 🔥
                </option>
                <option value="Smoky Medium BBQ Glaze">
                  Smoky Medium BBQ Glaze
                </option>
                <option value="Creamy Reshmi Malai (Mild)">
                  Creamy Reshmi Malai (Mild)
                </option>
                <option value="Naga Charcoal Fire 🔥🔥">
                  Naga Charcoal Fire 🔥🔥
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Serving Side
              </label>
              <input
                type="text"
                name="servingSide"
                placeholder="e.g. Hot Garlic Butter Naan + Mint Dip"
                required
                value={dynamicData.servingSide || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Desserts":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Serving Temperature & Style
              </label>
              <select
                name="servingTemp"
                required
                value={dynamicData.servingTemp || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Warm & Gooey with Cold Gelato">
                  Warm & Gooey with Cold Gelato
                </option>
                <option value="Chilled & Creamy">
                  Chilled & Creamy (Refrigerator)
                </option>
                <option value="Freshly Baked Room Temp">
                  Freshly Baked Room Temp
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Gelato / Ice Cream Scoop
              </label>
              <select
                name="iceCreamScoop"
                required
                value={dynamicData.iceCreamScoop || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Vanilla Bean Gelato Scoop Included">
                  Vanilla Bean Gelato Scoop Included
                </option>
                <option value="Chocolate Fudge Scoop Included">
                  Chocolate Fudge Scoop Included
                </option>
                <option value="No Ice Cream (Pastry/Cake Only)">
                  No Ice Cream (Pastry/Cake Only)
                </option>
              </select>
            </div>
          </>
        );

      case "Drinks":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Cup Size / Volume
              </label>
              <select
                name="cupSize"
                required
                value={dynamicData.cupSize || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Regular Cup (350ml)">Regular Cup (350ml)</option>
                <option value="Large Cup (500ml)">Large Cup (500ml)</option>
                <option value="Sharing Pitcher (1.5L)">
                  Sharing Pitcher (1.5L)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Ice & Sweetness Level
              </label>
              <input
                type="text"
                name="iceLevel"
                placeholder="e.g. Normal Ice, 50% Less Sugar"
                required
                value={dynamicData.iceLevel || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      default:
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Portion / Serving Size
              </label>
              <input
                type="text"
                name="portionSize"
                placeholder="e.g. Single Portion / 6 Pieces / 500ml Bowl"
                value={dynamicData.portionSize || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Preparation / Flavor Notes
              </label>
              <input
                type="text"
                name="prepStyle"
                placeholder="e.g. House Specialty, Authentic Herbs & Spices"
                value={dynamicData.prepStyle || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">
                Special Serving Options
              </label>
              <input
                type="text"
                name="specialNotes"
                placeholder="e.g. Served fresh with dipping sauce and side garnish"
                value={dynamicData.specialNotes || ""}
                onChange={handleDynamicChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );
    }
  };

  // Reset Form
  const handleReset = () => {
    setCommonData({
      name: "",
      price: "",
      discountPrice: "",
      description: "",
      status: "available",
      isVegetarian: false,
      isSpicy: false,
      tags: "",
      ingredients: "",
    });
    setDynamicData({
      crustType: "Thin Italian Crust",
      pizzaSize: "12 Inch (Medium)",
      sauceBase: "San Marzano Tomato Marinara",
      cheeseType: "Mozzarella & Parmesan Blend",
      sliceCount: "6 Slices",
    });
    setCategory("Pizza");
    setCustomCategory("");
    setImages([]);
    setActivePreviewIndex(0);
    setImageUrlInput("");
    setErrorMsg("");
    setSuccessMsg("");
    clearAddFoodDraft();
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const effectiveCategory =
      category === "Custom" ? customCategory.trim() : category.trim();

    if (!effectiveCategory) {
      setErrorMsg("Please select or enter a Food Category!");
      return;
    }

    if (!commonData.name.trim()) {
      setErrorMsg("Please enter the Dish / Food Name.");
      return;
    }

    const priceNum = Number(commonData.price);
    if (!commonData.price.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Please enter a valid Price greater than 0.");
      return;
    }

    const discountPriceNum = commonData.discountPrice.trim()
      ? Number(commonData.discountPrice)
      : undefined;

    if (
      discountPriceNum !== undefined &&
      (!Number.isFinite(discountPriceNum) ||
        discountPriceNum >= priceNum ||
        discountPriceNum < 0)
    ) {
      setErrorMsg("Discount price must be less than the regular price.");
      return;
    }

    // Require at least 1 image
    if (images.length === 0) {
      setErrorMsg(
        "Please upload or add at least 1 food photo to the gallery before submitting.",
      );
      return;
    }

    setLoading(true);

    try {
      const restaurantId = restaurant?._id || restaurant?.id || "";
      if (!restaurantId) {
        throw new Error(
          "No active restaurant profile found. Please create your restaurant first.",
        );
      }

      const tagsArray = commonData.tags
        ? commonData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [effectiveCategory];

      const ingredientsArray = commonData.ingredients
        ? commonData.ingredients
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean)
        : [];

      const payload = {
        restaurantId,
        name: commonData.name.trim(),
        category: effectiveCategory,
        price: priceNum,
        discountPrice: discountPriceNum,
        description: commonData.description.trim(),
        image: images[0] || "",
        images: images,
        status: commonData.status,
        isAvailable: commonData.status === "available",
        isVegetarian: commonData.isVegetarian,
        isSpicy: commonData.isSpicy,
        tags: [
          effectiveCategory,
          commonData.isVegetarian ? "Vegetarian" : "",
          commonData.isSpicy ? "Spicy" : "",
          ...tagsArray,
        ].filter(Boolean),
        ingredients: ingredientsArray,
        categoryDetails: dynamicData,
      };

      const res = await createFoodItem(payload);

      if (res.success && res.data) {
        setSuccessMsg(
          `🎉 "${res.data.name}" has been published to your menu successfully with ${images.length} photos!`,
        );
        handleReset();
        setTimeout(() => {
          router.push("/dashboard/restaurant/menu");
          router.refresh();
        }, 1200);
      } else {
        setErrorMsg(
          res.message || "Failed to publish food item. Please try again.",
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* Loading state */
  if (profileLoading) {
    return <LoadingSpinner size={50} minHeight="60vh" />;
  }

  /* No restaurant profile */
  if (!restaurant) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-10 sm:p-14 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-18 h-18 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35]">
            <Store className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            No Restaurant Profile Found
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            You need to create your restaurant profile before adding food items
            to your menu.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/restaurant/create-restaurant")
            }
            className="px-7 py-3.5 rounded-2xl bg-[#FF6B35] text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:bg-[#e85b27] transition cursor-pointer"
          >
            Create Restaurant Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 space-y-8">
      {/* 🌟 HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-[#FF6B35] to-amber-500 text-white p-7 sm:p-9 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Category-Adaptive Multi-Image Menu Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Add New Dish to {restaurant.restaurantName}
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm max-w-2xl">
            Choose a food category to dynamically switch recipe specifications,
            upload multiple gallery photos, and preview your live customer card.
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* MAIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ======================================================= */}
          {/* 👈 LEFT COLUMN: GENERAL FOOD INFORMATION                */}
          {/* ======================================================= */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-black text-gray-900">
                <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />
                <span>General Dish Information</span>
              </div>
              <span className="text-xs font-bold text-gray-400">Step 1</span>
            </div>

            {/* Food Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Dish / Food Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={commonData.name}
                onChange={handleCommonChange}
                placeholder="e.g. Supreme Double Truffle Beef Burger"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-semibold transition"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>
                  Food Category <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-[#FF6B35] font-bold">
                  Adapts specifications dynamically
                </span>
              </label>
              <select
                name="category"
                required
                value={category}
                onChange={handleCategoryChange}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-bold text-gray-900 transition cursor-pointer"
              >
                {globalCategories.length > 0
                  ? globalCategories.map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.emoji || "🏷️"} {cat.name}
                      </option>
                    ))
                  : [
                      { name: "Pizza", emoji: "🍕" },
                      { name: "Burgers", emoji: "🍔" },
                      { name: "Biryani", emoji: "🍛" },
                      { name: "Pasta", emoji: "🍝" },
                      { name: "BBQ & Grill", emoji: "🍖" },
                      { name: "Desserts", emoji: "🍰" },
                      { name: "Drinks", emoji: "🥤" },
                      { name: "Sushi", emoji: "🍣" },
                      { name: "Chinese", emoji: "🍲" },
                      { name: "Thai", emoji: "🌿" },
                      { name: "Healthy", emoji: "🥗" },
                    ].map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                <option value="Custom">✨ Add Custom / New Category...</option>
              </select>

              {/* Custom Category Input Field */}
              {category === "Custom" && (
                <div className="mt-2.5 space-y-1">
                  <label className="text-xs font-bold text-[#FF6B35] uppercase tracking-wider">
                    Enter New Category Name{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Mexican Tacos, Waffles, Indian Thali, Ramen..."
                    className="w-full px-4 py-3 rounded-2xl bg-orange-50/60 border border-orange-300 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-bold text-gray-900 transition placeholder:text-gray-400 shadow-xs"
                  />
                </div>
              )}
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Price (Tk) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2">
                    Tk
                  </span>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0.01"
                    step="0.01"
                    value={commonData.price}
                    onChange={handleCommonChange}
                    placeholder="150"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Discount Price</span>
                  <span className="text-[10px] text-orange-500 font-bold">
                    Offer
                  </span>
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    name="discountPrice"
                    min="0.01"
                    step="0.01"
                    value={commonData.discountPrice}
                    onChange={handleCommonChange}
                    placeholder="9.99"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 💰 REQUIREMENT 2: "ADD FOOD" LIVE PROFIT CALCULATOR */}
            {(() => {
              const rawPrice = Number(
                commonData.discountPrice || commonData.price || 0,
              );
              const priceNum = Number.isNaN(rawPrice) ? 0 : rawPrice;
              const commissionVal =
                Math.round(priceNum * (commissionPercentage / 100) * 100) / 100;
              const netPayout = Math.max(
                0,
                Math.round((priceNum - commissionVal) * 100) / 100,
              );

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-50/90 border border-emerald-200/80 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>Live Profit & Settlement Calculator</span>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      {commissionPercentage}% Platform Commission
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Food Price (Selling Price):
                      </span>
                      <span className="font-extrabold text-gray-900">
                        ৳ {priceNum.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-rose-600">
                      <span>
                        Platform Commission ({commissionPercentage}%):
                      </span>
                      <span className="font-extrabold">
                        -৳ {commissionVal.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-sm">
                      <span className="font-black text-emerald-950">
                        Your Net Payout (Net Payout):
                      </span>
                      <span className="font-black text-emerald-600 text-base">
                        ৳ {netPayout.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ⭐ AVAILABILITY / STOCK STATUS FIELD */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>
                  Food Availability / Stock Status{" "}
                  <span className="text-rose-500">*</span>
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    commonData.status === "available"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {commonData.status === "available"
                    ? "● In Stock"
                    : "● Out of Stock"}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() =>
                    setCommonData((p) => ({ ...p, status: "available" }))
                  }
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    commonData.status === "available"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                      : "text-gray-600 hover:text-gray-900 bg-transparent"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Available (In Stock)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCommonData((p) => ({ ...p, status: "unavailable" }))
                  }
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    commonData.status === "unavailable"
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-[1.02]"
                      : "text-gray-600 hover:text-gray-900 bg-transparent"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Unavailable (Out of Stock)</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Appetizing Description
              </label>
              <textarea
                name="description"
                rows={3}
                value={commonData.description}
                onChange={handleCommonChange}
                placeholder="Describe flavor notes, prep technique, and serving presentation..."
                className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white focus:border-[#FF6B35] outline-none text-sm font-medium transition resize-none leading-relaxed"
              />
            </div>

            {/* Key Ingredients & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ingredients (Comma Separated)
                </label>
                <input
                  type="text"
                  name="ingredients"
                  value={commonData.ingredients}
                  onChange={handleCommonChange}
                  placeholder="e.g. Angus Beef, Mozzarella, Truffle Butter"
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tags (Comma Separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={commonData.tags}
                  onChange={handleCommonChange}
                  placeholder="e.g. Best Seller, Spicy, Chef Special"
                  className="w-full px-4 py-2.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] outline-none"
                />
              </div>
            </div>

            {/* Dietary Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  setCommonData((p) => ({
                    ...p,
                    isVegetarian: !p.isVegetarian,
                  }))
                }
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  commonData.isVegetarian
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Leaf className="w-4 h-4" />
                <span>Vegetarian</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCommonData((p) => ({ ...p, isSpicy: !p.isSpicy }))
                }
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                  commonData.isSpicy
                    ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Spicy Hot 🔥</span>
              </button>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 👉 RIGHT COLUMN: DYNAMIC SPECS & MULTI-IMAGE GALLERY    */}
          {/* ======================================================= */}
          <div className="space-y-6">
            {/* 1. DYNAMIC CATEGORY SPECIFICATIONS CARD */}
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                  {getCategoryIcon()}
                  <span>Dynamic {category} Specifications</span>
                </div>
                <span className="text-xs font-bold text-[#FF6B35] bg-orange-50 px-2.5 py-1 rounded-xl">
                  {category} Preset
                </span>
              </div>

              {/* Dynamic Category Specific Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderDynamicFields()}
              </div>
            </div>

            {/* 2. MULTIPLE PHOTO GALLERY UPLOADER CARD (3-4 PHOTOS) */}
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                  <span>Food Photos Gallery ({images.length} Photos)</span>
                </div>

                <div className="inline-flex rounded-xl bg-gray-100 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setImageInputMode("upload")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      imageInputMode === "upload"
                        ? "bg-white text-[#FF6B35] shadow-xs"
                        : "text-gray-500"
                    }`}
                  >
                    Upload Files
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode("url")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      imageInputMode === "url"
                        ? "bg-white text-[#FF6B35] shadow-xs"
                        : "text-gray-500"
                    }`}
                  >
                    Paste URL
                  </button>
                </div>
              </div>

              {imageInputMode === "upload" ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={uploading}
                    className="hidden"
                  />

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      fileInputRef.current?.click()
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropFiles}
                    className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#FF6B35] hover:bg-orange-50/30 bg-gray-50/70 transition flex flex-col items-center justify-center gap-2 cursor-pointer group select-none"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                        <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
                        <span className="text-xs font-bold text-gray-800">
                          {uploadProgress || "Uploading photos..."}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Please wait a moment
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 group-hover:border-orange-200 shadow-sm flex items-center justify-center text-[#FF6B35]">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-gray-900 block">
                            Click to select 3, 4, or more Photos (Multi-select)
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Or drag & drop photos here from your computer /
                            phone gallery
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 1-Click Auto Fill Demo Photos */}
                  <button
                    type="button"
                    onClick={handleAutoFillCategoryPhotos}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-orange-200"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#FF6B35]" />
                    <span>Auto-load 4 High-Res {category} Photos (Demo)</span>
                  </button>

                  {/* AI Image Editing Entry Point */}
                  <RestaurantAiButton
                    onClick={handleAiImageEdit}
                    size="md"
                    disabled={images.length === 0}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddUrlImage())
                      }
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      className="px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold hover:bg-[#e85b27] transition cursor-pointer"
                    >
                      + Add Image
                    </button>
                  </div>

                  {/* 1-Click Auto Fill Demo Photos */}
                  <button
                    type="button"
                    onClick={handleAutoFillCategoryPhotos}
                    className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-orange-200"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#FF6B35]" />
                    <span>Auto-load 4 High-Res {category} Photos (Demo)</span>
                  </button>

                  {/* AI Image Editing Entry Point */}
                  <RestaurantAiButton
                    onClick={handleAiImageEdit}
                    size="sm"
                    disabled={images.length === 0}
                  />
                </div>
              )}

              {/* Uploaded Gallery Grid */}
              {images.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{images.length} Photos in Gallery</span>
                    </span>
                    <span className="text-[10px] text-orange-500 font-semibold">
                      1st Photo is Primary Cover
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-2xl overflow-hidden border-2 aspect-square group bg-gray-100 shadow-xs cursor-pointer ${
                          idx === 0
                            ? "border-[#FF6B35] ring-2 ring-orange-500/20"
                            : idx === activePreviewIndex
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-gray-200"
                        }`}
                        onClick={() => setActivePreviewIndex(idx)}
                      >
                        <img
                          src={imgUrl}
                          alt={`Uploaded ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-[#FF6B35] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs z-10">
                            Cover
                          </span>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsCoverImage(idx);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white text-gray-900 text-[9px] font-bold hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx);
                            }}
                            className="p-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-amber-800 text-xs flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      No photos added yet. Select photos or use Auto-load
                      button.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 🌟 3. LIVE INTERACTIVE CUSTOMER PREVIEW CARD */}
            <div className="bg-gradient-to-br from-white to-orange-50/40 rounded-3xl border border-orange-200/80 shadow-md p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <Eye className="w-4 h-4 text-[#FF6B35]" />
                  <span>Live Customer Card & Gallery Preview</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6B35] text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  Live View
                </span>
              </div>

              {/* Preview Content */}
              <div className="space-y-4">
                {/* Spotlight Main Photo */}
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900 shadow-inner group">
                  {images.length > 0 ? (
                    <img
                      src={images[activePreviewIndex] || images[0]}
                      alt="Spotlight Preview"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800/80 p-6 text-center gap-2">
                      <ImageIcon className="w-10 h-10 text-gray-500 animate-pulse" />
                      <span className="text-xs font-bold text-gray-300">
                        Add images above to see live preview
                      </span>
                    </div>
                  )}

                  {/* Badges on Top of Photo */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                      {category}
                    </span>
                    {commonData.discountPrice &&
                      Number(commonData.discountPrice) <
                        Number(commonData.price) && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                          {Math.round(
                            ((Number(commonData.price) -
                              Number(commonData.discountPrice)) /
                              Number(commonData.price)) *
                              100,
                          )}
                          % OFF
                        </span>
                      )}
                  </div>

                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm ${
                        commonData.status === "available"
                          ? "bg-emerald-500/90 text-white"
                          : "bg-rose-500/90 text-white"
                      }`}
                    >
                      {commonData.status === "available"
                        ? "● In Stock"
                        : "● Out of Stock"}
                    </span>
                  </div>

                  {images.length > 1 && (
                    <div className="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Photo {activePreviewIndex + 1} of {images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnails Swapping Row in Preview */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((thumbUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                          activePreviewIndex === idx
                            ? "border-[#FF6B35] ring-2 ring-orange-500/30 scale-105"
                            : "border-gray-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={thumbUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Dish Info in Preview */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-gray-900">
                        {commonData.name || "Delicious Dish Name"}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {commonData.description ||
                          "Freshly cooked with premium ingredients..."}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {commonData.discountPrice ? (
                        <>
                          <span className="text-base font-black text-[#FF6B35]">
                            ${Number(commonData.discountPrice).toFixed(2)}
                          </span>
                          <span className="block text-[11px] text-gray-400 line-through">
                            ${Number(commonData.price || 0).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-black text-gray-900">
                          ${Number(commonData.price || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Specifications & Dietary Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(dynamicData).map(([k, v]) =>
                      v ? (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-lg bg-orange-100/70 text-[#FF6B35] text-[10px] font-bold"
                        >
                          {v}
                        </span>
                      ) : null,
                    )}
                    {commonData.isVegetarian && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> Veg
                      </span>
                    )}
                    {commonData.isSpicy && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Spicy
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 SUBMIT & RESET FOOTER */}
        <div className="pt-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || uploading}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full sm:w-auto px-9 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-orange-500 to-amber-500 text-white text-sm font-black flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Dish to Menu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Publish &quot;{commonData.name || category}&quot; (
                  {images.length} Photos)
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
