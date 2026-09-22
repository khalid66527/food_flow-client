import { NextRequest, NextResponse } from "next/server";
import { getSettingsCollection } from "@/lib/db";

const DEFAULT_AI_SETTINGS = {
  key: "ai_configuration",
  activeProvider: "gemini",
  activeModel: "gemini-2.5-flash",
  geminiKeys: [],
  groqKeys: [],
  agentRouterKeys: [],
  salesExecutivePrompt: `You are FoodFlow's Lead Food Concierge & Gourmet Sales Executive. FoodFlow is a premier online food delivery platform in Bangladesh.
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
`,
  temperature: 0.6,
  maxOutputTokens: 2048,
  locationAware: true,
  moodPillsEnabled: true,
  preSuggestedPromptsEnabled: true,
  preSuggestedPrompts: [
    { id: "1", label: "🔥 সেরা স্পাইসি খাবার", message: "আজকের সেরা স্পাইসি ও ঝাল খাবার কী আছে?" },
    { id: "2", label: "💰 ৳৫০০ কম্বো (২ জন)", message: "আমার বাজেট ৫০০ টাকা, ২ জনের জন্য সেরা কম্বো খাবার সাজিয়ে দাও।" },
    { id: "3", label: "⚡ দ্রুত ডেলিভারি", message: "আমার এরিয়াতে সবচেয়ে দ্রুত ডেলিভারি কোন খাবারের?" },
    { id: "4", label: "🥗 হেলদি ডায়েট ফুড", message: "হেলদি ও লো-ক্যালরি ডায়েট ফুড অপশন দেখাও।" },
    { id: "5", label: "🌙 লেট-নাইট স্ন্যাক্স", message: "রাতে খাওয়ার মতো হালকা ও মজার কিছু সাজেস্ট করো।" },
    { id: "6", label: "🎉 ৪ জনের পার্টি প্ল্যাটার", message: "৪-৫ জনের আড্ডার জন্য একটা পারফেক্ট প্ল্যাটটার সাজিয়ে দাও।" },
  ],
  fallbackEnabled: true,
  updatedAt: new Date().toISOString(),
};

