"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  MapPin,
  RotateCcw,
  HelpCircle,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Flame,
  Star,
  Clock,
  Sparkles,
  Phone,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
  Minimize2,
  Trash2,
  Mic,
  MicOff,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/contexts/CartContext";
import { IGlobalFoodItem } from "@/types/restaurant";

/* ------------------------------------------------------------------ */
/*  Types & Interfaces (assistant-ui styled)                           */
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
  type: "ADD_TO_CART" | "CHECKOUT" | "TRACK_ORDER" | "CUSTOM";
  foodId?: string;
  restaurantId?: string;
  name?: string;
  price?: number;
  image?: string;
  label: string;
}

interface ParsedMessageContent {
  text: string;
  recommendedFoods: RecommendedFood[];
  orderStatus: OrderStatusData | null;
  actionButtons: ActionButton[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: ParsedMessageContent;
  timestamp: Date;
  feedback?: "like" | "dislike" | null;
}

interface QuickAction {
  title: string;
  description: string;
  message: string;
  icon: React.ReactNode;
}

type NormalizedRole = "customer" | "restaurant" | "rider" | "guest";

/* ------------------------------------------------------------------ */
/*  Constants & Quick Prompts                                          */
/* ------------------------------------------------------------------ */

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

const ROLE_QUICK_ACTIONS: Record<NormalizedRole, QuickAction[]> = {
  customer: [
    {
      title: "বাজেট ৫০০ ঝাল খাবার",
      description: "২ জনের জন্য কমপ্লিট প্যাকেজ",
      message: "আমার বাজেট ৫০০ টাকা, ঝাল খাবার চাই, ২ জনের জন্য। কি কি অপশন আছে?",
      icon: <Flame className="h-4 w-4 text-orange-500" />,
    },
    {
      title: "বাজেট ৩০০ স্ন্যাক্স",
      description: "রাতে খাওয়ার মতো হালকা খাবার",
      message: "আমার কাছে ৩০০ টাকা আছে, রাতে কিছু খেতে চাই। কি পাওয়া যাবে?",
      icon: <UtensilsCrossed className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "অর্ডার ট্র্যাকিং",
      description: "আমার খাবারের লাইভ স্ট্যাটাস",
      message: "আমার order এখনো আসেনি, বর্তমান স্ট্যাটাস কি এবং রাইডার কোথায়?",
      icon: <MapPin className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "চেকআউট সাপোর্ট",
      description: "কার্ট ও ডিসকাউন্ট ভাউচার",
      message: "আমি কার্ট অর্ডার checkout করতে চাই, কোনো ডিসকাউন্ট আছে?",
      icon: <ShoppingCart className="h-4 w-4 text-emerald-500" />,
    },
  ],
  restaurant: [
    {
      title: "Manage Orders",
      description: "Incoming & live preparation",
      message: "How do I manage incoming orders and update cooking status?",
      icon: <Package className="h-4 w-4 text-orange-500" />,
    },
    {
      title: "Menu Updates",
      description: "Add or edit menu items",
      message: "I want to update my menu items and pricing.",
      icon: <UtensilsCrossed className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "Payouts & Finance",
      description: "Earnings and disbursement",
      message: "When will I receive my restaurant payout?",
      icon: <RotateCcw className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "Analytics Help",
      description: "Sales and reviews report",
      message: "How do I read my restaurant sales analytics?",
      icon: <HelpCircle className="h-4 w-4 text-emerald-500" />,
    },
  ],
  rider: [
    {
      title: "Active Delivery",
      description: "Navigation and drop-off",
      message: "I need help navigating to the customer's delivery location.",
      icon: <MapPin className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "Earnings Calculation",
      description: "Daily trips & incentives",
      message: "How are my delivery earnings and bonuses calculated?",
      icon: <RotateCcw className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "Report an Issue",
      description: "Traffic, delay or OTP",
      message: "I am having trouble verifying the customer delivery OTP.",
      icon: <HelpCircle className="h-4 w-4 text-orange-500" />,
    },
    {
      title: "Support Desk",
      description: "Emergency rider hotline",
      message: "I need immediate emergency support from FoodFlow.",
      icon: <Phone className="h-4 w-4 text-emerald-500" />,
    },
  ],
  guest: [
    {
      title: "খাবার সাজেস্ট করো",
      description: "বাজেট অনুযায়ী সেরা খাবার",
      message: "আমার বাজেট ৫০০ টাকা, সেরা কিছু খাবারের অপশন দেখাও।",
      icon: <Sparkles className="h-4 w-4 text-orange-500" />,
    },
    {
      title: "জনপ্রিয় খাবারসমূহ",
      description: "FoodFlow স্পেশাল মেনু",
      message: "FoodFlow-তে সেরা এবং সবচেয়ে বেশি অর্ডার হওয়া খাবারগুলো কি কি?",
      icon: <UtensilsCrossed className="h-4 w-4 text-amber-500" />,
    },
    {
      title: "কিভাবে অর্ডার করব?",
      description: "নতুন ইউজারদের জন্য গাইড",
      message: "FoodFlow-তে কিভাবে পছন্দের খাবার অর্ডার করব এবং পেমেন্ট করব?",
      icon: <HelpCircle className="h-4 w-4 text-blue-500" />,
    },
    {
      title: "কাস্টমার সাপোর্ট",
      description: "যেকোনো সহায়তায় আমরা প্রস্তুত",
      message: "আমি FoodFlow কাস্টমার সাপোর্টের সাথে কথা বলতে চাই।",
      icon: <MessageCircle className="h-4 w-4 text-emerald-500" />,
    },
  ],
};

const GREETING_MESSAGES: Record<NormalizedRole, string> = {
  customer:
    "আসসালামু আলাইকুম! আমি **FoodFlow AI অ্যাসিস্ট্যান্ট** 🤖।\n\nআপনার **বাজেট**, **পছন্দের খাবার** (ঝাল/মিষ্টি/বার্গার/পিজ্জা) বলুন অথবা যেকোনো অর্ডার সংক্রান্ত বিষয়ে সরাসরি প্রশ্ন করুন!",
  restaurant:
    "Welcome, Partner! I'm FoodFlow's Restaurant Assistant. I can help manage incoming orders, update menus, or explain analytics.",
  rider:
    "Hey Rider! Need help with delivery navigation, trip earnings, or customer verification? Ask away!",
  guest:
    "স্বাগতম FoodFlow-তে! 🍔 আমি আপনার স্মার্ট AI ফুড গাইড। আপনার বাজেট বা পছন্দের খাবার জানালে দারুণ সব রেস্টুরেন্টের খাবার খুঁজে দিতে পারব!",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeRole(rawRole?: string | null): NormalizedRole {
  if (!rawRole) return "guest";
  const r = rawRole.toLowerCase();
  if (r.includes("restaurant") || r.includes("partner")) return "restaurant";
  if (r.includes("rider") || r.includes("delivery")) return "rider";
  if (r.includes("customer")) return "customer";
  if (r.includes("admin")) return "restaurant";
  return "customer";
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Parses raw message text and extracts structured JSON tokens
 */
function sanitizeFoodImage(img?: string): string {
  if (!img || typeof img !== "string" || img.startsWith("data:") || img.length > 250) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
  }
  return img;
}

function parseAssistantMessage(rawText: string): ParsedMessageContent {
  let text = rawText;
  let recommendedFoods: RecommendedFood[] = [];
  let orderStatus: OrderStatusData | null = null;
  let actionButtons: ActionButton[] = [];

  // 1. Extract ```food_recommendations ... ```
  const foodRegex = /```(?:food_recommendations|json:foods|json)?\s*(\[\s*\{[\s\S]*?"id"[\s\S]*?\}\s*\])\s*```?/i;
  const foodMatch = text.match(foodRegex);
  if (foodMatch) {
    try {
      const parsed = JSON.parse(foodMatch[1]);
      if (Array.isArray(parsed)) {
        recommendedFoods = parsed.map((f: any) => ({
          ...f,
          image: sanitizeFoodImage(f.image),
        }));
      }
    } catch {
      // ignore
    }
    text = text.replace(foodRegex, "").trim();
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

  // 2. Extract ```order_status ... ```
  const orderRegex = /```(?:order_status|json:order|json)?\s*(\{\s*"orderId"[\s\S]*?\}\s*)\s*```?/i;
  const orderMatch = text.match(orderRegex);
  if (orderMatch) {
    try {
      const parsed = JSON.parse(orderMatch[1]);
      if (parsed && typeof parsed === "object") {
        orderStatus = parsed;
      }
    } catch {
      // ignore
    }
    text = text.replace(orderRegex, "").trim();
  }

  // 3. Extract ```action_buttons ... ```
  const actionRegex = /```(?:action_buttons|json:actions|json)?\s*(\[\s*\{[\s\S]*?"type"[\s\S]*?\}\s*\])\s*```?/i;
  const actionMatch = text.match(actionRegex);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1]);
      if (Array.isArray(parsed)) {
        actionButtons = parsed;
      }
    } catch {
      // ignore
    }
    text = text.replace(actionRegex, "").trim();
  }

  text = text.replace(/```(?:food_recommendations|order_status|action_buttons)?/gi, "").trim();

  return {
    text,
    recommendedFoods,
    orderStatus,
    actionButtons,
  };
}

/* ------------------------------------------------------------------ */
/*  UI Sub-components (assistant-ui style)                             */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-2xl rounded-bl-sm w-fit">
      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
      <span className="text-[11px] text-gray-500 font-medium ml-1">AI ভাবছে...</span>
    </div>
  );
}

function FoodRecommendationCard({
  food,
  onAddToCart,
  onPurchase,
}: {
  food: RecommendedFood;
  onAddToCart: (food: RecommendedFood, quantity: number) => void;
  onPurchase?: (food: RecommendedFood, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(food, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuy = () => {
    if (onPurchase) {
      onPurchase(food, quantity);
    } else {
      onAddToCart(food, quantity);
      window.location.href = "/checkout";
    }
  };

  const finalPrice = food.discountPrice !== undefined ? food.discountPrice : food.price;
  const hasDiscount = Boolean(food.discountPrice && food.discountPrice < food.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 hover:shadow-xs transition-all"
    >
      {/* Photo */}
      <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 self-center sm:self-start">
        {food.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={food.image}
            alt={food.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-orange-400">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        )}

        {/* Dietary Tag */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {food.isSpicy && (
            <span
              className="bg-red-500/90 text-white p-1 rounded-full text-[10px] shadow-xs"
              title="ঝাল খাবার / Spicy"
            >
              <Flame className="h-3 w-3" />
            </span>
          )}
          {food.isVegetarian && (
            <span
              className="bg-emerald-500/90 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-xs"
              title="নিরামিষ / Vegetarian"
            >
              Veg
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-gray-900 truncate leading-snug">{food.name}</h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span className="truncate">{food.restaurantName || "FoodFlow Kitchen"}</span>
          {food.rating && (
            <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold shrink-0">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {food.rating}
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-black text-orange-600">৳{finalPrice}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">৳{food.price}</span>
          )}
        </div>
      </div>

      {/* Stepper + Add Button + Purchase Button */}
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition cursor-pointer"
            title="পরিমাণ কমান"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-2 text-xs font-bold text-gray-800">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition cursor-pointer"
            title="পরিমাণ বাড়ান"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Add to Cart button */}
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex items-center justify-center gap-1 p-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
            added
              ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
              : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
          }`}
          title="কার্টে যোগ করুন"
        >
          {added ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Purchase / Buy Now button */}
        <button
          onClick={handleBuy}
          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-xs shrink-0 transition-all cursor-pointer"
          title="এখনই কিনুন / সরাসরি অর্ডার করুন"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>কিনুন</span>
        </button>
      </div>
    </motion.div>
  );
}

