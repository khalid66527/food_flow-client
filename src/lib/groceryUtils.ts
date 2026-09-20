export interface IDishIngredientBreakdown {
  dishName: string;
  portions: number;
  baseQuantity: number;
  scaledQuantity: number;
  displayQuantity: string;
  unit: string;
}

export interface IGroceryItem {
  id: string;
  name: string;
  quantity: number;
  displayQuantity: string;
  unit: string;
  category: string;
  aisleName: string;
  aisleIcon: string;
  dishes: string[];
  dishBreakdown: IDishIngredientBreakdown[];
  isChecked?: boolean;
  estimatedUnitCost?: number;
  notes?: string;
  isCustom?: boolean;
}

export interface IAisleSection {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  items: IGroceryItem[];
}

export interface ISelectedDishRequirement {
  foodId: string;
  name: string;
  category: string;
  image: string;
  price: number;
  portions: number;
  ingredients: string[];
}

export interface IDishRecipeDetail {
  foodId: string;
  name: string;
  category: string;
  price: number;
  portions: number;
  image: string;
  ingredients: Array<{
    raw: string;
    name: string;
    baseQuantity: number;
    scaledQuantity: number;
    displayQuantity: string;
    unit: string;
    category: string;
    aisleIcon: string;
  }>;
}

/**
 * Supermarket Aisle Definition with rich theme colors & icons
 */
export const SUPERMARKET_AISLES: Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
  {
    id: "produce",
    name: "Produce (Vegetables & Fresh Herbs)",
    icon: "🥦",
    color: "text-emerald-800",
    bgColor: "bg-emerald-50/70",
    borderColor: "border-emerald-200",
  },
  {
    id: "meat",
    name: "Meat & Poultry",
    icon: "🍗",
    color: "text-rose-800",
    bgColor: "bg-rose-50/70",
    borderColor: "border-rose-200",
  },
  {
    id: "seafood",
    name: "Fish & Seafood",
    icon: "🐟",
    color: "text-cyan-800",
    bgColor: "bg-cyan-50/70",
    borderColor: "border-cyan-200",
  },
  {
    id: "dairy",
    name: "Dairy, Eggs & Chilled",
    icon: "🧀",
    color: "text-amber-800",
    bgColor: "bg-amber-50/70",
    borderColor: "border-amber-200",
  },
  {
    id: "grains",
    name: "Grains, Rice, Flour & Pulses",
    icon: "🌾",
    color: "text-yellow-900",
    bgColor: "bg-yellow-50/70",
    borderColor: "border-yellow-200",
  },
  {
    id: "spices",
    name: "Spices, Herbs & Seasonings",
    icon: "🧂",
    color: "text-orange-800",
    bgColor: "bg-orange-50/70",
    borderColor: "border-orange-200",
  },
  {
    id: "oils",
    name: "Oils, Sauces & Condiments",
    icon: "🍶",
    color: "text-purple-800",
    bgColor: "bg-purple-50/70",
    borderColor: "border-purple-200",
  },
  {
    id: "bakery",
    name: "Bakery & Baking Supplies",
    icon: "🍞",
    color: "text-amber-900",
    bgColor: "bg-amber-50/50",
    borderColor: "border-amber-200",
  },
  {
    id: "beverages",
    name: "Beverages, Sweeteners & Syrups",
    icon: "☕",
    color: "text-teal-800",
    bgColor: "bg-teal-50/70",
    borderColor: "border-teal-200",
  },
  {
    id: "packaging",
    name: "Packaging & Kitchen Supplies",
    icon: "📦",
    color: "text-slate-800",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
  },
  {
    id: "pantry",
    name: "General Pantry Staples",
    icon: "🥫",
    color: "text-blue-800",
    bgColor: "bg-blue-50/70",
    borderColor: "border-blue-200",
  },
];

/**
 * Classify an ingredient into a standard supermarket aisle
 */
