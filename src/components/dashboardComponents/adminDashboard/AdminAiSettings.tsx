"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Cpu,
  Key,
  Sliders,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  MapPin,
  Flame,
  Zap,
  Bot,
  Loader2,
  Check,
  HelpCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Settings2,
  Activity,
  Clock,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  getAiSettings,
  updateAiSettings,
  addAiKey,
  removeAiKey,
  testAiKey,
  resetKeyUsage,
  TAiProvider,
  IAiSettingsData,
  IPreSuggestedPrompt,
  IApiKeyMetric,
} from "@/lib/api/aiSettings";

const PROVIDER_OPTIONS: Array<{
  id: TAiProvider;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  icon: any;
  models: string[];
}> = [
  {
    id: "groq",
    name: "Groq (LPU Engine)",
    tagline: "Sub-second ultra-fast inference for food conversations",
    badge: "Ultra Fast",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Zap,
    models: [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-20b",
      "llama-3.3-70b-versatile",
    ],
  },
  {
    id: "agentrouter",
    name: "Agent Router (DeepSeek)",
    tagline: "SSE streaming reasoning model for complex sales pairing",
    badge: "DeepSeek v4",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Cpu,
    models: ["deepseek-v4-flash"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Multimodal Google flagship LLM with high contextual memory",
    badge: "Multimodal",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Sparkles,
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ],
  },
];