function extractRawKey(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return typeof item.key === "string" ? item.key.trim() : "";
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function formatKeyMetricArray(keys: any[]): any[] {
  if (!Array.isArray(keys)) return [];
  return keys.map((k, index) => {
    const rawKey = extractRawKey(k);
    return {
      id: typeof k === "object" && k.id ? k.id : `k-${index}`,
      maskedKey: maskKey(rawKey),
      usageCount: typeof k === "object" && typeof k.usageCount === "number" ? k.usageCount : 0,
      lastUsedAt: typeof k === "object" ? k.lastUsedAt || null : null,
      status: typeof k === "object" ? k.status || "active" : "active",
      addedAt: typeof k === "object" ? k.addedAt || null : null,
    };
  });
}

export async function GET() {
  try {
    const col = await getSettingsCollection();
    let settings = await col.findOne({ key: "ai_configuration" });

    if (!settings) {
      await col.insertOne(DEFAULT_AI_SETTINGS);
      settings = await col.findOne({ key: "ai_configuration" });
    }

    const data = {
      activeProvider: settings?.activeProvider || "gemini",
      activeModel: settings?.activeModel || "gemini-2.5-flash",
      geminiKeys: formatKeyMetricArray(settings?.geminiKeys),
      groqKeys: formatKeyMetricArray(settings?.groqKeys),
      agentRouterKeys: formatKeyMetricArray(settings?.agentRouterKeys),
      rawGeminiCount: Array.isArray(settings?.geminiKeys) ? settings.geminiKeys.length : 0,
      rawGroqCount: Array.isArray(settings?.groqKeys) ? settings.groqKeys.length : 0,
      rawAgentRouterCount: Array.isArray(settings?.agentRouterKeys) ? settings.agentRouterKeys.length : 0,
      salesExecutivePrompt: settings?.salesExecutivePrompt || DEFAULT_AI_SETTINGS.salesExecutivePrompt,
      temperature: Number(settings?.temperature ?? 0.6),
      maxOutputTokens: Math.max(Number(settings?.maxOutputTokens ?? 2048), 1800),
      locationAware: settings?.locationAware !== false,
      moodPillsEnabled: settings?.moodPillsEnabled !== false,
      preSuggestedPromptsEnabled: settings?.preSuggestedPromptsEnabled !== false,
      preSuggestedPrompts: Array.isArray(settings?.preSuggestedPrompts) ? settings.preSuggestedPrompts : DEFAULT_AI_SETTINGS.preSuggestedPrompts,
      fallbackEnabled: settings?.fallbackEnabled !== false,
      updatedAt: settings?.updatedAt || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch AI configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const col = await getSettingsCollection();

    // 1. Add Key Action with full metrics tracking record
    if (body.action === "add_key" && body.provider && body.apiKey) {
      const field =
        body.provider === "groq"
          ? "groqKeys"
          : body.provider === "agentrouter"
          ? "agentRouterKeys"
          : "geminiKeys";

      const cleanKey = String(body.apiKey).trim();
      if (!cleanKey || cleanKey.includes("...")) {
        return NextResponse.json({ success: false, message: "Invalid API key format" }, { status: 400 });
      }

      const keyDoc = {
        id: Math.random().toString(36).substring(2, 9),
        key: cleanKey,
        usageCount: 0,
        lastUsedAt: null,
        status: "active",
        addedAt: new Date().toISOString(),
      };

      await col.updateOne(
        { key: "ai_configuration" },
        {
          $push: { [field]: keyDoc as any },
          $set: { updatedAt: new Date().toISOString() },
        },
        { upsert: true }
      );

      const updated = await col.findOne({ key: "ai_configuration" });
      return NextResponse.json({
        success: true,
        message: `${body.provider.toUpperCase()} API Key added successfully!`,
        data: {
          activeProvider: updated?.activeProvider,
          activeModel: updated?.activeModel,
          geminiKeys: formatKeyMetricArray(updated?.geminiKeys),
          groqKeys: formatKeyMetricArray(updated?.groqKeys),
          agentRouterKeys: formatKeyMetricArray(updated?.agentRouterKeys),
          rawGeminiCount: Array.isArray(updated?.geminiKeys) ? updated.geminiKeys.length : 0,
          rawGroqCount: Array.isArray(updated?.groqKeys) ? updated.groqKeys.length : 0,
          rawAgentRouterCount: Array.isArray(updated?.agentRouterKeys) ? updated.agentRouterKeys.length : 0,
          salesExecutivePrompt: updated?.salesExecutivePrompt,
          temperature: updated?.temperature,
          maxOutputTokens: updated?.maxOutputTokens,
          locationAware: updated?.locationAware,
          moodPillsEnabled: updated?.moodPillsEnabled,
          preSuggestedPromptsEnabled: updated?.preSuggestedPromptsEnabled,
          preSuggestedPrompts: updated?.preSuggestedPrompts,
          fallbackEnabled: updated?.fallbackEnabled,
          updatedAt: updated?.updatedAt,
        },
      });
    }

    // 2. Remove Key Action by index
    if (body.action === "remove_key" && body.provider && typeof body.index === "number") {
      const field =
        body.provider === "groq"
          ? "groqKeys"
          : body.provider === "agentrouter"
          ? "agentRouterKeys"
          : "geminiKeys";

      const doc = await col.findOne({ key: "ai_configuration" });
      const currentList: any[] = Array.isArray(doc?.[field]) ? [...doc[field]] : [];

      if (body.index >= 0 && body.index < currentList.length) {
        currentList.splice(body.index, 1);
        await col.updateOne(
          { key: "ai_configuration" },
          {
            $set: { [field]: currentList, updatedAt: new Date().toISOString() },
          },
          { upsert: true }
        );
      }

      const updated = await col.findOne({ key: "ai_configuration" });
      return NextResponse.json({
        success: true,
        message: "API Key removed successfully",
        data: {
          activeProvider: updated?.activeProvider,
          activeModel: updated?.activeModel,
          geminiKeys: formatKeyMetricArray(updated?.geminiKeys),
          groqKeys: formatKeyMetricArray(updated?.groqKeys),
          agentRouterKeys: formatKeyMetricArray(updated?.agentRouterKeys),
          rawGeminiCount: Array.isArray(updated?.geminiKeys) ? updated.geminiKeys.length : 0,
          rawGroqCount: Array.isArray(updated?.groqKeys) ? updated.groqKeys.length : 0,
          rawAgentRouterCount: Array.isArray(updated?.agentRouterKeys) ? updated.agentRouterKeys.length : 0,
          salesExecutivePrompt: updated?.salesExecutivePrompt,
          temperature: updated?.temperature,
          maxOutputTokens: updated?.maxOutputTokens,
          locationAware: updated?.locationAware,
          moodPillsEnabled: updated?.moodPillsEnabled,
          preSuggestedPromptsEnabled: updated?.preSuggestedPromptsEnabled,
          preSuggestedPrompts: updated?.preSuggestedPrompts,
          fallbackEnabled: updated?.fallbackEnabled,
          updatedAt: updated?.updatedAt,
        },
      });
    }

    // 3. Reset Key Usage Action
    if (body.action === "reset_usage" && body.provider) {
      const field =
        body.provider === "groq"
          ? "groqKeys"
          : body.provider === "agentrouter"
          ? "agentRouterKeys"
          : "geminiKeys";

      const doc = await col.findOne({ key: "ai_configuration" });
      let currentList: any[] = Array.isArray(doc?.[field]) ? [...doc[field]] : [];

      if (typeof body.index === "number" && body.index >= 0 && body.index < currentList.length) {
        const item = currentList[body.index];
        if (typeof item === "object") {
          currentList[body.index] = {
            ...item,
            usageCount: 0,
            status: "active",
          };
        } else if (typeof item === "string") {
          currentList[body.index] = {
            id: `k-${body.index}`,
            key: item,
            usageCount: 0,
            lastUsedAt: null,
            status: "active",
            addedAt: new Date().toISOString(),
          };
        }
      } else {
        // Reset all in this pool
        currentList = currentList.map((item, idx) => {
          if (typeof item === "object") {
            return { ...item, usageCount: 0, status: "active" };
          }
          return {
            id: `k-${idx}`,
            key: item,
            usageCount: 0,
            lastUsedAt: null,
            status: "active",
            addedAt: new Date().toISOString(),
          };
        });
      }

      await col.updateOne(
        { key: "ai_configuration" },
        {
          $set: { [field]: currentList, updatedAt: new Date().toISOString() },
        },
        { upsert: true }
      );

      const updated = await col.findOne({ key: "ai_configuration" });
      return NextResponse.json({
        success: true,
        message: "API key usage counter reset successfully",
        data: {
          activeProvider: updated?.activeProvider,
          activeModel: updated?.activeModel,
          geminiKeys: formatKeyMetricArray(updated?.geminiKeys),
          groqKeys: formatKeyMetricArray(updated?.groqKeys),
          agentRouterKeys: formatKeyMetricArray(updated?.agentRouterKeys),
          rawGeminiCount: Array.isArray(updated?.geminiKeys) ? updated.geminiKeys.length : 0,
          rawGroqCount: Array.isArray(updated?.groqKeys) ? updated.groqKeys.length : 0,
          rawAgentRouterCount: Array.isArray(updated?.agentRouterKeys) ? updated.agentRouterKeys.length : 0,
          salesExecutivePrompt: updated?.salesExecutivePrompt,
          temperature: updated?.temperature,
          maxOutputTokens: updated?.maxOutputTokens,
          locationAware: updated?.locationAware,
          moodPillsEnabled: updated?.moodPillsEnabled,
          preSuggestedPromptsEnabled: updated?.preSuggestedPromptsEnabled,
          preSuggestedPrompts: updated?.preSuggestedPrompts,
          fallbackEnabled: updated?.fallbackEnabled,
          updatedAt: updated?.updatedAt,
        },
      });
    }

    // 4. General Settings Update - NEVER overwrite existing keys!
    const updateDoc: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.activeProvider !== undefined) updateDoc.activeProvider = body.activeProvider;
    if (body.activeModel !== undefined) updateDoc.activeModel = body.activeModel;
    if (body.salesExecutivePrompt !== undefined) updateDoc.salesExecutivePrompt = body.salesExecutivePrompt;
    if (body.temperature !== undefined) updateDoc.temperature = Number(body.temperature);
    if (body.maxOutputTokens !== undefined) updateDoc.maxOutputTokens = Number(body.maxOutputTokens);
    if (body.locationAware !== undefined) updateDoc.locationAware = Boolean(body.locationAware);
    if (body.moodPillsEnabled !== undefined) updateDoc.moodPillsEnabled = Boolean(body.moodPillsEnabled);
    if (body.preSuggestedPromptsEnabled !== undefined) updateDoc.preSuggestedPromptsEnabled = Boolean(body.preSuggestedPromptsEnabled);
    if (Array.isArray(body.preSuggestedPrompts)) updateDoc.preSuggestedPrompts = body.preSuggestedPrompts;
    if (body.fallbackEnabled !== undefined) updateDoc.fallbackEnabled = Boolean(body.fallbackEnabled);

    await col.updateOne(
      { key: "ai_configuration" },
      { $set: updateDoc },
      { upsert: true }
    );

    const updated = await col.findOne({ key: "ai_configuration" });

    return NextResponse.json({
      success: true,
      message: "AI configuration saved successfully",
      data: {
        activeProvider: updated?.activeProvider,
        activeModel: updated?.activeModel,
        geminiKeys: formatKeyMetricArray(updated?.geminiKeys),
        groqKeys: formatKeyMetricArray(updated?.groqKeys),
        agentRouterKeys: formatKeyMetricArray(updated?.agentRouterKeys),
        rawGeminiCount: Array.isArray(updated?.geminiKeys) ? updated.geminiKeys.length : 0,
        rawGroqCount: Array.isArray(updated?.groqKeys) ? updated.groqKeys.length : 0,
        rawAgentRouterCount: Array.isArray(updated?.agentRouterKeys) ? updated.agentRouterKeys.length : 0,
        salesExecutivePrompt: updated?.salesExecutivePrompt,
        temperature: updated?.temperature,
        maxOutputTokens: updated?.maxOutputTokens,
        locationAware: updated?.locationAware,
        moodPillsEnabled: updated?.moodPillsEnabled,
        preSuggestedPromptsEnabled: updated?.preSuggestedPromptsEnabled,
        preSuggestedPrompts: updated?.preSuggestedPrompts,
        fallbackEnabled: updated?.fallbackEnabled,
        updatedAt: updated?.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update AI configuration" },
      { status: 500 }
    );
  }
}
