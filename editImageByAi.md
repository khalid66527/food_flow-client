# Restaurant AI Image Editor — real model-backed edits

> Supersedes the original "wire it to BFL (FLUX)" plan, and the direct-to-Google revision after it.
> The provider is now **OpenRouter**, an OpenAI-compatible gateway, with a Gemini image model
> behind it — the same "Nano Banana" output, billed through OpenRouter instead of a Google AI
> project. FLUX's async job + polling + status route still do not apply.

## Outcome

Add Food → **Image Edit by AI** → describe an edit → **Generate** → a real edited photo comes
back → **Apply** → return to Add Food with the form intact and the edited photo as the cover.

## Provider

| Decision | Choice |
|---|---|
| Gateway | **OpenRouter**, `https://openrouter.ai/api/v1` — OpenAI-compatible, pay-per-use. Overridable via `OPENROUTER_API_BASE`. |
| Model | A Gemini image model ("Nano Banana"), default `google/gemini-3.1-flash-image`, overridable via `OPENROUTER_MODEL`. Must be a model that *outputs* images — most OpenRouter models are text-out only; `GET /v1/models` marks the image-capable ones with an `image` output modality. |
| API surface | `POST /v1/chat/completions` with the photo as an `image_url` content part and `modalities: ["image","text"]` asking for a picture back. |
| Sync vs async | **Synchronous.** The edited image comes back inline as base64 on the same response, so there is no job id, no polling and no status route. |
| Input format | Inline base64 only. A hosted gallery photo (ImgBB / Unsplash) is downloaded and encoded server-side; a data URI is decoded in place. |
| API key | `OPENROUTER_API_KEY`, server-only — no `NEXT_PUBLIC_` prefix, no hardcoded fallback. |

## Files

### `src/app/api/ai-image-edit/route.ts` (POST)

Body `{ image, prompt }` → `{ success: true, image: "data:image/...;base64,..." }`.

- Rejects an empty prompt / missing image (400) and a missing key (500).
- **SSRF guard.** The gallery lets an owner paste any image URL and this route fetches it from
  inside the server, so loopback, private ranges and cloud-metadata addresses are refused — at
  every redirect hop, by hostname *and* by resolved address. Verified working.
- Caps input at 20MB; requires an `image/*` content type.
- Sends `modalities: ["image", "text"]` so a picture comes back rather than a description of one.
- Parses `choices[0].message.images[].image_url.url`, falling back to `image_url` parts inside a
  multimodal `content` array, and to a `/v1/images/edits`-style `data[].b64_json` should the
  gateway answer in that shape instead.
- A text-only answer is a refusal, reported as such; `finish_reason` of `content_filter` or
  `length` get their own readable messages.
- A 404 is reported as "OpenRouter does not serve `<model>`", which is the failure most likely to
  appear first if `OPENROUTER_MODEL` names a text-only model.
- A 401/403 surfaces as a 502 — an upstream auth failure is the server's problem, not the caller's.

### `src/lib/aiImageEditApi.ts`

Client driver: `requestAiImageEdit({ image, prompt, signal, onPhase })` → one POST, resolves to the
data URI. Phases drive the status text (`submitting` → `rendering` after 1.2s → `downloading`);
`queued` is retained in the union but unused now the call is synchronous. Caller's `AbortSignal`
cancels; a 120s timer bounds a hung request. Checks `success` before the status code, since a model
refusal comes back as `success: false` on a 200. Throws `AiImageEditError` with a user-facing message.

### `src/lib/addFoodDraft.ts`

sessionStorage draft (`foodflow_add_food_draft`) so the editor round trip does not wipe the form.
`saveAddFoodDraft` / `readAddFoodDraft` / `clearAddFoodDraft` / `applyEditedCoverToDraft`.
On `QuotaExceededError` it retries without `images` so typed fields still survive, and never throws.

### `RestaurantAiImageEditor.tsx`

Real async generate with cancel + elapsed counter; `editedImage` data URI is the *after* source;
sliders layer on top via `bakeFilteredImage`, skipped entirely when there are no adjustments.
Apply writes both `applyAiImageEditResult` and `applyEditedCoverToDraft`.

### `AddFoodForm.tsx`

Saves the draft before `router.push` to the editor; restores once on mount then clears both the
draft and the handoff; clears the draft on reset and after a successful submit.

## Status

Verified:

- Provider layer rewritten to OpenRouter; `npx tsc --noEmit` clean, and eslint reports the same
  five pre-existing `no-explicit-any` errors as before — no new findings.
- `google/gemini-3.1-flash-image` confirmed present on OpenRouter's public `/v1/models` with an
  `image` output modality, alongside `google/gemini-3-pro-image` and `openai/gpt-5-image`.
- The SSRF guard, the 20MB cap, the `image/*` content-type check and the request-validation and
  response shapes are carried over from the Gemini implementation unchanged.

**A real edit has now been run and came back correct** — `google/gemini-3.1-flash-image` returned a
1024×1024 PNG (~1.4MB) with visibly warmer, brighter lighting, using the exact request body this
route builds. Two of three consecutive attempts succeeded; one returned `finish_reason:
content_filter` with no image on an ordinary food photo, so **expect an occasional spurious refusal**
— the route already reports that as a readable message, and a retry worked.

### `max_tokens` is required, not optional

OpenRouter reserves `prompt + max_tokens` against the account balance *before* running anything. With
`max_tokens` unset it holds the model's entire output budget and rejects an otherwise affordable edit
with a 402 (`requested up to 58712 tokens, but can only afford 13333`). `MAX_OUTPUT_TOKENS = 4096`
in the route keeps the reservation realistic; do not remove it. A 402 is reported to the owner as
"The AI image credits have run out."

Input size matters too: the photo is sent inline as base64, so a large gallery image costs
proportionally more prompt tokens per edit.

### Providers ruled out

- **Direct Google AI.** The project has no image-generation entitlement: every image model answers
  HTTP 429 with `limit: 0` while text models work fine. Needs billing enabled.
- **AgentRouter** (`agentrouter.org`). Evaluated and rejected. The account exposes five models —
  `claude-opus-4-8`, `claude-opus-5`, `deepseek-v4-flash`, `gpt-5.6-sol`, `gpt-6-astra` — and none
  support images; `/v1/images/generations` answers *"model … does not support the image_gen
  interface"*. It also gates on `User-Agent`, accepting only coding-agent clients, so a server
  route would have to impersonate one. It is a coding-credit service, not an app backend.

## Remaining manual verification

The UI round trip could not be driven end to end here — the restaurant dashboard requires a login.
Once quota exists, sign in and:

1. Add Food → upload a photo, type a name and price → **Image Edit by AI**.
2. Pick a preset, **Generate**. DevTools shows one `POST /api/ai-image-edit` returning
   `{ success: true, image: "data:..." }`. The stage shows a visibly different photo.
3. Confirm the key never leaves the server: search Network and page source for the key — zero hits.
   `process.env.OPENROUTER_API_KEY` should appear only in the route.
4. Move a slider, **Apply**, then **Back to Add Food** — name, price, category and gallery all
   restored, cover thumbnail is the edited photo.
5. Publish and confirm the edited image lands on the menu.
6. Cancel mid-generation returns cleanly to idle.