function OrderStatusCard({ order }: { order: OrderStatusData }) {
  const steps = ["Placed", "Preparing", "Out for Delivery", "Delivered"];
  const currentStatus = order.status || "Placed";

  const getStepIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("delivered")) return 3;
    if (s.includes("out for delivery")) return 2;
    if (s.includes("preparing") || s.includes("accepted")) return 1;
    return 0;
  };

  const currentStepIdx = getStepIndex(currentStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-600">
            অর্ডার: <strong className="font-mono text-gray-900">{order.orderId}</strong>
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          {order.status}
        </span>
      </div>

      {/* Progress timeline bar */}
      <div className="py-1">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-2 right-2 top-2 h-0.5 bg-gray-200 -z-0" />
          <div
            className="absolute left-2 top-2 h-0.5 bg-blue-500 transition-all duration-500 -z-0"
            style={{ width: `${(currentStepIdx / 3) * 100}%` }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step} className="flex flex-col items-center z-10">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-600 text-white ring-2 ring-blue-200"
                      : "bg-gray-200 text-gray-500"
                  } ${isCurrent ? "animate-pulse" : ""}`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className="text-[10px] text-gray-600 mt-1 font-medium hidden sm:block">
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rider & ETA */}
      <div className="flex items-center justify-between pt-1 border-t border-blue-100 text-xs text-gray-700">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>ETA: <strong>{order.eta || "15-20 মিনিট"}</strong></span>
        </div>

        {order.riderName && order.riderName !== "Not Assigned" && (
          <div className="flex items-center gap-2">
            <span>🚴 {order.riderName}</span>
            {order.riderPhone && (
              <a
                href={`tel:${order.riderPhone}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition"
              >
                <Phone className="h-3 w-3" /> কল দিন
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <Link
          href="/dashboard/customer/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
        >
          সম্পূর্ণ লাইভ ট্র্যাকিং পেজ <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}

