/**
 * Curated static food backgrounds, lighting color presets,
 * and default prompt questions for the Restaurant AI Image Editor.
 */

export interface StudioBackground {
  id: string;
  name: string;
  category: "wood" | "luxury" | "marble" | "stone" | "nature";
  description: string;
  previewUrl: string;
  fallbackColor: string;
  ambientTint: string;
  defaultWarmth: number;
}

export interface StudioColorStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
  warmth: number; // 0 to 100 (Kelvin warmth shift)
  brightness: number; // 80 to 140%
  contrast: number; // 90 to 140%
  saturation: number; // 90 to 150% (Food vibrance)
  vignette: number; // 0 to 1
  lightGlow: boolean;
  glowColor: string;
  glowPosition: "top-left" | "top-center" | "top-right";
}

export interface StudioPromptIdea {
  id: string;
  question: string;
  prompt: string;
  badge: string;
  bgId: string;
  colorId: string;
}

export const STATIC_BACKGROUNDS: StudioBackground[] = [
  {
    id: "rustic-dishes-table",
    name: "Rustic Wood with Cultural Dishes",
    category: "wood",
    description: "Top view rustic wooden surface with spices and cultural food setting",
    previewUrl: "https://static.vecteezy.com/system/resources/thumbnails/049/974/382/small/top-view-of-vibrant-cultural-dishes-on-rustic-wooden-table-free-photo.jpg",
    fallbackColor: "#4a2810",
    ambientTint: "rgba(180, 110, 50, 0.12)",
    defaultWarmth: 32,
  },
  {
    id: "fresh-ingredients-table",
    name: "Fresh Ingredients & Herbs Table",
    category: "nature",
    description: "Top view with ripe tomatoes, garlic, peppers, lemon and olive oil",
    previewUrl: "https://img.freepik.com/free-photo/top-close-up-view-vegetables-tomatoes-with-pedicels-garlic-bell-peppers-lemon-oil-onion_140725-72203.jpg?w=740&q=80",
    fallbackColor: "#2a3b1e",
    ambientTint: "rgba(90, 160, 70, 0.1)",
    defaultWarmth: 20,
  },
  {
    id: "dark-gourmet-slate",
    name: "Dark Gourmet Textured Surface",
    category: "stone",
    description: "Moody dark stone table with rich chef plating atmosphere",
    previewUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpf5Zt3_IINyS_D809QGHGWQK0ZLh0DzycZbgxucMgow&s=10",
    fallbackColor: "#1c1f24",
    ambientTint: "rgba(30, 35, 45, 0.15)",
    defaultWarmth: 15,
  },
  {
    id: "wood-board-kitchen",
    name: "Wood Board & Kitchen Surface",
    category: "wood",
    description: "Warm wooden cutting board background with kitchen ambiance",
    previewUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuFOrG2-B3lZg0YDJtY7SE_ZVeRzwJiWdodzA_7Br05w&s=10",
    fallbackColor: "#5c3a1e",
    ambientTint: "rgba(190, 120, 60, 0.12)",
    defaultWarmth: 30,
  },
  {
    id: "spices-marble-counter",
    name: "Marble Counter with Spices",
    category: "marble",
    description: "Bright kitchen marble surface with colorful gourmet spices and herbs",
    previewUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsbrBHjqzRyiq1iFumU17WIgFPfSIwf4WhufyiZYob3g&s=10",
    fallbackColor: "#eaeef2",
    ambientTint: "rgba(240, 245, 255, 0.06)",
    defaultWarmth: 10,
  },
  {
    id: "rosemary-rustic-table",
    name: "Rustic Table with Rosemary & Spices",
    category: "wood",
    description: "Dark warm wood table with fresh rosemary sprigs and seasonings",
    previewUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWrwc7cY9XcJdWugxV-K2SnN3xdeS_kfYO6SNfaMJGbA&s=10",
    fallbackColor: "#3a2212",
    ambientTint: "rgba(180, 110, 50, 0.14)",
    defaultWarmth: 28,
  },
  {
    id: "restaurant-bokeh-table",
    name: "Restaurant Dining Table with Bokeh",
    category: "luxury",
    description: "Warm restaurant dining table with glowing ambient bokeh background",
    previewUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlYJd8kN_aczYAqKpGScozHydFvET_cc3akWvX0x73-Q&s=10",
    fallbackColor: "#2d1b10",
    ambientTint: "rgba(255, 170, 70, 0.15)",
    defaultWarmth: 38,
  },
];

