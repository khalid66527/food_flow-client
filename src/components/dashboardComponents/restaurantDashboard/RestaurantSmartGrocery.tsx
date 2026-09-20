"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ShoppingCart,
  Download,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Circle,
  RefreshCw,
  Sparkles,
  Store,
  Layers,
  Utensils,
  Trash2,
  ChefHat,
  Info,
  PackagePlus,
  Printer,
  CheckCheck,
  ArrowRight,
  HelpCircle,
  Clock,
  Check,
  Tag,
  Zap,
  BookOpen,
  LayoutGrid,
  ListOrdered,
  Building,
  Lock,
  Settings2,
  Sliders,
  X,
  FileText,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import {
  getMyRestaurantProfile,
  getRestaurantGroceryItems,
  updateFoodSecretRecipe,
} from "@/lib/api/restaurant";
import {
  SUPERMARKET_AISLES,
  aggregateIngredientsClient,
  exportGroceryListToPdf,
  parseRawIngredient,
  suggestDefaultUnitForIngredient,
  ISelectedDishRequirement,
  IGroceryItem,
  IAisleSection,
  IDishRecipeDetail,
  classifyIngredientName,
} from "@/lib/groceryUtils";
import { toast } from "react-toastify";

/**
 * Standard Recipe Presets for Instant Raw Material Configuration
 */
const RECIPE_PRESETS = [
  {
    name: "Biryani / Pulao",
    icon: "🍚",
    items: [
      "300g Basmati Rice",
      "350g Chicken / Meat",
      "50g Ghee",
      "100g Onion",
      "15g Biryani Masala",
      "20g Ginger Garlic Paste",
      "30g Plain Yogurt",
      "1 tsp Salt",
    ],
  },
  {
    name: "Burger Assembly",
    icon: "🍔",
    items: [
      "1 pcs Burger Bun",
      "150g Meat Patty",
      "1 slice Cheddar Cheese",
      "30g Lettuce",
      "25g Tomato",
      "20g Mayonnaise",
      "15g Burger Sauce",
    ],
  },
  {
    name: "Curry / Gravy",
    icon: "🍲",
    items: [
      "300g Chicken / Meat",
      "150g Onion",
      "100g Tomato Puree",
      "50ml Mustard Oil",
      "10g Garam Masala",
      "1 tsp Turmeric Powder",
      "1 tsp Chili Powder",
    ],
  },
  {
    name: "Fried Rice / Noodles",
    icon: "🥢",
    items: [
      "250g Rice / Noodles",
      "100g Mixed Vegetables",
      "80g Chicken",
      "1 pcs Egg",
      "30ml Soya Sauce",
      "20ml Cooking Oil",
      "1 tsp Black Pepper",
    ],
  },
  {
    name: "Pizza / Pasta",
    icon: "🍕",
    items: [
      "200g Pasta / Pizza Dough",
      "100g Mozzarella Cheese",
      "80g Tomato Sauce",
      "50g Mushroom",
      "1 tbsp Olive Oil",
      "1 tsp Oregano",
      "2 cloves Garlic",
    ],
  },
  {
    name: "Beverages / Desserts",
    icon: "☕",
    items: [
      "250ml Milk",
      "40g Sugar",
      "25g Coffee / Tea Blend",
      "30ml Whipping Cream",
      "1 tbsp Chocolate Syrup",
    ],
  },
];

