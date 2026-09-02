"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  UtensilsCrossed,
  Store,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  RotateCcw,
  Search,
  ChevronDown,
  Eye,
  Edit3,
  Percent,
  Trash2,
  CheckCircle2,
  CheckCircle,
  XCircle,
  Flame,
  Leaf,
  DollarSign,
  Tag,
  Image as ImageIcon,
  Check,
  X,
  ExternalLink,
  Layers,
  Pizza,
  Soup,
  Coffee,
  IceCream,
  Drumstick,
  UploadCloud,
  Zap,
  Sliders,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  getMyRestaurantProfile,
  getRestaurantMenuItems,
  IRestaurant,
} from "@/lib/api/restaurant";
import {
  updateFoodItemAction,
  toggleFoodItemAvailabilityAction,
  deleteFoodItemAction,
} from "@/lib/actions/restaurant";
import { IMenuItem } from "@/types/restaurant";

type CategoryType =
  | "Pizza"
  | "Burger"
  | "Biryani"
  | "Pasta"
  | "BBQ & Grill"
  | "Desserts"
  | "Drinks"
  | "General"
  | string;

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

export default function RestaurantMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; email?: string; name?: string; role?: string }
    | undefined;

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [items, setItems] = useState<IMenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "available" | "unavailable">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "discount">("newest");

  // View Modal state
  const [viewItem, setViewItem] = useState<IMenuItem | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState(0);

  // Comprehensive Edit Modal state (Full AddFoodForm clone)
  const [editItem, setEditItem] = useState<IMenuItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    price: "",
    discountPrice: "",
    category: "Pizza" as CategoryType,
    status: "available" as "available" | "unavailable",
    description: "",
    ingredients: "",
    tags: "",
    isVegetarian: false,
    isSpicy: false,
  });
  const [editDynamicData, setEditDynamicData] = useState<Record<string, string>>({});
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editActivePreviewIndex, setEditActivePreviewIndex] = useState<number>(0);
  const [editImageInputMode, setEditImageInputMode] = useState<"upload" | "url">("upload");
  const [editImageUrlInput, setEditImageUrlInput] = useState("");
  const [editUploading, setEditUploading] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Quick Offer Modal state
  const [offerItem, setOfferItem] = useState<IMenuItem | null>(null);
  const [offerDiscountPrice, setOfferDiscountPrice] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Delete Modal state
  const [deleteItem, setDeleteItem] = useState<IMenuItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Status updating state per item
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  /* ---------------------------------------------------------- */
  /* Resolve logged-in owner's restaurant profile               */
  /* ---------------------------------------------------------- */
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
          // ignore cache
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

  /* ---------------------------------------------------------- */
  /* Fetch menu items whenever the resolved restaurant changes  */
  /* ---------------------------------------------------------- */
  const restaurantId = restaurant?._id || restaurant?.id || "";

  const loadItems = async () => {
    if (!restaurantId) return;
    setErrorMsg(null);
    setItemsLoading(true);
    try {
      const res = await getRestaurantMenuItems(restaurantId);
      if (res.success) {
        setItems(res.data || []);
      } else {
        setErrorMsg(res.message || "Failed to load your menu items.");
        setItems([]);
      }
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [restaurantId]);

  /* ---------------------------------------------------------- */
  /* Notification Toast Auto-dismiss                            */
  /* ---------------------------------------------------------- */
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /* ---------------------------------------------------------- */
  /* Toggle Availability Handler (In Stock / Out of Stock)       */
  /* ---------------------------------------------------------- */
  const handleToggleAvailability = async (item: IMenuItem, newStatus: boolean) => {
    const itemId = item._id || item.id || "";
    if (!itemId) return;

    setStatusUpdatingId(itemId);

    // Optimistic UI Update
    setItems((prev) =>
      prev.map((it) => {
        const id = it._id || it.id;
        if (id === itemId) {
          return {
            ...it,
            isAvailable: newStatus,
            status: newStatus ? "available" : "unavailable",
          };
        }
        return it;
      })
    );

    try {
      const res = await toggleFoodItemAvailabilityAction(itemId, newStatus);
      if (res.success) {
        setSuccessMsg(
          `✓ "${item.name}" is now ${newStatus ? "Available (In Stock)" : "Unavailable (Out of Stock)"}!`
        );
      } else {
        // Revert on error
        setItems((prev) =>
          prev.map((it) => {
            const id = it._id || it.id;
            if (id === itemId) {
              return {
                ...it,
                isAvailable: !newStatus,
                status: !newStatus ? "available" : "unavailable",
              };
            }
            return it;
          })
        );
        setErrorMsg(res.message || "Failed to update item availability.");
      }
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((it) => {
          const id = it._id || it.id;
          if (id === itemId) {
            return {
              ...it,
              isAvailable: !newStatus,
              status: !newStatus ? "available" : "unavailable",
            };
          }
          return it;
        })
      );
      setErrorMsg("An unexpected error occurred while toggling status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /* ---------------------------------------------------------- */
  /* Open Full Edit Modal (Loads all fields)                    */
  /* ---------------------------------------------------------- */
  const openEditModal = (item: IMenuItem) => {
    setEditItem(item);
    
    // Resolve images
    let resolvedImages: string[] = [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      resolvedImages = [...item.images];
    } else if (item.image) {
      resolvedImages = [item.image];
    }

    const itemCategory = (item.category || "Pizza") as CategoryType;

    setEditFormData({
      name: item.name || "",
      price: String(item.price || ""),
      discountPrice: item.discountPrice !== undefined && item.discountPrice !== null ? String(item.discountPrice) : "",
      category: itemCategory,
      status: item.isAvailable === false || item.status === "unavailable" ? "unavailable" : "available",
      description: item.description || "",
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(", ") : (typeof item.ingredients === "string" ? item.ingredients : ""),
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : (typeof item.tags === "string" ? item.tags : ""),
      isVegetarian: Boolean(item.isVegetarian),
      isSpicy: Boolean(item.isSpicy),
    });

    let initialDynamic: Record<string, string> = {};
    if (typeof item.categoryDetails === "object" && item.categoryDetails !== null) {
      initialDynamic = { ...item.categoryDetails };
    } else {
      switch (itemCategory) {
        case "Pizza":
          initialDynamic = {
            crustType: "Thin Italian Crust",
            pizzaSize: "12 Inch (Medium)",
            sauceBase: "San Marzano Tomato Marinara",
            cheeseType: "Mozzarella & Parmesan Blend",
            sliceCount: "6 Slices",
          };
          break;
        case "Burger":
          initialDynamic = {
            pattyType: "Double Angus Beef",
            pattyCount: "2x Patties (300g)",
            bunType: "Toasted Golden Brioche Bun",
            cheeseType: "Melted Wisconsin Cheddar",
            comboOptions: "Burger + Seasoned Waffle Fries",
          };
          break;
        case "Biryani":
          initialDynamic = {
            meatType: "Mutton Kacchi (Dum Cooked)",
            portionSize: "Duo Feast (1:2) - 2 Persons",
            riceType: "Shahi Basmati Rice",
            complimentarySides: "Chilled Mint Borhani + Salad",
          };
          break;
        case "Pasta":
          initialDynamic = {
            pastaShape: "Fettuccine Ribbons",
            sauceType: "Creamy Garlic Parmesan Alfredo",
            protein: "Seasoned Grilled Chicken",
            garlicBreadIncluded: "Yes (2 Slices Cheesy Garlic Bread)",
          };
          break;
        case "BBQ & Grill":
          initialDynamic = {
            cutType: "Charcoal Chicken Quarter (Leg/Breast)",
            spiceLevel: "Peri-Peri Spicy Hot 🔥",
            marinadeStyle: "Smoky Charcoal Grill",
            servingSide: "Warm Garlic Butter Naan + Mint Dip",
          };
          break;
        case "Desserts":
          initialDynamic = {
            servingTemp: "Warm & Gooey with Cold Gelato",
            sweetnessLevel: "Regular Sweetness",
            iceCreamScoop: "Vanilla Bean Gelato Scoop Included",
            dietOption: "Regular",
          };
          break;
        case "Drinks":
          initialDynamic = {
            cupSize: "Large Cup (500ml)",
            iceLevel: "Normal Crushed Ice",
            sugarLevel: "Regular 100% Sweetness",
            beverageType: "Fresh Fruit Juice / Mocktail",
          };
          break;
        default:
          initialDynamic = {};
      }
    }

    setEditDynamicData(initialDynamic);
    setEditImages(resolvedImages);
    setEditActivePreviewIndex(0);
    setEditImageUrlInput("");
    setEditImageInputMode("upload");
  };

  // Helper: Read and compress image locally
  const compressAndReadFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (typeof window === "undefined") return resolve(rawResult || "");
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

  // Edit Modal Multi-Image Upload (Guaranteed 100% Reliable via /api/upload + Local Fallback)
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    const files = Array.from(rawFiles);

    if (e.target) e.target.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";

    setEditUploading(true);
    setEditUploadProgress(`Processing ${files.length} photo(s)...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.urls) && json.urls.length > 0) {
        setEditImages((prev) => [...prev, ...json.urls]);
        setEditActivePreviewIndex(0);
      } else {
        const fallbackUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await compressAndReadFile(files[i]);
          if (url) fallbackUrls.push(url);
        }
        if (fallbackUrls.length > 0) {
          setEditImages((prev) => [...prev, ...fallbackUrls]);
          setEditActivePreviewIndex(0);
        }
      }
    } catch {
      const fallbackUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await compressAndReadFile(files[i]);
        if (url) fallbackUrls.push(url);
      }
      if (fallbackUrls.length > 0) {
        setEditImages((prev) => [...prev, ...fallbackUrls]);
        setEditActivePreviewIndex(0);
      }
    } finally {
      setEditUploading(false);
      setEditUploadProgress("");
    }
  };

  // Drag & drop files handler in Edit Modal
  const handleEditDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editUploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (droppedFiles.length === 0) return;

    const dataTransfer = new DataTransfer();
    droppedFiles.forEach((file) => dataTransfer.items.add(file));
    if (editFileInputRef.current) {
      editFileInputRef.current.files = dataTransfer.files;
      const event = {
        target: editFileInputRef.current,
      } as React.ChangeEvent<HTMLInputElement>;
      handleEditImageUpload(event);
    }
  };

  // Add Direct URL in Edit Modal
  const handleEditAddUrlImage = () => {
    const url = editImageUrlInput.trim();
    if (url) {
      const urlsToAdd = url.split(",").map((u) => u.trim()).filter(Boolean);
      setEditImages((prev) => [...prev, ...urlsToAdd]);
      setEditActivePreviewIndex(0);
      setEditImageUrlInput("");
    }
  };

  // Remove image in Edit Modal
  const handleEditRemoveImage = (idxToRemove: number) => {
    setEditImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== idxToRemove);
      if (editActivePreviewIndex >= filtered.length) {
        setEditActivePreviewIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Set as Cover in Edit Modal
  const handleEditSetCoverImage = (idxToCover: number) => {
    setEditImages((prev) => {
      const chosen = prev[idxToCover];
      const rest = prev.filter((_, idx) => idx !== idxToCover);
      return [chosen, ...rest];
    });
    setEditActivePreviewIndex(0);
  };

  // Auto-fill category preset demo photos in edit modal
  const handleEditAutoFillCategoryPhotos = () => {
    const cat = editFormData.category || "Pizza";
    const samples = CATEGORY_SAMPLE_PHOTOS[cat] || CATEGORY_SAMPLE_PHOTOS.Pizza;
    setEditImages(samples);
    setEditActivePreviewIndex(0);
  };

  // Handle Edit Category Change
  const handleEditCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CategoryType;
    setEditFormData((p) => ({ ...p, category: selected }));

    // Set dynamic category defaults
    switch (selected) {
      case "Pizza":
        setEditDynamicData({
          crustType: "Thin Italian Crust",
          pizzaSize: "12 Inch (Medium)",
          sauceBase: "San Marzano Tomato Marinara",
          cheeseType: "Mozzarella & Parmesan Blend",
          sliceCount: "6 Slices",
        });
        break;
      case "Burger":
        setEditDynamicData({
          pattyType: "Double Angus Beef",
          pattyCount: "2x Patties (300g)",
          bunType: "Toasted Golden Brioche Bun",
          cheeseType: "Melted Wisconsin Cheddar",
          comboOptions: "Burger + Seasoned Waffle Fries",
        });
        break;
      case "Biryani":
        setEditDynamicData({
          meatType: "Mutton Kacchi (Dum Cooked)",
          portionSize: "Duo Feast (1:2) - 2 Persons",
          riceType: "Shahi Basmati Rice",
          complimentarySides: "Chilled Mint Borhani + Salad",
        });
        break;
      case "Pasta":
        setEditDynamicData({
          pastaShape: "Fettuccine Ribbons",
          sauceType: "Creamy Garlic Parmesan Alfredo",
          protein: "Seasoned Grilled Chicken",
          garlicBreadIncluded: "Yes (2 Slices Cheesy Garlic Bread)",
        });
        break;
      case "BBQ & Grill":
        setEditDynamicData({
          cutType: "Charcoal Chicken Quarter (Leg/Breast)",
          spiceLevel: "Peri-Peri Spicy Hot 🔥",
          marinadeStyle: "Smoky Charcoal Grill",
          servingSide: "Warm Garlic Butter Naan + Mint Dip",
        });
        break;
      case "Desserts":
        setEditDynamicData({
          servingTemp: "Warm & Gooey with Cold Gelato",
          sweetnessLevel: "Regular Sweetness",
          iceCreamScoop: "Vanilla Bean Gelato Scoop Included",
          dietOption: "Regular",
        });
        break;
      case "Drinks":
        setEditDynamicData({
          cupSize: "Large Cup (500ml)",
          iceLevel: "Normal Crushed Ice",
          sugarLevel: "Regular 100% Sweetness",
          beverageType: "Fresh Fruit Juice / Mocktail",
        });
        break;
      default:
        setEditDynamicData({});
        break;
    }
  };

  // Render Dynamic Category Specs in Edit Modal (Full 100% clone of AddFoodForm)
  const renderEditDynamicFields = () => {
    const cat = editFormData.category;

    switch (cat) {
      case "Pizza":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Crust Type</label>
              <select
                value={editDynamicData.crustType || "Thin Italian Crust"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, crustType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Thin Italian Crust">Thin Italian Crust</option>
                <option value="Pan Crust">Fluffy Pan Crust</option>
                <option value="Cheese Stuffed Crust">Cheese Stuffed Crust (+Cheese)</option>
                <option value="Chicago Deep Dish">Chicago Deep Dish</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Pizza Size (Inches / Slices)</label>
              <select
                value={editDynamicData.pizzaSize || "12 Inch (Medium)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, pizzaSize: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="8 Inch (Personal - 4 Slices)">8 Inch (Personal - 4 Slices)</option>
                <option value="12 Inch (Medium - 6 Slices)">12 Inch (Medium - 6 Slices)</option>
                <option value="16 Inch (Large - 8 Slices)">16 Inch (Large - 8 Slices)</option>
                <option value="20 Inch (Party Feast - 12 Slices)">20 Inch (Party Feast - 12 Slices)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Sauce Base</label>
              <select
                value={editDynamicData.sauceBase || "San Marzano Tomato Marinara"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, sauceBase: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="San Marzano Tomato Marinara">San Marzano Tomato Marinara</option>
                <option value="Spicy BBQ Sauce">Spicy BBQ Sauce</option>
                <option value="White Garlic Parmesan Cream">White Garlic Parmesan Cream</option>
                <option value="Basil Pesto Herb Sauce">Basil Pesto Herb Sauce</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Cheese & Topping Blend</label>
              <input
                type="text"
                value={editDynamicData.cheeseType || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, cheeseType: e.target.value }))}
                placeholder="e.g. 100% Mozzarella, Pepperoni, Fresh Basil"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Slice Count</label>
              <select
                value={editDynamicData.sliceCount || "6 Slices"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, sliceCount: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="4 Slices">4 Slices</option>
                <option value="6 Slices">6 Slices</option>
                <option value="8 Slices">8 Slices</option>
                <option value="12 Slices">12 Slices</option>
              </select>
            </div>
          </>
        );

      case "Burger":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Patty Style & Meat</label>
              <select
                value={editDynamicData.pattyType || "Double Angus Beef"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, pattyType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Double Angus Beef">Double Angus Beef</option>
                <option value="Single Angus Beef">Single Angus Beef</option>
                <option value="Crispy Golden Fried Chicken">Crispy Golden Fried Chicken</option>
                <option value="Grilled Chicken Breast">Grilled Chicken Breast</option>
                <option value="Smash Beef Patty">Smash Beef Patty</option>
                <option value="Plant-based Veggie Patty">Plant-based Veggie Patty</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Patty Count / Serving</label>
              <select
                value={editDynamicData.pattyCount || "2x Patties (300g)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, pattyCount: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="1x Single Patty (150g)">1x Single Patty (150g)</option>
                <option value="2x Double Stack (300g)">2x Double Stack (300g)</option>
                <option value="3x Triple Monster (450g)">3x Triple Monster (450g)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Bun Type</label>
              <select
                value={editDynamicData.bunType || "Toasted Golden Brioche Bun"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, bunType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Toasted Golden Brioche Bun">Toasted Golden Brioche Bun</option>
                <option value="Sesame Seed Bun">Sesame Seed Bun</option>
                <option value="Soft Potato Bun">Soft Potato Bun</option>
                <option value="Gluten Free Bun">Gluten Free Bun</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Cheese & Melt</label>
              <input
                type="text"
                value={editDynamicData.cheeseType || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, cheeseType: e.target.value }))}
                placeholder="e.g. Melted Wisconsin Cheddar"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">Combo & Add-ons</label>
              <input
                type="text"
                value={editDynamicData.comboOptions || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, comboOptions: e.target.value }))}
                placeholder="e.g. Served with Seasoned Waffle Fries & Iced Soda"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Biryani":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Meat & Biryani Recipe</label>
              <select
                value={editDynamicData.meatType || "Mutton Kacchi (Dum Cooked)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, meatType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Mutton Kacchi (Dum Cooked)">Traditional Mutton Kacchi (Dum Cooked)</option>
                <option value="Chicken Roast Morog Polao">Shahi Chicken Roast & Morog Polao</option>
                <option value="Old Dhaka Beef Tehari">Old Dhaka Mustard Beef Tehari</option>
                <option value="Hydrabadi Dum Biryani">Hydrabadi Dum Biryani</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Portion / Platter Size</label>
              <select
                value={editDynamicData.portionSize || "Duo Feast (1:2) - 2 Persons"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, portionSize: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Single Serving (1:1) - 1 Person">Single Serving (1:1) - 1 Person</option>
                <option value="Duo Feast (1:2) - 2 Persons">Duo Feast (1:2) - 2 Persons</option>
                <option value="Family Feast Tray (1:4) - 4-5 Persons">Family Feast Tray (1:4) - 4-5 Persons</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Rice Type</label>
              <select
                value={editDynamicData.riceType || "Shahi Basmati Long Grain"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, riceType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Shahi Basmati Long Grain">Shahi Basmati Long Grain</option>
                <option value="Aromatic Chinigura Rice">Aromatic Chinigura Rice</option>
                <option value="Kalijira Fragrant Rice">Kalijira Fragrant Rice</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Complimentary Sides</label>
              <input
                type="text"
                value={editDynamicData.complimentarySides || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, complimentarySides: e.target.value }))}
                placeholder="e.g. Borhani (250ml) + Shahi Egg + Cucumber Salad"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Pasta":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Pasta Shape</label>
              <select
                value={editDynamicData.pastaShape || "Fettuccine Ribbons"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, pastaShape: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Fettuccine Ribbons">Fettuccine Ribbons</option>
                <option value="Penne Rigate">Penne Rigate</option>
                <option value="Classic Spaghetti">Classic Spaghetti</option>
                <option value="Fusilli Spirals">Fusilli Spirals</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Sauce Choice</label>
              <select
                value={editDynamicData.sauceType || "Creamy Garlic Parmesan Alfredo"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, sauceType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Creamy Garlic Parmesan Alfredo">Creamy Garlic Parmesan Alfredo</option>
                <option value="Spicy Tomato Arrabbiata">Spicy Tomato Arrabbiata</option>
                <option value="Pink Rosa Sauce (Cream + Tomato)">Pink Rosa Sauce (Cream + Tomato)</option>
                <option value="Basil Pine Nut Pesto">Basil Pine Nut Pesto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Protein Choice</label>
              <input
                type="text"
                value={editDynamicData.protein || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, protein: e.target.value }))}
                placeholder="e.g. Sliced Grilled Chicken Breast / Garlic Shrimp"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Garlic Bread Included</label>
              <select
                value={editDynamicData.garlicBreadIncluded || "Yes (2 Slices Cheesy Garlic Bread)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, garlicBreadIncluded: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Yes (2 Slices Cheesy Garlic Bread)">Yes (2 Slices Cheesy Garlic Bread)</option>
                <option value="No (Pasta Bowl Only)">No (Pasta Bowl Only)</option>
              </select>
            </div>
          </>
        );

      case "BBQ & Grill":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Cut & Meat Type</label>
              <select
                value={editDynamicData.cutType || "Charcoal Chicken Quarter (Leg/Breast)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, cutType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Charcoal Chicken Quarter (Leg/Breast)">Charcoal Chicken Quarter (Leg/Breast)</option>
                <option value="Boneless Chicken Tikka Boti">Boneless Chicken Tikka Boti</option>
                <option value="Smoked Beef Short Ribs">Smoked Beef Short Ribs</option>
                <option value="Mutton Seekh Kebab Skewers">Mutton Seekh Kebab Skewers</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Marinade & Spice Level</label>
              <select
                value={editDynamicData.spiceLevel || "Peri-Peri Spicy Hot 🔥"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, spiceLevel: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Peri-Peri Spicy Hot 🔥">Peri-Peri Spicy Hot 🔥</option>
                <option value="Smoky Medium BBQ Glaze">Smoky Medium BBQ Glaze</option>
                <option value="Creamy Reshmi Malai (Mild)">Creamy Reshmi Malai (Mild)</option>
                <option value="Naga Charcoal Fire 🔥🔥">Naga Charcoal Fire 🔥🔥</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Marinade Style</label>
              <select
                value={editDynamicData.marinadeStyle || "Smoky Charcoal Grill"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, marinadeStyle: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Smoky Charcoal Grill">Smoky Charcoal Grill</option>
                <option value="Tandoori Tikka Spices">Tandoori Tikka Spices</option>
                <option value="Sweet & Tangy BBQ Glaze">Sweet & Tangy BBQ Glaze</option>
                <option value="Garlic Herb Butter Basted">Garlic Herb Butter Basted</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Serving Side</label>
              <input
                type="text"
                value={editDynamicData.servingSide || ""}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, servingSide: e.target.value }))}
                placeholder="e.g. Hot Garlic Butter Naan + Mint Dip"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              />
            </div>
          </>
        );

      case "Desserts":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Serving Temperature & Style</label>
              <select
                value={editDynamicData.servingTemp || "Warm & Gooey with Cold Gelato"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, servingTemp: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Warm & Gooey with Cold Gelato">Warm & Gooey with Cold Gelato</option>
                <option value="Chilled & Creamy">Chilled & Creamy (Refrigerator)</option>
                <option value="Freshly Baked Room Temp">Freshly Baked Room Temp</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Sweetness Level</label>
              <select
                value={editDynamicData.sweetnessLevel || "Regular Sweetness"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, sweetnessLevel: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Regular Sweetness">Regular Sweetness</option>
                <option value="Less Sugar (50%)">Less Sugar (50%)</option>
                <option value="Honey Sweetened">Honey Sweetened</option>
                <option value="Sugar Free (Stevia)">Sugar Free (Stevia)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Gelato / Ice Cream Scoop</label>
              <select
                value={editDynamicData.iceCreamScoop || "Vanilla Bean Gelato Scoop Included"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, iceCreamScoop: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Vanilla Bean Gelato Scoop Included">Vanilla Bean Gelato Scoop Included</option>
                <option value="Chocolate Fudge Scoop Included">Chocolate Fudge Scoop Included</option>
                <option value="No Ice Cream (Pastry/Cake Only)">No Ice Cream (Pastry/Cake Only)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Dietary / Health Option</label>
              <select
                value={editDynamicData.dietOption || "Regular"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, dietOption: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Regular">Regular</option>
                <option value="Gluten-Free">Gluten-Free</option>
                <option value="Vegan Friendly">Vegan Friendly</option>
                <option value="Keto Friendly">Keto Friendly</option>
              </select>
            </div>
          </>
        );

      case "Drinks":
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Cup Size / Volume</label>
              <select
                value={editDynamicData.cupSize || "Large Cup (500ml)"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, cupSize: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Regular Cup (350ml)">Regular Cup (350ml)</option>
                <option value="Large Cup (500ml)">Large Cup (500ml)</option>
                <option value="Sharing Pitcher (1.5L)">Sharing Pitcher (1.5L)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Ice Level</label>
              <select
                value={editDynamicData.iceLevel || "Normal Crushed Ice"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, iceLevel: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="No Ice (Room Temp)">No Ice (Room Temp)</option>
                <option value="Less Ice">Less Ice</option>
                <option value="Normal Crushed Ice">Normal Crushed Ice</option>
                <option value="Extra Chilled Ice">Extra Chilled Ice</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Sugar Level</label>
              <select
                value={editDynamicData.sugarLevel || "Regular 100% Sweetness"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, sugarLevel: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Zero Sugar (0%)">Zero Sugar (0%)</option>
                <option value="Less Sweet (50%)">Less Sweet (50%)</option>
                <option value="Regular 100% Sweetness">Regular 100% Sweetness</option>
                <option value="Extra Sweet (120%)">Extra Sweet (120%)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Beverage Type</label>
              <select
                value={editDynamicData.beverageType || "Fresh Fruit Juice / Mocktail"}
                onChange={(e) => setEditDynamicData((p) => ({ ...p, beverageType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none"
              >
                <option value="Fresh Fruit Juice / Mocktail">Fresh Fruit Juice / Mocktail</option>
                <option value="Carbonated Soda / Fizzy Drink">Carbonated Soda / Fizzy Drink</option>
                <option value="Specialty Coffee / Frappe">Specialty Coffee / Frappe</option>
                <option value="Milkshake / Smoothie">Milkshake / Smoothie</option>
                <option value="Hot Tea / Herbal Brew">Hot Tea / Herbal Brew</option>
              </select>
            </div>
          </>
        );

      default:
        return (
          <div className="col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center">
            Standard dish specification fields
          </div>
        );
    }
  };

  // Submit Full Edit Modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const itemId = editItem._id || editItem.id || "";
    const priceNum = Number(editFormData.price);
    if (!editFormData.name.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Please enter a valid Name and Price greater than 0.");
      return;
    }

    const discountNum = editFormData.discountPrice.trim()
      ? Number(editFormData.discountPrice)
      : undefined;

    if (
      discountNum !== undefined &&
      (!Number.isFinite(discountNum) || discountNum >= priceNum || discountNum <= 0)
    ) {
      setErrorMsg("Discount price must be greater than 0 and less than regular price.");
      return;
    }

    const ingredientsArray = editFormData.ingredients
      ? editFormData.ingredients.split(",").map((i) => i.trim()).filter(Boolean)
      : [];

    const tagsArray = editFormData.tags
      ? editFormData.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [editFormData.category];

    const isAvail = editFormData.status === "available";

    setEditSubmitting(true);
    try {
      const res = await updateFoodItemAction(itemId, {
        name: editFormData.name.trim(),
        price: priceNum,
        discountPrice: discountNum,
        category: editFormData.category,
        description: editFormData.description.trim(),
        status: editFormData.status,
        isAvailable: isAvail,
        isVegetarian: editFormData.isVegetarian,
        isSpicy: editFormData.isSpicy,
        image: editImages[0] || "",
        images: editImages,
        ingredients: ingredientsArray,
        tags: [
          editFormData.category,
          editFormData.isVegetarian ? "Vegetarian" : "",
          editFormData.isSpicy ? "Spicy" : "",
          ...tagsArray,
        ].filter(Boolean),
        categoryDetails: editDynamicData,
      });

      if (res.success) {
        setSuccessMsg(`✓ "${editFormData.name}" updated successfully!`);
        setEditItem(null);
        loadItems();
      } else {
        setErrorMsg(res.message || "Failed to update food item.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error updating item.");
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ---------------------------------------------------------- */
  /* Quick Offer / Discount Modal Handlers                      */
  /* ---------------------------------------------------------- */
  const openOfferModal = (item: IMenuItem) => {
    setOfferItem(item);
    setOfferDiscountPrice(item.discountPrice ? String(item.discountPrice) : "");
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerItem) return;

    const itemId = offerItem._id || offerItem.id || "";
    const price = offerItem.price || 0;
    const discountNum = offerDiscountPrice.trim()
      ? Number(offerDiscountPrice)
      : null;

    if (
      discountNum !== null &&
      (!Number.isFinite(discountNum) || discountNum >= price || discountNum <= 0)
    ) {
      setErrorMsg(`Discount price must be greater than 0 and less than regular price (Tk ${price}).`);
      return;
    }

    setOfferSubmitting(true);
    try {
      const res = await updateFoodItemAction(itemId, {
        discountPrice: discountNum !== null ? discountNum : undefined,
      });

      if (res.success) {
        setSuccessMsg(
          discountNum
            ? `🎉 Special offer set at Tk ${discountNum.toFixed(2)} for "${offerItem.name}"!`
            : `✓ Special discount removed for "${offerItem.name}".`
        );
        setOfferItem(null);
        loadItems();
      } else {
        setErrorMsg(res.message || "Failed to update offer price.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error updating offer.");
    } finally {
      setOfferSubmitting(false);
    }
  };

  /* ---------------------------------------------------------- */
  /* Delete Food Item Handlers                                  */
  /* ---------------------------------------------------------- */
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    const itemId = deleteItem._id || deleteItem.id || "";

    setDeleteSubmitting(true);
    try {
      const res = await deleteFoodItemAction(itemId);
      if (res.success) {
        setSuccessMsg(`✓ "${deleteItem.name}" was permanently removed from menu.`);
        setItems((prev) => prev.filter((it) => (it._id || it.id) !== itemId));
        setDeleteItem(null);
      } else {
        setErrorMsg(res.message || "Failed to delete item.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error deleting item.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  /* ---------------------------------------------------------- */
  /* Category Icons Helper                                      */
  /* ---------------------------------------------------------- */
  const getCategoryIcon = (catName: string) => {
    const lower = (catName || "").toLowerCase();
    if (lower.includes("pizza")) return <Pizza className="w-3.5 h-3.5 text-amber-500" />;
    if (lower.includes("burger")) return <Layers className="w-3.5 h-3.5 text-orange-500" />;
    if (lower.includes("biryani") || lower.includes("rice")) return <Soup className="w-3.5 h-3.5 text-amber-600" />;
    if (lower.includes("pasta")) return <UtensilsCrossed className="w-3.5 h-3.5 text-rose-500" />;
    if (lower.includes("bbq") || lower.includes("grill")) return <Drumstick className="w-3.5 h-3.5 text-red-500" />;
    if (lower.includes("dessert") || lower.includes("cake")) return <IceCream className="w-3.5 h-3.5 text-pink-500" />;
    if (lower.includes("drink") || lower.includes("beverage")) return <Coffee className="w-3.5 h-3.5 text-blue-500" />;
    return <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF6B35]" />;
  };

  /* ---------------------------------------------------------- */
  /* Filtered and Sorted Menu Items                             */
  /* ---------------------------------------------------------- */
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = (item.name || "").toLowerCase().includes(q);
          const matchesCategory = (item.category || "").toLowerCase().includes(q);
          const matchesIngredients = Array.isArray(item.ingredients)
            ? item.ingredients.some((ing) => ing.toLowerCase().includes(q))
            : false;
          if (!matchesName && !matchesCategory && !matchesIngredients) return false;
        }

        // Category filter
        if (selectedCategory !== "all") {
          const itemCat = (item.category || "").toLowerCase();
          if (!itemCat.includes(selectedCategory.toLowerCase())) return false;
        }

        // Availability status filter
        if (selectedStatus === "available" && !item.isAvailable) return false;
        if (selectedStatus === "unavailable" && item.isAvailable) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "discount") {
          const discA = a.discountPrice ? a.price - a.discountPrice : 0;
          const discB = b.discountPrice ? b.price - b.discountPrice : 0;
          return discB - discA;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [items, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Summary Metrics
  const totalCount = items.length;
  const availableCount = items.filter((it) => it.isAvailable).length;
  const offerCount = items.filter(
    (it) => it.discountPrice && Number(it.discountPrice) < Number(it.price)
  ).length;
  const unavailableCount = totalCount - availableCount;

  // Distinct category list
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items]);

  /* ---------------------------------------------------------- */
  /* Loading state                                              */
  /* ---------------------------------------------------------- */
  if (profileLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center py-28 gap-4">
        <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Loading your menu table...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* No restaurant profile                                      */
  /* ---------------------------------------------------------- */
  if (!restaurant) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-10 sm:p-14 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-18 h-18 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35]">
            <Store className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">No Restaurant Profile Found</h2>
          <p className="text-sm text-gray-500 max-w-md">
            You need to create your restaurant profile before viewing and managing your menu items.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/restaurant/create-restaurant")}
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
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Menu Management Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              {restaurant.restaurantName} Menu
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm">
              Manage live dish availability, special discount offers, edit recipe details, and track customer pricing all in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/restaurant/add-food")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-[#FF6B35] font-black text-sm shadow-lg shadow-black/10 hover:bg-orange-50 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Food</span>
          </button>
        </div>
      </div>

      {/* 📊 SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Dishes</span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35]">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">In Stock (Available)</span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">{availableCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Special Offers</span>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-500">{offerCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Out of Stock</span>
            <h3 className="text-2xl sm:text-3xl font-black text-rose-500">{unavailableCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 🔔 NOTIFICATION MESSAGES */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 🔍 FILTER & SEARCH CONTROLS */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dish name, ingredients..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
            
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e: any) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-[#FF6B35] cursor-pointer"
            >
              <option value="all">All Availability Status</option>
              <option value="available">🟢 Available (In Stock)</option>
              <option value="unavailable">🔴 Unavailable (Out of Stock)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-[#FF6B35] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Biggest Discount</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadItems}
              disabled={itemsLoading}
              className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              title="Refresh Menu"
            >
              <RotateCcw className={`w-4 h-4 ${itemsLoading ? "animate-spin text-[#FF6B35]" : ""}`} />
            </button>

          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#FF6B35] text-white shadow-sm shadow-orange-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Categories ({items.length})
          </button>

          {["Pizza", "Burger", "Biryani", "Pasta", "BBQ & Grill", "Desserts", "Drinks"].map((cat) => {
            const count = items.filter((it) => (it.category || "").toLowerCase().includes(cat.toLowerCase())).length;
            if (count === 0 && !distinctCategories.some((c) => c.toLowerCase().includes(cat.toLowerCase()))) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#FF6B35] text-white shadow-sm shadow-orange-500/20"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{cat}</span>
                <span className="text-[10px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* 📋 TABLE: RESTAURANT MENU ITEMS */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        
        {itemsLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin" />
            <p className="text-xs font-bold text-gray-400">Loading menu table...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B35]">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">No Food Items Found</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "No dishes match your active search or filter criteria. Try resetting filters."
                  : "You haven't added any food items yet. Click below to add your first dish."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/restaurant/add-food")}
              className="px-6 py-2.5 rounded-2xl bg-[#FF6B35] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:bg-[#e85b27] transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Dish</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Dish / Food Info</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Price & Offer</th>
                  <th className="py-4 px-4">Availability</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredItems.map((item, idx) => {
                  const itemId = item._id || item.id || `item-${idx}`;
                  const isDiscounted =
                    item.discountPrice && Number(item.discountPrice) < Number(item.price);
                  const discountPercent = isDiscounted
                    ? Math.round(
                        ((Number(item.price) - Number(item.discountPrice)) /
                          Number(item.price)) *
                          100
                      )
                    : 0;

                  const photoCount = Array.isArray(item.images)
                    ? item.images.length
                    : item.image
                    ? 1
                    : 0;

                  return (
                    <tr
                      key={itemId}
                      className="hover:bg-orange-50/20 transition-colors group"
                    >
                      
                      {/* 1. DISH & IMAGE INFO */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3.5">
                          
                          {/* Image with photo count badge */}
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 shadow-xs">
                            {item.image || (item.images && item.images[0]) ? (
                              <img
                                src={item.image || item.images?.[0]}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                            {photoCount > 1 && (
                              <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                {photoCount} 📷
                              </span>
                            )}
                          </div>

                          {/* Title, tags, description */}
                          <div className="space-y-1 max-w-xs sm:max-w-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-gray-900 group-hover:text-[#FF6B35] transition leading-tight">
                                {item.name}
                              </h4>
                              {item.isVegetarian && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                  <Leaf className="w-2.5 h-2.5" /> Veg
                                </span>
                              )}
                              {item.isSpicy && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                                  <Flame className="w-2.5 h-2.5" /> Spicy
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-1">
                              {item.description || "No description provided."}
                            </p>

                            {Array.isArray(item.ingredients) && item.ingredients.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.ingredients.slice(0, 3).map((ing, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.2 rounded"
                                  >
                                    {ing}
                                  </span>
                                ))}
                                {item.ingredients.length > 3 && (
                                  <span className="text-[10px] font-medium text-gray-400">
                                    +{item.ingredients.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </td>

                      {/* 2. CATEGORY */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100 text-xs font-bold text-gray-800">
                          {getCategoryIcon(item.category || "General")}
                          <span>{item.category || "General"}</span>
                        </span>
                      </td>

                      {/* 3. PRICING & OFFER */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {isDiscounted ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-black text-[#FF6B35]">
                                  Tk {Number(item.discountPrice).toFixed(2)}
                                </span>
                                <span className="text-xs font-bold text-gray-400 line-through">
                                  Tk {Number(item.price).toFixed(2)}
                                </span>
                              </div>
                              <span className="inline-block bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded">
                                {discountPercent}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-base font-black text-gray-900">
                              Tk {Number(item.price || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. AVAILABILITY DROPDOWN SELECTOR */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={item.isAvailable ? "available" : "unavailable"}
                            disabled={statusUpdatingId === itemId}
                            onChange={(e) =>
                              handleToggleAvailability(item, e.target.value === "available")
                            }
                            className={`appearance-none pl-7 pr-7 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer outline-none ${
                              item.isAvailable
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                : "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"
                            } ${statusUpdatingId === itemId ? "opacity-50 cursor-wait" : ""}`}
                          >
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                          </select>

                          {/* Status Dot */}
                          <span
                            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                              item.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />

                          {/* Dropdown Chevron */}
                          <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 5. ACTIONS BUTTONS */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          
                          {/* View Modal CTA */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewItem(item);
                              setViewImageIndex(0);
                            }}
                            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:text-[#FF6B35] hover:bg-orange-50 transition cursor-pointer"
                            title="View Dish Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Modal CTA */}
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                            title="Edit Food Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Offer / Discount CTA */}
                          <button
                            type="button"
                            onClick={() => openOfferModal(item)}
                            className={`p-2 rounded-xl transition cursor-pointer ${
                              isDiscounted
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                            }`}
                            title="Set Discount Offer"
                          >
                            <Percent className="w-4 h-4" />
                          </button>

                          {/* Delete CTA */}
                          <button
                            type="button"
                            onClick={() => setDeleteItem(item)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="Delete Food Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ======================================================= */}
      {/* 👁️ 1. VIEW DISH DETAILS MODAL                            */}
      {/* ======================================================= */}
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />
                <span>Dish Details</span>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photos Carousel */}
            {viewItem.images && viewItem.images.length > 0 ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900 shadow-inner">
                  <img
                    src={viewItem.images[viewImageIndex] || viewItem.image}
                    alt={viewItem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Photo {viewImageIndex + 1} of {viewItem.images.length}
                  </div>
                </div>

                {viewItem.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {viewItem.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setViewImageIndex(idx)}
                        className={`w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                          viewImageIndex === idx
                            ? "border-[#FF6B35] ring-2 ring-orange-500/20"
                            : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : viewItem.image ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                <img src={viewItem.image} alt={viewItem.name} className="w-full h-full object-cover" />
              </div>
            ) : null}

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{viewItem.name}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] mt-0.5">
                    {getCategoryIcon(viewItem.category || "General")}
                    <span>{viewItem.category}</span>
                  </span>
                </div>
                <div className="text-right">
                  {viewItem.discountPrice ? (
                    <>
                      <span className="text-xl font-black text-[#FF6B35]">
                        Tk {Number(viewItem.discountPrice).toFixed(2)}
                      </span>
                      <span className="block text-xs text-gray-400 line-through">
                        Tk {Number(viewItem.price).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-black text-gray-900">
                      Tk {Number(viewItem.price || 0).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {viewItem.description || "No detailed description provided."}
              </p>

              {/* Dynamic Specs */}
              {viewItem.categoryDetails && Object.keys(viewItem.categoryDetails).length > 0 && (
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Recipe Specifications
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(viewItem.categoryDetails).map(([k, v]) =>
                      v ? (
                        <span
                          key={k}
                          className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-gray-800 text-[11px] font-bold shadow-2xs"
                        >
                          {String(v)}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push(`/restaurants/${viewItem._id || viewItem.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B35] hover:underline cursor-pointer"
              >
                <span>Open Public Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* ✏️ 2. FULL EDIT FOOD STUDIO MODAL (ALL FIELDS)           */}
      {/* ======================================================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-150 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#FF6B35] flex items-center justify-center shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>Edit Dish & Recipe Details</span>
                    <span className="text-xs font-bold text-[#FF6B35] bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-lg">
                      {editFormData.category}
                    </span>
                  </h3>
                  <p className="text-xs font-medium text-gray-400">
                    Modify pricing, availability status, category specifications & image gallery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-2 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* 👈 LEFT COLUMN: GENERAL INFO & PRICING */}
                <div className="space-y-5">
                  
                  <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-900 border-b border-gray-100 pb-2.5">
                      <UtensilsCrossed className="w-4 h-4 text-[#FF6B35]" />
                      <span>General Dish Details</span>
                    </div>

                    {/* Dish Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Dish Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Truffle Pepperoni Gourmet Pizza"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Category Menu Section <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editFormData.category}
                        onChange={handleEditCategoryChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                      >
                        <option value="Pizza">🍕 Pizza & Calzones</option>
                        <option value="Burger">🍔 Burgers & Sandwiches</option>
                        <option value="Biryani">🍛 Biryani & Rice Platters</option>
                        <option value="Pasta">🍝 Pasta & Noodles</option>
                        <option value="BBQ & Grill">🍖 BBQ & Grilled Platters</option>
                        <option value="Desserts">🍰 Desserts & Bakery</option>
                        <option value="Drinks">🥤 Drinks & Beverages</option>
                      </select>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Price (Tk) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="text-xs font-bold text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
                            Tk
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={editFormData.price}
                            onChange={(e) => setEditFormData((p) => ({ ...p, price: e.target.value }))}
                            placeholder="150"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Discount / Offer Price</span>
                          <span className="text-[10px] text-orange-500 font-bold">Promo</span>
                        </label>
                        <div className="relative">
                          <Percent className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editFormData.discountPrice}
                            onChange={(e) => setEditFormData((p) => ({ ...p, discountPrice: e.target.value }))}
                            placeholder="e.g. 9.99 (Optional)"
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stock Availability Status */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Food Availability / Stock Status <span className="text-rose-500">*</span></span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          editFormData.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {editFormData.status === "available" ? "● In Stock" : "● Out of Stock"}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setEditFormData((p) => ({ ...p, status: "available" }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            editFormData.status === "available"
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900 bg-transparent"
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Available (In Stock)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFormData((p) => ({ ...p, status: "unavailable" }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            editFormData.status === "unavailable"
                              ? "bg-rose-500 text-white shadow-xs"
                              : "text-gray-600 hover:text-gray-900 bg-transparent"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
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
                        rows={3}
                        value={editFormData.description}
                        onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Describe flavor notes, prep technique, and presentation..."
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none resize-none leading-relaxed"
                      />
                    </div>

                    {/* Ingredients & Tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Ingredients (Comma Separated)
                        </label>
                        <input
                          type="text"
                          value={editFormData.ingredients}
                          onChange={(e) => setEditFormData((p) => ({ ...p, ingredients: e.target.value }))}
                          placeholder="e.g. Angus Beef, Mozzarella, Truffle"
                          className="w-full px-3.5 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Tags (Comma Separated)
                        </label>
                        <input
                          type="text"
                          value={editFormData.tags}
                          onChange={(e) => setEditFormData((p) => ({ ...p, tags: e.target.value }))}
                          placeholder="e.g. Best Seller, Chef Special"
                          className="w-full px-3.5 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                        />
                      </div>
                    </div>

                    {/* Dietary Toggles */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditFormData((p) => ({ ...p, isVegetarian: !p.isVegetarian }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          editFormData.isVegetarian
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Leaf className="w-4 h-4" />
                        <span>Vegetarian</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditFormData((p) => ({ ...p, isSpicy: !p.isSpicy }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          editFormData.isSpicy
                            ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                        <span>Spicy Hot 🔥</span>
                      </button>
                    </div>

                  </div>

                </div>

                {/* 👉 RIGHT COLUMN: DYNAMIC SPECS, MULTI-IMAGE GALLERY & LIVE PREVIEW */}
                <div className="space-y-5">
                  
                  {/* 1. DYNAMIC CATEGORY SPECIFICATIONS CARD */}
                  <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                        {getCategoryIcon(editFormData.category)}
                        <span>Dynamic {editFormData.category} Specifications</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#FF6B35] bg-orange-50 border border-orange-200/70 px-2 py-0.5 rounded-md">
                        {editFormData.category} Preset
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {renderEditDynamicFields()}
                    </div>
                  </div>

                  {/* 2. MULTI-PHOTO GALLERY UPLOADER CARD */}
                  <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                        <ImageIcon className="w-4 h-4 text-[#FF6B35]" />
                        <span>Food Photos Gallery ({editImages.length} Photos)</span>
                      </div>

                      <div className="inline-flex rounded-xl bg-gray-100 p-0.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setEditImageInputMode("upload")}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            editImageInputMode === "upload" ? "bg-white text-[#FF6B35] shadow-xs" : "text-gray-500"
                          }`}
                        >
                          Upload Files
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditImageInputMode("url")}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            editImageInputMode === "url" ? "bg-white text-[#FF6B35] shadow-xs" : "text-gray-500"
                          }`}
                        >
                          Paste URL
                        </button>
                      </div>
                    </div>

                    {editImageInputMode === "upload" ? (
                      <div className="space-y-2.5">
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageUpload}
                          disabled={editUploading}
                          className="hidden"
                        />

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => editFileInputRef.current?.click()}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && editFileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleEditDropFiles}
                          className="w-full py-5 px-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#FF6B35] hover:bg-orange-50/30 bg-gray-50/70 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center select-none"
                        >
                          {editUploading ? (
                            <div className="flex flex-col items-center justify-center gap-1 py-1">
                              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
                              <span className="text-xs font-bold text-gray-800">
                                {editUploadProgress || "Processing photos..."}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center text-[#FF6B35] mb-0.5">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-bold text-gray-900 block">
                                Click to select new photos from device
                              </span>
                              <span className="text-[10px] text-gray-400">
                                Multi-selection supported (JPEG, PNG, WebP) or drag & drop here
                              </span>
                            </>
                          )}
                        </div>

                        {/* 1-Click Auto Fill Demo Photos */}
                        <button
                          type="button"
                          onClick={handleEditAutoFillCategoryPhotos}
                          className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-orange-200/80"
                        >
                          <Zap className="w-3.5 h-3.5 fill-[#FF6B35]" />
                          <span>Auto-load 4 High-Res {editFormData.category} Photos (Demo)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={editImageUrlInput}
                            onChange={(e) => setEditImageUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleEditAddUrlImage())}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleEditAddUrlImage}
                            className="px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold hover:bg-[#e85b27] transition cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleEditAutoFillCategoryPhotos}
                          className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B35] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-orange-200/80"
                        >
                          <Zap className="w-3.5 h-3.5 fill-[#FF6B35]" />
                          <span>Auto-load 4 High-Res {editFormData.category} Photos (Demo)</span>
                        </button>
                      </div>
                    )}

                    {/* Uploaded Gallery Grid */}
                    {editImages.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{editImages.length} Photos in Gallery</span>
                          </span>
                          <span className="text-[10px] text-orange-500 font-semibold">1st Photo is Primary Cover</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {editImages.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              onClick={() => setEditActivePreviewIndex(idx)}
                              className={`relative rounded-xl overflow-hidden border-2 aspect-square group bg-gray-100 shadow-2xs cursor-pointer ${
                                idx === 0
                                  ? "border-[#FF6B35] ring-2 ring-orange-500/20"
                                  : idx === editActivePreviewIndex
                                  ? "border-blue-500 ring-2 ring-blue-500/20"
                                  : "border-gray-200"
                              }`}
                            >
                              <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 bg-[#FF6B35] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs z-10">
                                  Cover
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSetCoverImage(idx);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-white text-gray-900 text-[8px] font-bold hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                                  >
                                    Set Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRemoveImage(idx);
                                  }}
                                  className="p-1 rounded bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
                                  title="Delete Image"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-amber-800 text-[11px] flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No photos added yet. Select photos or use the Auto-load button.</span>
                      </div>
                    )}
                  </div>

                  {/* 🌟 3. LIVE CUSTOMER CARD & GALLERY PREVIEW */}
                  <div className="bg-gradient-to-br from-white to-orange-50/40 rounded-2xl border border-orange-200/80 p-5 sm:p-6 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                        <Eye className="w-4 h-4 text-[#FF6B35]" />
                        <span>Live Customer Card Preview</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#FF6B35] text-white px-2 py-0.5 rounded-full shadow-2xs">
                        Live View
                      </span>
                    </div>

                    {/* Spotlight Main Photo */}
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900 shadow-inner group">
                      {editImages.length > 0 ? (
                        <img
                          src={editImages[editActivePreviewIndex] || editImages[0]}
                          alt="Preview Spotlight"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800/80 p-4 text-center gap-1.5">
                          <ImageIcon className="w-8 h-8 text-gray-500 animate-pulse" />
                          <span className="text-xs font-bold text-gray-300">
                            Add photos above to see live spotlight preview
                          </span>
                        </div>
                      )}

                      {/* Badges on Top of Photo */}
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                        <span className="bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                          {editFormData.category}
                        </span>
                        {editFormData.discountPrice && Number(editFormData.discountPrice) < Number(editFormData.price) && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
                            {Math.round(
                              ((Number(editFormData.price) - Number(editFormData.discountPrice)) /
                                Number(editFormData.price)) *
                                100
                            )}
                            % OFF
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md backdrop-blur-md shadow-xs ${
                            editFormData.status === "available"
                              ? "bg-emerald-500/90 text-white"
                              : "bg-rose-500/90 text-white"
                          }`}
                        >
                          {editFormData.status === "available" ? "● In Stock" : "● Out of Stock"}
                        </span>
                      </div>

                      {editImages.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Photo {editActivePreviewIndex + 1} of {editImages.length}
                        </div>
                      )}
                    </div>

                    {/* Thumbnails Swapping Row in Preview */}
                    {editImages.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {editImages.map((thumbUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditActivePreviewIndex(idx)}
                            className={`relative w-14 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                              editActivePreviewIndex === idx
                                ? "border-[#FF6B35] ring-2 ring-orange-500/30 scale-105"
                                : "border-gray-200 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={thumbUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Dish Preview Info */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-gray-900">
                            {editFormData.name || "Delicious Dish Name"}
                          </h4>
                          <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                            {editFormData.description || "Freshly prepared with curated ingredients..."}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {editFormData.discountPrice ? (
                            <>
                              <span className="text-sm font-black text-[#FF6B35]">
                                Tk {Number(editFormData.discountPrice).toFixed(2)}
                              </span>
                              <span className="block text-[10px] text-gray-400 line-through">
                                Tk {Number(editFormData.price || 0).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-gray-900">
                              Tk {Number(editFormData.price || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Specifications & Dietary Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {Object.entries(editDynamicData).map(([k, v]) =>
                          v ? (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-md bg-orange-100/70 text-[#FF6B35] text-[9px] font-bold"
                            >
                              {String(v)}
                            </span>
                          ) : null
                        )}
                        {editFormData.isVegetarian && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center gap-1">
                            <Leaf className="w-3 h-3" /> Veg
                          </span>
                        )}
                        {editFormData.isSpicy && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Spicy
                          </span>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Submit / Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => openEditModal(editItem)}
                  disabled={editSubmitting || editUploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200/80"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                  <span>Revert to Original</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEditItem(null)}
                    disabled={editSubmitting || editUploading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting || editUploading}
                    className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] via-orange-500 to-amber-500 hover:brightness-105 text-white text-xs font-black shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save All Changes ({editImages.length} Photos)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 🏷️ 3. QUICK OFFER / DISCOUNT MODAL                      */}
      {/* ======================================================= */}
      {offerItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <Percent className="w-4 h-4 text-amber-600" />
                <span>Special Discount Offer</span>
              </div>
              <button
                type="button"
                onClick={() => setOfferItem(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOfferSubmit} className="space-y-4">
              
              <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-900">{offerItem.name}</h4>
                  <span className="text-[11px] text-gray-500">Regular Price:</span>
                </div>
                <span className="text-base font-black text-gray-900">
                  Tk {Number(offerItem.price || 0).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Promotional Offer Price (Tk)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={offerDiscountPrice}
                  onChange={(e) => setOfferDiscountPrice(e.target.value)}
                  placeholder="e.g. 9.99 (Leave empty to remove offer)"
                  className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 focus:bg-white focus:border-[#FF6B35] outline-none"
                />
              </div>

              {/* Quick Percent Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Quick Discount Presets
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((pct) => {
                    const calculated = ((offerItem.price * (100 - pct)) / 100).toFixed(2);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setOfferDiscountPrice(calculated)}
                        className="py-1.5 px-2 rounded-xl bg-gray-100 hover:bg-orange-100 hover:text-[#FF6B35] text-xs font-bold text-gray-700 transition cursor-pointer text-center"
                      >
                        {pct}% OFF
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOfferItem(null)}
                  disabled={offerSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-amber-500 hover:brightness-105 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  {offerSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Apply Offer</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 🗑️ 4. DELETE CONFIRMATION MODAL                         */}
      {/* ======================================================= */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in duration-150">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">Delete Food Item?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to permanently delete <strong className="text-gray-800 font-bold">&quot;{deleteItem.name}&quot;</strong> from your menu? This action cannot be undone.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={deleteSubmitting}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-2"
              >
                {deleteSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Permanently</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
