import { NextRequest, NextResponse } from "next/server";
import { getSettingsCollection } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, keyIndex, model } = await req.json();

    if (!provider) {
      return NextResponse.json(
        { success: false, message: "Provider is required." },
        { status: 400 }
      );
    }

    let key = apiKey ? String(apiKey).trim() : "";

    // If key is masked or keyIndex is supplied, fetch real key from database
    if ((!key || key.includes("...")) && typeof keyIndex === "number") {
      const col = await getSettingsCollection();
      const doc = await col.findOne({ key: "ai_configuration" });
      const field =
        provider === "groq"
          ? "groqKeys"
          : provider === "agentrouter"
          ? "agentRouterKeys"
          : "geminiKeys";

      const list: any[] = Array.isArray(doc?.[field]) ? doc[field] : [];
      if (keyIndex >= 0 && keyIndex < list.length) {
        const item = list[keyIndex];
        key = typeof item === "string" ? item.trim() : (item?.key?.trim() || "");
      }
    }

    if (!key || key.includes("...")) {
      return NextResponse.json(
        { success: false, message: "Valid API key not found for testing." },
        { status: 400 }
      );
    }

    // 1. Test Groq
    if (provider === "groq") {
      const targetModel = model || "openai/gpt-oss-120b";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        return NextResponse.json({ success: true, message: "Groq API key verified successfully!" });
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return NextResponse.json({ success: false, message: errMsg }, { status: 400 });
    }

    // 2. Test Agent Router
    if (provider === "agentrouter") {
      const res = await fetch("https://agentrouter.org/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          Originator: "codex_cli_rs",
          Version: "0.114.0",
          "anthropic-dangerous-direct-browser-access": "true",
          "x-app": "cli",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: [{ role: "user", content: "ping" }],
          stream: true,
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return NextResponse.json({ success: false, message: errMsg }, { status: 400 });
      }

      if (res.body) {
        const reader = res.body.getReader();
        await reader.read();
        reader.cancel();
      }

      return NextResponse.json({ success: true, message: "Agent Router API key verified successfully!" });
    }

    // 3. Test Google Gemini
    const geminiModel = model || "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    );

    if (res.ok) {
      return NextResponse.json({ success: true, message: "Google Gemini API key verified successfully!" });
    }

    const errJson = await res.json().catch(() => null);
    const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    return NextResponse.json({ success: false, message: errMsg }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to test key" },
      { status: 500 }
    );
  }
}
