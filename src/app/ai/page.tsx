"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/contexts/CartContext";
import { IGlobalFoodItem } from "@/types/restaurant";
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
  type: "ADD_TO_CART" | "CHECKOUT" | "TRACK_ORDER" | "CUSTOM";
  foodId?: string;
  restaurantId?: string;
  name?: string;
  price?: number;
  image?: string;
  label: string;
}

interface ParsedMessageContent {
  cleanMarkdown: string;
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

/* ------------------------------------------------------------------ */
/*  Parser Helper for JSON code blocks                                */
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

  // 1. Food Recommendations block (with codeblock or raw json)
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
      } catch (e) {
        // ignore
      }
    }
  }

  // 2. Order Status block
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

  // 3. Action buttons block
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

  // Strip any leftover unclosed markdown codeblock ticks
  text = text.replace(/```(?:food_recommendations|order_status|action_buttons)?/gi, "").trim();

  return {
    cleanMarkdown: text,
    recommendedFoods,
    orderStatus,
    actionButtons,
  };
}

/* ------------------------------------------------------------------ */
/*  Main Dedicated Page Component                                     */
/* ------------------------------------------------------------------ */

export default function AIAssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items: cartItems, addItem } = useCart();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle Send Message
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
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userName: session?.user?.name,
          userRole: (session?.user as any)?.role || "customer",
          cartItems: cartItems.map((item) => ({
            id: item.foodItem?._id || (item as any)?.foodId || (item as any)?.id,
            name: item.foodItem?.name || (item as any)?.name || "খাবার আইটেম",
            price: item.foodItem?.discountPrice || item.foodItem?.price || (item as any)?.price || 0,
            quantity: item.quantity || 1,
          })),
        }),
      });

      const data = await response.json();

      if (data.success && data.reply) {
        const parsed = parseMessageContent(data.reply);
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          parsed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorText = `⚠️ দুঃখিত, তথ্য লোড করতে সমস্যা হয়েছে: ${data.error || "কিছুক্ষণ পর আবার চেষ্টা করুন।"}`;
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
    } catch (err: any) {
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

  // Add to cart directly
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

  // Purchase directly (Add to cart & go to checkout)
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
    router.push("/checkout");
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
    } catch (e) {
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
    <div className="min-h-[calc(100vh-70px)] bg-gray-50/60 text-gray-900 flex flex-col transition-colors">
      
      {/* Top Header Banner matching Navbar style */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-[65px] z-20 px-4 py-3 sm:px-8 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-gray-900">
                  FoodFlow AI Assistant
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-gray-500">
                স্মার্ট ফুড অ্যান্ড সাপোর্ট অ্যাসিস্ট্যান্ট
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear Conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">নতুন চ্যাট</span>
            </button>
            <Link
              href="/dishes"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>মেনু দেখুন</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col px-3 sm:px-6 py-4">
        
        {/* Message Feed Card */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-200/90 shadow-sm p-4 sm:p-6 overflow-y-auto flex flex-col space-y-4 min-h-[60vh] max-h-[68vh]">
          
          {/* Minimal Empty State when no messages */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto select-none">
              <div className="h-14 w-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs mb-3">
                <Bot className="h-7 w-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                ফুডফ্লো এআই অ্যাসিস্ট্যান্ট
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm">
                আপনার পছন্দের খাবার খুঁজতে বা যেকোনো তথ্যের জন্য নিচের বক্সে লিখুন।
              </p>
            </div>
          )}

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
                      {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                  ) : (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 shadow-2xs ${
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

                      {/* 1. Recommended Food Cards */}
                      {parsed?.recommendedFoods && parsed.recommendedFoods.length > 0 && (
                        <div className="mt-3.5 space-y-2.5">
                          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                            সাজেস্টেড খাবার ({parsed.recommendedFoods.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {parsed.recommendedFoods.map((food) => {
                              const qty = quantities[food.id] || 1;
                              const isAdded = addedItems[food.id];
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

                                    {/* Price & Add to cart */}
                                    <div className="flex items-center justify-between gap-2 mt-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-orange-600">
                                          ৳{hasDiscount ? food.discountPrice : food.price}
                                        </span>
                                        {hasDiscount && (
                                          <span className="text-[10px] text-gray-400 line-through">
                                            ৳{food.price}
                                          </span>
                                        )}
                                      </div>

                                      {/* Quantity, Cart & Purchase Buttons */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
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
                                          className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                          title="এখনই কিনুন / অর্ডার করুন"
                                        >
                                          <ShoppingBag className="h-3 w-3" />
                                          <span>কিনুন</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick Checkout Link below food items */}
                          <div className="pt-1 flex justify-end">
                            <Link
                              href="/checkout"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              <span>সরাসরি চেকআউট করুন</span>
                            </Link>
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

                          {/* Order Status Timeline Progress */}
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

                      {/* 3. Action Buttons */}
                      {parsed?.actionButtons && parsed.actionButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200/60">
                          {parsed.actionButtons.map((btn, idx) => {
                            if (btn.type === "CHECKOUT") {
                              return (
                                <Link
                                  key={idx}
                                  href="/checkout"
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span>{btn.label || "চেকআউট করুন"}</span>
                                </Link>
                              );
                            }
                            if (btn.type === "TRACK_ORDER") {
                              return (
                                <Link
                                  key={idx}
                                  href="/order-tracking"
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                                >
                                  <Package className="h-3.5 w-3.5" />
                                  <span>{btn.label || "ট্র্যাকিং পেইজ"}</span>
                                </Link>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}

                      {/* Utility Footer (Copy, TTS, Feedback) */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/60 text-gray-400 text-xs">
                        <span className="text-[10px]">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Speak TTS */}
                          <button
                            onClick={() => handleSpeak(message.id, parsed?.cleanMarkdown || message.content)}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              speakingMsgId === message.id ? "text-orange-500" : "text-gray-400"
                            }`}
                            title="Read Aloud"
                          >
                            {speakingMsgId === message.id ? (
                              <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Copy Text */}
                          <button
                            onClick={() => handleCopy(parsed?.cleanMarkdown || message.content)}
                            className="p-1 rounded-md hover:bg-gray-200/60 transition-colors text-gray-400 cursor-pointer"
                            title="Copy Response"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Like */}
                          <button
                            onClick={() => handleFeedback(message.id, "like")}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              message.feedback === "like" ? "text-emerald-500" : "text-gray-400"
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Dislike */}
                          <button
                            onClick={() => handleFeedback(message.id, "dislike")}
                            className={`p-1 rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer ${
                              message.feedback === "dislike" ? "text-red-500" : "text-gray-400"
                            }`}
                            title="Not Helpful"
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 text-orange-600 bg-orange-50 p-3 rounded-2xl w-fit border border-orange-200"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-semibold animate-pulse">
                ফুডফ্লো এআই উত্তর তৈরি করছে...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Controls */}
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-2 sm:p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? "bg-red-500 text-white animate-bounce shadow-md shadow-red-500/20"
                  : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
              title={isListening ? "Listening... Click to stop" : "ভয়েস ইনপুট (বাংলা)"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Textarea Input */}
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              placeholder="আপনার প্রশ্ন বা খাবারের পছন্দের কথা এখানে লিখুন..."
              className="flex-1 bg-transparent border-none focus:outline-none resize-none text-sm text-gray-800 placeholder-gray-400 max-h-28 py-1.5 px-2"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
