/**
 * Draft persistence for the Add Food form.
 *
 * AddFoodForm keeps everything in plain useState, so navigating to the AI image
 * editor unmounts it and loses whatever was typed. The draft is parked in
 * sessionStorage before the hop and rehydrated on the way back, which makes the
 * round trip non-destructive.
 *
 * Written in the same defensive style as `aiImageEdit.ts`: SSR guards, try/catch
 * around every storage access, and tolerant parsing so a stale or partial record
 * degrades to "no draft" instead of throwing.
 */

const STORAGE_KEY = "foodflow_add_food_draft";

export interface AddFoodDraft {
  category: string;
  customCategory: string;
  commonData: Record<string, unknown>;
  dynamicData: Record<string, string>;
  images: string[];
  imageInputMode: "upload" | "url";
  activePreviewIndex: number;
  /** True once the AI editor has written an edited cover into this draft. */
  coverEdited: boolean;
  savedAt: number;
}

export type AddFoodDraftInput = Omit<AddFoodDraft, "savedAt" | "coverEdited"> & {
  coverEdited?: boolean;
};

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/**
 * Persist the draft. Never throws.
 *
 * Base64 photos can blow past the ~5MB sessionStorage quota, so the write is
 * tiered: the full record first, then cover-only (the cover is the photo the AI
 * editor works on, so it is the one worth keeping), then no photos at all.
 * Losing photos is far better than losing everything the user typed.
 */
export function saveAddFoodDraft(draft: AddFoodDraftInput): boolean {
  if (typeof window === "undefined") return false;

  const record: AddFoodDraft = {
    ...draft,
    coverEdited: draft.coverEdited ?? false,
    savedAt: Date.now(),
  };

  const attempts: AddFoodDraft[] = [record];

  if (record.images.length > 1) {
    attempts.push({
      ...record,
      images: record.images.slice(0, 1),
      activePreviewIndex: 0,
    });
  }
  if (record.images.length > 0) {
    attempts.push({ ...record, images: [], activePreviewIndex: 0 });
  }

  for (const attempt of attempts) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
      return true;
    } catch {
      // Almost certainly QuotaExceededError from data-URI photos — try smaller.
    }
  }

  // Storage is unavailable entirely — the form simply starts empty.
  return false;
}

export function readAddFoodDraft(): AddFoodDraft | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AddFoodDraft>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      category: typeof parsed.category === "string" ? parsed.category : "Pizza",
      customCategory:
        typeof parsed.customCategory === "string" ? parsed.customCategory : "",
      commonData:
        parsed.commonData && typeof parsed.commonData === "object"
          ? (parsed.commonData as Record<string, unknown>)
          : {},
      dynamicData:
        parsed.dynamicData && typeof parsed.dynamicData === "object"
          ? (parsed.dynamicData as Record<string, string>)
          : {},
      images: isStringArray(parsed.images) ? parsed.images : [],
      imageInputMode: parsed.imageInputMode === "url" ? "url" : "upload",
      coverEdited: parsed.coverEdited === true,
      activePreviewIndex:
        typeof parsed.activePreviewIndex === "number" &&
        parsed.activePreviewIndex >= 0
          ? parsed.activePreviewIndex
          : 0,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearAddFoodDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The key just stays until the tab closes.
  }
}

/**
 * Swap the cover photo in the stored draft for the edited version.
 *
 * Called from the editor on Apply, so the draft stays the single source of truth
 * and AddFoodForm can restore it verbatim without diffing anything on return.
 */
export function applyEditedCoverToDraft(dataUrl: string): boolean {
  if (typeof window === "undefined" || !dataUrl) return false;

  const draft = readAddFoodDraft();
  if (!draft) return false;

  const images = [...draft.images];
  if (images.length === 0) {
    images.push(dataUrl);
  } else {
    images[0] = dataUrl;
  }

  return saveAddFoodDraft({
    category: draft.category,
    customCategory: draft.customCategory,
    commonData: draft.commonData,
    dynamicData: draft.dynamicData,
    images,
    imageInputMode: draft.imageInputMode,
    activePreviewIndex: draft.activePreviewIndex,
    coverEdited: true,
  });
}
