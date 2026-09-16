"use client";

import React from "react";
import { Wand2 } from "lucide-react";

interface RestaurantAiButtonProps {
  onClick: () => void;
  /** "md" matches the upload-mode row, "sm" the tighter paste-URL row. */
  size?: "md" | "sm";
  /** Greyed out when there is no photo to edit yet. */
  disabled?: boolean;
}

const SIZE_CLASSES: Record<"md" | "sm", string> = {
  md: "py-2.5 px-4",
  sm: "py-2 px-3",
};

// AI photo editing entry point for the restaurant dashboard.
// Mirrors the sibling auto-load button's shape and typography, in a purple tint.
export default function RestaurantAiButton({
  onClick,
  size = "md",
  disabled = false,
}: RestaurantAiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Add a photo first to edit it with AI" : undefined}
      className={`w-full ${SIZE_CLASSES[size]} rounded-xl bg-purple-50 text-purple-700 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? "" : "hover:bg-purple-100 cursor-pointer"}`}
    >
      <Wand2 className="w-3.5 h-3.5" />
      <span>Image Edit by AI</span>
    </button>
  );
}
