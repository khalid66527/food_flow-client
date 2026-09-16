/**
 * Client-side driver for the AI image edit round trip.
 *
 * The route at `/api/ai-image-edit` talks to Gemini, which edits images
 * synchronously: the edited photo comes back inline on the same response, so a
 * single edit is one call with no job id and nothing to poll.
 *
 * That call still takes ~5-15s, so the phase callback keeps the stage honest
 * about what is happening while it is in flight.
 *
 * Distinct from `aiImageEdit.ts`, which is the sessionStorage hand-off store.
 */

const SUBMIT_PATH = "/api/ai-image-edit";

/** The model is working long before it answers; move off "submitting" by then. */
const RENDERING_PHASE_AFTER_MS = 1200;

/** Backstop so a hung connection surfaces as a message instead of a dead spinner. */
const REQUEST_TIMEOUT_MS = 120_000;

/** Coarse stage of the round trip, used to drive the status text on the stage. */
export type AiEditPhase = "submitting" | "queued" | "rendering" | "downloading";

export interface AiImageEditRequest {
  /** Hosted URL or base64 data URI of the photo to edit. */
  image: string;
  /** The edit instruction. */
  prompt: string;
  signal?: AbortSignal;
  onPhase?: (phase: AiEditPhase) => void;
}

/** Carries a message already written for the user, so callers can show it as is. */
export class AiImageEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiImageEditError";
  }
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isAbort(error: unknown): boolean {
  return (error as Error)?.name === "AbortError";
}

/**
 * Run the edit and resolve to the edited photo as a data URI. Rejects with an
 * `AiImageEditError` carrying a user-facing message, or with an `AbortError`
 * when cancelled by the caller.
 */
export async function requestAiImageEdit({
  image,
  prompt,
  signal,
  onPhase,
}: AiImageEditRequest): Promise<string> {
  onPhase?.("submitting");

  // The caller's signal cancels; a timer bounds a request that never answers.
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  let timedOut = false;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  // Once the photo is up, the wait is the model rendering rather than uploading.
  const renderingTimer = setTimeout(() => {
    onPhase?.("rendering");
  }, RENDERING_PHASE_AFTER_MS);

  let res: Response;
  try {
    res = await fetch(SUBMIT_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, prompt }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (timedOut) {
      throw new AiImageEditError(
        "The AI edit is taking longer than expected. Please try again in a moment.",
      );
    }
    // A caller-driven cancel propagates as-is so the editor stays silent.
    if (isAbort(error)) throw error;
    throw new AiImageEditError(
      "Could not reach the AI service. Check your connection and try again.",
    );
  } finally {
    clearTimeout(renderingTimer);
    clearTimeout(timeoutTimer);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  onPhase?.("downloading");

  const json = await readJson(res);

  // A refusal comes back as `success: false` on a 200, so the flag is checked
  // before the status code.
  if (!json?.success) {
    throw new AiImageEditError(
      json?.message || `The AI service returned an error (${res.status}).`,
    );
  }

  if (typeof json.image !== "string" || !json.image) {
    throw new AiImageEditError(
      "The AI service did not return an edited photo. Please try again.",
    );
  }

  return json.image;
}
