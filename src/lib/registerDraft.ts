/**
 * Draft persistence for the registration form.
 *
 * RegisterPage keeps everything in plain useState, so clicking through to the
 * Terms of Service or Privacy Policy unmounts it and loses whatever was typed.
 * The draft is autosaved to sessionStorage and rehydrated on the way back, which
 * makes the round trip non-destructive.
 *
 * Passwords are deliberately left out — the `Pick` below is what enforces it, so
 * the exclusion cannot be undone by a careless call site. They come back blank
 * and the user retypes them.
 *
 * Written in the same defensive style as `addFoodDraft.ts`: SSR guards, try/catch
 * around every storage access, and tolerant parsing so a stale or partial record
 * degrades to "no draft" instead of throwing.
 */

import type { PublicRole, RegisterFormData } from "@/types/auth";

const STORAGE_KEY = "foodflow_register_draft";

/** Kept in sync with `PublicRole`; used to reject anything unrecognised on read. */
const PUBLIC_ROLES: readonly PublicRole[] = [
  "Customer",
  "Restaurant Partner",
  "Delivery Partner",
];

export interface RegisterDraft
  extends Pick<
    RegisterFormData,
    "fullName" | "email" | "phone" | "role" | "agreeToTerms"
  > {
  savedAt: number;
}

function isPublicRole(value: unknown): value is PublicRole {
  return (
    typeof value === "string" && PUBLIC_ROLES.includes(value as PublicRole)
  );
}

/**
 * Persist the safe fields of the form. Never throws.
 *
 * The record is a few hundred bytes, so unlike `addFoodDraft` there is no quota
 * fallback to tier through — a failed write just means the form starts empty.
 */
export function saveRegisterDraft(form: RegisterFormData): boolean {
  if (typeof window === "undefined") return false;

  const record: RegisterDraft = {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    role: form.role,
    agreeToTerms: form.agreeToTerms,
    savedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    // Storage is unavailable (private mode, blocked site data, quota) — the form
    // simply starts empty.
    return false;
  }
}

export function readRegisterDraft(): RegisterDraft | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RegisterDraft>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      role: isPublicRole(parsed.role) ? parsed.role : "Customer",
      agreeToTerms: parsed.agreeToTerms === true,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearRegisterDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The key just stays until the tab closes.
  }
}
