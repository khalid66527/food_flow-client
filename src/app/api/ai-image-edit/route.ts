import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";

/**
 * Edit a food photo with a Gemini image model ("Nano Banana"), reached through
 * OpenRouter rather than by calling Google directly.
 *
 * OpenRouter is an OpenAI-compatible relay, so the edit goes out as a
 * `POST /v1/chat/completions` carrying the photo as an `image_url` part and
 * asking for a picture back via `modalities`. The call is synchronous: the
 * edited image comes back inline as base64 on the same response, so there is
 * nothing to poll.
 *
 * The model still will not take a remote image URL — only inline base64 — so a
 * hosted gallery photo (ImgBB / Unsplash) is fetched and encoded here first.
 *
 * The API key is read here and never leaves the server.
 */

const OPENROUTER_API_BASE =
  process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1";

// Must be a model that *outputs* images, not merely accepts them: most models on
// OpenRouter are text-out only. Image-capable ones are listed with an "image"
// output modality by `GET /v1/models`.
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-image";

// OpenRouter reserves `prompt + max_tokens` against the account balance before it
// runs anything, so leaving this unset makes it hold the model's entire output
// budget and reject an affordable edit with a 402. An edited image costs on the
// order of 1.3k tokens, so this is generous while keeping the reservation sane.
const MAX_OUTPUT_TOKENS = 4096;

// Inline image data has to fit inside the request, so cap it well short of trouble.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Hosted photos occasionally sit behind a redirect; follow a few, checking each.
const MAX_REDIRECTS = 3;

interface ResolvedImage {
  mimeType: string;
  base64: string;
}

type Resolution =
  | { ok: true; value: ResolvedImage }
  | { ok: false; message: string };

/* ------------------------------------------------------------------ */
/*  Fetching a user-supplied URL server-side                           */
/*                                                                     */
/*  The gallery lets a restaurant owner paste any image URL, and this   */
/*  route fetches it from inside the server. Without a guard that is an */
/*  SSRF hole into anything the server can reach, so loopback, private  */
/*  ranges and cloud metadata addresses are refused — at every redirect */
/*  hop, not just on the URL that was handed in.                       */
/* ------------------------------------------------------------------ */

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (
    host === "localhost" ||
    host === "::1" ||
    host === "::" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local and cloud metadata
    if (a >= 224) return true; // multicast / reserved
  }

  // IPv6 loopback, unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd]/.test(host) || host.startsWith("fe8") || host.startsWith("fe9")) {
    return true;
  }

  return false;
}

/** Also check where the hostname actually resolves, not just how it is spelled. */
async function resolvesToPrivateAddress(hostname: string): Promise<boolean> {
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.some((entry) => isPrivateHostname(entry.address));
  } catch {
    // Unresolvable — let fetch fail on it and report that instead.
    return false;
  }
}

async function checkFetchableUrl(url: URL): Promise<string | null> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Only http and https image URLs are supported.";
  }
  if (isPrivateHostname(url.hostname)) {
    return "That image URL points at a private address and cannot be fetched.";
  }
  if (await resolvesToPrivateAddress(url.hostname)) {
    return "That image URL resolves to a private address and cannot be fetched.";
  }
  return null;
}

/** Download a hosted photo, validating the URL at each redirect hop. */
async function fetchImageAsBase64(rawUrl: string): Promise<Resolution> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return { ok: false, message: "That image URL is not valid." };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const problem = await checkFetchableUrl(current);
    if (problem) return { ok: false, message: problem };

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        cache: "no-store",
      });
    } catch {
      return {
        ok: false,
        message: "Could not download the selected photo. Try re-uploading it.",
      };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return { ok: false, message: "Could not download the selected photo." };
      }
      current = new URL(location, current);
      continue;
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `Could not download the selected photo (${res.status}). Try re-uploading it.`,
      };
    }

    const contentType = (res.headers.get("content-type") || "")
      .split(";")[0]
      .trim();
    if (!contentType.startsWith("image/")) {
      return { ok: false, message: "That URL does not point to an image." };
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        message: "That photo is larger than 20MB. Please use a smaller image.",
      };
    }

    return {
      ok: true,
      value: {
        mimeType: contentType,
        base64: Buffer.from(arrayBuffer).toString("base64"),
      },
    };
  }

  return { ok: false, message: "That image URL redirects too many times." };
}

/** The model takes inline base64 only, so both gallery formats end up as bytes. */
async function resolveInputImage(image: string): Promise<Resolution> {
  const trimmed = image.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return fetchImageAsBase64(trimmed);
  }

  // [\s\S] rather than the dotAll flag, which this tsconfig target predates.
  const dataUriMatch = trimmed.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/
  );
  if (!dataUriMatch) {
    return {
      ok: false,
      message:
        "The selected photo is not a supported image. Use a hosted image URL or re-upload the photo.",
    };
  }

  const mimeType = dataUriMatch[1];
  const base64 = dataUriMatch[2].replace(/\s+/g, "");

  if (Math.round(base64.length * 0.75) > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: "This photo is larger than 20MB. Please use a smaller image.",
    };
  }

  return { ok: true, value: { mimeType, base64 } };
}

/* ------------------------------------------------------------------ */
/*  Reading the chat/completions response                              */
/* ------------------------------------------------------------------ */

interface CollectedParts {
  images: { mimeType: string; data: string }[];
  texts: string[];
}

/** Split a `data:<mime>;base64,<bytes>` URI into the pieces the caller returns. */
function splitDataUri(url: string): { mimeType: string; data: string } | null {
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2].replace(/\s+/g, "") };
}