export const STATIC_COLOR_STYLES: StudioColorStyle[] = [
  {
    id: "golden-hour",
    name: "Golden Hour Warmth",
    description: "Warm amber glow with soft cinematic sunbeam lighting and appetizing color warmth",
    icon: "🌅",
    warmth: 32,
    brightness: 106,
    contrast: 110,
    saturation: 116,
    vignette: 0.18,
    lightGlow: true,
    glowColor: "rgba(255, 185, 90, 0.28)",
    glowPosition: "top-left",
  },
  {
    id: "commercial-daylight",
    name: "Crisp Studio Daylight",
    description: "Bright, natural daylight with crystal clean textures and pure whites",
    icon: "☀️",
    warmth: 6,
    brightness: 110,
    contrast: 108,
    saturation: 110,
    vignette: 0.1,
    lightGlow: true,
    glowColor: "rgba(255, 255, 245, 0.18)",
    glowPosition: "top-center",
  },
  {
    id: "vibrant-fresh",
    name: "Ultra-Fresh & Vivid",
    description: "Vibrant color punch making sauce reds, herb greens and golden crusts pop",
    icon: "🥗",
    warmth: 14,
    brightness: 106,
    contrast: 114,
    saturation: 128,
    vignette: 0.12,
    lightGlow: false,
    glowColor: "transparent",
    glowPosition: "top-left",
  },
  {
    id: "moody-gourmet",
    name: "Moody Gourmet Spotlight",
    description: "Deep cinematic contrast with focused warm spotlight and rich shadows",
    icon: "🍷",
    warmth: 18,
    brightness: 96,
    contrast: 122,
    saturation: 114,
    vignette: 0.35,
    lightGlow: true,
    glowColor: "rgba(255, 195, 110, 0.22)",
    glowPosition: "top-center",
  },
  {
    id: "candlelight-romance",
    name: "Romantic Candlelight",
    description: "Intimate warm flickering flame tones with soft ambient honey glow",
    icon: "🕯️",
    warmth: 44,
    brightness: 102,
    contrast: 116,
    saturation: 120,
    vignette: 0.28,
    lightGlow: true,
    glowColor: "rgba(255, 145, 55, 0.28)",
    glowPosition: "top-right",
  },
];

export const DEFAULT_PROMPT_QUESTIONS: StudioPromptIdea[] = [
  {
    id: "idea-rustic-dishes",
    question: "Place this dish on a rustic wood table with cultural food setting",
    prompt: "Place the dish on a rustic wooden table surrounded by cultural food and spices with warm lighting",
    badge: "Rustic Wood Table",
    bgId: "rustic-dishes-table",
    colorId: "golden-hour",
  },
  {
    id: "idea-fresh-ingredients",
    question: "Place on a fresh ingredients table with tomatoes, garlic & herbs",
    prompt: "Place the food on a table surrounded by fresh ripe tomatoes, garlic, peppers and olive oil",
    badge: "Fresh Ingredients",
    bgId: "fresh-ingredients-table",
    colorId: "vibrant-fresh",
  },
  {
    id: "idea-restaurant-bokeh",
    question: "Place in a luxury fine dining restaurant with golden bokeh lights",
    prompt: "Place this dish in a luxury fine dining restaurant with golden bokeh lights and warm candlelight",
    badge: "Restaurant Bokeh",
    bgId: "restaurant-bokeh-table",
    colorId: "candlelight-romance",
  },
  {
    id: "idea-spices-marble",
    question: "Place on an elegant marble countertop with gourmet spices",
    prompt: "Place the food on a bright marble kitchen countertop with colorful gourmet spices and herbs",
    badge: "Spices Marble",
    bgId: "spices-marble-counter",
    colorId: "commercial-daylight",
  },
  {
    id: "idea-rosemary-wood",
    question: "Place on a dark rustic table with rosemary sprigs and seasonings",
    prompt: "Place the dish on a dark rustic wooden table with fresh rosemary sprigs and seasonings",
    badge: "Rosemary Wood",
    bgId: "rosemary-rustic-table",
    colorId: "golden-hour",
  },
  {
    id: "idea-dark-gourmet",
    question: "Give this dish a dark moody gourmet presentation with spotlight",
    prompt: "Present this dish on a dark charcoal textured stone with moody gourmet spotlight and rich contrast",
    badge: "Dark Gourmet Stone",
    bgId: "dark-gourmet-slate",
    colorId: "moody-gourmet",
  },
];

