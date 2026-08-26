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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  message: string;
  icon: React.ReactNode;
}

type NormalizedRole = "customer" | "restaurant" | "rider" | "guest";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_API_URL || "http://localhost:5000/api";

const ROLE_QUICK_ACTIONS: Record<NormalizedRole, QuickAction[]> = {
  customer: [
    {
      label: "Track My Order",
      message: "Where is my order right now?",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Help with Cart",
      message: "I need help with my cart checkout.",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      label: "Restaurant Info",
      message: "Can you recommend restaurants near me?",
      icon: <UtensilsCrossed className="h-4 w-4" />,
    },
    {
      label: "Refund Status",
      message: "What is the status of my refund request?",
      icon: <RotateCcw className="h-4 w-4" />,
    },
  ],
  restaurant: [
    {
      label: "Manage Orders",
      message: "How do I manage incoming orders?",
      icon: <Package className="h-4 w-4" />,
    },
    {
      label: "Update Menu",
      message: "I want to update my menu items.",
      icon: <UtensilsCrossed className="h-4 w-4" />,
    },
    {
      label: "Analytics Help",
      message: "How do I read my restaurant analytics?",
      icon: <HelpCircle className="h-4 w-4" />,
    },
    {
      label: "Payouts",
      message: "When will I receive my payout?",
      icon: <RotateCcw className="h-4 w-4" />,
    },
  ],
  rider: [
    {
      label: "Active Delivery",
      message: "I need help with my current delivery.",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Earnings",
      message: "How are my earnings calculated?",
      icon: <RotateCcw className="h-4 w-4" />,
    },
    {
      label: "Route Help",
      message: "I am having trouble finding the delivery address.",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Account Issue",
      message: "I have an issue with my rider account.",
      icon: <HelpCircle className="h-4 w-4" />,
    },
  ],
  guest: [
    {
      label: "How it Works",
      message: "How does FoodFlow work?",
      icon: <HelpCircle className="h-4 w-4" />,
    },
    {
      label: "Nearby Restaurants",
      message: "What restaurants are near me?",
      icon: <UtensilsCrossed className="h-4 w-4" />,
    },
    {
      label: "Create Account",
      message: "How do I create an account?",
      icon: <User className="h-4 w-4" />,
    },
    {
      label: "Contact Support",
      message: "I want to contact customer support.",
      icon: <MessageCircle className="h-4 w-4" />,
    },
  ],
};

const GREETING_MESSAGES: Record<NormalizedRole, string> = {
  customer:
    "Hi there! I'm FoodFlow Assistant. I can help you track orders, find restaurants, or answer any questions about your food delivery.",
  restaurant:
    "Welcome, partner! I'm here to help you manage orders, update your menu, or understand your analytics dashboard.",
  rider:
    "Hey rider! Need help with a delivery, checking earnings, or navigating to a drop-off? I've got you covered.",
  guest:
    "Welcome to FoodFlow! I'm your virtual assistant. Ask me anything about ordering food, our restaurants, or how to get started.",
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
          isUser
            ? "bg-gradient-to-tr from-orange-500 to-amber-500"
            : "bg-gradient-to-tr from-orange-600 to-orange-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-orange-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p
          className={`mt-1 text-[10px] ${
            isUser ? "text-orange-100" : "text-gray-400"
          }`}
        >
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const greetedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; name?: string; email?: string; role?: string }
    | undefined;
  const role = normalizeRole(user?.role);

  /* ---- Auto-scroll ---- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  /* ---- Focus input on open ---- */
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* ---- Greeting ---- */
  useEffect(() => {
    if (isOpen && !greetedRef.current) {
      greetedRef.current = true;
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: GREETING_MESSAGES[role],
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, role]);

  /* ---- Send message ---- */
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

      try {
        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userRole,
            message: content,
            chatHistory,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
        }

        const reply: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content:
            data?.reply ||
            data?.data?.reply ||
            data?.message ||
            "I'm sorry, I couldn't process that. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, reply]);
        setInput("");
      } catch (err) {
        const text =
          err instanceof Error
            ? err.message
            : "Oops! Something went wrong. Please check your connection and try again.";
        setErrorMsg(text);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, user, messages]
  );

  /* ---- Key down ---- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ---- Toggle ---- */
  const toggle = () => setIsOpen((o) => !o);

  /* ---- Render ---- */
  return (
    <>
      {/* =================== Floating Toggle Button =================== */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 md:bottom-8 md:right-8"
        aria-label="Open chat assistant"
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
            >
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Ping dot when closed */}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500" />
          </span>
        )}
      </motion.button>

      {/* =================== Chat Window =================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-100/80 bg-white shadow-2xl shadow-gray-900/10 sm:right-6 md:bottom-28 md:right-8 md:w-96"
          >
            {/* ---- Header ---- */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold tracking-wide font-[family-name:var(--font-jakarta)]">
                  FoodFlow Assistant
                </h3>
                <p className="flex items-center gap-1.5 text-xs text-orange-100">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  Online
                  {user && (
                    <span className="ml-1 truncate text-orange-200">
                      &middot; {user.name?.split(" ")[0]}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={toggle}
                className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ---- Messages ---- */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[50vh] sm:max-h-[55vh] scroll-smooth">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isTyping && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-orange-400 text-white text-xs font-bold">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-gray-100 px-1 py-1">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {errorMsg && (
              <div className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                <p className="font-medium">Error</p>
                <p>{errorMsg}</p>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="mt-1 text-[11px] font-medium text-red-500 underline hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ---- Quick Actions ---- */}
            {messages.length <= 1 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Quick actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_QUICK_ACTIONS[role].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.message)}
                      disabled={isTyping}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-orange-500">{action.icon}</span>
                      <span className="truncate">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Input ---- */}
            <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message…"
                  disabled={isTyping}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
                  aria-label="Send message"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