export const classifyIngredientName = (ingredientName: string): string => {
  const lower = (ingredientName || "").toLowerCase().trim();

  // Meat & Poultry
  if (
    /\b(chicken|beef|mutton|lamb|goat|duck|turkey|veal|kheema|mince|sausage|bacon|pork|meat|wings|drumstick|thigh|breast|patty)\b/i.test(
      lower
    )
  ) {
    return "Meat & Poultry";
  }

  // Seafood
  if (
    /\b(fish|salmon|tuna|prawn|prawns|shrimp|shrimps|crab|squid|lobster|rohu|rui|katla|hilsa|ilish|tilapia|bhetki|pomfret|calamari|seafood)\b/i.test(
      lower
    )
  ) {
    return "Fish & Seafood";
  }

  // Dairy & Eggs
  if (
    /\b(milk|yogurt|curd|dahi|ghee|butter|paneer|cheese|mozzarella|cheddar|cream|heavy cream|sour cream|egg|eggs|dim|condensed milk|whipping cream|mayo)\b/i.test(
      lower
    )
  ) {
    return "Dairy, Eggs & Chilled";
  }

  // Produce (Fresh Vegetables, Aromatics, Herbs)
  if (
    /\b(onion|onions|pyaj|tomato|tomatoes|potato|potatoes|alu|garlic|lasun|ginger|ada|coriander|dhaniya|mint|pudina|chili|chillies|chilli|morich|lemon|lime|capsicum|bell pepper|carrot|cabbage|cauliflower|cucumber|spinach|palak|mushroom|mushrooms|lettuce|herb|vegetable|vegetables|peas|green peas|eggplant|brinjal|begun|zucchini|broccoli|radish|okra|bhindi|curry leaves|lemongrass|spring onion|scallion|banana|apple|mango|orange|lime juice|lemon juice)\b/i.test(
      lower
    )
  ) {
    return "Produce (Vegetables & Fresh Herbs)";
  }

  // Grains, Rice, Flour & Pulses
  if (
    /\b(rice|basmati|polao|chinigura|kalijeera|dal|daal|lentil|lentils|chickpeas|chana|gram|flour|atta|maida|semolina|suji|cornstarch|corn flour|noodle|noodles|pasta|spaghetti|macaroni|oats|breadcrumbs|besan|vermicelli|shemai|quinoa)\b/i.test(
      lower
    )
  ) {
    return "Grains, Rice, Flour & Pulses";
  }

  // Spices & Seasonings
  if (
    /\b(salt|pepper|black pepper|turmeric|haldi|chili powder|mirch|garam masala|masala|cumin|jeera|coriander powder|cardamom|elaichi|cinnamon|dalchini|clove|cloves|laung|bay leaf|bay leaves|tej pata|mustard seed|fenugreek|methi|kasuri methi|saffron|kesar|zafran|paprika|oregano|rosemary|thyme|nutmeg|jaiphal|mace|javitri|star anise|chaat masala|biryani masala|tandoori masala|allspice|cajun|fennel|saunf)\b/i.test(
      lower
    )
  ) {
    return "Spices, Herbs & Seasonings";
  }

  // Oils, Sauces & Condiments
  if (
    /\b(oil|mustard oil|soybean oil|olive oil|vegetable oil|sunflower oil|sesame oil|canola oil|soy sauce|soya sauce|vinegar|ketchup|tomato paste|tomato puree|chili sauce|hot sauce|mayonnaise|mustard paste|kasundi|fish sauce|oyster sauce|bbq sauce|sweet chili|tahini|honey)\b/i.test(
      lower
    )
  ) {
    return "Oils, Sauces & Condiments";
  }

  // Bakery
  if (
    /\b(bread|bun|buns|burger bun|naan|roti|paratha|tortilla|pita|yeast|baking powder|baking soda|vanilla|vanilla extract|cocoa|cocoa powder|chocolate|dough)\b/i.test(
      lower
    )
  ) {
    return "Bakery & Baking Supplies";
  }

  // Beverages & Sweeteners
  if (
    /\b(sugar|brown sugar|jaggery|gur|tea|chai|green tea|coffee|espresso|syrup|caramel|juice|soda|club soda|sparkling water|tonic|drink mix)\b/i.test(
      lower
    )
  ) {
    return "Beverages, Sweeteners & Syrups";
  }

  // Packaging & Disposables
  if (
    /\b(box|container|foil|aluminum foil|cling film|paper bag|plastic bag|napkin|tissue|spoon|fork|knife|straw|cup|bowl|takeaway|disposable)\b/i.test(
      lower
    )
  ) {
    return "Packaging & Kitchen Supplies";
  }

  return "General Pantry Staples";
};