/** Pull the returned image and text out of an OpenAI-compatible response. */
function collectParts(json: any): CollectedParts {
  const out: CollectedParts = { images: [], texts: [] };

  const message = json?.choices?.[0]?.message;

  // The common shape: images ride alongside the message rather than inside it.
  for (const entry of message?.images ?? []) {
    const url = entry?.image_url?.url ?? entry?.imageUrl?.url ?? entry?.url;
    const split = typeof url === "string" ? splitDataUri(url) : null;
    if (split) out.images.push(split);
  }

  // A multimodal `content` array carries the same parts for some providers.
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part?.type === "image_url" || part?.type === "output_image") {
        const url = part?.image_url?.url ?? part?.imageUrl?.url;
        const split = typeof url === "string" ? splitDataUri(url) : null;
        if (split) out.images.push(split);
      } else if (typeof part?.text === "string" && part.text) {
        out.texts.push(part.text);
      }
    }
  } else if (typeof message?.content === "string" && message.content) {
    out.texts.push(message.content);
  }

  // Should the gateway answer in the /v1/images/edits shape instead, the bytes
  // are still usable — read them rather than reporting "no image".
  for (const entry of json?.data ?? []) {
    const b64 = entry?.b64_json ?? entry?.b64JSON;
    if (typeof b64 === "string" && b64) {
      out.images.push({ mimeType: "image/png", data: b64.replace(/\s+/g, "") });
    }
  }

  return out;
}

/** Why the model returned no image, in words a restaurant owner can act on. */
function refusalMessage(json: any, texts: string[]): string {
  const finish = json?.choices?.[0]?.finish_reason ?? json?.choices?.[0]?.finishReason;

  if (finish === "content_filter") {
    return "The model declined this edit as unsafe. Try a different instruction or photo.";
  }
  if (finish === "length") {
    return "The model stopped before returning a photo. Try a shorter instruction.";
  }

  const said = texts.join(" ").trim();
  return said
    ? `The model declined this edit: ${said}`
    : "The model did not return an edited image. Try rewording the instruction.";
}

function errorMessageFrom(json: any, status: number, raw: string): string {
  return (
    (json?.error && typeof json.error.message === "string"
      ? json.error.message
      : null) ||
    (typeof json?.message === "string" ? json.message : null) ||
    raw?.slice(0, 300) ||
    `HTTP ${status}`
  );
}

async function readJsonBody(
  res: Response
): Promise<{ json: any; raw: string }> {
  const raw = await res.text();
  try {
    return { json: raw ? JSON.parse(raw) : null, raw };
  } catch {
    return { json: null, raw };
  }
}

/* ------------------------------------------------------------------ */
/*  Route                                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const image = typeof body?.image === "string" ? body.image : "";

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          message: "Describe the edit you want before generating.",
        },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { success: false, message: "No photo was provided to edit." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const input = await resolveInputImage(image);
    if (!input.ok) {
      return NextResponse.json(
        { success: false, message: input.message },
        { status: 400 }
      );
    }

    const routerRes = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter attributes usage to the calling app via these two; both are
        // optional, and the referer is only sent when it is actually configured.
        ...(process.env.OPENROUTER_SITE_URL
          ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
          : {}),
        "X-Title": "FoodFlow",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.value.mimeType};base64,${input.value.base64}`,
                },
              },
            ],
          },
        ],
        // Ask for a picture back, not a description of one.
        modalities: ["image", "text"],
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
    });

    const { json, raw } = await readJsonBody(routerRes);

    if (!routerRes.ok) {
      const detail = errorMessageFrom(json, routerRes.status, raw);

      // A model the plan does not carry fails here first, so name it.
      if (routerRes.status === 404) {
        return NextResponse.json(
          {
            success: false,
            message: `OpenRouter does not serve "${OPENROUTER_MODEL}". Check GET /v1/models and set OPENROUTER_MODEL to a model with image output.`,
          },
          { status: 502 }
        );
      }

      // Out of credits, or too little headroom for the reservation above. Both
      // are account problems the owner can act on, so say so plainly.
      if (routerRes.status === 402) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The AI image credits have run out. Top up the OpenRouter account to keep editing photos.",
          },
          { status: 402 }
        );
      }

      if (routerRes.status === 429) {
        return NextResponse.json(
          {
            success: false,
            message: `The AI service is rate limited right now. ${detail}`,
          },
          { status: 429 }
        );
      }

      // An upstream auth failure is the server's problem, not the caller's, so
      // it surfaces as a 502 rather than passing 401/403 down to the browser.
      return NextResponse.json(
        {
          success: false,
          message:
            routerRes.status === 401 || routerRes.status === 403
              ? `OpenRouter rejected the API key (${routerRes.status}): ${detail}`
              : `OpenRouter rejected the request (${routerRes.status}): ${detail}`,
        },
        {
          status:
            routerRes.status === 401 || routerRes.status === 403
              ? 502
              : routerRes.status,
        }
      );
    }

    const parts = collectParts(json);

    if (parts.images.length === 0) {
      // A text-only answer is the model explaining why it will not do the edit.
      return NextResponse.json(
        { success: false, message: refusalMessage(json, parts.texts) },
        { status: 200 }
      );
    }

    const picked = parts.images[0];
    return NextResponse.json({
      success: true,
      image: `data:${picked.mimeType};base64,${picked.data}`,
    });
  } catch (error: any) {
    console.error("AI image edit error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to run the AI image edit",
      },
      { status: 500 }
    );
  }
}
