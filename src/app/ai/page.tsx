"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Bot,
  User,
  Loader2,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Flame,
  Star,
  Sparkles,
  Phone,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShoppingBag,
  Heart,
  Store,
  Bike,
  ShieldCheck,
  Trash2,
  ArrowRight,
  ExternalLink,
  Banknote,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/contexts/CartContext";
import { IGlobalFoodItem } from "@/types/restaurant";
import { 
  getUserFavoritesApi, 
  toggleFavoriteApi, 
  removeFavoriteApi 
} from "@/lib/api/favorite";
import { TFavoriteItem } from "@/types/favorite";
import { toast } from "react-toastify";

/* ------------------------------------------------------------------ */
/*  Types & Interfaces                                                */
/* ------------------------------------------------------------------ */

interface RecommendedFood {
  id: string;
  restaurantId?: string;
  name: string;
  price: number;
  discountPrice?: number;
  restaurantName?: string;
  image?: string;
  rating?: number;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  description?: string;
}

interface OrderStatusData {
  orderId: string;
  status: string;
  totalAmount?: number;
  riderName?: string;
  riderPhone?: string;
  eta?: string;
}

interface ActionButton {
  type: "ADD_TO_CART" | "CHECKOUT" | "TRACK_ORDER" | "NAVIGATE" | "CUSTOM" | string;
  foodId?: string;
  restaurantId?: string;
  name?: string;
  price?: number;
  image?: string;
  target?: string;
  label: string;
}

interface ActionExecuteDirective {
  action: "ADD_TO_CART" | "REMOVE_FROM_CART" | "CLEAR_CART" | "ADD_TO_FAVORITE" | "REMOVE_FROM_FAVORITE" | "CHECK_ORDERS" | "NAVIGATE";
  foodId?: string;
  foodName?: string;
  price?: number;
  restaurantId?: string;
  image?: string;
  quantity?: number;
  target?: string;
  label?: string;
}

interface ParsedMessageContent {
  cleanMarkdown: string;
  recommendedFoods: RecommendedFood[];
  orderStatus: OrderStatusData | null;
  actionButtons: ActionButton[];
  actionExecute: ActionExecuteDirective | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: ParsedMessageContent;
  timestamp: Date;
  feedback?: "like" | "dislike" | null;
}

/* ------------------------------------------------------------------ */
/*  Parser Helper for Structured AI Tokens                             */
/* ------------------------------------------------------------------ */

function sanitizeFoodImage(img?: string): string {
  if (!img || typeof img !== "string" || img.startsWith("data:") || img.length > 250) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
  }
  return img;
}