/**
 * Standardize units
 */
export const normalizeUnitString = (unitCandidate: string): string => {
  const u = (unitCandidate || "").toLowerCase().replace(/[.]+$/, "").trim();
  if (["g", "gm", "gram", "grams"].includes(u)) return "g";
  if (["kg", "kgs", "kilo", "kilogram", "kilograms"].includes(u)) return "kg";
  if (["ml", "milliliter", "millilitre"].includes(u)) return "ml";
  if (["l", "ltr", "liter", "liters", "litre", "litres"].includes(u)) return "L";
  if (["tbsp", "tablespoon", "tablespoons"].includes(u)) return "tbsp";
  if (["tsp", "teaspoon", "teaspoons"].includes(u)) return "tsp";
  if (["cup", "cups"].includes(u)) return "cup";
  if (["pinch", "pinches"].includes(u)) return "pinch";
  if (["pcs", "pc", "piece", "pieces"].includes(u)) return "pcs";
  if (["pkt", "packet", "packets", "pack", "packs"].includes(u)) return "pkt";
  if (["clove", "cloves"].includes(u)) return "cloves";
  if (["slice", "slices"].includes(u)) return "slices";
  if (["can", "cans"].includes(u)) return "can";
  if (["bunch", "bunches"].includes(u)) return "bunch";
  return u || "pcs";
};

/**
 * Intelligently suggests standard culinary units based on ingredient name
 * e.g., Oil, Water, Milk, Sauce, Vinegar -> "ml" / "L"
 * Meat, Rice, Flour, Veggies, Sugar -> "g" / "kg"
 * Eggs, Buns, Patties, Lemons, Cloves, Cans -> "pcs"
 * Spices, Salt, Pepper -> "g" / "tsp" / "tbsp"
 */
export const suggestDefaultUnitForIngredient = (ingredientName: string): string => {
  const lower = (ingredientName || "").toLowerCase().trim();
  if (!lower) return "g";

  // Liquids & Beverages -> ml / L
  if (
    /\b(oil|mustard oil|soybean oil|olive oil|vegetable oil|sunflower oil|sesame oil|milk|water|vinegar|sauce|soy sauce|soya sauce|fish sauce|oyster sauce|bbq sauce|hot sauce|chili sauce|syrup|juice|cream|heavy cream|curd|dahi|yogurt|broth|stock|puree|paste|honey|extract)\b/i.test(
      lower
    )
  ) {
    return "ml";
  }

  // Countable / Piece items -> pcs
  if (
    /\b(egg|eggs|dim|bun|buns|burger bun|patty|patties|lemon|lemons|lime|limes|slice|slices|bread|naan|roti|paratha|tortilla|pita|can|bottle|box|pack|packet|bay leaf|bay leaves|clove|cloves|cardamom|elaichi|cinnamon stick|star anise)\b/i.test(
      lower
    )
  ) {
    return "pcs";
  }

  // Bulk grains, meats, vegetables -> g
  return "g";
};

/**
 * Clean and format ingredient text
 */