function MessageThreadItem({
  msg,
  onAddToCart,
  onPurchase,
  onActionClick,
  onCopy,
  onFeedback,
  onRetry,
}: {
  msg: ChatMessage;
  onAddToCart: (food: RecommendedFood, quantity: number) => void;
  onPurchase?: (food: RecommendedFood, quantity: number) => void;
  onActionClick: (action: ActionButton) => void;
  onCopy: (text: string) => void;
  onFeedback: (id: string, type: "like" | "dislike") => void;
  onRetry?: (content: string) => void;
}) {
  const isUser = msg.role === "user";
  const parsed = msg.parsed;
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    const contentToCopy = parsed?.text || msg.content;
    onCopy(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold shadow-xs ${
          isUser
            ? "bg-gradient-to-tr from-orange-500 to-amber-500"
            : "bg-gradient-to-tr from-orange-600 to-orange-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content Container */}
      <div className="max-w-[85%] sm:max-w-[82%] space-y-2">
        {/* Message Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
            isUser
              ? "bg-orange-500 text-white rounded-tr-xs"
              : "bg-gray-100/90 text-gray-900 rounded-tl-xs border border-gray-200/50"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-orange-600 prose-a:text-orange-600 prose-strong:text-gray-900 prose-ul:my-1 prose-li:my-0.5 prose-p:my-1 text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsed ? parsed.text : msg.content}
              </ReactMarkdown>
            </div>
          )}

          <div
            className={`mt-1.5 flex items-center justify-between text-[10px] ${
              isUser ? "text-orange-100" : "text-gray-400"
            }`}
          >
            <span>{formatTime(msg.timestamp)}</span>
          </div>
        </div>

        {/* Structured Food Recommendations */}
        {!isUser && parsed && parsed.recommendedFoods && parsed.recommendedFoods.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> সাজেস্টেড খাবার
              </span>
              <span className="text-[11px] text-gray-500">লাইভ ডাটাবেজ থেকে পাওয়া</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {parsed.recommendedFoods.map((food, idx) => (
                <FoodRecommendationCard
                  key={food.id || idx}
                  food={food}
                  onAddToCart={onAddToCart}
                  onPurchase={onPurchase}
                />
              ))}
            </div>
          </div>
        )}

        {/* Structured Order Status */}
        {!isUser && parsed && parsed.orderStatus && (
          <div className="pt-1">
            <OrderStatusCard order={parsed.orderStatus} />
          </div>
        )}

        {/* Interactive Action Buttons */}
        {!isUser && parsed && parsed.actionButtons && parsed.actionButtons.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {parsed.actionButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(btn)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {btn.type === "CHECKOUT" && <ShoppingCart className="h-3.5 w-3.5" />}
                {btn.type === "ADD_TO_CART" && <Plus className="h-3.5 w-3.5" />}
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Assistant Message Toolbar (assistant-ui style) */}
        {!isUser && (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 text-xs pt-0.5">
            <button
              onClick={handleCopyText}
              className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
              title="কপি করুন"
            >
              {copied ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                  <Check className="h-3 w-3" /> কপি হয়েছে
                </span>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={() => onFeedback(msg.id, "like")}
              className={`p-1 rounded-md hover:bg-gray-100 hover:text-orange-600 transition cursor-pointer ${
                msg.feedback === "like" ? "text-orange-600" : ""
              }`}
              title="ভালো লেগেছে"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onFeedback(msg.id, "dislike")}
              className={`p-1 rounded-md hover:bg-gray-100 hover:text-red-500 transition cursor-pointer ${
                msg.feedback === "dislike" ? "text-red-500" : ""
              }`}
              title="উপযোগী নয়"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>

            {onRetry && (
              <button
                onClick={() => onRetry(msg.content)}
                className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer ml-1"
                title="আবার ট্রাই করুন"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Assistant-UI Chatbot Component                                */
/* ------------------------------------------------------------------ */

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const greetedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const router = useRouter();
  const { data: session } = useSession();
  const { items: cartItems, addItem, openCartDrawer, totalPrice } = useCart();

  const user = session?.user as
    | { id?: string; name?: string; email?: string; role?: string }
    | undefined;
  const role = normalizeRole(user?.role);

  /* ---- Auto-scroll ---- */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  /* ---- Scroll container watcher ---- */
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isUp);
  };

  /* ---- Greeting initialization ---- */
  useEffect(() => {
    if (isOpen && !greetedRef.current) {
      greetedRef.current = true;
      const initialGreeting = GREETING_MESSAGES[role];
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: initialGreeting,
          parsed: parseAssistantMessage(initialGreeting),
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, role]);

  /* ---- Focus textarea on open ---- */
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* ---- Auto-expand textarea ---- */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  /* ---- Speech Recognition (Voice Input) ---- */
  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("আপনার ব্রাউজারে Speech Recognition সাপোর্ট নেই। দয়া করে টাইপ করুন।");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD"; // Supports Bengali speech input
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  /* ---- Add to Cart Integration ---- */
  const handleAddToCartFromAI = useCallback(
    (food: RecommendedFood, quantity: number = 1) => {
      const itemToCart: IGlobalFoodItem = {
        _id: food.id,
        restaurantId: food.restaurantId || "foodflow-kitchen",
        name: food.name,
        price: food.price,
        discountPrice: food.discountPrice,
        image:
          food.image ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80",
        restaurantName: food.restaurantName || "FoodFlow Kitchen",
        description: "",
        category: "Dishes",
        status: "available",
        isAvailable: true,
        restaurantSlug: "foodflow",
        restaurantLogo: "",
        restaurantIsOpen: true,
        restaurantRating: food.rating || 4.7,
        restaurantReviewCount: 10,
      };

      addItem(itemToCart, quantity);
    },
    [addItem]
  );

  /* ---- Direct Purchase Integration ---- */
  const handlePurchaseFromAI = useCallback(
    (food: RecommendedFood, quantity: number = 1) => {
      handleAddToCartFromAI(food, quantity);
      setIsOpen(false);
      router.push("/checkout");
    },
    [handleAddToCartFromAI, router]
  );

  /* ---- Action Click Dispatcher ---- */
  const handleActionClick = useCallback(
    (action: ActionButton) => {
      if (action.type === "CHECKOUT") {
        setIsOpen(false);
        router.push(user ? "/dashboard/customer/checkout" : "/auth/login");
      } else if (action.type === "ADD_TO_CART" && action.foodId) {
        handleAddToCartFromAI({
          id: action.foodId,
          name: action.name || "Food Item",
          price: action.price || 0,
          restaurantId: action.restaurantId,
          image: action.image,
        });
      } else if (action.type === "TRACK_ORDER") {
        setIsOpen(false);
        router.push("/dashboard/customer/orders");
      }
    },
    [handleAddToCartFromAI, router, user]
  );

  /* ---- Copy text helper ---- */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  /* ---- Feedback like/dislike ---- */
  const handleFeedback = (id: string, type: "like" | "dislike") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
  };

  /* ---- Clear Chat ---- */
  const handleClearChat = () => {
    const initialGreeting = GREETING_MESSAGES[role];
    setMessages([
      {
        id: generateId(),
        role: "assistant",
        content: initialGreeting,
        parsed: parseAssistantMessage(initialGreeting),
        timestamp: new Date(),
      },
    ]);
  };

  /* ---- Send Message ---- */
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text || input).trim();
      if (!content || isTyping) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setErrorMsg(null);

      const chatHistory = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const userRole =
        user?.role?.toLowerCase().includes("restaurant")
          ? "restaurant"
          : user?.role?.toLowerCase().includes("rider") ||
            user?.role?.toLowerCase().includes("delivery")
            ? "rider"
            : "customer";

      const cartSummary = cartItems.map((ci) => ({
        id: ci.foodItem?._id || (ci as any)?.foodId || (ci as any)?.id,
        name: ci.foodItem?.name || (ci as any)?.name || "খাবার আইটেম",
        quantity: ci.quantity || 1,
        price: ci.foodItem?.discountPrice || ci.foodItem?.price || (ci as any)?.price || 0,
      }));

      try {
        // Try direct Next.js API route first, fallback to Express server if needed
        let res = await fetch(`/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userRole,
            message: content,
            chatHistory,
            userId: user?.id,
            userEmail: user?.email,
            cartItems: cartSummary,
          }),
        });

        if (!res.ok) {
          // Fallback to Express backend server route
          res = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userRole,
              message: content,
              chatHistory,
              userId: user?.id,
              userEmail: user?.email,
              cartItems: cartSummary,
            }),
          });
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
        }

        const rawReply =
          data?.reply ||
          data?.data?.reply ||
          data?.message ||
          "I'm sorry, I couldn't process that. Please try again.";

        const parsed = parseAssistantMessage(rawReply);

        const replyMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: rawReply,
          parsed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, replyMsg]);
        setInput("");
      } catch (err) {
        const textErr =
          err instanceof Error
            ? err.message
            : "Oops! Something went wrong. Please check your connection and try again.";
        setErrorMsg(textErr);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, user, messages, cartItems]
  );

  /* ---- Key Down Handler ---- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggle = () => setIsOpen((o) => !o);

  return (
    <>
      {/* =================== Floating Trigger Launcher =================== */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/35 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 md:bottom-8 md:right-8 cursor-pointer"
        aria-label="FoodFlow AI Assistant"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Bot className="h-7 w-7" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ripple indicator when closed */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500 border-2 border-white" />
          </span>
        )}
      </motion.button>

      {/* =================== Assistant-UI Chat Window =================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-50 flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/20 transition-all duration-300 ${
              isExpanded
                ? "inset-4 md:inset-10 w-auto h-auto max-w-5xl mx-auto"
                : "bottom-24 right-4 sm:right-6 md:bottom-28 md:right-8 w-[calc(100vw-2rem)] sm:w-[420px] md:w-[440px] h-[580px] max-h-[82vh]"
            }`}
          >
            {/* ---- Thread Header ---- */}
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 px-5 py-3.5 text-white shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-orange-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                    <span>FoodFlow AI</span>
                    <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Auto-Key Failover
                    </span>
                  </h3>
                  <p className="text-xs text-orange-100 truncate flex items-center gap-1">
                    <span>Food Recommendation + Support Agent</span>
                    {user && <span>&middot; {user.name?.split(" ")[0]}</span>}
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-1 text-white/90">
                {/* Live Cart Chip */}
                {cartItems.length > 0 && (
                  <button
                    onClick={openCartDrawer}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition mr-1 cursor-pointer"
                    title="কার্ট ওপেন করুন"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>৳{totalPrice}</span>
                  </button>
                )}

                {/* Reset Chat */}
                <button
                  onClick={handleClearChat}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  title="নতুন কথোপকথন শুরু করুন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Maximize / Minimize toggle */}
                <button
                  onClick={() => setIsExpanded((e) => !e)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer hidden sm:block"
                  title={isExpanded ? "ছোট করুন" : "বড় করুন"}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                {/* Close */}
                <button
                  onClick={toggle}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ---- Thread Messages List ---- */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth bg-gray-50/40"
            >
              {messages.map((msg) => (
                <MessageThreadItem
                  key={msg.id}
                  msg={msg}
                  onAddToCart={handleAddToCartFromAI}
                  onPurchase={handlePurchaseFromAI}
                  onActionClick={handleActionClick}
                  onCopy={handleCopy}
                  onFeedback={handleFeedback}
                  onRetry={() => handleSend(msg.content)}
                />
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-orange-400 text-white text-xs font-bold">
                    <Bot className="h-4 w-4" />
                  </div>
                  <TypingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll to Bottom button */}
            {showScrollBottom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-28 right-6 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                title="নিচে যান"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.button>
            )}

            {/* Error Notification */}
            {errorMsg && (
              <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start justify-between">
                <div>
                  <p className="font-bold">Error Connecting</p>
                  <p>{errorMsg}</p>
                </div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-[11px] font-bold text-red-600 underline hover:text-red-800 ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ---- Prompt Suggestions Cards (When messages <= 1) ---- */}
            {messages.length <= 1 && (
              <div className="border-t border-gray-100 px-4 py-3 bg-white">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-orange-500" /> দ্রুত শুরু করতে ট্যাপ করুন
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_QUICK_ACTIONS[role].map((action) => (
                    <button
                      key={action.title}
                      onClick={() => handleSend(action.message)}
                      disabled={isTyping}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition-all text-left group cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <div className="p-1.5 rounded-lg bg-orange-100/60 group-hover:bg-orange-100 transition shrink-0 mt-0.5">
                        {action.icon}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-gray-800 group-hover:text-orange-600 truncate">
                          {action.title}
                        </h5>
                        <p className="text-[10px] text-gray-500 truncate">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Input Composer (assistant-ui style) ---- */}
            <div className="border-t border-gray-200 bg-white p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-1.5 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition-all"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition cursor-pointer ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Voice Input (বাংলায় কথা বলুন)"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="আপনার বাজেট বা খাবারের নাম লিখুন... (যেমন: বাজেট ৫০০ ঝাল খাবার)"
                  disabled={isTyping}
                  className="flex-1 max-h-28 min-h-[36px] resize-none border-none bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Send message"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1.5">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> লাইভ ফুড রিকমেন্ডেশন ও অর্ডার ট্র্যাকার
                </span>
                <span>Enter = Send, Shift+Enter = New line</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