/**
 * Matches prompt keywords to auto-select matching static background and color style.
 */
export function matchPresetFromPrompt(promptText: string): {
  bg: StudioBackground;
  colorStyle: StudioColorStyle;
  customWarmth?: number;
} {
  const p = promptText.toLowerCase();

  let selectedBg = STATIC_BACKGROUNDS[0]; // default rustic dishes table

  if (p.includes("fresh") || p.includes("tomato") || p.includes("garlic") || p.includes("ingredient") || p.includes("vegetable")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "fresh-ingredients-table") || selectedBg;
  } else if (p.includes("marble") || p.includes("counter") || p.includes("white table")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "spices-marble-counter") || selectedBg;
  } else if (p.includes("bokeh") || p.includes("restaurant") || p.includes("fine dining") || p.includes("candle") || p.includes("luxury")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "restaurant-bokeh-table") || selectedBg;
  } else if (p.includes("dark") || p.includes("slate") || p.includes("stone") || p.includes("black") || p.includes("gourmet")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "dark-gourmet-slate") || selectedBg;
  } else if (p.includes("rosemary") || p.includes("seasoning") || p.includes("herbs")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "rosemary-rustic-table") || selectedBg;
  } else if (p.includes("board") || p.includes("cutting")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "wood-board-kitchen") || selectedBg;
  } else if (p.includes("wood") || p.includes("rustic") || p.includes("table") || p.includes("bg") || p.includes("background")) {
    selectedBg = STATIC_BACKGROUNDS.find((b) => b.id === "rustic-dishes-table") || selectedBg;
  }

  let selectedColor = STATIC_COLOR_STYLES[0]; // default golden hour
  if (p.includes("dark") || p.includes("moody") || p.includes("dramatic") || p.includes("spotlight")) {
    selectedColor = STATIC_COLOR_STYLES.find((c) => c.id === "moody-gourmet") || selectedColor;
  } else if (p.includes("fresh") || p.includes("vivid") || p.includes("vibrant") || p.includes("pop") || p.includes("color")) {
    selectedColor = STATIC_COLOR_STYLES.find((c) => c.id === "vibrant-fresh") || selectedColor;
  } else if (p.includes("daylight") || p.includes("clean light") || p.includes("crisp") || p.includes("commercial")) {
    selectedColor = STATIC_COLOR_STYLES.find((c) => c.id === "commercial-daylight") || selectedColor;
  } else if (p.includes("candle") || p.includes("romantic") || p.includes("cozy")) {
    selectedColor = STATIC_COLOR_STYLES.find((c) => c.id === "candlelight-romance") || selectedColor;
  } else if (p.includes("warm") || p.includes("sun") || p.includes("golden")) {
    selectedColor = STATIC_COLOR_STYLES.find((c) => c.id === "golden-hour") || selectedColor;
  }

  let customWarmth: number | undefined;
  if (p.includes("warmer") || p.includes("warm lighting")) {
    customWarmth = Math.max(selectedColor.warmth, 32);
  }

  return {
    bg: selectedBg,
    colorStyle: selectedColor,
    customWarmth,
  };
}