export const cleanIngredientString = (name: string): string => {
  return name
    .replace(/^[-–,;:]+/, "")
    .replace(/[-–,;:]+$/, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format quantity into nice readable string
 */
export const formatDisplayQuantityString = (quantity: number, unit: string): string => {
  const rounded = Math.round(quantity * 100) / 100;

  if (unit === "g" && rounded >= 1000) {
    const inKg = Math.round((rounded / 1000) * 100) / 100;
    return `${inKg} kg`;
  }

  if (unit === "ml" && rounded >= 1000) {
    const inL = Math.round((rounded / 1000) * 100) / 100;
    return `${inL} L`;
  }

  if (unit === "portion" || unit === "unit") {
    return `${rounded} ${unit}${rounded > 1 ? "s" : ""}`;
  }

  return `${rounded} ${unit}`;
};

const RECOGNIZED_UNITS = [
  "g", "gm", "gram", "grams", "kg", "kgs", "kilo", "kilogram", "kilograms",
  "ml", "l", "ltr", "liter", "liters", "litre", "litres",
  "tbsp", "tsp", "cup", "cups", "pinch", "pinches", "pcs", "pc",
  "piece", "pieces", "pkt", "packet", "packets", "pack", "packs",
  "clove", "cloves", "slice", "slices", "can", "cans", "bottle", "bottles",
  "tbsp.", "tsp.", "bunch", "bunches"
];

/**
 * Parse an ingredient string into numeric quantity, standard unit, and clean name
 * Supports:
 * - "500g Basmati Rice" or "1.5 kg Chicken"
 * - "Basmati Rice 500g" or "Chicken 1.5kg"
 * - "Basmati Rice (500g)"
 * - "2 tbsp Ginger Paste" or "Ginger Paste 2 tbsp"
 * - "Salt to taste"
 */
export const parseRawIngredient = (
  raw: string
): { quantity: number; unit: string; name: string } => {
  if (!raw || typeof raw !== "string") {
    return { quantity: 1, unit: "unit", name: "Ingredient" };
  }

  const cleaned = raw.trim();

  // Pattern 1: Leading quantity & unit (e.g., "500g Basmati Rice", "1.5 kg Chicken", "2 tbsp Oil")
  const leadingMatch = cleaned.match(/^([\d./]+)\s*([a-zA-Z]+)?\s*[:\-–]?\s*(.*)$/);
  if (leadingMatch) {
    const rawVal = leadingMatch[1];
    let qty = 1;
    if (rawVal.includes("/")) {
      const parts = rawVal.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) !== 0) {
        qty = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      qty = parseFloat(rawVal) || 1;
    }

    const unitCandidate = (leadingMatch[2] || "").toLowerCase();
    const restName = (leadingMatch[3] || "").trim();

    if (RECOGNIZED_UNITS.includes(unitCandidate)) {
      const standardUnit = normalizeUnitString(unitCandidate);
      const name = restName || cleaned;
      return { quantity: qty, unit: standardUnit, name: cleanIngredientString(name) };
    }

    if (restName) {
      const combinedName = `${leadingMatch[2]} ${restName}`.trim();
      return { quantity: qty, unit: "pcs", name: cleanIngredientString(combinedName) };
    }

    if (unitCandidate) {
      return { quantity: qty, unit: "pcs", name: cleanIngredientString(unitCandidate) };
    }
  }

  // Pattern 2: Trailing parentheses quantity (e.g., "Basmati Rice (500g)", "Chicken (1.5 kg)")
  const parenMatch = cleaned.match(/^(.*?)\s*\(([\d./]+)\s*([a-zA-Z]+)?\)$/);
  if (parenMatch) {
    const name = cleanIngredientString(parenMatch[1]);
    const rawVal = parenMatch[2];
    let qty = 1;
    if (rawVal.includes("/")) {
      const parts = rawVal.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) !== 0) {
        qty = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      qty = parseFloat(rawVal) || 1;
    }
    const unitCandidate = (parenMatch[3] || "pcs").toLowerCase();
    return { quantity: qty, unit: normalizeUnitString(unitCandidate), name };
  }

  // Pattern 3: Trailing quantity & unit (e.g., "Basmati Rice 500g", "Chicken 1.5kg", "Mustard Oil 250ml", "Eggs 4pcs")
  const trailingMatch = cleaned.match(/^(.*?)\s+([\d./]+)\s*([a-zA-Z]+)?$/);
  if (trailingMatch) {
    const nameCandidate = cleanIngredientString(trailingMatch[1]);
    const rawVal = trailingMatch[2];
    let qty = 1;
    if (rawVal.includes("/")) {
      const parts = rawVal.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) !== 0) {
        qty = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      qty = parseFloat(rawVal) || 1;
    }
    const unitCandidate = (trailingMatch[3] || "").toLowerCase();

    if (RECOGNIZED_UNITS.includes(unitCandidate)) {
      return {
        quantity: qty,
        unit: normalizeUnitString(unitCandidate),
        name: nameCandidate,
      };
    } else if (!unitCandidate) {
      return {
        quantity: qty,
        unit: "pcs",
        name: nameCandidate,
      };
    }
  }

  // Fallback: No numeric quantity
  return {
    quantity: 1,
    unit: "portion",
    name: cleanIngredientString(cleaned),
  };
};