const DEFAULT_SALES_PROMPT = `You are FoodFlow's Lead Food Concierge & Gourmet Sales Executive. FoodFlow is a premier online food delivery platform in Bangladesh.
Your mission: Entice, delight, and guide customers into ordering the best food deliverable to their location!

PERSONALITY & SALES TONE:
- Be warm, extremely polite, and mouthwateringly descriptive (বাংলায় কথা বলুন). Use appetizing sensory words (যেমন: মুচমুচে, গরম গরম, চিজি, ধোঁয়া ওঠা, স্পাইসি, সুগন্ধি বাসমতী চাল, অথেনটিক মসলা).
- Act as a proactive Sales Executive: If customer chooses a main dish, tempt them with a complementary beverage (ঠান্ডা কোক, বোরহানি), side (স্পাইসি উইংস, ফ্রেঞ্চ ফ্রাইজ) or dessert.
- Always be courteous, enthusiastic, and helpful. Keep responses concise (3-5 engaging sentences).

LOCATION CONTEXT ({{USER_LOCATION}}):
- Prioritize dishes from restaurants in the user's detected area/zone.
- Reassure the customer about swift delivery time (সাধারণত ২৫-৪০ মিনিটে খাবার পৌঁছাবে).

MOOD & CRAVINGS ({{USER_MOOD}}):
- Match the user's vibe (ঝাল/স্পাইসি, চিট ডে/বার্গার-পিজ্জা, হেলদি/সালাদ, লেট নাইট বাইটস, বাজেট কম্বো, পার্টি ও আড্ডা).

ORDER & BUDGET CALCULATION:
- Standard delivery fee is ৳৪০. When recommending packages within a budget, always include the ৳৪০ delivery fee calculation clearly.

STRUCTURED RECOMMENDATIONS:
Whenever suggesting food, ALWAYS append the structured food recommendations and checkout action button codeblocks at the very end of your response:
\`\`\`food_recommendations
[{"id":"<food_id>","restaurantId":"<restaurant_id>","name":"<name>","price":<price>,"discountPrice":<discountPrice_or_null>,"restaurantName":"<restaurant_name>","image":"<image_url>","rating":4.8,"isSpicy":<true/false>}]
\`\`\`
\`\`\`action_buttons
[{"type":"CHECKOUT","label":"চেকআউট করুন"}]
\`\`\`
`;

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Never used";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function AdminAiSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "keys" | "prompt" | "prompts" | "sandbox">("general");

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<IAiSettingsData>({
    activeProvider: "gemini",
    activeModel: "gemini-2.5-flash",
    geminiKeys: [],
    groqKeys: [],
    agentRouterKeys: [],
    salesExecutivePrompt: DEFAULT_SALES_PROMPT,
    temperature: 0.6,
    maxOutputTokens: 900,
    locationAware: true,
    moodPillsEnabled: true,
    preSuggestedPromptsEnabled: true,
    preSuggestedPrompts: [],
    fallbackEnabled: true,
  });

  // Keys Management State
  const [selectedKeyProvider, setSelectedKeyProvider] = useState<TAiProvider>("groq");
  const [newKeyInput, setNewKeyInput] = useState("");
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Starter Prompt Form
  const [newPromptLabel, setNewPromptLabel] = useState("");
  const [newPromptMsg, setNewPromptMsg] = useState("");

  // Sandbox State
  const [sandboxLocation, setSandboxLocation] = useState("ধানমন্ডি, ঢাকা");
  const [sandboxMood, setSandboxMood] = useState("spicy");
  const [sandboxMessage, setSandboxMessage] = useState("আমার বাজেট ৫০০ টাকা, ২ জনের জন্য সেরা স্পাইসি খাবার দেখাও।");
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [sandboxMeta, setSandboxMeta] = useState<{ provider: string; model: string; latency?: number } | null>(null);

  // Load Settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getAiSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to load AI settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings (General Configuration only - does not touch keys!)
  const handleSaveSettings = async (overrideSettings?: Partial<IAiSettingsData>) => {
    setSaving(true);
    setNotification(null);
    try {
      // Exclude keys from general settings payload so existing DB keys are NEVER wiped out
      const { geminiKeys, groqKeys, agentRouterKeys, ...cleanSettings } = {
        ...settings,
        ...(overrideSettings || {}),
      };
      const res = await updateAiSettings(cleanSettings);
      if (res.success && res.data) {
        setSettings(res.data);
        setNotification({ type: "success", text: "AI Settings successfully saved & updated live!" });
      } else {
        throw new Error(res.message || "Save failed");
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to save AI configuration." });
    } finally {
      setSaving(false);
    }
  };

  // Switch Provider
  const handleSelectProvider = (provId: TAiProvider) => {
    const defaultModel = PROVIDER_OPTIONS.find((p) => p.id === provId)?.models[0] || "";
    setSettings((prev) => ({
      ...prev,
      activeProvider: provId,
      activeModel: defaultModel,
    }));
  };

  // Add Key to Current Pool (Direct atomic DB push)
  const handleAddKey = async () => {
    if (!newKeyInput.trim()) return;
    const cleanKey = newKeyInput.trim();

    setSaving(true);
    setNotification(null);
    try {
      const res = await addAiKey(selectedKeyProvider, cleanKey);
      if (res.success && res.data) {
        setSettings(res.data);
        setNewKeyInput("");
        setNotification({
          type: "success",
          text: `${selectedKeyProvider.toUpperCase()} API Key successfully added to pool!`,
        });
      } else {
        throw new Error(res.message || "Failed to add API key");
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to add API key." });
    } finally {
      setSaving(false);
    }
  };

  // Remove Key (Direct atomic DB remove)
  const handleRemoveKey = async (provider: TAiProvider, index: number) => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await removeAiKey(provider, index);
      if (res.success && res.data) {
        setSettings(res.data);
        setNotification({ type: "success", text: "API Key removed from pool." });
      } else {
        throw new Error(res.message || "Failed to remove API key");
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to remove API key." });
    } finally {
      setSaving(false);
    }
  };

  // Test Key (supports testing both raw keys or already saved masked keys by index)
  const handleTestKey = async (provider: TAiProvider, key: string, index?: number) => {
    setTestingKey(key);
    setTestResult(null);
    try {
      const testModel = provider === "groq" ? "openai/gpt-oss-120b" : undefined;
      const res = await testAiKey(provider, key.includes("...") ? undefined : key, testModel, index);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Connection failed" });
    } finally {
      setTestingKey(null);
    }
  };

  // Reset Key Usage Counter (single key or entire pool)
  const handleResetUsage = async (provider: TAiProvider, index?: number) => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await resetKeyUsage(provider, index);
      if (res.success && res.data) {
        setSettings(res.data);
        setNotification({
          type: "success",
          text: index !== undefined ? "API key usage counter reset to 0." : `All ${provider.toUpperCase()} pool keys reset.`,
        });
      } else {
        throw new Error(res.message || "Failed to reset usage");
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to reset usage counter." });
    } finally {
      setSaving(false);
    }
  };

  // Add Starter Prompt
  const handleAddStarterPrompt = async () => {
    if (!newPromptLabel.trim() || !newPromptMsg.trim()) return;
    const newPrompt: IPreSuggestedPrompt = {
      id: Date.now().toString(),
      label: newPromptLabel.trim(),
      message: newPromptMsg.trim(),
      active: true,
    };

    const updatedList = [...(settings.preSuggestedPrompts || []), newPrompt];
    setNewPromptLabel("");
    setNewPromptMsg("");
    await handleSaveSettings({ preSuggestedPrompts: updatedList });
  };

  // Remove Starter Prompt
  const handleRemoveStarterPrompt = async (id: string) => {
    const updated = (settings.preSuggestedPrompts || []).filter((p) => p.id !== id);
    await handleSaveSettings({ preSuggestedPrompts: updated });
  };

  // Run Sandbox Simulation
  const handleRunSandbox = async () => {
    setSandboxRunning(true);
    setSandboxResponse(null);
    setSandboxMeta(null);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sandboxMessage,
          userRole: "customer",
          userLocation: { zoneName: sandboxLocation },
          userMood: sandboxMood,
        }),
      });

      const data = await res.json();
      const latency = Date.now() - startTime;
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Chatbot execution error");
      }
      setSandboxResponse(data.reply);
      setSandboxMeta({
        provider: data.provider || settings.activeProvider,
        model: data.model || settings.activeModel,
        latency,
      });
    } catch (err: any) {
      setSandboxResponse(`❌ Sandbox Error: ${err?.message || "Could not connect to AI engine"}`);
    } finally {
      setSandboxRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#FF6B35]" />
          <p className="text-sm font-semibold text-gray-600">Loading AI Assistant Configuration...</p>
        </div>
      </div>
    );
  }

  const activeProviderMeta = PROVIDER_OPTIONS.find((p) => p.id === settings.activeProvider) || PROVIDER_OPTIONS[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-stone-900 to-gray-950 p-6 md:p-8 text-white shadow-xl border border-gray-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> FoodFlow AI 2.0 Management
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Restaurant Food Sales Executive & Multi-Provider AI Engine
            </h1>
            <p className="text-gray-300 text-sm max-w-2xl">
              Control the proactive gourmet concierge persona, round-robin multi-API-key pools, location & mood filters, and multi-model dispatching across Groq, Agent Router, and Google Gemini.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleSaveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e85d2b] text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving Live..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Security Alert Badge */}
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Zero Hardcoded Secrets Policy:</strong> All API keys are loaded dynamically from environment variables and encrypted database settings. No secret keys are stored in source code.
          </span>
        </div>
      </div>

      {/* Notification Bar */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Cpu className="h-4 w-4" /> Active Provider & Models
        </button>

        <button
          onClick={() => setActiveTab("keys")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "keys"
              ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Key className="h-4 w-4" /> API Key Pools Manager
        </button>

        <button
          onClick={() => setActiveTab("prompt")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "prompt"
              ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Settings2 className="h-4 w-4" /> Persona & Sales Prompt
        </button>

        <button
          onClick={() => setActiveTab("prompts")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "prompts"
              ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Pre-Suggested Prompts
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "sandbox"
              ? "bg-[#FF6B35] text-white shadow-md shadow-orange-500/20"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Live AI Sandbox & Test
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ACTIVE PROVIDER & MODELS                               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Select Primary AI Provider</h2>
            <p className="text-xs text-gray-500 mb-5">
              The primary active provider handles incoming user requests. If exhausted or rate limited, FoodFlow AI automatically cascades to failover providers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PROVIDER_OPTIONS.map((prov) => {
                const isSelected = settings.activeProvider === prov.id;
                const Icon = prov.icon;
                return (
                  <div
                    key={prov.id}
                    onClick={() => handleSelectProvider(prov.id)}
                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#FF6B35] bg-orange-50/30 shadow-md"
                        : "border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected ? "bg-[#FF6B35] text-white" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prov.badgeColor}`}>
                        {prov.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900">{prov.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prov.tagline}</p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-400">Available Models:</span>
                      <span className="text-gray-700">{prov.models.length} Models</span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#FF6B35] text-white flex items-center justify-center text-xs shadow-xs">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Selector */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Active Model for {activeProviderMeta.name}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Choose the exact LLM model for generation. Only models compatible with {activeProviderMeta.name} are shown.
            </p>

            <div className="max-w-md">
              <select
                value={settings.activeModel}
                onChange={(e) => setSettings({ ...settings, activeModel: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm font-semibold text-gray-800 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                {activeProviderMeta.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Assistant Behavior & Feature Toggles</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.locationAware}
                  onChange={(e) => setSettings({ ...settings, locationAware: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Location-Aware Recommendations</h4>
                  <p className="text-xs text-gray-500">
                    Prioritize foods and restaurants deliverable to the user&apos;s detected zone or area.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.moodPillsEnabled}
                  onChange={(e) => setSettings({ ...settings, moodPillsEnabled: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Mood & Craving Quick Pills</h4>
                  <p className="text-xs text-gray-500">
                    Show quick mood filters (Spicy, Cheat Day, Healthy, Late Night) above the chatbot input.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.preSuggestedPromptsEnabled}
                  onChange={(e) => setSettings({ ...settings, preSuggestedPromptsEnabled: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Pre-Suggested Prompt Chips</h4>
                  <p className="text-xs text-gray-500">
                    Display 1-tap quick conversation starters for users when opening the chat.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.fallbackEnabled}
                  onChange={(e) => setSettings({ ...settings, fallbackEnabled: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Local Rule Engine Failover</h4>
                  <p className="text-xs text-gray-500">
                    If all external AI APIs encounter limits or network failure, automatically use the local rule engine.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: API KEY POOLS MANAGER                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Multi-Key Round-Robin Pools</h2>
                <p className="text-xs text-gray-500">
                  Manage multiple API keys per provider. The system automatically rotates through keys when rate limits or quotas are hit.
                </p>
              </div>

              {/* Sub-selector for keys provider */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                {(["groq", "agentrouter", "gemini"] as TAiProvider[]).map((prov) => (
                  <button
                    key={prov}
                    onClick={() => {
                      setSelectedKeyProvider(prov);
                      setTestResult(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      selectedKeyProvider === prov
                        ? "bg-white text-gray-900 shadow-xs"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Key Input */}
            <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Add New {selectedKeyProvider.toUpperCase()} API Key
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder={`Paste ${selectedKeyProvider} API key (e.g., gsk_... or sk-... or AQ...)`}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddKey}
                  disabled={!newKeyInput.trim() || saving}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add to Pool
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <span>{testResult.message}</span>
                <button
                  onClick={() => setTestResult(null)}
                  className="text-[11px] font-bold underline hover:opacity-80"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Existing Keys List & Usage Metrics */}
            {(() => {
              const currentKeys: (string | IApiKeyMetric)[] =
                selectedKeyProvider === "groq"
                  ? settings.groqKeys
                  : selectedKeyProvider === "agentrouter"
                  ? settings.agentRouterKeys
                  : settings.geminiKeys;

              const normalizedKeys: IApiKeyMetric[] = (currentKeys || []).map((item, idx) => {
                if (typeof item === "string") {
                  return {
                    id: `k-${idx}`,
                    maskedKey: item,
                    usageCount: 0,
                    lastUsedAt: null,
                    status: "active",
                    addedAt: null,
                  };
                }
                return item;
              });

              const totalUsage = normalizedKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
              const healthyCount = normalizedKeys.filter((k) => k.status === "active").length;

              return (
                <div className="space-y-4">
                  {/* Pool Usage Summary Cards */}
                  {normalizedKeys.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                      <div className="p-3.5 rounded-xl border border-gray-100 bg-gradient-to-br from-orange-50/60 to-orange-100/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Keys in Pool</span>
                          <Key className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold text-gray-900">{normalizedKeys.length}</span>
                          <span className="text-xs text-gray-500">active</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/60 to-blue-100/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Total API Calls</span>
                          <BarChart3 className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold text-gray-900">{totalUsage}</span>
                          <span className="text-xs text-gray-500">requests</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Pool Health</span>
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold text-emerald-600">
                            {healthyCount}/{normalizedKeys.length}
                          </span>
                          <span className="text-xs text-gray-500">ready</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span>Configured Keys ({normalizedKeys.length})</span>
                      <span className="text-[11px] text-gray-400 font-normal">
                        (Live usage counter updates on every chat request)
                      </span>
                    </span>
                    {normalizedKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetUsage(selectedKeyProvider)}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-600 transition cursor-pointer"
                        title="Reset all counters for this pool"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset All Usage</span>
                      </button>
                    )}
                  </div>

                  {normalizedKeys.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                      No dynamic keys added for {selectedKeyProvider} yet. System will fallback to environment variables if available.
                    </div>
                  ) : (
                    normalizedKeys.map((keyItem, index) => (
                      <div
                        key={keyItem.id || index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200/90 bg-white hover:border-orange-200 hover:shadow-xs transition"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 text-xs font-bold font-mono">
                            #{index + 1}
                          </span>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-gray-900 tracking-wider">
                                {keyItem.maskedKey}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" /> Masked
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {/* Usage Count Pill */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[11px] font-bold border border-orange-100">
                                <Activity className="h-3 w-3 text-orange-500" />
                                <span>{keyItem.usageCount || 0} calls</span>
                              </span>

                              {/* Status Pill */}
                              {keyItem.status === "rate_limited" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  <span>Rate Limited</span>
                                </span>
                              ) : keyItem.status === "error" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span>Error</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Healthy</span>
                                </span>
                              )}

                              {/* Last Used Timestamp */}
                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>{keyItem.lastUsedAt ? formatRelativeTime(keyItem.lastUsedAt) : "Never used"}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTestKey(selectedKeyProvider, keyItem.maskedKey, index)}
                            disabled={testingKey === keyItem.maskedKey}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition cursor-pointer disabled:opacity-50"
                          >
                            {testingKey === keyItem.maskedKey ? (
                              <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                            ) : (
                              <RefreshCw className="h-3 w-3 text-gray-500" />
                            )}
                            Test Connection
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetUsage(selectedKeyProvider, index)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            title="Reset counter for this key"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveKey(selectedKeyProvider, index)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition cursor-pointer"
                            title="Remove Key from Pool"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SALES EXECUTIVE PERSONA & PROMPT TUNING                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "prompt" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Food Sales Executive System Prompt</h2>
                <p className="text-xs text-gray-500">
                  Customize instructions, tone, upselling guidelines, and conversion strategies for the AI Sales Concierge.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, salesExecutivePrompt: DEFAULT_SALES_PROMPT })}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
              >
                Reset to Default Sales Executive Prompt
              </button>
            </div>

            {/* Variable Tags Pills */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
              <span className="font-semibold text-gray-400">Available Dynamic Tags:</span>
              {["{{USER_LOCATION}}", "{{USER_MOOD}}", "{{LIVE_FOODS}}", "{{USER_CART}}", "{{ACTIVE_COUPONS}}"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="font-mono px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>

            <textarea
              rows={16}
              value={settings.salesExecutivePrompt}
              onChange={(e) => setSettings({ ...settings, salesExecutivePrompt: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/30 p-4 font-mono text-xs leading-relaxed text-gray-900 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />

            {/* Hyperparameters Sliders */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-2">
                  <span>Temperature (Creativity & Charm)</span>
                  <span className="font-mono text-orange-600">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0.0 (Precise & Factual)</span>
                  <span>1.0 (Very Creative & Persuasive)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-2">
                  <span>Max Output Tokens (Length Limit)</span>
                  <span className="font-mono text-orange-600">{settings.maxOutputTokens}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={settings.maxOutputTokens}
                  onChange={(e) => setSettings({ ...settings, maxOutputTokens: parseInt(e.target.value, 10) })}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>200 (Short Bites)</span>
                  <span>2000 (Detailed Menus)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PRE-SUGGESTED PROMPTS MANAGER                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "prompts" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Pre-Suggested Quick Starter Prompt Chips</h2>
            <p className="text-xs text-gray-500 mb-6">
              Manage the 1-click interactive prompt chips shown to users on the chatbot widget and full-screen `/ai` page.
            </p>

            {/* Add New Starter Prompt */}
            <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Create New Quick Prompt Chip
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Chip Label (e.g. 🔥 সেরা স্পাইসি খাবার)"
                  value={newPromptLabel}
                  onChange={(e) => setNewPromptLabel(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Full Message Prompt (e.g. আজকের সেরা স্পাইসি ও ঝাল খাবার কী আছে?)"
                  value={newPromptMsg}
                  onChange={(e) => setNewPromptMsg(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddStarterPrompt}
                disabled={!newPromptLabel.trim() || !newPromptMsg.trim() || saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Prompt Chip
              </button>
            </div>

            {/* Existing Prompt Chips */}
            <div className="space-y-2">
              {(settings.preSuggestedPrompts || []).map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition"
                >
                  <div className="min-w-0 pr-4">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-orange-100/70 text-orange-700 text-xs font-bold mb-1">
                      {prompt.label}
                    </span>
                    <p className="text-xs text-gray-700 truncate">{prompt.message}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStarterPrompt(prompt.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition shrink-0 cursor-pointer"
                    title="Remove prompt chip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: LIVE AI PLAYGROUND / SANDBOX                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "sandbox" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Live Sales Concierge Sandbox</h2>
            <p className="text-xs text-gray-500 mb-6">
              Simulate user location, mood, and questions to verify Bengali sales executive tone, upselling, and JSON recommendation blocks in real time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Simulate User Location</label>
                <select
                  value={sandboxLocation}
                  onChange={(e) => setSandboxLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-800 focus:border-orange-500 focus:outline-none"
                >
                  <option value="ধানমন্ডি, ঢাকা">ধানমন্ডি, ঢাকা (Zone 1)</option>
                  <option value="মিরপুর, ঢাকা">মিরপুর, ঢাকা (Zone 2)</option>
                  <option value="গুলশান ও বনানী, ঢাকা">গুলশান ও বনানী, ঢাকা (Zone 3)</option>
                  <option value="উত্তরা, ঢাকা">উত্তরা, ঢাকা (Zone 4)</option>
                  <option value="আগ্রাবাদ, চট্টগ্রাম">আগ্রাবাদ, চট্টগ্রাম</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Simulate User Mood / Vibe</label>
                <select
                  value={sandboxMood}
                  onChange={(e) => setSandboxMood(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-800 focus:border-orange-500 focus:outline-none"
                >
                  <option value="spicy">🌶️ ঝাল ও স্পাইসি (Spicy Cravings)</option>
                  <option value="cheat_day">🍔 চিট ডে / ফাস্ট ফুড (Comfort / Cheat Day)</option>
                  <option value="healthy">🥗 হেলদি / ডায়েট (Healthy & Salad)</option>
                  <option value="late_night">🌙 লেট নাইট ক্রাভিং (Late-Night Bites)</option>
                  <option value="budget">💰 বাজেট কম্বো (Budget Deals)</option>
                  <option value="party">🎉 পার্টি ও আড্ডা (Group Platter)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Simulate Customer Prompt</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sandboxMessage}
                  onChange={(e) => setSandboxMessage(e.target.value)}
                  placeholder="Ask for food recommendations..."
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleRunSandbox}
                  disabled={sandboxRunning || !sandboxMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF6B35] hover:bg-[#e85d2b] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {sandboxRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sandboxRunning ? "Testing..." : "Send Test"}
                </button>
              </div>
            </div>

            {/* Sandbox Output Window */}
            {sandboxResponse && (
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-900 text-gray-100 p-5 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800 mb-3 text-xs">
                  <span className="flex items-center gap-1.5 text-orange-400 font-bold">
                    <Bot className="h-4 w-4" /> AI Sales Concierge Response Preview
                  </span>

                  {/* Live Debug Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <Zap className="h-3 w-3" /> Service: {sandboxMeta?.provider}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <Cpu className="h-3 w-3" /> Model: {sandboxMeta?.model}
                    </span>
                    {sandboxMeta?.latency && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono text-gray-300 bg-gray-800 border border-gray-700">
                        <Clock className="h-3 w-3" /> {sandboxMeta.latency}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-200">
                  {sandboxResponse}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
