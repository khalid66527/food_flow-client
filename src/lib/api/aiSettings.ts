export type TAiProvider = 'gemini' | 'groq' | 'agentrouter';

export interface IPreSuggestedPrompt {
  id: string;
  label: string;
  message: string;
  icon?: string;
  active?: boolean;
}

export interface IApiKeyMetric {
  id: string;
  maskedKey: string;
  usageCount: number;
  lastUsedAt?: string | null;
  status: 'active' | 'rate_limited' | 'error';
  addedAt?: string | null;
}

export interface IAiSettingsData {
  activeProvider: TAiProvider;
  activeModel: string;
  geminiKeys: IApiKeyMetric[];
  groqKeys: IApiKeyMetric[];
  agentRouterKeys: IApiKeyMetric[];
  rawGeminiCount?: number;
  rawGroqCount?: number;
  rawAgentRouterCount?: number;
  salesExecutivePrompt: string;
  temperature: number;
  maxOutputTokens: number;
  locationAware: boolean;
  moodPillsEnabled: boolean;
  preSuggestedPromptsEnabled: boolean;
  preSuggestedPrompts: IPreSuggestedPrompt[];
  fallbackEnabled: boolean;
  updatedAt?: string;
}

const SERVER_BASE_URL = (
  process.env.NEXT_PUBLIC_SERVER_API_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = `${SERVER_BASE_URL}/api`;

export async function getAiSettings(): Promise<{ success: boolean; data?: IAiSettingsData; message?: string }> {
  try {
    let res = await fetch("/api/ai/settings", { cache: "no-store" });
    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/settings`, { cache: "no-store" });
    }
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to load AI configuration.",
    };
  }
}

export async function updateAiSettings(
  payload: Partial<IAiSettingsData>
): Promise<{ success: boolean; data?: IAiSettingsData; message?: string }> {
  try {
    let res = await fetch("/api/ai/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to update AI configuration.",
    };
  }
}

export async function addAiKey(
  provider: TAiProvider,
  apiKey: string
): Promise<{ success: boolean; data?: IAiSettingsData; message?: string }> {
  try {
    let res = await fetch("/api/ai/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_key", provider, apiKey }),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_key", provider, apiKey }),
      });
    }

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to add API key.",
    };
  }
}

export async function removeAiKey(
  provider: TAiProvider,
  index: number
): Promise<{ success: boolean; data?: IAiSettingsData; message?: string }> {
  try {
    let res = await fetch("/api/ai/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_key", provider, index }),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_key", provider, index }),
      });
    }

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to remove API key.",
    };
  }
}

export async function testAiKey(
  provider: TAiProvider,
  apiKey?: string,
  model?: string,
  keyIndex?: number
): Promise<{ success: boolean; message: string }> {
  try {
    let res = await fetch("/api/ai/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, model, keyIndex }),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/test-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model, keyIndex }),
      });
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Key test request failed.",
    };
  }
}

export async function resetKeyUsage(
  provider: TAiProvider,
  index?: number
): Promise<{ success: boolean; data?: IAiSettingsData; message?: string }> {
  try {
    let res = await fetch("/api/ai/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_usage", provider, index }),
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/ai/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_usage", provider, index }),
      });
    }

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to reset API key usage.",
    };
  }
}