export default function RestaurantSmartGrocery() {
  const { data: session } = useSession();

  // State
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [foods, setFoods] = useState<any[]>([]);

  // Selection & Portions state: Map of foodId -> portions (number)
  const [selectedPortions, setSelectedPortions] = useState<Record<string, number>>({});

  // Has the user generated the grocery list?
  const [hasGenerated, setHasGenerated] = useState(false);

  // Active view filter for right panel: "all", "dishes", or "aisles"
  const [activeTab, setActiveTab] = useState<"all" | "dishes" | "aisles">("all");

  // Filtering / Search state for menu dishes
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterVegOnly, setFilterVegOnly] = useState(false);

  // Custom added grocery items
  const [customItems, setCustomItems] = useState<IGroceryItem[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customUnit, setCustomUnit] = useState("kg");
  const [customAisle, setCustomAisle] = useState(SUPERMARKET_AISLES[0].name);

  // Secret Recipe Configuration Modal State
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipeFood, setEditingRecipeFood] = useState<any>(null);
  const [recipeIngredientRows, setRecipeIngredientRows] = useState<
    Array<{ id: string; name: string; quantity: string | number; unit: string }>
  >([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [quickInputText, setQuickInputText] = useState("");
  const [showQuickInput, setShowQuickInput] = useState(false);

  // Checked state for grocery items (checklist)
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());

  // Print template container ref
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Logged-in Restaurant Profile (Strict Scoping)
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const savedData =
          typeof window !== "undefined"
            ? localStorage.getItem("foodflow_restaurant_data")
            : null;
        let restProfile = savedData ? JSON.parse(savedData) : null;

        const ownerEmail =
          session?.user?.email ||
          (typeof window !== "undefined"
            ? localStorage.getItem("restaurant_owner_email")
            : "") ||
          "";
        if (ownerEmail) {
          const res = await getMyRestaurantProfile(ownerEmail);
          if (res?.success && res?.data) {
            restProfile = res.data;
            if (typeof window !== "undefined") {
              localStorage.setItem(
                "foodflow_restaurant_data",
                JSON.stringify(res.data)
              );
            }
          }
        }

        if (isMounted) {
          setRestaurantData(restProfile);
        }
      } catch (err) {
        console.error("Failed to load restaurant profile", err);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.email]);

  // 2. Fetch Restaurant-Specific Food Items (Strictly Scoped)
  useEffect(() => {
    if (!restaurantData) return;

    const restId = restaurantData._id || restaurantData.id;
    if (!restId) return;

    let isMounted = true;
    const fetchFoods = async () => {
      setIsLoadingFoods(true);
      try {
        const res = await getRestaurantGroceryItems(restId);
        if (isMounted) {
          if (res?.success && Array.isArray(res.data)) {
            setFoods(res.data);
          } else {
            setFoods([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch restaurant grocery items", err);
        if (isMounted) setFoods([]);
      } finally {
        if (isMounted) setIsLoadingFoods(false);
      }
    };

    fetchFoods();

    return () => {
      isMounted = false;
    };
  }, [restaurantData]);

  // Extract distinct categories from restaurant foods
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    foods.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return ["All", ...Array.from(cats).sort()];
  }, [foods]);

  // Filter foods for display
  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (food.name && food.name.toLowerCase().includes(q)) ||
        (food.category && food.category.toLowerCase().includes(q)) ||
        (Array.isArray(food.ingredients) &&
          food.ingredients.some((ing: string) => ing.toLowerCase().includes(q)));

      const matchesCat =
        selectedCategory === "All" ||
        (food.category &&
          food.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesVeg = !filterVegOnly || Boolean(food.isVegetarian);

      return matchesSearch && matchesCat && matchesVeg;
    });
  }, [foods, searchQuery, selectedCategory, filterVegOnly]);

  // Build selected dishes list with portions
  const selectedDishesList: ISelectedDishRequirement[] = useMemo(() => {
    const result: ISelectedDishRequirement[] = [];
    foods.forEach((food) => {
      const id = food._id || food.id;
      const portions = selectedPortions[id];
      if (portions && portions > 0) {
        result.push({
          foodId: id,
          name: food.name,
          category: food.category || "General",
          image: food.image || "",
          price: food.price || 0,
          portions,
          ingredients: Array.isArray(food.ingredients) ? food.ingredients : [],
        });
      }
    });
    return result;
  }, [foods, selectedPortions]);

  // Aggregated Grocery Calculation & Dish Recipe Breakdown
  const {
    aisleSections,
    dishSections,
    totalDishesCount,
    totalPortionsCount,
    totalUniqueIngredientsCount,
  } = useMemo(() => {
    if (!hasGenerated && selectedDishesList.length === 0 && customItems.length === 0) {
      return {
        aisleSections: [],
        dishSections: [],
        totalDishesCount: 0,
        totalPortionsCount: 0,
        totalUniqueIngredientsCount: 0,
      };
    }
    return aggregateIngredientsClient(selectedDishesList, customItems);
  }, [selectedDishesList, customItems, hasGenerated]);

  // Toggle dish selection / adjust portion
  const handleToggleDish = (foodId: string) => {
    setSelectedPortions((prev) => {
      const current = prev[foodId];
      if (current && current > 0) {
        const next = { ...prev };
        delete next[foodId];
        return next;
      } else {
        return { ...prev, [foodId]: 10 };
      }
    });
  };

  const handleUpdatePortion = (foodId: string, newPortion: number) => {
    const val = Math.max(0, Math.round(newPortion));
    setSelectedPortions((prev) => {
      if (val <= 0) {
        const next = { ...prev };
        delete next[foodId];
        return next;
      }
      return { ...prev, [foodId]: val };
    });
  };

  const handleSelectAll = () => {
    const newMap: Record<string, number> = {};
    filteredFoods.forEach((food) => {
      const id = food._id || food.id;
      newMap[id] = selectedPortions[id] || 10;
    });
    setSelectedPortions((prev) => ({ ...prev, ...newMap }));
    toast.info(`Selected ${filteredFoods.length} dishes.`);
  };

  const handleClearAll = () => {
    setSelectedPortions({});
    setCheckedItemIds(new Set());
    setHasGenerated(false);
    toast.info("Cleared dish selection.");
  };

  const handleGenerateList = () => {
    if (selectedDishesList.length === 0 && customItems.length === 0) {
      toast.warning("Please select at least one menu item from the left panel.");
      return;
    }
    setHasGenerated(true);
    setCheckedItemIds(new Set());
    toast.success(
      `Generated shopping list for ${selectedDishesList.length} dishes (${totalPortionsCount} portions)!`
    );
  };

  // Toggle item checked in shopping checklist
  const handleToggleCheckItem = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Add Custom Grocery Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.warning("Please enter an ingredient or item name.");
      return;
    }

    const qtyNum = parseFloat(customQty) || 1;
    const itemAisle = customAisle || classifyIngredientName(customName);
    const aisleDef =
      SUPERMARKET_AISLES.find((a) => a.name === itemAisle) ||
      SUPERMARKET_AISLES[SUPERMARKET_AISLES.length - 1];

    const newItem: IGroceryItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: customName.trim(),
      quantity: qtyNum,
      displayQuantity: `${qtyNum} ${customUnit}`,
      unit: customUnit,
      category: itemAisle,
      aisleName: itemAisle,
      aisleIcon: aisleDef.icon,
      dishes: ["Custom Kitchen Requirement"],
      dishBreakdown: [
        {
          dishName: "Custom Kitchen Requirement",
          portions: 1,
          baseQuantity: qtyNum,
          scaledQuantity: qtyNum,
          displayQuantity: `${qtyNum} ${customUnit}`,
          unit: customUnit,
        },
      ],
      isChecked: false,
      isCustom: true,
    };

    setCustomItems((prev) => [newItem, ...prev]);
    setCustomName("");
    setCustomQty("1");
    setShowCustomModal(false);
    setHasGenerated(true);
    toast.success(`Added "${newItem.name}" to ${itemAisle}`);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Custom item removed.");
  };

  // Open Secret Recipe Modal
  const handleOpenRecipeModal = (food: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingRecipeFood(food);
    const rawList = Array.isArray(food.ingredients)
      ? food.ingredients
      : typeof food.ingredients === "string" && food.ingredients.trim()
      ? food.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (rawList.length > 0) {
      const parsedRows = rawList.map((raw: string, idx: number) => {
        const parsed = parseRawIngredient(raw);
        return {
          id: `row-${idx}-${Date.now()}`,
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
        };
      });
      setRecipeIngredientRows(parsedRows);
    } else {
      setRecipeIngredientRows([
        { id: `row-1-${Date.now()}`, name: "", quantity: 1, unit: "g" },
      ]);
    }
    setQuickInputText("");
    setShowQuickInput(false);
    setShowRecipeModal(true);
  };

  // Add Row
  const handleAddRecipeRow = () => {
    setRecipeIngredientRows((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name: "", quantity: 1, unit: "g" },
    ]);
  };

  // Remove Row
  const handleRemoveRecipeRow = (rowId: string) => {
    setRecipeIngredientRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return filtered.length > 0
        ? filtered
        : [{ id: `row-${Date.now()}`, name: "", quantity: 1, unit: "g" }];
    });
  };

  // Update Row Field with Smart Default Unit Detection
  const handleUpdateRecipeRow = (
    rowId: string,
    field: "name" | "quantity" | "unit",
    val: any
  ) => {
    setRecipeIngredientRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (field === "name") {
          const autoSuggestedUnit = suggestDefaultUnitForIngredient(val);
          // If the unit was a generic default, intelligently adapt to the ingredient type (e.g. oil -> ml, egg -> pcs)
          const shouldAutoUpdateUnit = !r.unit || r.unit === "g" || r.unit === "pcs" || r.unit === "ml";
          return {
            ...r,
            name: val,
            unit: shouldAutoUpdateUnit ? autoSuggestedUnit : r.unit,
          };
        }
        return { ...r, [field]: val };
      })
    );
  };

  // Apply Quick Preset
  const handleApplyPreset = (presetItems: string[]) => {
    const parsed = presetItems.map((raw, idx) => {
      const p = parseRawIngredient(raw);
      return {
        id: `preset-${idx}-${Date.now()}`,
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
      };
    });
    setRecipeIngredientRows(parsed);
    toast.info("Applied recipe template ingredients!");
  };

  // Apply Quick Text Parse
  const handleApplyQuickText = () => {
    if (!quickInputText.trim()) return;
    const items = quickInputText.split(",").map((s) => s.trim()).filter(Boolean);
    if (items.length > 0) {
      const parsed = items.map((raw, idx) => {
        const p = parseRawIngredient(raw);
        return {
          id: `bulk-${idx}-${Date.now()}`,
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
        };
      });
      setRecipeIngredientRows((prev) => [
        ...prev.filter((r) => r.name.trim()),
        ...parsed,
      ]);
      setQuickInputText("");
      setShowQuickInput(false);
      toast.success(`Imported ${items.length} raw materials!`);
    }
  };

  // Save Secret Recipe Configuration
  const handleSaveSecretRecipe = async () => {
    if (!editingRecipeFood) return;
    const foodId = editingRecipeFood._id || editingRecipeFood.id;

    // Filter valid rows
    const validRows = recipeIngredientRows.filter((r) => r.name && r.name.trim());
    if (validRows.length === 0) {
      toast.error("Please add at least one valid raw material ingredient.");
      return;
    }

    // Format strings: e.g. "250g Chicken", "1.5 kg Basmati Rice", "2 tbsp Oil"
    const formattedIngredients = validRows.map((r) => {
      const q = parseFloat(String(r.quantity)) || 1;
      const u = r.unit.trim();
      const n = r.name.trim();
      if (u === "portion" || u === "unit") {
        return `${q} ${n}`;
      }
      return `${q}${u} ${n}`;
    });

    setIsSavingRecipe(true);
    try {
      const res = await updateFoodSecretRecipe(foodId, formattedIngredients);
      if (res?.success) {
        // Optimistically update local foods state
        setFoods((prev) =>
          prev.map((f) =>
            f._id === foodId || f.id === foodId
              ? { ...f, ingredients: formattedIngredients }
              : f
          )
        );
        toast.success(`Secret recipe for "${editingRecipeFood.name}" saved!`);
        setShowRecipeModal(false);
      } else {
        toast.error(res?.message || "Failed to save secret recipe.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save secret recipe.");
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // PDF Export Trigger using html2pdf.js
  const handleDownloadPdf = async () => {
    if (totalUniqueIngredientsCount === 0) {
      toast.warning(
        "No ingredients to export. Please select dishes and generate your list."
      );
      return;
    }

    setIsExportingPdf(true);
    const toastId = toast.loading("Generating high-resolution Grocery List PDF...");

    try {
      const restaurantSlug = (restaurantData?.restaurantName || "Restaurant")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `${restaurantSlug}-grocery-manifest-${dateStr}.pdf`;

      const success = await exportGroceryListToPdf(
        "grocery-pdf-manifest",
        fileName
      );

      if (success) {
        toast.update(toastId, {
          render: "Grocery List PDF downloaded successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
      } else {
        toast.update(toastId, {
          render: "Failed to create PDF. Please check your browser settings.",
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
      }
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.update(toastId, {
        render: err?.message || "An error occurred while generating the PDF.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Guard: No restaurant profile found
  if (!isLoadingProfile && !restaurantData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white rounded-3xl border border-gray-100 shadow-xs">
        <div className="w-20 h-20 bg-orange-50 text-[#FF6B35] rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/10">
          <Store className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Restaurant Profile Required
        </h2>
        <p className="text-gray-600 max-w-md mb-8 text-sm">
          To generate intelligent grocery lists and manage kitchen ingredient requirements, you must first create or connect your restaurant profile.
        </p>
        <Link
          href="/dashboard/restaurant/create-restaurant"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E85D2A] text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all text-sm"
        >
          <Store className="w-4 h-4" />
          Create Restaurant Profile
        </Link>
      </div>
    );
  }

  const restaurantName =
    restaurantData?.restaurantName || restaurantData?.name || "Your Restaurant";
  const restaurantAddress =
    typeof restaurantData?.address === "object"
      ? restaurantData?.address?.fullAddress ||
        `${restaurantData?.address?.street || ""}, ${restaurantData?.address?.city || ""}`
      : typeof restaurantData?.address === "string"
      ? restaurantData.address
      : "Main Kitchen";

  const selectedCount = Object.keys(selectedPortions).length;

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ============================================================ */}
      {/* 🌟 HERO BANNER: FOODFLOW ORANGE / WARM AMBER GRADIENT */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] via-[#FF7843] to-[#FF8C42] text-white p-6 sm:p-8 md:p-10 shadow-xl shadow-orange-500/15">
        {/* Subtle Decorative Accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-20 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Scoping & Feature Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Smart Grocery & Inventory</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-emerald-100 font-semibold">Strict Restaurant Scoping</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Smart Grocery & Shopping List
            </h1>

            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              Select dishes from{" "}
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-white backdrop-blur-xs">
                {restaurantName}
              </span>
              , set target cooking portions, and instantly aggregate all raw ingredients grouped by supermarket aisles.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-white/80">
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-white" />
                <span>Scope: <strong>{restaurantName}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-white" />
                <span>Menu Inventory: <strong>{foods.length} items</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <button
              onClick={() => setShowCustomModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold border border-white/30 backdrop-blur-md shadow-xs transition-all cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Add Custom Item</span>
            </button>

            {hasGenerated && (
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf || totalUniqueIngredientsCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-orange-50 active:scale-95 text-[#FF6B35] text-xs font-extrabold shadow-lg shadow-black/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6B35]" />
                ) : (
                  <Download className="w-4 h-4 text-[#FF6B35]" />
                )}
                <span>Download PDF Manifest</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🍱 TWO-COLUMN SPLIT WORKSPACE */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ------------------------------------------------------------ */}
        {/* 👈 LEFT PANEL: "Your Restaurant Menu" (5 cols) */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#FF6B35]" />
                  <span>Your Restaurant Menu</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check items to include in grocery calculation
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-[#FF6B35] bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Chips */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dishes or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-900 placeholder:text-gray-400 transition-all"
                />
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {availableCategories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#FF6B35] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu List: Fixed Height Container with Custom Scrollbar */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar">
              {isLoadingFoods ? (
                <div className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF6B35]" />
                  <p className="text-xs">Loading restaurant dishes...</p>
                </div>
              ) : filteredFoods.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-700">
                    No dishes found
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {foods.length === 0
                      ? "Add food items to your menu to plan your groceries."
                      : "Try clearing search filters."}
                  </p>
                </div>
              ) : (
                filteredFoods.map((food) => {
                  const id = food._id || food.id;
                  const portions = selectedPortions[id] || 0;
                  const isSelected = portions > 0;
                  const ingredients = Array.isArray(food.ingredients)
                    ? food.ingredients
                    : typeof food.ingredients === "string" && food.ingredients.trim()
                    ? food.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean)
                    : [];

                  return (
                    <div
                      key={id}
                      onClick={() => handleToggleDish(id)}
                      className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-orange-50/70 border-orange-300 shadow-xs"
                          : "bg-white border-gray-150 hover:border-gray-300 hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox Trigger */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#FF6B35] text-white"
                              : "border-2 border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Dish Image */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative border border-gray-200">
                          {food.image ? (
                            <Image
                              src={food.image}
                              alt={food.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              🍲
                            </div>
                          )}
                        </div>

                        {/* Dish Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-gray-900 truncate">
                              {food.name}
                            </h3>
                            {food.isVegetarian && (
                              <span
                                className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                                title="Vegetarian"
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span className="font-bold text-[#FF6B35]">
                              ৳{food.price}
                            </span>
                            <span>•</span>
                            <span>{food.category || "General"}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">
                              {ingredients.length} raw items
                            </span>
                          </div>
                        </div>

                        {/* Portion Counter (when selected) */}
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-white px-1.5 py-1 rounded-xl border border-orange-200 shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdatePortion(id, portions - 5)}
                              className="w-5 h-5 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-orange-100 hover:text-[#FF6B35] transition-colors cursor-pointer"
                              title="-5 portions"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={portions}
                              onChange={(e) =>
                                handleUpdatePortion(
                                  id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-8 text-center text-xs font-black text-gray-900 bg-transparent focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => handleUpdatePortion(id, portions + 5)}
                              className="w-5 h-5 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-orange-100 hover:text-[#FF6B35] transition-colors cursor-pointer"
                              title="+5 portions"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Ingredients preview & Prominent Redesigned "Configure Recipe" Action Button */}
                      <div className="mt-2.5 pt-2 border-t border-gray-150/80 flex items-center justify-between gap-2.5 flex-wrap">
                        <div className="flex flex-wrap gap-1 flex-1 min-w-0 items-center">
                          {ingredients.length > 0 ? (
                            <>
                              {ingredients.slice(0, 3).map((ing: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-medium truncate max-w-[125px]"
                                >
                                  {ing}
                                </span>
                              ))}
                              {ingredients.length > 3 && (
                                <span className="text-[10px] text-gray-500 font-bold self-center px-1">
                                  +{ingredients.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-medium italic flex items-center gap-1">
                              <span>⚠️ Needs recipe setup</span>
                            </span>
                          )}
                        </div>

                        {/* Redesigned Prominent Action Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenRecipeModal(food, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                          title="Configure secret ingredients and quantities per portion"
                        >
                          <Settings2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>⚙️ Configure Recipe</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Generate Button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleGenerateList}
                disabled={selectedCount === 0 && customItems.length === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E85D2A] hover:from-[#f3602a] hover:to-[#db5220] active:scale-[0.99] text-white text-xs font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-200 text-amber-200" />
                <span>Generate Smart Grocery List</span>
                {selectedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                    {selectedCount} dishes ({totalPortionsCount} portions)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 👉 RIGHT PANEL: PREVIEW / AISLE BREAKDOWN (7 cols) */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-7 space-y-4">
          {!hasGenerated ? (
            /* ======================================================== */
            /* 🌟 RECIPEHUB STYLE EMPTY / PREVIEW INSPIRATIONAL STATE */
            /* ======================================================== */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[580px] space-y-6">
              {/* Illustration Icon Container */}
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 border border-orange-100 flex items-center justify-center text-4xl shadow-md shadow-orange-500/5">
                  🛒
                </div>
                <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shadow-md shadow-emerald-500/20">
                  🥦
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Ready to Shop Smarter?
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  Select your dishes on the left panel, adjust batch portions, and click{" "}
                  <strong className="text-[#FF6B35]">
                    &quot;Generate Smart Grocery List&quot;
                  </strong>{" "}
                  to automatically aggregate raw ingredient quantities categorized by supermarket aisles.
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left pt-2">
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-150 space-y-1">
                  <div className="text-lg">🥦</div>
                  <h4 className="text-xs font-bold text-gray-900">
                    Aisle-Wise Sorting
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Sorted by Produce, Meat, Spices, Dairy & Pantry.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-150 space-y-1">
                  <div className="text-lg">⚖️</div>
                  <h4 className="text-xs font-bold text-gray-900">
                    Batch Scaling
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Scale from 10 to 100 servings with unit conversion.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-150 space-y-1">
                  <div className="text-lg">📄</div>
                  <h4 className="text-xs font-bold text-gray-900">
                    1-Click PDF Export
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Export a clean kitchen procurement manifest.
                  </p>
                </div>
              </div>

              {/* Call-to-action hint */}
              <div className="text-xs font-semibold text-[#FF6B35] flex items-center gap-1.5 pt-2">
                <span>👈 Select dishes on the left panel to begin</span>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* 📋 GENERATED SHOPPING MANIFEST & BREAKDOWNS */
            /* ======================================================== */
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
              {/* Header & Status Bar (Fixed at Top) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3.5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#FF6B35]" />
                    <span>Smart Kitchen & Grocery Manifest</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Strictly generated from {selectedDishesList.length} production recipes ({totalPortionsCount} batch portions)
                  </p>
                </div>

                {/* View Switcher Tabs & Download PDF CTA */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "all"
                          ? "bg-white text-[#FF6B35] shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("dishes")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "dishes"
                          ? "bg-white text-[#FF6B35] shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>1. Recipes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("aisles")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "aisles"
                          ? "bg-white text-[#FF6B35] shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>2. Aisles</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf || totalUniqueIngredientsCount === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#E85D2A] hover:from-[#f3602a] hover:to-[#db5220] active:scale-95 text-white text-xs font-bold shadow-sm shadow-orange-500/20 hover:shadow-orange-500/35 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExportingPdf ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics KPI Bar (Fixed at Top) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Planned Dishes
                  </span>
                  <p className="text-base sm:text-lg font-black text-gray-900">
                    {totalDishesCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-orange-50/70 border border-orange-150 text-center">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                    Total Portions
                  </span>
                  <p className="text-base sm:text-lg font-black text-[#FF6B35]">
                    {totalPortionsCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-150 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Raw Materials
                  </span>
                  <p className="text-base sm:text-lg font-black text-emerald-700">
                    {totalUniqueIngredientsCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-purple-50/70 border border-purple-150 text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Store Aisles
                  </span>
                  <p className="text-base sm:text-lg font-black text-purple-700">
                    {aisleSections.length}
                  </p>
                </div>
              </div>

              {/* Scrollable Container for Section 1 & Section 2 */}
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar">
                {/* ======================================================== */}
                {/* 🍲 SECTION 1: PER-RECIPE INGREDIENT BREAKDOWN */}
                {/* ======================================================== */}
                {(activeTab === "all" || activeTab === "dishes") && (
                  <div className="space-y-3 pt-1">
                    {/* Section 1 Header Banner */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-orange-50/80 via-white to-transparent p-2.5 rounded-2xl border border-orange-100/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#FF6B35] text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                          1
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-[#FF6B35]" />
                            <span>Per-Recipe Ingredient Breakdown</span>
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            Raw materials scaled per selected recipe batch
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] text-[10px] font-bold">
                        {dishSections.length} Recipes
                      </span>
                    </div>

                    {/* Dish Recipe Preview Cards */}
                    <div className="grid grid-cols-1 gap-3">
                      {dishSections.map((dish) => (
                        <div
                          key={dish.foodId}
                          className="rounded-2xl border border-gray-150 bg-white p-3 sm:p-3.5 shadow-2xs hover:border-orange-200 transition-all space-y-2.5"
                        >
                          {/* Card Top: Image, Name, Category, Price & Badges */}
                          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 relative shrink-0 border border-gray-200 shadow-2xs">
                                {dish.image ? (
                                  <Image
                                    src={dish.image}
                                    alt={dish.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">
                                    🍲
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-gray-900 truncate">
                                  {dish.name}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                  <span className="font-semibold text-gray-600">{dish.category}</span>
                                  <span>•</span>
                                  <span className="font-bold text-[#FF6B35]">৳{dish.price}</span>
                                </div>
                              </div>
                            </div>

                            {/* Badges: Total items, portions & Configure Recipe button */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                                <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{dish.ingredients.length} items</span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-[#FF6B35] border border-orange-200 text-[10.5px] font-black tracking-tight">
                                <span>{dish.portions} Portions</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  const foodItem = foods.find(
                                    (f) => (f._id || f.id) === dish.foodId
                                  );
                                  handleOpenRecipeModal(foodItem || dish, e);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold text-[11px] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                                title="Edit secret recipe raw materials for this dish"
                              >
                                <Settings2 className="w-3 h-3 stroke-[2.5]" />
                                <span>⚙️ Edit Recipe</span>
                              </button>
                            </div>
                          </div>

                          {/* Ingredients Tag / Chips Grid */}
                          <div className="pt-0.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                              Recipe Raw Materials ({dish.portions} Servings):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {dish.ingredients.map((ing, i) => (
                                <div
                                  key={i}
                                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-50/90 border border-gray-200 hover:bg-orange-50/50 hover:border-orange-200 text-xs text-gray-800 font-medium transition-colors shadow-2xs"
                                >
                                  <span className="text-xs leading-none">{ing.aisleIcon}</span>
                                  <span className="font-semibold text-gray-800">{ing.name}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200/90 text-[#FF6B35] font-black text-[10.5px] leading-none ml-0.5">
                                    {ing.displayQuantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* 🛒 SECTION 2: SUPERMARKET AISLE CHECKLIST */}
                {/* ======================================================== */}
                {(activeTab === "all" || activeTab === "aisles") && (
                  <div className="space-y-3 pt-2">
                    {/* Section 2 Header Banner */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-white to-transparent p-2.5 rounded-2xl border border-emerald-100/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                          2
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Supermarket Aisle Checklist</span>
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            Categorized shopping list with interactive checklist & multi-dish multipliers
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {aisleSections.length} Aisles
                      </span>
                    </div>

                    {/* Aisle Category Cards */}
                    <div className="space-y-3">
                      {aisleSections.map((aisle) => (
                        <div
                          key={aisle.id}
                          className="rounded-2xl border border-gray-150 overflow-hidden bg-white shadow-2xs"
                        >
                          {/* Aisle Header */}
                          <div className="px-3.5 py-2 bg-gray-50/90 border-b border-gray-150 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{aisle.icon}</span>
                              <h3 className="text-xs font-bold text-gray-800">
                                {aisle.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                              {aisle.items.length} {aisle.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          {/* Aisle Items Checklist */}
                          <div className="divide-y divide-gray-100">
                            {aisle.items.map((item) => {
                              const isChecked = checkedItemIds.has(item.id);
                              const isMultiDish = item.dishes && item.dishes.length > 1;

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleToggleCheckItem(item.id)}
                                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                                    isChecked
                                      ? "bg-gray-50/70 text-gray-400"
                                      : "hover:bg-gray-50/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {/* Checkbox */}
                                    <div
                                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                        isChecked
                                          ? "bg-emerald-600 text-white"
                                          : "border border-gray-300 bg-white hover:border-emerald-500"
                                      }`}
                                    >
                                      {isChecked && (
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p
                                          className={`text-xs font-bold truncate ${
                                            isChecked
                                              ? "text-gray-400 line-through"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {item.name}
                                        </p>

                                        {/* Multiplier Badge if used in multiple recipes */}
                                        {isMultiDish && (
                                          <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold tracking-wide shrink-0"
                                            title={`Used in ${item.dishes.length} dishes: ${item.dishes.join(", ")}`}
                                          >
                                            <Layers className="w-2.5 h-2.5 text-amber-700" />
                                            <span>x{item.dishes.length} Dishes</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Detailed dish breakdown tag */}
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {item.dishBreakdown && item.dishBreakdown.length > 0 ? (
                                          item.dishBreakdown.map((db, i) => (
                                            <span
                                              key={i}
                                              className={`text-[9px] px-1.5 py-0.2 rounded border transition-colors ${
                                                isChecked
                                                  ? "bg-gray-100 text-gray-400 border-gray-200"
                                                  : "bg-gray-50 text-gray-600 border-gray-200"
                                              }`}
                                            >
                                              {db.dishName} ({db.portions}x):{" "}
                                              <strong className={isChecked ? "text-gray-400" : "text-gray-900"}>
                                                {db.displayQuantity}
                                              </strong>
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-gray-500">
                                            For: {item.dishes.join(", ")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Total Scaled Quantity Badge */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border transition-colors ${
                                        isChecked
                                          ? "bg-gray-100 text-gray-400 border-gray-200 line-through"
                                          : "bg-orange-50 text-[#FF6B35] border-orange-200"
                                      }`}
                                    >
                                      {item.displayQuantity}
                                    </span>

                                    {item.isCustom && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveCustomItem(item.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📄 HIGH-RESOLUTION EXECUTIVE PRINT MANIFEST (html2pdf.js) */}
      {/* Positioned cleanly offscreen with explicit dimensions to avoid clipping */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 📄 HIGH-RESOLUTION EXECUTIVE PRINT MANIFEST (html2pdf.js) */}
      {/* Positioned cleanly offscreen with 100% Hex colors to prevent lab() parsing errors */}
      {/* ============================================================ */}
      <div className="absolute -left-[9999px] top-0 w-[710px] bg-[#ffffff] text-[#0f172a] font-sans z-[-999] box-border">
        <div
          id="grocery-pdf-manifest"
          ref={pdfTemplateRef}
          className="p-4 bg-[#ffffff] text-[#0f172a] w-[710px] box-border"
        >
          {/* ======================================================== */}
          {/* 1. LUXURY EXECUTIVE BRANDED DARK HEADER */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0B132B] rounded-xl p-4 mb-3 box-border text-[#ffffff] border-b-[3.5px] border-[#FF6B35]">
            <table className="w-full table-fixed border-collapse">
              <tbody>
                <tr>
                  {/* Left: FoodFlow Branding + Manifest Badge (Vertically Centered) */}
                  <td className="w-[52%] align-middle p-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[22px] font-black text-[#FF6B35] tracking-tight leading-none inline-block">
                        FoodFlow
                      </span>
                      <span className="bg-[#FF6B35] text-[#ffffff] text-[8px] font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase inline-flex items-center justify-center leading-none shadow-sm">
                        PROCUREMENT MANIFEST
                      </span>
                    </div>
                    <p className="text-[9px] font-medium text-[#94a3b8] mt-1.5 tracking-wide leading-tight">
                      Smart Kitchen Operations &bull; Automated Requisition Schedule
                    </p>
                  </td>

                  {/* Right: Restaurant Name, Location & Reference ID (Vertically Centered) */}
                  <td className="w-[48%] align-middle text-right p-0">
                    <p className="text-[15px] font-black text-[#ffffff] mb-0.5 leading-tight tracking-tight">
                      {restaurantName}
                    </p>
                    <p className="text-[9.5px] font-medium text-[#cbd5e1] mb-1 leading-tight">
                      📍 {restaurantAddress}
                    </p>
                    <div className="mt-1 text-[8px] text-[#94a3b8] leading-tight flex items-center justify-end gap-1.5 flex-wrap">
                      <span>
                        Date:{" "}
                        <strong className="text-[#f1f5f9]">
                          {new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span className="bg-[#fff7ed] border border-[#fed7aa] text-[#ea580c] px-2 py-0.5 rounded font-extrabold text-[8px] tracking-wide inline-block leading-tight">
                        Ref: #FF-PROC-{(restaurantData?._id || "REST").slice(-6).toUpperCase()}-{Date.now().toString().slice(-4)}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* 2. EXECUTIVE KPI SUMMARY BAR */}
          {/* ======================================================== */}
          <table className="w-full table-fixed border-collapse bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] rounded-lg mb-3 box-border text-center">
            <tbody>
              <tr>
                <td className="p-2 border-r border-[#e2e8f0] w-1/4">
                  <span className="text-[7.5px] font-extrabold text-[#64748b] uppercase tracking-wider block">
                    Planned Dishes
                  </span>
                  <span className="text-[15px] font-black text-[#0f172a] block mt-0.5">
                    {totalDishesCount}
                  </span>
                </td>

                <td className="p-2 border-r border-[#e2e8f0] w-1/4">
                  <span className="text-[7.5px] font-extrabold text-[#ea580c] uppercase tracking-wider block">
                    Total Portions
                  </span>
                  <span className="text-[15px] font-black text-[#ea580c] block mt-0.5">
                    {totalPortionsCount}
                  </span>
                </td>

                <td className="p-2 border-r border-[#e2e8f0] w-1/4">
                  <span className="text-[7.5px] font-extrabold text-[#059669] uppercase tracking-wider block">
                    Unique Raw Items
                  </span>
                  <span className="text-[15px] font-black text-[#059669] block mt-0.5">
                    {totalUniqueIngredientsCount}
                  </span>
                </td>

                <td className="p-2 w-1/4">
                  <span className="text-[7.5px] font-extrabold text-[#9333ea] uppercase tracking-wider block">
                    Store Aisles
                  </span>
                  <span className="text-[15px] font-black text-[#9333ea] block mt-0.5">
                    {aisleSections.length}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ======================================================== */}
          {/* 3. SECTION 1: PRODUCTION MENU RECIPES & BATCH BREAKDOWN */}
          {/* ======================================================== */}
          <div className="mb-3 box-border">
            <div className="flex items-center justify-between mb-1.5 border-b-[1.5px] border-[#cbd5e1] pb-1">
              <h3 className="text-[10.5px] font-extrabold text-[#0f172a] uppercase tracking-wide m-0">
                1. Production Menu Recipes & Batch Breakdown
              </h3>
              <span className="text-[8.5px] font-bold text-[#FF6B35] bg-[#fff7ed] px-2 py-0.5 rounded-full border border-[#fed7aa]">
                {selectedDishesList.length} Recipes ({totalPortionsCount} Total Portions)
              </span>
            </div>

            <table className="w-full table-fixed border-collapse text-[9px] box-border border border-[#e2e8f0] rounded-md overflow-hidden">
              <thead>
                <tr className="bg-[#0f172a] text-[#ffffff]">
                  <th className="p-2 px-1.5 border border-[#0f172a] text-center w-[6%] align-middle whitespace-nowrap">
                    #
                  </th>
                  <th className="p-2 px-2.5 border border-[#0f172a] text-left w-[44%] align-middle">
                    Dish & Required Recipe Ingredients
                  </th>
                  <th className="p-2 px-2.5 border border-[#0f172a] text-left w-[18%] align-middle whitespace-nowrap">
                    Category
                  </th>
                  <th className="p-2 px-2.5 border border-[#0f172a] text-right w-[14%] align-middle whitespace-nowrap">
                    Unit Price
                  </th>
                  <th className="p-2 px-2.5 border border-[#0f172a] text-center w-[18%] align-middle whitespace-nowrap">
                    Planned Portions
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedDishesList.map((d, idx) => (
                  <tr
                    key={d.foodId}
                    className={`border-b border-[#e2e8f0] ${idx % 2 === 0 ? "bg-[#ffffff]" : "bg-[#f8fafc]"}`}
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <td className="p-2 px-1.5 border border-[#e2e8f0] text-center text-[#64748b] align-top font-semibold">
                      {idx + 1}
                    </td>
                    <td className="p-2 px-2.5 border border-[#e2e8f0] align-top break-words">
                      <div className="font-extrabold text-[#0f172a] text-[10.5px] mb-1">
                        {d.name}
                      </div>
                      {d.ingredients && d.ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {d.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              className="inline-block bg-[#f1f5f9] border border-[#cbd5e1] rounded px-1.5 py-0.5 text-[8px] font-semibold text-[#1e293b] leading-tight"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-2 px-2.5 border border-[#e2e8f0] text-[#475569] align-top break-words font-medium">
                      {d.category}
                    </td>
                    <td className="p-2 px-2.5 border border-[#e2e8f0] text-right text-[#0f172a] align-top font-bold whitespace-nowrap">
                      Tk. {d.price}
                    </td>
                    <td className="p-2 px-2.5 border border-[#e2e8f0] text-center font-extrabold text-[#ea580c] align-top text-[10px] whitespace-nowrap">
                      {d.portions} servings
                    </td>
                  </tr>
                ))}
                {customItems.length > 0 && (
                  <tr className="bg-[#fffbeb]" style={{ pageBreakInside: "avoid" }}>
                    <td className="p-2 px-1.5 border border-[#fde68a] text-center text-[#ea580c] font-bold align-middle">
                      *
                    </td>
                    <td colSpan={3} className="p-2 px-2.5 border border-[#fde68a] font-bold text-[#78350f] align-middle">
                      + {customItems.length} Custom Kitchen Requisitions (Extra Supplies)
                    </td>
                    <td className="p-2 px-2.5 border border-[#fde68a] text-center font-bold text-[#ea580c] align-middle">
                      As Listed
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* 4. SECTION 2: CATEGORIZED RAW MATERIALS PROCUREMENT MATRIX */}
          {/* ======================================================== */}
          <div className="mb-3 box-border w-full">
            <div className="flex items-center justify-between mb-1.5 border-b-[1.5px] border-[#cbd5e1] pb-1">
              <h3 className="text-[10.5px] font-extrabold text-[#0f172a] uppercase tracking-wide m-0">
                2. Categorized Raw Materials Procurement Schedule
              </h3>
              <span className="text-[8.5px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                {totalUniqueIngredientsCount} Unique Raw Items &bull; {aisleSections.length} Store Aisles
              </span>
            </div>

            {/* UNIFIED ENTERPRISE PROCUREMENT MATRIX TABLE */}
            <div className="border-[1.5px] border-[#cbd5e1] rounded-lg overflow-hidden box-border bg-[#ffffff]">
              <table className="w-full table-fixed border-collapse text-[9px] box-border">
                <thead>
                  <tr className="bg-[#0f172a] text-[#ffffff] text-left">
                    <th className="w-[6%] p-2 px-1 text-center align-middle font-extrabold tracking-wider whitespace-nowrap border-r border-[#334155]">
                      ✓
                    </th>
                    <th className="w-[30%] p-2 px-2.5 text-left align-middle font-extrabold uppercase tracking-wider whitespace-nowrap border-r border-[#334155]">
                      INGREDIENT / RAW MATERIAL
                    </th>
                    <th className="w-[18%] p-2 px-2.5 text-right align-middle font-extrabold uppercase tracking-wider whitespace-nowrap border-r border-[#334155]">
                      TOTAL REQUIRED
                    </th>
                    <th className="w-[46%] p-2 px-2.5 text-left align-middle font-extrabold uppercase tracking-wider whitespace-nowrap">
                      REQUIRED FOR PRODUCTION BATCHES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aisleSections.map((aisle) => (
                    <React.Fragment key={aisle.id}>
                      {/* Aisle Category Banner Row */}
                      <tr
                        className="pdf-aisle-group bg-[#f1f5f9] border-t-[1.5px] border-b-[1.5px] border-[#cbd5e1]"
                        style={{ pageBreakInside: "avoid" }}
                      >
                        <td colSpan={4} className="p-1.5 px-2.5 border-l-4 border-[#FF6B35] align-middle">
                          <div className="flex justify-between items-center">
                            <span className="text-[10.5px] font-extrabold text-[#0f172a]">
                              {aisle.icon} {aisle.name}
                            </span>
                            <span className="text-[8.5px] text-[#475569] font-bold bg-[#ffffff] px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                              {aisle.items.length} {aisle.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Aisle Items */}
                      {aisle.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-[#e2e8f0] ${idx % 2 === 0 ? "bg-[#ffffff]" : "bg-[#f8fafc]"}`}
                          style={{ pageBreakInside: "avoid" }}
                        >
                          {/* Clean Standard Square Checkbox */}
                          <td className="p-2 px-1 text-center align-middle">
                            <span className="inline-block w-[13px] h-[13px] border-[1.5px] border-[#64748b] rounded bg-[#ffffff] align-middle" />
                          </td>

                          {/* Ingredient Name + Multiplier Tag */}
                          <td className="p-2 px-2.5 font-bold text-[#0f172a] align-middle break-words">
                            <span className="text-[10px]">{item.name}</span>
                            {item.dishes && item.dishes.length > 1 && (
                              <span className="inline-flex items-center ml-1.5 bg-[#fef3c7] border border-[#fcd34d] text-[#78350f] text-[7.5px] font-extrabold px-1 py-0.5 rounded align-middle">
                                x{item.dishes.length} Dishes
                              </span>
                            )}
                          </td>

                          {/* Total Quantity */}
                          <td className="p-2 px-2.5 text-right font-black text-[#ea580c] align-middle whitespace-nowrap text-[10.5px]">
                            {item.displayQuantity}
                          </td>

                          {/* Dish Requirement Breakdown with clean structured badge chips */}
                          <td className="p-2 px-2.5 text-[#475569] align-middle break-words">
                            {item.dishBreakdown && item.dishBreakdown.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.dishBreakdown.map((db, i) => (
                                  <span
                                    key={i}
                                    className="inline-block bg-[#f1f5f9] border border-[#cbd5e1] rounded px-1.5 py-0.5 text-[7.5px] text-[#334155] leading-tight"
                                  >
                                    <strong>{db.dishName}</strong> ({db.portions}x):{" "}
                                    <span className="text-[#c2410c] font-extrabold ml-0.5">
                                      {db.displayQuantity}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#64748b] text-[7.5px]">
                                For: {item.dishes.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. SECTION 3: OFFICIAL VERIFICATION & SIGNATURE LINES */}
          {/* ======================================================== */}
          <div className="pdf-avoid-break mt-2.5 pt-2 border-t-[1.5px] border-[#cbd5e1] box-border" style={{ pageBreakInside: "avoid" }}>
            <p className="text-[7.5px] text-[#64748b] mb-2 leading-tight">
              <strong>Official Notice:</strong> This document is an official kitchen procurement manifest generated via FoodFlow Smart Kitchen Operations. All raw materials must be inspected for freshness, correct quantities, and hygiene compliance prior to store sign-off.
            </p>

            <div className="flex justify-between items-end pt-1">
              <div>
                <p className="mb-0.5 font-black text-[#0f172a] text-[10px]">
                  FoodFlow Kitchen Operations
                </p>
                <p className="m-0 text-[8px] text-[#64748b]">
                  Strict Restaurant Scoping: <strong>{restaurantName}</strong> &bull; Verified Database Requisition
                </p>
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <div className="w-[120px] border-b-[1.5px] border-[#94a3b8] mb-1" />
                  <p className="m-0 text-[8px] font-bold text-[#334155]">
                    Head Chef Signature
                  </p>
                  <p className="mt-0.5 text-[7px] text-[#94a3b8]">Date: _______________</p>
                </div>

                <div className="text-center">
                  <div className="w-[120px] border-b-[1.5px] border-[#94a3b8] mb-1" />
                  <p className="m-0 text-[8px] font-bold text-[#334155]">
                    Store / Procurement Officer
                  </p>
                  <p className="mt-0.5 text-[7px] text-[#94a3b8]">Date: _______________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 📦 ADD CUSTOM ITEM MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-[#FF6B35]" />
                  <span>Add Custom Grocery Item</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center text-sm font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddCustomItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Item / Ingredient Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cooking Foil, Mint Leaves, Oil 5L"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-900"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="L">L (Liter)</option>
                      <option value="ml">ml (Milliliter)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="pkt">pkt (Packets)</option>
                      <option value="can">can (Cans)</option>
                      <option value="bottle">bottle (Bottles)</option>
                      <option value="bunch">bunch (Bunches)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Supermarket Aisle Category
                  </label>
                  <select
                    value={customAisle}
                    onChange={(e) => setCustomAisle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-900"
                  >
                    {SUPERMARKET_AISLES.map((aisle) => (
                      <option key={aisle.id} value={aisle.name}>
                        {aisle.icon} {aisle.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#FF6B35] hover:bg-[#E85D2A] text-white rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    Add to List
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 🔐 SECRET RECIPE & RAW MATERIAL CONFIGURATION MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showRecipeModal && editingRecipeFood && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full border border-gray-150 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">
                        Secret Recipe & Grocery Mapping
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold tracking-wide uppercase border border-amber-200">
                        Confidential
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure raw ingredients per single portion. Stored securely in database for automated grocery scaling.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Target Food Overview Banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50/40 to-transparent border border-orange-200/70 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-white relative shrink-0 border border-orange-200 shadow-2xs">
                    {editingRecipeFood.image ? (
                      <Image
                        src={editingRecipeFood.image}
                        alt={editingRecipeFood.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">
                        🍲
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">
                      {editingRecipeFood.name}
                    </h4>
                    <p className="text-[11px] text-gray-600 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-orange-700">{editingRecipeFood.category || "General"}</span>
                      <span>•</span>
                      <span className="font-bold text-[#FF6B35]">৳{editingRecipeFood.price}</span>
                      <span>•</span>
                      <span>Base recipe scale: <strong>1 Portion</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuickInput(!showQuickInput)}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  {showQuickInput ? "Hide Bulk Input" : "⚡ Bulk Paste"}
                </button>
              </div>

              {/* Quick Presets Bar */}
              <div className="space-y-1.5 shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Quick Recipe Templates:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {RECIPE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset.items)}
                      className="px-2.5 py-1 rounded-xl bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 text-[11px] font-medium text-gray-700 hover:text-[#FF6B35] whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Text Input (Optional) */}
              {showQuickInput && (
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2 shrink-0">
                  <label className="block text-[11px] font-bold text-amber-900">
                    Paste comma-separated ingredients (e.g. 250g Chicken, 150g Rice, 2 tbsp Oil):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 250g Chicken Breast, 150g Basmati Rice, 50ml Mustard Oil, 1 tsp Salt"
                      value={quickInputText}
                      onChange={(e) => setQuickInputText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQuickText}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Parse & Add
                    </button>
                  </div>
                </div>
              )}

              {/* Ingredient Rows (Scrollable) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[160px] max-h-[280px] custom-scrollbar">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-1">
                  <div className="col-span-3">Quantity & Unit</div>
                  <div className="col-span-5">Raw Material / Ingredient</div>
                  <div className="col-span-3">Supermarket Aisle</div>
                  <div className="col-span-1 text-center">Del</div>
                </div>

                {recipeIngredientRows.map((row) => {
                  const detectedCategory = classifyIngredientName(row.name);
                  const aisleDef =
                    SUPERMARKET_AISLES.find((a) => a.name === detectedCategory) ||
                    SUPERMARKET_AISLES[SUPERMARKET_AISLES.length - 1];

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-2 items-center bg-gray-50/80 p-2 rounded-2xl border border-gray-200/80 hover:border-gray-300 transition-colors"
                    >
                      {/* Quantity & Unit */}
                      <div className="col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateRecipeRow(row.id, "quantity", e.target.value)
                          }
                          className="w-14 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          placeholder="Qty"
                        />
                        <select
                          value={row.unit}
                          onChange={(e) =>
                            handleUpdateRecipeRow(row.id, "unit", e.target.value)
                          }
                          className="flex-1 px-1.5 py-1.5 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                        >
                          <option value="g">g (Grams)</option>
                          <option value="kg">kg (Kilograms)</option>
                          <option value="ml">ml (Millilitres)</option>
                          <option value="L">L (Litres)</option>
                          <option value="pcs">pcs (Pieces / Count)</option>
                          <option value="tbsp">tbsp (Tablespoon)</option>
                          <option value="tsp">tsp (Teaspoon)</option>
                          <option value="cup">cup (Cup)</option>
                          <option value="cloves">cloves (Cloves)</option>
                          <option value="pkt">pkt (Packets)</option>
                          <option value="can">can (Cans)</option>
                          <option value="slice">slice (Slices)</option>
                          <option value="bunch">bunch (Bunches)</option>
                          <option value="pinch">pinch (Pinch)</option>
                        </select>
                      </div>

                      {/* Name */}
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Chicken Breast, Basmati Rice"
                          value={row.name}
                          onChange={(e) =>
                            handleUpdateRecipeRow(row.id, "name", e.target.value)
                          }
                          className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                        />
                      </div>

                      {/* Aisle Category Indicator */}
                      <div className="col-span-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-700 truncate w-full" title={detectedCategory}>
                          <span className="shrink-0">{aisleDef.icon}</span>
                          <span className="truncate">{aisleDef.name.split("(")[0].trim()}</span>
                        </span>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeRow(row.id)}
                          className="w-7 h-7 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Row Button */}
              <div className="pt-1 shrink-0">
                <button
                  type="button"
                  onClick={handleAddRecipeRow}
                  className="w-full py-2 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-xs font-bold text-gray-600 hover:text-[#FF6B35] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Raw Material</span>
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 shrink-0">
                <p className="text-[11px] text-gray-500">
                  Total <strong>{recipeIngredientRows.filter((r) => r.name.trim()).length}</strong> configured raw materials
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRecipeModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRecipe}
                    onClick={handleSaveSecretRecipe}
                    className="px-5 py-2 text-xs font-bold bg-[#FF6B35] hover:bg-[#E85D2A] text-white rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingRecipe ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Save Secret Recipe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

