/**
 * Hand-off for the "Image Edit by AI" flow.
 *
 * The gallery in AddFoodForm holds a mix of hosted URLs (ImgBB / Unsplash) and
 * base64 data URIs from the local-compression fallback. Data URIs are far too
 * long to survive a query string, so the selected photo is parked in
 * sessionStorage and picked up by the editor page.
 *
 * Exposed as a tiny external store so the editor can read it with
 * useSyncExternalStore instead of a mount effect.
 */

const STORAGE_KEY = "foodflow_ai_image_edit";

export interface AiImageEditHandoff {
  /** The photo to edit — a hosted URL or a base64 data URI. */
  image: string;
  /** Food name as typed on the form, if any — shown as context in the editor. */
  foodName?: string;
  /** Selected food category, if any. */
  category?: string;
  savedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Store internals                                                    */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity, so the parsed object is
// cached and only rebuilt when the underlying raw string actually changes.
let cachedRaw: string | null = null;
let cachedValue: AiImageEditHandoff | null = null;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): AiImageEditHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiImageEditHandoff>;
    if (!parsed || typeof parsed.image !== "string" || !parsed.image) {
      return null;
    }
    return {
      image: parsed.image,
      foodName:
        typeof parsed.foodName === "string" ? parsed.foodName : undefined,
      category:
        typeof parsed.category === "string" ? parsed.category : undefined,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function saveAiImageEditHandoff(
  payload: Omit<AiImageEditHandoff, "savedAt">,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const record: AiImageEditHandoff = { ...payload, savedAt: Date.now() };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    emit();
    return true;
  } catch {
    // Private mode / storage disabled — the editor falls back to its empty state.
    return false;
  }
}

/**
 * Replace the stored photo with an edited version, keeping the rest of the
 * hand-off intact. Used when an edit is applied in the editor.
 */
export function applyAiImageEditResult(image: string): boolean {
  if (typeof window === "undefined" || !image) return false;
  const current = getAiImageEditHandoff();
  if (!current) return false;
  return saveAiImageEditHandoff({
    image,
    foodName: current.foodName,
    category: current.category,
  });
}

export function clearAiImageEditHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — the key simply stays until the tab closes.
  }
  emit();
}

/** Current value. Stable identity between changes, so it is safe as a snapshot. */
export function getAiImageEditHandoff(): AiImageEditHandoff | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

/** sessionStorage does not exist while rendering on the server. */
export function getAiImageEditHandoffServerSnapshot(): null {
  return null;
}

export function subscribeAiImageEditHandoff(listener: () => void): () => void {
  listeners.add(listener);
  // Also pick up writes made by other tabs sharing this session.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