function parseMessageContent(raw: string): ParsedMessageContent {
  let text = raw;
  let recommendedFoods: RecommendedFood[] = [];
  let orderStatus: OrderStatusData | null = null;
  let actionButtons: ActionButton[] = [];
  let actionExecute: ActionExecuteDirective | null = null;

  // 1. Action Execute block: ```action_execute ... ```
  const actionExecRegex = /```(?:action_execute|json:action)?\s*(\{\s*"action"[\s\S]*?\}\s*)\s*```?/i;
  const actionExecMatch = text.match(actionExecRegex);
  if (actionExecMatch) {
    try {
      actionExecute = JSON.parse(actionExecMatch[1].trim());
    } catch (e) {
      console.warn("Could not parse action execute JSON", e);
    }
    text = text.replace(actionExecRegex, "").trim();
  }

  // 2. Food Recommendations block: ```food_recommendations ... ```
  const foodBlockRegex = /```(?:food_recommendations|json)?\s*(\[\s*\{[\s\S]*?"id"[\s\S]*?\}\s*\])\s*```?/i;
  const foodMatch = text.match(foodBlockRegex);
  if (foodMatch) {
    try {
      const parsed = JSON.parse(foodMatch[1].trim());
      if (Array.isArray(parsed)) {
        recommendedFoods = parsed.map((f: any) => ({
          ...f,
          image: sanitizeFoodImage(f.image),
        }));
      }
    } catch (e) {
      console.warn("Could not parse food recommendations JSON", e);
    }
    text = text.replace(foodBlockRegex, "").trim();
  } else {
    // Check for raw array without backticks
    const rawArrayRegex = /\[\s*\{\s*"id"[\s\S]*?\}\s*\]/i;
    const rawMatch = text.match(rawArrayRegex);
    if (rawMatch) {
      try {
        const parsed = JSON.parse(rawMatch[0].trim());
        if (Array.isArray(parsed) && parsed[0]?.name) {
          recommendedFoods = parsed.map((f: any) => ({
            ...f,
            image: sanitizeFoodImage(f.image),
          }));
          text = text.replace(rawArrayRegex, "").trim();
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Order Status block: ```order_status ... ```
  const orderBlockRegex = /```(?:order_status|json)?\s*(\{\s*"orderId"[\s\S]*?\}\s*)\s*```?/i;
  const orderMatch = text.match(orderBlockRegex);
  if (orderMatch) {
    try {
      orderStatus = JSON.parse(orderMatch[1].trim());
    } catch (e) {
      console.warn("Could not parse order status JSON", e);
    }
    text = text.replace(orderBlockRegex, "").trim();
  }

  // 4. Action buttons block: ```action_buttons ... ```
  const actionBlockRegex = /```(?:action_buttons|json)?\s*(\[\s*\{[\s\S]*?"type"[\s\S]*?\}\s*\])\s*```?/i;
  const actionMatch = text.match(actionBlockRegex);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1].trim());
      if (Array.isArray(parsed)) {
        actionButtons = parsed;
      }
    } catch (e) {
      console.warn("Could not parse action buttons JSON", e);
    }
    text = text.replace(actionBlockRegex, "").trim();
  }

  // Strip any leftover unclosed markdown codeblock tags
  text = text.replace(/```(?:action_execute|food_recommendations|order_status|action_buttons)?/gi, "").trim();

  return {
    cleanMarkdown: text,
    recommendedFoods,
    orderStatus,
    actionButtons,
    actionExecute,
  };
}

/* ------------------------------------------------------------------ */
/*  Role Helper & Preset Prompts                                       */
/* ------------------------------------------------------------------ */

type AppRole = "customer" | "restaurant" | "rider" | "admin" | "guest";

function getNormalizedRole(rawRole?: string): AppRole {
  if (typeof window !== "undefined") {
    try {
      const restData = localStorage.getItem("foodflow_restaurant_data");
      if (restData) return "restaurant";
    } catch {
      // ignore
    }
  }

  if (!rawRole) return "guest";
  const r = rawRole.toLowerCase();
  if (r.includes("restaurant") || r.includes("partner")) return "restaurant";
  if (r.includes("rider") || r.includes("delivery")) return "rider";
  if (r.includes("admin")) return "admin";
  if (r.includes("customer")) return "customer";
  return "customer";
}

const ROLE_PRESET_PROMPTS: Record<AppRole, Array<{ label: string; icon: string; query: string }>> = {
  customer: [
    { label: "🍔 ৫০০ টাকায় ঝাল খাবার", icon: "Flame", query: "আমার বাজেট ৫০০ টাকা, ২ জনের জন্য ঝাল খাবারের প্যাকেজ সাজেস্ট করো" },
    { label: "❤️ ফেভারিট খাবার তালিকা", icon: "Heart", query: "আমার ফেভারিট তালিকায় থাকা খাবারগুলো দেখাও" },
    { label: "🛒 কার্ট ও মোট খরচ", icon: "ShoppingCart", query: "আমার কার্টে কী কী আইটেম আছে এবং ডেলিভারি চার্জসহ মোট কত?" },
    { label: "📦 অর্ডার লাইভ স্ট্যাটাস", icon: "Package", query: "আমার সাম্প্রতিক অর্ডারের লাইভ স্ট্যাটাস ও রাইডারের তথ্য দেখাও" },
    { label: "🏷️ ডিসকাউন্ট কুপন", icon: "Sparkles", query: "বর্তমানে কী কী আকর্ষণীয় ডিসকাউন্ট কুপন ও অফার চলছে?" },
  ],
  restaurant: [
    { label: "📦 রানিং অর্ডারসমূহ", icon: "Package", query: "আমার রেস্টুরেন্টের বর্তমান রানিং ও সক্রিয় অর্ডারগুলো দেখাও" },
    { label: "🍕 মেনু ও খাবার তালিকা", icon: "UtensilsCrossed", query: "আমার রেস্টুরেন্টের বর্তমান মেনু আইটেমগুলো দেখাও" },
    { label: "💰 সেলস ও আয় সামারি", icon: "Banknote", query: "আমার রেস্টুরেন্টের মোট সেলস ও রেভিনিউ সামারি দেখাও" },
    { label: "📝 নতুন খাবার ডেসক্রিপশন", icon: "Sparkles", query: "আমার একটি নতুন প্রিমিয়াম খাবারের জন্য আকর্ষণীয় ডেসক্রিপশন লিখে দাও" },
    { label: "⚙️ রেস্টুরেন্ট ড্যাশবোর্ড", icon: "Store", query: "আমাকে রেস্টুরেন্ট অর্ডার ম্যানেজমেন্ট পেজে নিয়ে যাও" },
  ],
  rider: [
    { label: "🛵 দ্রুত ডেলিভারি টিপস", icon: "Bike", query: "পিক আওয়ারে খাবার গরম রেখে দ্রুত ডেলিভারি করার সেরা টিপস কী?" },
    { label: "💰 রাইডার আর্নিংস ও বোনাস", icon: "Sparkles", query: "FoodFlow-তে রাইডারদের ডেলিভারি কমিশন ও বোনাস কীভাবে হিসাব হয়?" },
    { label: "📍 কাস্টমার লোকেশন গাইড", icon: "Phone", query: "কাস্টমার ঠিকানা খুঁজে পেতে সমস্যা হলে কী করণীয়?" },
  ],
  admin: [
    { label: "📊 প্ল্যাটফর্ম সামারি", icon: "ShieldCheck", query: "FoodFlow প্ল্যাটফর্মের বর্তমান সক্রিয় রেস্টুরেন্ট, রাইডার ও অর্ডার সামারি দাও" },
    { label: "🛡️ পার্টনার অ্যাপ্রুভাল নিয়ম", icon: "Store", query: "নতুন রেস্টুরেন্ট ও রাইডার ভেরিফিকেশন এবং নীতিমালার নিয়মগুলো কী?" },
  ],
  guest: [
    { label: "🔥 প্ল্যাটফর্মের সেরা খাবার", icon: "Sparkles", query: "FoodFlow-তে সবচেয়ে জনপ্রিয় ও সেরা রেটিংয়ের খাবারগুলো দেখাও" },
    { label: "🚀 কীভাবে অর্ডার করবেন?", icon: "ShoppingBag", query: "FoodFlow-তে অ্যাকাউন্ট খুলে কীভাবে খাবার অর্ডার করতে হয়?" },
    { label: "🏪 রেস্টুরেন্ট পার্টনার রেজিস্ট্রেশন", icon: "Store", query: "রেস্টুরেন্ট ওনার হিসেবে FoodFlow-তে যুক্ত হওয়ার নিয়ম কী?" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Main Navbar AI Assistant Page Component                           */
/* ------------------------------------------------------------------ */

export default function AIAssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items: cartItems, addItem, removeItem, clearCart, openCartDrawer } = useCart();

  const user = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;
  const [userRole, setUserRole] = useState<AppRole>(() => getNormalizedRole(user?.role));
  const userId = user?.id;
  const userEmail = user?.email;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<TFavoriteItem[]>([]);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync user role on mount or session changes
  useEffect(() => {
    setUserRole(getNormalizedRole(user?.role));
  }, [user?.role]);

  // Auto-scroll only the internal messages container without jumping the browser window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);


  // Load User Favorites
  const loadUserFavorites = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getUserFavoritesApi(userId, userEmail);
      if (res.success && Array.isArray(res.data)) {
        setFavorites(res.data);
        const map: Record<string, boolean> = {};
        res.data.forEach((fav) => {
          map[fav.foodId] = true;
        });
        setFavoriteMap(map);
      }
    } catch {
      // ignore
    }
  }, [userId, userEmail]);

  useEffect(() => {
    loadUserFavorites();
  }, [loadUserFavorites]);

  // Initialize Welcome Message on First Load
  useEffect(() => {
    if (messages.length === 0) {
      let initialGreeting = "";
      if (userRole === "customer") {
        initialGreeting = `স্বাগতম **${user?.name || "Customer"}**! 👋 আমি **FoodFlow AI Super Assistant**।\n\nআপনি সাইটে যা যা করতে চান (যেমন: খাবার কার্টে যোগ করা, ফেভারিট সেভ বা ডিলিট করা, অর্ডার ট্র্যাক করা, বা সরাসরি চেকআউট) সবকিছু আমাকে লিখে বা বলে করাতে পারেন! 🍔`;
      } else if (userRole === "restaurant") {
        initialGreeting = `স্বাগতম **${user?.name || "Restaurant Partner"}**! 🏪 আমি আপনার **FoodFlow Restaurant Assistant**।\n\nআপনি রানিং অর্ডার চেক করতে, মেনু খাবার দেখতে বা সেলস ও রেভিনিউ হিসাব জানতে আমাকে প্রশ্ন করতে পারেন।`;
      } else if (userRole === "rider") {
        initialGreeting = `স্বাগতম **${user?.name || "Rider Hero"}**! 🛵 আমি আপনার ডেলিভারি ও রুট গাইড। আজকের ট্রিপ, আয় হিসাব বা যেকোনো সহায়তার জন্য আমাকে জানান।`;
      } else if (userRole === "admin") {
        initialGreeting = `স্বাগতম **Admin Panel Manager**! 🛡️ প্ল্যাটফর্মের ডেটা ওভারভিউ, সিস্টেম কনফিগারেশন বা যেকোনো সহায়তা প্রস্তুত।`;
      } else {
        initialGreeting = `স্বাগতম FoodFlow-তে! 👋 আপনার পছন্দের খাবার খুঁজে নিতে, মেনু দেখতে বা অর্ডার করতে আমাকে যেকোনো প্রশ্ন করতে পারেন।`;
      }

      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: initialGreeting,
          parsed: parseMessageContent(initialGreeting),
          timestamp: new Date(),
        },
      ]);
    }
  }, [userRole, user?.name, messages.length]);

  // Execute Agentic Action Directive
  const executeAgentAction = useCallback(
    async (actionObj: ActionExecuteDirective) => {
      if (!actionObj || !actionObj.action) return;

      switch (actionObj.action) {
        case "ADD_TO_CART": {
          if (userRole !== "restaurant" && actionObj.foodId) {
            const foodPayload: IGlobalFoodItem = {
              _id: actionObj.foodId,
              restaurantId: actionObj.restaurantId || "foodflow-kitchen",
              name: actionObj.foodName || "Food Item",
              price: actionObj.price || 0,
              discountPrice: undefined,
              image: actionObj.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
              restaurantName: "FoodFlow Kitchen",
              description: "",
              category: "Dishes",
              status: "available",
              isAvailable: true,
              restaurantSlug: "foodflow",
              restaurantLogo: "",
              restaurantIsOpen: true,
              restaurantRating: 4.8,
              restaurantReviewCount: 15,
            };
            addItem(foodPayload, actionObj.quantity || 1);
            setAddedItems((prev) => ({ ...prev, [actionObj.foodId!]: true }));
            toast.success(`'${actionObj.foodName || "খাবার"}' কার্টে যুক্ত করা হয়েছে! 🛒`);
            setTimeout(() => {
              setAddedItems((prev) => ({ ...prev, [actionObj.foodId!]: false }));
            }, 2500);
          }
          break;
        }

        case "REMOVE_FROM_CART": {
          if (actionObj.foodId) {
            removeItem(actionObj.foodId);
            toast.info(`'${actionObj.foodName || "খাবার"}' কার্ট থেকে বাদ দেওয়া হয়েছে।`);
          }
          break;
        }

        case "CLEAR_CART": {
          clearCart();
          toast.info("আপনার কার্ট পুরোপুরি খালি করা হয়েছে।");
          break;
        }

        case "ADD_TO_FAVORITE": {
          if (actionObj.foodId && userId) {
            const res = await toggleFavoriteApi(actionObj.foodId, userId, userEmail);
            if (res.success) {
              setFavoriteMap((prev) => ({ ...prev, [actionObj.foodId!]: true }));
              toast.success(`'${actionObj.foodName || "খাবার"}' ফেভারিট লিস্টে যোগ করা হয়েছে! ❤️`);
              loadUserFavorites();
            }
          }
          break;
        }

        case "REMOVE_FROM_FAVORITE": {
          if (actionObj.foodId && userId) {
            const res = await removeFavoriteApi(actionObj.foodId, userId, userEmail);
            if (res.success) {
              setFavoriteMap((prev) => ({ ...prev, [actionObj.foodId!]: false }));
              toast.info(`'${actionObj.foodName || "খাবার"}' ফেভারিট থেকে মুছে ফেলা হয়েছে।`);
              loadUserFavorites();
            }
          }
          break;
        }

        case "NAVIGATE": {
          if (actionObj.target) {
            toast.info(`নেভিগেট করা হচ্ছে... 🚀`);
            setTimeout(() => {
              router.push(actionObj.target!);
            }, 800);
          }
          break;
        }

        default:
          break;
      }
    },
    [userRole, addItem, removeItem, clearCart, userId, userEmail, loadUserFavorites, router]
  );

  // Send Message & Process Agent Flow
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          userRole: userRole,
          cartItems: cartItems.map((item) => ({
            id: item.foodItem?._id || (item as any)?.foodId || (item as any)?.id,
            name: item.foodItem?.name || (item as any)?.name || "খাবার আইটেম",
            price: item.foodItem?.discountPrice || item.foodItem?.price || (item as any)?.price || 0,
            quantity: item.quantity || 1,
          })),
        }),
      });

      const data = await response.json();

      if (data.userRole && data.userRole !== userRole) {
        setUserRole(data.userRole as AppRole);
      }

      if (data.success && data.reply) {
        const parsed = parseMessageContent(data.reply);

        // If AI emitted an autonomous action execution directive, execute it automatically!
        if (parsed.actionExecute) {
          executeAgentAction(parsed.actionExecute);
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          parsed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorText = `⚠️ দুঃখিত, রিকোয়েস্ট প্রসেস করতে সমস্যা হয়েছে: ${data.error || "কিছুক্ষণ পর আবার চেষ্টা করুন।"}`;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: errorText,
            parsed: parseMessageContent(errorText),
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      const errMessage = "⚠️ ইন্টারনেট সংযোগে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: errMessage,
          parsed: parseMessageContent(errMessage),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quantity helpers
  const handleQuantityChange = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  // Add to cart directly from Card
  const handleAddToCart = (food: RecommendedFood) => {
    const qty = quantities[food.id] || 1;
    const foodItemPayload: IGlobalFoodItem = {
      _id: food.id,
      restaurantId: food.restaurantId || "foodflow-kitchen",
      name: food.name,
      price: food.price,
      discountPrice: food.discountPrice,
      image: food.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
      restaurantName: food.restaurantName || "FoodFlow Kitchen",
      restaurantSlug: (food.restaurantName || "foodflow").toLowerCase().replace(/\s+/g, "-"),
      restaurantLogo: "",
      restaurantIsOpen: true,
      restaurantRating: food.rating || 4.8,
      restaurantReviewCount: 24,
      description: food.description || "",
      category: "Dishes",
      status: "available",
      isAvailable: true,
      isSpicy: food.isSpicy,
      isVegetarian: food.isVegetarian,
    };

    addItem(foodItemPayload, qty);
    setAddedItems((prev) => ({ ...prev, [food.id]: true }));
    toast.success(`'${food.name}' কার্টে যুক্ত করা হয়েছে! 🛒`);

    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [food.id]: false }));
    }, 2500);
  };

  // Toggle favorite on Card
  const handleToggleFavorite = async (food: RecommendedFood) => {
    if (!userId) {
      toast.warn("ফেভারিট সেভ করতে দয়া করে লগইন করুন।");
      router.push("/auth/login");
      return;
    }

    try {
      const isCurrentlyFav = favoriteMap[food.id];
      if (isCurrentlyFav) {
        const res = await removeFavoriteApi(food.id, userId, userEmail);
        if (res.success) {
          setFavoriteMap((prev) => ({ ...prev, [food.id]: false }));
          toast.info(`'${food.name}' ফেভারিট থেকে বাদ দেওয়া হয়েছে।`);
          loadUserFavorites();
        }
      } else {
        const res = await toggleFavoriteApi(food.id, userId, userEmail);
        if (res.success) {
          setFavoriteMap((prev) => ({ ...prev, [food.id]: true }));
          toast.success(`'${food.name}' ফেভারিট লিস্টে যোগ করা হয়েছে! ❤️`);
          loadUserFavorites();
        }
      }
    } catch {
      toast.error("ফেভারিট আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  // Purchase directly (Add to cart & Checkout)
  const handlePurchaseNow = (food: RecommendedFood) => {
    const qty = quantities[food.id] || 1;
    const foodItemPayload: IGlobalFoodItem = {
      _id: food.id,
      restaurantId: food.restaurantId || "foodflow-kitchen",
      name: food.name,
      price: food.price,
      discountPrice: food.discountPrice,
      image: food.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
      restaurantName: food.restaurantName || "FoodFlow Kitchen",
      restaurantSlug: (food.restaurantName || "foodflow").toLowerCase().replace(/\s+/g, "-"),
      restaurantLogo: "",
      restaurantIsOpen: true,
      restaurantRating: food.rating || 4.8,
      restaurantReviewCount: 24,
      description: food.description || "",
      category: "Dishes",
      status: "available",
      isAvailable: true,
      isSpicy: food.isSpicy,
      isVegetarian: food.isVegetarian,
    };

    addItem(foodItemPayload, qty);
    toast.success(`'${food.name}' যুক্ত হয়েছে, চেকআউটে নিয়ে যাওয়া হচ্ছে... 🚀`);
    router.push(userId ? "/dashboard/customer/checkout" : "/checkout");
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.info("টেক্সট কপি করা হয়েছে! 📋");
  };

  // Message feedback
  const handleFeedback = (msgId: string, type: "like" | "dislike") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
    toast.success("আপনার মতামতের জন্য ধন্যবাদ! ❤️");
  };

  // Speech Recognition (Voice Input)
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("আপনার ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়।");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD";
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Text-To-Speech (Speech Synthesis)
  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("ভয়েস আউটপুট সমর্থিত নয়।");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_~[\]()]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "bn-BD";
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Reset Chat
  const handleResetChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gray-50/70 text-gray-900 flex flex-col transition-colors">
      
      {/* Top Header Banner matching Navbar style */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-[65px] z-20 px-4 py-3 sm:px-8 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Title & Role Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shadow-orange-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-gray-900">
                  FoodFlow AI Assistant
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 capitalize flex items-center gap-1">
                  {userRole === "restaurant" && <Store className="h-3 w-3" />}
                  {userRole === "rider" && <Bike className="h-3 w-3" />}
                  {userRole === "admin" && <ShieldCheck className="h-3 w-3" />}
                  Role: {userRole}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Autonomous Agent Active
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {userRole === "restaurant" 
                  ? "রেস্টুরেন্ট রানিং অর্ডার, মেনু ম্যানেজমেন্ট ও সেলস অ্যাসিস্ট্যান্ট" 
                  : "স্মার্ট রিকমেন্ডেশন, কার্ট ও ফেভারিট ম্যানেজমেন্ট অ্যাসিস্ট্যান্ট"}
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear Conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">নতুন চ্যাট</span>
            </button>

            {userRole === "restaurant" ? (
              <Link
                href="/dashboard/restaurant/orders"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors"
              >
                <Package className="h-3.5 w-3.5" />
                <span>অর্ডার ড্যাশবোর্ড</span>
              </Link>
            ) : (
              <button
                onClick={openCartDrawer}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>কার্ট ({cartItems.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col px-3 sm:px-6 py-4">
        
        {/* Interactive Role-Based Quick Preset Chips */}
        <div className="mb-3 overflow-x-auto pb-1 flex items-center gap-2 select-none no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-orange-500" /> সাজেশন:
          </span>
          {ROLE_PRESET_PROMPTS[userRole]?.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt.query)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 hover:border-orange-300 text-gray-700 text-xs font-medium border border-gray-200 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>{prompt.label}</span>
            </button>
          ))}
        </div>

        {/* Message Feed Card */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-4 sm:p-6 overflow-y-auto flex flex-col space-y-4 min-h-[56vh] max-h-[66vh]"
        >
          
          {messages.map((message) => {
            const isUser = message.role === "user";
            const parsed = message.parsed;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="shrink-0 pt-0.5">
                  {isUser ? (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold shadow-xs text-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                  ) : (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 shadow-2xs ${
                    isUser
                      ? "bg-orange-500 text-white rounded-tr-xs"
                      : "bg-gray-50 border border-gray-200/80 text-gray-900 rounded-tl-xs"
                  }`}
                >
                  {isUser ? (
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div>
                      {/* React Markdown Rich Text Rendering */}
                      <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-orange-600 prose-a:text-orange-600 prose-a:underline prose-strong:text-gray-900 prose-ul:my-2 prose-li:my-0.5 prose-p:my-1.5 leading-relaxed text-sm text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {parsed?.cleanMarkdown || message.content}
                        </ReactMarkdown>
                      </div>

                      {/* 1. Recommended Food Cards (Only for Customer role) */}
                      {userRole !== "restaurant" && parsed?.recommendedFoods && parsed.recommendedFoods.length > 0 && (
                        <div className="mt-3.5 space-y-2.5">
                          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                            সাজেস্টেড খাবার ({parsed.recommendedFoods.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {parsed.recommendedFoods.map((food) => {
                              const qty = quantities[food.id] || 1;
                              const isAdded = addedItems[food.id];
                              const isFav = favoriteMap[food.id];
                              const hasDiscount = Boolean(food.discountPrice && food.discountPrice < food.price);

                              return (
                                <div
                                  key={food.id}
                                  className="group flex gap-3 p-2.5 rounded-2xl border border-gray-200 bg-white hover:border-orange-400 hover:shadow-xs transition-all"
                                >
                                  {/* Image */}
                                  <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                    <img
                                      src={food.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                                      alt={food.name}
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {food.isSpicy && (
                                      <span className="absolute top-1 left-1 bg-red-500/90 text-white p-0.5 rounded-full text-[9px]">
                                        <Flame className="h-2.5 w-2.5" />
                                      </span>
                                    )}
                                    {/* Favorite Button on Image */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFavorite(food)}
                                      className="absolute top-1 right-1 p-1 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-red-500 shadow-xs transition-all cursor-pointer"
                                      title={isFav ? "ফেভারিট থেকে রিমুভ করুন" : "ফেভারিটে যোগ করুন"}
                                    >
                                      <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                                    </button>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <h4 className="text-xs font-bold text-gray-900 truncate">
                                          {food.name}
                                        </h4>
                                        {food.rating && (
                                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded">
                                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                            {food.rating}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {food.restaurantName || "FoodFlow Kitchen"}
                                      </p>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className="flex items-center justify-between gap-1 mt-1.5 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-orange-600">
                                          ৳{hasDiscount ? food.discountPrice : food.price}
                                        </span>
                                        {hasDiscount && (
                                          <span className="text-[10px] text-gray-400 line-through">
                                            ৳{food.price}
                                          </span>
                                        )}
                                      </div>

                                      {/* Quantity & Cart Button */}
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50">
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(food.id, -1)}
                                            className="p-1 text-gray-500 hover:text-orange-600 text-xs cursor-pointer"
                                            title="পরিমাণ কমান"
                                          >
                                            <Minus className="h-2.5 w-2.5" />
                                          </button>
                                          <span className="text-[10px] font-bold px-1.5">{qty}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleQuantityChange(food.id, 1)}
                                            className="p-1 text-gray-500 hover:text-orange-600 text-xs cursor-pointer"
                                            title="পরিমাণ বাড়ান"
                                          >
                                            <Plus className="h-2.5 w-2.5" />
                                          </button>
                                        </div>

                                        {/* Add to Cart button */}
                                        <button
                                          type="button"
                                          onClick={() => handleAddToCart(food)}
                                          className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            isAdded
                                              ? "bg-emerald-500 text-white"
                                              : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
                                          }`}
                                          title="কার্টে যোগ করুন"
                                        >
                                          {isAdded ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                        </button>

                                        {/* Purchase / Buy Now button */}
                                        <button
                                          type="button"
                                          onClick={() => handlePurchaseNow(food)}
                                          className="px-2 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                          title="এখনই কিনুন / অর্ডার করুন"
                                        >
                                          <ShoppingBag className="h-3 w-3" />
                                          <span>অর্ডার</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Order Status Widget */}
                      {parsed?.orderStatus && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-orange-500" />
                              অর্ডার আইডি: <span className="font-mono text-orange-600">{parsed.orderStatus.orderId}</span>
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              {parsed.orderStatus.status}
                            </span>
                          </div>

                          {/* Progress timeline */}
                          <div className="grid grid-cols-4 gap-1 my-3 text-center">
                            {["Placed", "Preparing", "On the Way", "Delivered"].map((step, idx) => {
                              const currentStatus = parsed.orderStatus?.status?.toLowerCase() || "";
                              const isCompleted =
                                (idx === 0 && Boolean(currentStatus)) ||
                                (idx === 1 && (currentStatus.includes("prep") || currentStatus.includes("confirm") || currentStatus.includes("way") || currentStatus.includes("deliver"))) ||
                                (idx === 2 && (currentStatus.includes("way") || currentStatus.includes("out") || currentStatus.includes("deliver"))) ||
                                (idx === 3 && currentStatus.includes("deliver"));

                              return (
                                <div key={step} className="flex flex-col items-center">
                                  <div
                                    className={`h-2 w-full rounded-full mb-1 transition-all ${
                                      isCompleted ? "bg-orange-500" : "bg-gray-200"
                                    }`}
                                  />
                                  <span
                                    className={`text-[9px] font-semibold truncate ${
                                      isCompleted ? "text-orange-600 font-bold" : "text-gray-400"
                                    }`}
                                  >
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Rider Info & Amount */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                            {parsed.orderStatus.riderName && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <span className="font-semibold">রাইডার:</span>
                                <span>{parsed.orderStatus.riderName}</span>
                                {parsed.orderStatus.riderPhone && (
                                  <a
                                    href={`tel:${parsed.orderStatus.riderPhone}`}
                                    className="text-orange-600 hover:underline flex items-center gap-0.5 ml-1 font-bold"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {parsed.orderStatus.riderPhone}
                                  </a>
                                )}
                              </div>
                            )}
                            {parsed.orderStatus.totalAmount && (
                              <div className="font-bold text-gray-900">
                                মোট: <span className="text-orange-600">৳{parsed.orderStatus.totalAmount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. Universal Action Buttons (Works for Restaurant & Customer) */}
                      {parsed?.actionButtons && parsed.actionButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200/60">
                          {parsed.actionButtons.map((btn, idx) => {
                            const target = btn.target || (btn.type === "CHECKOUT" ? "/checkout" : btn.type === "TRACK_ORDER" ? "/dashboard/customer/orders" : null);

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (target) {
                                    router.push(target);
                                  } else if (btn.type === "CHECKOUT") {
                                    router.push(userId ? "/dashboard/customer/checkout" : "/checkout");
                                  } else if (btn.type === "TRACK_ORDER") {
                                    router.push(userRole === "restaurant" ? "/dashboard/restaurant/orders" : "/dashboard/customer/orders");
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                {userRole === "restaurant" ? <Store className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                <span>{btn.label}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Message Footer Utilities */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/60 text-gray-400 text-xs">
                        <span className="text-[10px]">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Speak TTS */}
                          <button
                            type="button"
                            onClick={() => handleSpeak(message.id, parsed?.cleanMarkdown || message.content)}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              speakingMsgId === message.id ? "text-orange-500 font-bold" : "text-gray-400"
                            }`}
                            title="ভয়েসে শুনুন"
                          >
                            {speakingMsgId === message.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          </button>

                          {/* Copy */}
                          <button
                            type="button"
                            onClick={() => handleCopy(parsed?.cleanMarkdown || message.content)}
                            className="p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer"
                            title="কপি করুন"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Like */}
                          <button
                            type="button"
                            onClick={() => handleFeedback(message.id, "like")}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              message.feedback === "like" ? "text-emerald-500" : ""
                            }`}
                            title="পছন্দ হয়েছে"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Dislike */}
                          <button
                            type="button"
                            onClick={() => handleFeedback(message.id, "dislike")}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              message.feedback === "dislike" ? "text-rose-500" : ""
                            }`}
                            title="পছন্দ হয়নি"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xs">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
                <span className="text-xs text-gray-500 font-medium ml-1">AI ভাবছে ও তথ্য প্রসেস করছে...</span>
              </div>
            </div>
          )}
        </div>


        {/* Input Bar */}
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex items-center gap-2">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
            title={isListening ? "ভয়েস শোনা হচ্ছে... ক্লিক করে থামান" : "ভয়েস দিয়ে বলুন (বাংলা/English)"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Text Input Area */}
          <textarea
            ref={inputRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              userRole === "restaurant"
                ? "রানিং অর্ডার, মেনু ম্যানেজমেন্ট বা যেকোনো প্রশ্ন লিখুন..."
                : "খাবারের অর্ডার, কার্ট, ফেভারিট বা যেকোনো কিছু বলুন..."
            }
            className="flex-1 max-h-24 resize-none bg-transparent px-2 py-1.5 text-sm outline-none text-gray-900 placeholder:text-gray-400"
          />

          {/* Send Button */}
          <button
            type="button"
            disabled={!inputMessage.trim() || isLoading}
            onClick={() => handleSendMessage()}
            className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
            title="বার্তা পাঠান"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