/**
 * Aggregates all ingredients from selected menu items scaled by portions
 * Strictly maps only selected dishes to their corresponding raw materials
 */
export const aggregateIngredientsClient = (
  selectedDishes: ISelectedDishRequirement[],
  customItems: IGroceryItem[] = []
): {
  aisleSections: IAisleSection[];
  dishSections: IDishRecipeDetail[];
  totalDishesCount: number;
  totalPortionsCount: number;
  totalUniqueIngredientsCount: number;
} => {
  const map = new Map<
    string,
    {
      name: string;
      category: string;
      quantity: number;
      unit: string;
      dishes: Set<string>;
      dishBreakdown: IDishIngredientBreakdown[];
    }
  >();

  const dishSections: IDishRecipeDetail[] = [];
  let totalPortionsCount = 0;

  selectedDishes.forEach((dish) => {
    const portions = Math.max(1, dish.portions || 1);
    totalPortionsCount += portions;

    const rawList = Array.isArray(dish.ingredients)
      ? dish.ingredients
      : typeof dish.ingredients === "string"
      ? (dish.ingredients as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const dishRecipeItems: IDishRecipeDetail["ingredients"] = [];

    rawList.forEach((raw) => {
      if (!raw || !raw.trim()) return;

      const parsed = parseRawIngredient(raw);
      const category = classifyIngredientName(parsed.name);
      const aisleDef =
        SUPERMARKET_AISLES.find((a) => a.name === category) ||
        SUPERMARKET_AISLES[SUPERMARKET_AISLES.length - 1];

      const scaledQty = parsed.quantity * portions;
      const displayQty = formatDisplayQuantityString(scaledQty, parsed.unit);

      dishRecipeItems.push({
        raw,
        name: parsed.name,
        baseQuantity: parsed.quantity,
        scaledQuantity: scaledQty,
        displayQuantity: displayQty,
        unit: parsed.unit,
        category,
        aisleIcon: aisleDef.icon,
      });

      const key = `${category}:::${parsed.name.toLowerCase()}:::${parsed.unit}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantity += scaledQty;
        existing.dishes.add(dish.name);
        existing.dishBreakdown.push({
          dishName: dish.name,
          portions,
          baseQuantity: parsed.quantity,
          scaledQuantity: scaledQty,
          displayQuantity: displayQty,
          unit: parsed.unit,
        });
      } else {
        map.set(key, {
          name: parsed.name,
          category,
          quantity: scaledQty,
          unit: parsed.unit,
          dishes: new Set([dish.name]),
          dishBreakdown: [
            {
              dishName: dish.name,
              portions,
              baseQuantity: parsed.quantity,
              scaledQuantity: scaledQty,
              displayQuantity: displayQty,
              unit: parsed.unit,
            },
          ],
        });
      }
    });

    dishSections.push({
      foodId: dish.foodId,
      name: dish.name,
      category: dish.category,
      price: dish.price,
      portions,
      image: dish.image,
      ingredients: dishRecipeItems,
    });
  });

  // Group into Aisle Sections
  const aisleMap = new Map<string, IAisleSection>();
  SUPERMARKET_AISLES.forEach((aisle) => {
    aisleMap.set(aisle.name, {
      id: aisle.id,
      name: aisle.name,
      icon: aisle.icon,
      color: aisle.color,
      bgColor: aisle.bgColor,
      borderColor: aisle.borderColor,
      items: [],
    });
  });

  let totalUniqueIngredientsCount = 0;

  map.forEach((entry) => {
    totalUniqueIngredientsCount++;
    const targetSection =
      aisleMap.get(entry.category) || aisleMap.get("General Pantry Staples")!;
    const aisleDef =
      SUPERMARKET_AISLES.find((a) => a.name === entry.category) ||
      SUPERMARKET_AISLES[SUPERMARKET_AISLES.length - 1];

    targetSection.items.push({
      id: `agg-${Math.random().toString(36).substring(2, 9)}`,
      name: entry.name,
      quantity: Math.round(entry.quantity * 100) / 100,
      displayQuantity: formatDisplayQuantityString(entry.quantity, entry.unit),
      unit: entry.unit,
      category: entry.category,
      aisleName: entry.category,
      aisleIcon: aisleDef.icon,
      dishes: Array.from(entry.dishes),
      dishBreakdown: entry.dishBreakdown,
      isChecked: false,
    });
  });

  // Add custom manual items
  customItems.forEach((cItem) => {
    totalUniqueIngredientsCount++;
    const catName = cItem.aisleName || cItem.category || "General Pantry Staples";
    const targetSection =
      aisleMap.get(catName) || aisleMap.get("General Pantry Staples")!;

    targetSection.items.push(cItem);
  });

  // Filter non-empty aisles & sort items alphabetically
  const activeSections = Array.from(aisleMap.values())
    .filter((s) => s.items.length > 0)
    .map((s) => ({
      ...s,
      items: s.items.sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return {
    aisleSections: activeSections,
    dishSections,
    totalDishesCount: selectedDishes.length,
    totalPortionsCount,
    totalUniqueIngredientsCount,
  };
};

/**
 * Generate PDF using html2pdf.js with bulletproof rendering options
 */
export const exportGroceryListToPdf = async (
  elementIdOrElement: string | HTMLElement,
  fileName: string = "FoodFlow-Smart-Grocery-List.pdf"
): Promise<boolean> => {
  try {
    if (typeof window === "undefined") return false;

    const sourceElement =
      typeof elementIdOrElement === "string"
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!sourceElement) {
      console.error(`Element '${elementIdOrElement}' not found for PDF generation.`);
      return false;
    }

    // Dynamic import for html2pdf.js with full ESM / CJS interop fallback
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf =
      (html2pdfModule as any).default?.default ||
      (html2pdfModule as any).default ||
      html2pdfModule;

    if (typeof html2pdf !== "function") {
      console.error("html2pdf is not a valid callable function:", html2pdfModule);
      return false;
    }

    const opt = {
      margin: [6, 6, 6, 6] as [number, number, number, number],
      filename: fileName,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: "#ffffff",
      },
      jsPDF: {
        unit: "mm" as const,
        format: "a4" as const,
        orientation: "portrait" as const,
      },
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".pdf-aisle-group", ".pdf-avoid-break"] },
    };

    await html2pdf(sourceElement, opt);
    return true;
  } catch (error) {
    console.error("Error exporting grocery list as PDF:", error);
    return false;
  }
};
