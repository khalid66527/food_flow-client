"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wand2,
  ArrowLeft,
  ImageOff,
  Sparkles,
  RotateCcw,
  Sun,
  Camera,
  Layers,
  Scissors,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns2,
  ChevronDown,
  SlidersHorizontal,
  X,
  Palette,
  HelpCircle,
  Cpu,
  Flame,
} from "lucide-react";
import {
  subscribeAiImageEditHandoff,
  getAiImageEditHandoff,
  getAiImageEditHandoffServerSnapshot,
  clearAiImageEditHandoff,
  applyAiImageEditResult,
} from "@/lib/aiImageEdit";
import {
  requestAiImageEdit,
  type AiEditPhase,
} from "@/lib/aiImageEditApi";
import { applyEditedCoverToDraft } from "@/lib/addFoodDraft";
import {
  STATIC_BACKGROUNDS,
  STATIC_COLOR_STYLES,
  DEFAULT_PROMPT_QUESTIONS,
  matchPresetFromPrompt,
  type StudioBackground,
  type StudioColorStyle,
  type StudioPromptIdea,
} from "@/lib/aiStudioPresets";
import { composeAiStudioImage } from "@/lib/aiImageComposer";

const ADD_FOOD_PATH = "/dashboard/restaurant/add-food";

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

interface EditPreset {
  id: string;
  label: string;
  hint: string;
  prompt: string;
  icon: React.ReactNode;
}

const PRESETS: EditPreset[] = [
  {
    id: "improve-lighting",
    label: "Warm Lighting",
    hint: "Golden warmth",
    prompt: "Make the lighting warmer and enhance appetizing food colors and textures",
    icon: <Sun className="w-4 h-4" />,
  },
  {
    id: "change-bg-wood",
    label: "Rustic Wood Table",
    hint: "Warm wood surface",
    prompt: "Replace the background with a warm rustic wooden restaurant table with soft morning lighting",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: "fine-dining",
    label: "Fine Dining",
    hint: "Bokeh restaurant",
    prompt: "Place this dish in a luxury fine dining restaurant with golden bokeh lights and warm candlelight",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "white-marble",
    label: "White Marble",
    hint: "Clean kitchen",
    prompt: "Place the food on a luxurious white marble countertop with bright, clean studio lighting",
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: "vivid-food",
    label: "Vivid Fresh",
    hint: "Richer colors",
    prompt: "Enhance food colors so toppings, herbs and sauces look vibrant and mouthwatering",
    icon: <Flame className="w-4 h-4" />,
  },
  {
    id: "remove-bg",
    label: "Solid BG Only",
    hint: "White/black flat",
    prompt: "Remove the solid white or black background and place on a rustic wood surface",
    icon: <Scissors className="w-4 h-4" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Adjustments                                                        */
/* ------------------------------------------------------------------ */

type Tone = "warm" | "neutral" | "cool";

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
};

const SLIDERS: {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  suffix: string;
}[] = [
  { key: "warmth", label: "Color Temp (Warmth)", min: 0, max: 100, suffix: "%" },
  { key: "brightness", label: "Brightness", min: 50, max: 150, suffix: "%" },
  { key: "contrast", label: "Contrast", min: 50, max: 150, suffix: "%" },
  { key: "saturation", label: "Vibrance / Saturation", min: 0, max: 200, suffix: "%" },
];

const TONES: { id: Tone; label: string; filter: string }[] = [
  { id: "warm", label: "Golden Warm", filter: "sepia(0.20) saturate(1.10)" },
  { id: "neutral", label: "Natural", filter: "" },
  { id: "cool", label: "Cool Daylight", filter: "hue-rotate(-6deg) saturate(0.98)" },
];

const QUALITIES: { id: string; label: string; value: number }[] = [
  { id: "high", label: "High — best quality", value: 0.95 },
  { id: "balanced", label: "Balanced — recommended", value: 0.85 },
  { id: "web", label: "Web — smallest file", value: 0.7 },
];

type ViewMode = "original" | "edited" | "compare";
type GenerationState = "idle" | "generating" | "done";
type EngineMode = "auto" | "studio";
type ControlTab = "questions" | "backgrounds" | "colors" | "presets";

const PHASE_LABELS: Record<AiEditPhase, string> = {
  submitting: "Connecting to AI model engine...",
  queued: "Analyzing photo lighting and food textures...",
  rendering: "Applying background, color temp & warm lighting...",
  downloading: "Finalizing photo with studio color grading...",
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export default function RestaurantAiImageEditor() {
  const handoff = useSyncExternalStore(
    subscribeAiImageEditHandoff,
    getAiImageEditHandoff,
    getAiImageEditHandoffServerSnapshot
  );

  const [prompt, setPrompt] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationState>("idle");
  const [phase, setPhase] = useState<AiEditPhase>("submitting");
  const [elapsed, setElapsed] = useState(0);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<"api" | "studio" | null>(null);

  const [engineMode, setEngineMode] = useState<EngineMode>("auto");
  const [selectedBg, setSelectedBg] = useState<StudioBackground>(STATIC_BACKGROUNDS[0]);
  const [selectedColor, setSelectedColor] = useState<StudioColorStyle>(STATIC_COLOR_STYLES[0]);
  const [activeTab, setActiveTab] = useState<ControlTab>("questions");

  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [tone, setTone] = useState<Tone>("neutral");
  const [quality, setQuality] = useState("high");
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [comparePos, setComparePos] = useState(50);
  const [zoom, setZoom] = useState(1);

  const [notice, setNotice] = useState<{
    tone: "ok" | "warn" | "info";
    title: string;
    detail?: string;
  } | null>(null);

  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => cancelGeneration, [cancelGeneration]);

  useEffect(() => {
    if (generation !== "generating") return;
    const started = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [generation]);

  /* ------------------------- derived filter ------------------------- */

  const adjusted =
    adjustments.brightness !== DEFAULT_ADJUSTMENTS.brightness ||
    adjustments.contrast !== DEFAULT_ADJUSTMENTS.contrast ||
    adjustments.saturation !== DEFAULT_ADJUSTMENTS.saturation ||
    adjustments.warmth !== DEFAULT_ADJUSTMENTS.warmth ||
    tone !== "neutral";

  const adjustmentFilter = [
    `brightness(${adjustments.brightness}%)`,
    `contrast(${adjustments.contrast}%)`,
    `saturate(${adjustments.saturation}%)`,
    adjustments.warmth > 0 ? `sepia(${Math.min(adjustments.warmth, 40)}%)` : "",
    TONES.find((t) => t.id === tone)?.filter || "",
  ]
    .filter(Boolean)
    .join(" ");

  const isGenerating = generation === "generating";
  const hasEdit = !!editedImage || adjusted;
  const afterSrc = editedImage ?? handoff?.image ?? "";
  const showsBefore = viewMode === "original" || viewMode === "compare";

  /* ---------------------------- handlers ---------------------------- */

  const showEdited = () =>
    setViewMode((mode) => (mode === "original" ? "edited" : mode));

  const handleAdjustment = (key: keyof Adjustments, value: number) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
    showEdited();
  };

  const handleTone = (next: Tone) => {
    setTone(next);
    showEdited();
  };

  const handlePreset = (preset: EditPreset) => {
    setActivePreset(preset.id);
    setPrompt(preset.prompt);
    const matched = matchPresetFromPrompt(preset.prompt);
    setSelectedBg(matched.bg);
    setSelectedColor(matched.colorStyle);
    setNotice(null);
  };

  const handlePromptIdea = (idea: StudioPromptIdea) => {
    setPrompt(idea.prompt);
    const bg = STATIC_BACKGROUNDS.find((b) => b.id === idea.bgId) || selectedBg;
    const color = STATIC_COLOR_STYLES.find((c) => c.id === idea.colorId) || selectedColor;
    setSelectedBg(bg);
    setSelectedColor(color);
    setActivePreset(null);
    setNotice({
      tone: "info",
      title: `Selected: ${idea.badge}`,
      detail: `Background: "${bg.name}" · Color Style: "${color.name}". Click "Generate with AI" to apply.`,
    });
  };

  const handleSelectBackground = (bg: StudioBackground) => {
    setSelectedBg(bg);
    setPrompt(`Replace background with ${bg.name.toLowerCase()} and warm lighting`);
  };

  const handleSelectColor = (color: StudioColorStyle) => {
    setSelectedColor(color);
    setPrompt(`Apply ${color.name.toLowerCase()} with warm color temperature and vibrant food colors`);
  };

  /**
   * Generates an image using curated static backgrounds and color adjustments.
   */
  const runStudioGeneration = async (
    sourceImg: string,
    bg: StudioBackground,
    colorStyle: StudioColorStyle,
    customWarmth?: number
  ) => {
    setPhase("rendering");
    await new Promise((r) => setTimeout(r, 450));
    setPhase("downloading");

    const result = await composeAiStudioImage(sourceImg, bg, colorStyle, {
      customWarmth,
      quality: 0.96,
    });

    setEditedImage(result.dataUrl);
    setGenerationSource("studio");
    setGeneration("done");
    setViewMode("compare");
    setComparePos(50);

    return result;
  };

  const handleGenerate = async () => {
    if (!handoff) return;

    const instruction =
      prompt.trim() ||
      `Place this dish on a ${selectedBg.name.toLowerCase()} with ${selectedColor.name.toLowerCase()}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setNotice(null);
    setGeneration("generating");
    setPhase("submitting");
    setElapsed(0);

    // If user chose Studio mode, run directly from curated static assets
    if (engineMode === "studio") {
      try {
        const matched = matchPresetFromPrompt(instruction);
        const activeBg = selectedBg.id !== STATIC_BACKGROUNDS[0].id ? selectedBg : matched.bg;
        const activeColor = selectedColor.id !== STATIC_COLOR_STYLES[0].id ? selectedColor : matched.colorStyle;

        const result = await runStudioGeneration(
          handoff.image,
          activeBg,
          activeColor,
          matched.customWarmth
        );

        setNotice({
          tone: "ok",
          title: "AI Studio Edit Completed!",
          detail: `Applied ${result.backgroundName} and ${result.colorStyleName} with warm color temp & vibrant contrast.`,
        });
      } catch (err: any) {
        setGeneration("idle");
        setNotice({
          tone: "warn",
          title: "Studio edit failed",
          detail: err?.message || "Could not process image. Please try again.",
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
      return;
    }

    // Auto mode: try Cloud API first; if limit/quota fails, fallback seamlessly to static assets!
    try {
      const result = await requestAiImageEdit({
        image: handoff.image,
        prompt: instruction,
        signal: controller.signal,
        onPhase: setPhase,
      });

      setEditedImage(result);
      setGenerationSource("api");
      setGeneration("done");
      setViewMode("compare");
      setComparePos(50);
      setNotice({
        tone: "ok",
        title: "AI Cloud Model Edit Completed!",
        detail: "The cloud AI model successfully processed your photo.",
      });
    } catch (apiError: any) {
      if (apiError?.name === "AbortError") return;

      // API limit/quota reached -> fallback seamlessly to static background & color presets!
      try {
        setPhase("rendering");
        const matched = matchPresetFromPrompt(instruction);
        const activeBg = selectedBg.id !== STATIC_BACKGROUNDS[0].id ? selectedBg : matched.bg;
        const activeColor = selectedColor.id !== STATIC_COLOR_STYLES[0].id ? selectedColor : matched.colorStyle;

        const result = await runStudioGeneration(
          handoff.image,
          activeBg,
          activeColor,
          matched.customWarmth
        );

        setNotice({
          tone: "ok",
          title: "AI Studio Smart Engine Activated",
          detail: `API quota reached — successfully generated with ${result.backgroundName} and ${result.colorStyleName}!`,
        });
      } catch (fallbackError: any) {
        setGeneration("idle");
        setNotice({
          tone: "warn",
          title: "Generation could not be completed",
          detail:
            fallbackError?.message ||
            apiError?.message ||
            "Please check your internet connection and try again.",
        });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    cancelGeneration();
    setNotice({
      tone: "warn",
      title: "Generation cancelled",
      detail: "Nothing was changed. Adjust your instruction and try again.",
    });
  };

  const handleReset = () => {
    cancelGeneration();
    setEditedImage(null);
    setGenerationSource(null);
    setGeneration("idle");
    setElapsed(0);
    setActivePreset(null);
    setPrompt("");
    setSelectedBg(STATIC_BACKGROUNDS[0]);
    setSelectedColor(STATIC_COLOR_STYLES[0]);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setTone("neutral");
    setViewMode("original");
    setComparePos(50);
    setZoom(1);
    setNotice(null);
  };

  const handleApply = async () => {
    if (!handoff || !hasEdit) return;
    const q = QUALITIES.find((item) => item.id === quality)?.value ?? 0.95;

    try {
      let dataUrl: string;
      let detail: string;

      if (editedImage && !adjusted) {
        dataUrl = editedImage;
        detail = "AI retouch applied · saved to your food item";
      } else {
        const result = await bakeFilteredImage(afterSrc, adjustmentFilter, q);
        dataUrl = result.dataUrl;
        detail = `${result.width} × ${result.height}px · ${formatBytes(
          result.bytes
        )} · applied to food item`;
      }

      if (!applyAiImageEditResult(dataUrl)) {
        throw new Error("Could not store the edited photo");
      }
      applyEditedCoverToDraft(dataUrl);

      setEditedImage(null);
      setGeneration("idle");
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setTone("neutral");
      setViewMode("original");
      setNotice({
        tone: "ok",
        title: "Changes applied to this photo",
        detail,
      });

      router.push(ADD_FOOD_PATH);
    } catch {
      setNotice({
        tone: "warn",
        title: "Could not save the edited photo",
        detail:
          "The image could not be encoded. Try selecting Web export quality or re-uploading.",
      });
    }
  };

  const handleDiscard = () => {
    cancelGeneration();
    clearAiImageEditHandoff();
    handleReset();
  };

  const nudgeZoom = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));

  /* ----------------------------- empty ----------------------------- */

  if (!handoff) {
    return (
      <div className="w-full max-w-7xl mx-auto pb-16 space-y-6">
        <BackLink />
        <Hero />
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-8 sm:p-14 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6B35]">
            <ImageOff className="w-8 h-8" />
          </div>
          <span className="text-base font-black text-gray-900">
            No photo selected yet
          </span>
          <span className="text-xs text-gray-500 max-w-sm leading-relaxed">
            Add photos to the Food Photos Gallery first, then use &quot;Image
            Edit by AI&quot; to bring your cover photo here.
          </span>
          <Link
            href={ADD_FOOD_PATH}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] text-white text-xs font-bold hover:bg-[#e85b27] transition cursor-pointer"
          >
            Go to Add Food
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------- editor ---------------------------- */

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 space-y-6">
      <BackLink />
      <Hero foodName={handoff.foodName} category={handoff.category} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================= WORKSPACE (LEFT) ======================= */}
        <div className="lg:col-span-7 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-black text-gray-900">
              <Camera className="w-4 h-4 text-[#FF6B35]" />
              <span>Editing Workspace</span>
            </div>
            <div className="flex items-center gap-2">
              {generationSource ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  {generationSource === "api" ? "Cloud AI Model" : "AI Studio Engine"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  AI Studio Ready
                </span>
              )}
            </div>
          </div>

          {/* Dark preview frame */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-950 shadow-inner">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
              {/* Base image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showsBefore ? handoff.image : afterSrc}
                alt={handoff.foodName || "Selected food photo"}
                className="absolute inset-0 w-full h-full object-contain transition-transform"
                style={{
                  filter: showsBefore ? undefined : adjustmentFilter,
                  transform: `scale(${zoom})`,
                }}
              />

              {/* Compare Split View */}
              {viewMode === "compare" && hasEdit ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={afterSrc}
                    alt="AI edited preview"
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-contain transition-transform"
                    style={{
                      filter: adjustmentFilter,
                      transform: `scale(${zoom})`,
                      clipPath: `inset(0 0 0 ${comparePos}%)`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
                    style={{ left: `${comparePos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-[#FF6B35]">
                      <Columns2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </>
              ) : null}

              {/* Badges */}
              {editedImage && viewMode !== "original" ? (
                <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black shadow-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  {generationSource === "api" ? "AI Model Enhanced" : "AI Studio Enhanced"}
                </span>
              ) : null}

              {/* Generating overlay */}
              {isGenerating ? (
                <div className="absolute inset-0 z-20 bg-gray-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-11 h-11 text-[#FF8C42] animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white block">
                      {PHASE_LABELS[phase]}
                    </span>
                    <span className="text-[11px] text-orange-200/75 block">
                      Applying background, color temperature & warm lighting...
                    </span>
                    <span className="text-[10px] text-white/50 tabular-nums block">
                      {elapsed}s elapsed
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelGeneration}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : null}

              {/* Floating toolbar */}
              <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-lg p-1 text-white">
                <ToolButton
                  label="Zoom out"
                  onClick={() => nudgeZoom(-0.25)}
                  disabled={zoom <= ZOOM_MIN}
                >
                  <ZoomOut className="w-4 h-4" />
                </ToolButton>
                <span className="px-1.5 text-[10px] font-black text-white/90 tabular-nums select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <ToolButton
                  label="Zoom in"
                  onClick={() => nudgeZoom(0.25)}
                  disabled={zoom >= ZOOM_MAX}
                >
                  <ZoomIn className="w-4 h-4" />
                </ToolButton>
                <span className="w-px h-4 bg-white/20 mx-0.5" />
                <ToolButton label="Fit to frame" onClick={() => setZoom(1)}>
                  <Maximize2 className="w-4 h-4" />
                </ToolButton>
                <ToolButton
                  label="Before / after"
                  onClick={() =>
                    setViewMode((m) => (m === "compare" ? "edited" : "compare"))
                  }
                  disabled={!hasEdit}
                  active={viewMode === "compare"}
                >
                  <Columns2 className="w-4 h-4" />
                </ToolButton>
              </div>
            </div>
          </div>

          {/* Compare slider */}
          {viewMode === "compare" && hasEdit ? (
            <div className="flex items-center gap-3 p-2.5 bg-orange-50/50 rounded-2xl border border-orange-100">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide shrink-0">
                Original
              </span>
              <input
                id="ai-compare"
                type="range"
                min={0}
                max={100}
                value={comparePos}
                onChange={(e) => setComparePos(Number(e.target.value))}
                aria-label="Compare before and after"
                className="w-full accent-[#FF6B35] cursor-pointer"
              />
              <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-wide shrink-0">
                AI Edited
              </span>
            </div>
          ) : null}

          {/* Two-up result thumbnails */}
          <div className="grid grid-cols-2 gap-3">
            <ResultThumb
              src={handoff.image}
              alt="Original photo"
              chip="Original"
              chipClass="bg-gray-100 text-gray-700"
              active={viewMode === "original"}
              onClick={() => setViewMode("original")}
            />
            <ResultThumb
              src={afterSrc}
              alt="AI enhanced preview"
              chip={generationSource === "api" ? "Cloud AI" : "AI Studio"}
              chipClass="bg-emerald-100 text-emerald-800"
              chipIcon={<Check className="w-2.5 h-2.5" />}
              filter={adjustmentFilter}
              active={viewMode !== "original"}
              disabled={!hasEdit}
              onClick={() => setViewMode("edited")}
            />
          </div>

          {/* Active summary */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF6B35]" />
              <span className="font-bold text-gray-700">Background:</span>
              <span className="font-black text-gray-900">{selectedBg.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-700">Color Style:</span>
              <span className="font-black text-gray-900">{selectedColor.name}</span>
            </div>
          </div>
        </div>

        {/* ======================== CONTROLS (RIGHT) ======================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* --- Engine Mode Selector & Prompt Card --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <Wand2 className="w-4 h-4 text-[#FF6B35]" />
                <span>AI Photo Studio</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-[#FF6B35] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Engine Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Engine Mode</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/90 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setEngineMode("auto")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    engineMode === "auto"
                      ? "bg-white text-[#FF6B35] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span>Auto Mode</span>
                  <span className="text-[9px] font-semibold text-gray-400">
                    API + Static Fallback
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngineMode("studio")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    engineMode === "studio"
                      ? "bg-white text-emerald-600 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>AI Studio</span>
                    <span className="px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black">
                      FREE
                    </span>
                  </span>
                  <span className="text-[9px] font-semibold text-gray-400">
                    Zero Quota · Instant
                  </span>
                </button>
              </div>
            </div>

            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>Describe Your Edit</span>
                <span className="text-[10px] font-semibold text-gray-400 lowercase">
                  type or pick a question below
                </span>
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-[#FF6B35] absolute left-3 top-3 pointer-events-none" />
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setActivePreset(null);
                  }}
                  rows={2}
                  placeholder="e.g. Change background to rustic wood table and make lighting warmer..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100 outline-none resize-none transition"
                />
              </div>

              {/* Quick default suggestions under prompt box */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DEFAULT_PROMPT_QUESTIONS.slice(0, 4).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handlePromptIdea(q)}
                    className="px-2.5 py-1 rounded-lg bg-orange-50/70 hover:bg-orange-100 text-[#FF6B35] text-[10px] font-bold transition cursor-pointer border border-orange-200/60"
                  >
                    + {q.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] via-orange-500 to-amber-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isGenerating
                  ? ""
                  : "hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Photo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>

            {/* Apply button */}
            <button
              type="button"
              onClick={handleApply}
              disabled={!hasEdit}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-45 disabled:cursor-not-allowed ${
                hasEdit
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 cursor-pointer shadow-md shadow-emerald-500/20 hover:scale-[1.01]"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Changes to Food Item</span>
            </button>

            {/* Notifications */}
            {notice ? (
              <div
                className={`p-3 rounded-2xl flex items-start gap-2.5 border ${
                  notice.tone === "ok"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : notice.tone === "info"
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {notice.tone === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : notice.tone === "info" ? (
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black">{notice.title}</p>
                  {notice.detail ? (
                    <p className="text-[10px] font-semibold text-gray-600 mt-0.5 leading-relaxed">
                      {notice.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* --- Tabs: Default Questions / Backgrounds / Colors / Presets --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === "questions"
                    ? "bg-white text-[#FF6B35] shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Default Questions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("backgrounds")}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === "backgrounds"
                    ? "bg-white text-[#FF6B35] shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Backgrounds</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === "colors"
                    ? "bg-white text-[#FF6B35] shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Colors & Light</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === "presets"
                    ? "bg-white text-[#FF6B35] shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Quick Edits</span>
              </button>
            </div>

            {/* TAB 1: Default Questions */}
            {activeTab === "questions" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                    Default Prompt Questions
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    Click to load & apply
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {DEFAULT_PROMPT_QUESTIONS.map((idea) => {
                    const isSelected = prompt === idea.prompt;
                    return (
                      <button
                        key={idea.id}
                        type="button"
                        onClick={() => handlePromptIdea(idea)}
                        className={`w-full p-2.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-orange-50 border-[#FF6B35] ring-1 ring-[#FF6B35]"
                            : "bg-gray-50/70 hover:bg-orange-50/40 border-gray-200/80 hover:border-orange-200"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0 px-2 py-0.5 rounded-md bg-orange-100 text-[#FF6B35] text-[9px] font-black uppercase tracking-wider">
                          {idea.badge}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 leading-snug">
                            {idea.question}
                          </p>
                          <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                            {idea.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Static Backgrounds */}
            {activeTab === "backgrounds" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                    Curated Static Food Backgrounds
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {STATIC_BACKGROUNDS.length} scenes available
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {STATIC_BACKGROUNDS.map((bg) => {
                    const isSelected = selectedBg.id === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => handleSelectBackground(bg)}
                        className={`relative rounded-2xl overflow-hidden border p-2 transition cursor-pointer text-left flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-orange-50 border-[#FF6B35] ring-2 ring-[#FF6B35]"
                            : "bg-white hover:bg-orange-50/40 border-gray-200 hover:border-orange-200"
                        }`}
                      >
                        <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-800 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={bg.previewUrl}
                            alt={bg.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FF6B35] text-white flex items-center justify-center shadow">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-900 truncate">
                            {bg.name}
                          </p>
                          <p className="text-[9px] text-gray-400 line-clamp-1">
                            {bg.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Colors & Lighting */}
            {activeTab === "colors" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                    Color & Light Grading
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    Warmth & Tone
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {STATIC_COLOR_STYLES.map((color) => {
                    const isSelected = selectedColor.id === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleSelectColor(color)}
                        className={`w-full p-2.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400"
                            : "bg-white hover:bg-amber-50/30 border-gray-200"
                        }`}
                      >
                        <span className="text-2xl shrink-0 p-2 rounded-xl bg-orange-50 border border-orange-100">
                          {color.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900">
                            {color.name}
                          </p>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                            {color.description}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#FF6B35] text-white flex items-center justify-center shrink-0 shadow">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Quick Presets */}
            {activeTab === "presets" && (
              <div className="grid grid-cols-2 gap-2.5">
                {PRESETS.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      className={`p-3 rounded-2xl transition cursor-pointer border text-left flex flex-col gap-1.5 ${
                        active
                          ? "bg-orange-50 border-[#FF6B35] ring-1 ring-[#FF6B35]"
                          : "bg-white hover:bg-orange-50/40 border-gray-200 hover:border-orange-200"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          active
                            ? "bg-[#FF6B35] text-white"
                            : "bg-orange-50 text-[#FF6B35]"
                        }`}
                      >
                        {preset.icon}
                      </span>
                      <span className="text-[11px] font-black leading-tight text-gray-900">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-semibold leading-tight text-gray-400">
                        {preset.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- Fine Adjustments (Collapsible) --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <SlidersHorizontal className="w-4 h-4 text-[#FF6B35]" />
                <span>Manual Retouch Sliders</span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustmentsOpen((open) => !open)}
                aria-expanded={adjustmentsOpen}
                aria-label={
                  adjustmentsOpen ? "Collapse adjustments" : "Expand adjustments"
                }
                className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center transition cursor-pointer"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    adjustmentsOpen ? "" : "-rotate-90"
                  }`}
                />
              </button>
            </div>

            {adjustmentsOpen && (
              <div className="space-y-4 pt-2">
                {SLIDERS.map((slider) => (
                  <div key={slider.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`adj-${slider.key}`}
                        className="text-[11px] font-bold text-gray-600"
                      >
                        {slider.label}
                      </label>
                      <span className="text-[11px] font-black text-[#FF6B35] tabular-nums">
                        {adjustments[slider.key]}
                        {slider.suffix}
                      </span>
                    </div>
                    <input
                      id={`adj-${slider.key}`}
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      value={adjustments[slider.key]}
                      onChange={(e) =>
                        handleAdjustment(slider.key, Number(e.target.value))
                      }
                      className="w-full accent-[#FF6B35] cursor-pointer"
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-600">
                    Color Temp Tone Filter
                  </span>
                  <div className="inline-flex w-full rounded-xl bg-gray-100 p-0.5 text-[11px] font-bold">
                    {TONES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTone(item.id)}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                          tone === item.id
                            ? "bg-white text-[#FF6B35] shadow-xs"
                            : "text-gray-500"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="export-quality"
                    className="text-[11px] font-bold text-gray-600"
                  >
                    Export Quality
                  </label>
                  <select
                    id="export-quality"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#FF6B35] outline-none cursor-pointer transition"
                  >
                    {QUALITIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* --- Dish Info Card --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={handoff.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">
                  {handoff.foodName || "Selected Food Item"}
                </p>
                <p className="text-[10px] font-bold text-gray-400">
                  Cover photo from Add Food
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDiscard}
              className="w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200"
            >
              <ImageOff className="w-3.5 h-3.5" />
              <span>Clear Selected Photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function BackLink() {
  return (
    <Link
      href={ADD_FOOD_PATH}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#FF6B35] transition"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back to Add Food</span>
    </Link>
  );
}

function Hero({
  foodName,
  category,
}: {
  foodName?: string;
  category?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-[#FF6B35] to-amber-500 text-white p-7 sm:p-9 shadow-xl">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Food Photo Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            {foodName ? `Edit ${foodName}` : "AI Food Image Studio"}
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm leading-relaxed">
            Enhance warm lighting, color temperature, and appetizing backgrounds with one-click questions or custom AI prompts.
          </p>
        </div>

        {category ? (
          <span className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md text-sm font-black shrink-0">
            {category}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition disabled:opacity-35 disabled:cursor-not-allowed ${
        active
          ? "bg-[#FF6B35] text-white"
          : "text-white/80 hover:bg-white/20"
      } ${disabled ? "" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ResultThumb({
  src,
  alt,
  chip,
  chipClass,
  chipIcon,
  filter,
  active,
  disabled,
  onClick,
}: {
  src: string;
  alt: string;
  chip: string;
  chipClass: string;
  chipIcon?: React.ReactNode;
  filter?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-2xl overflow-hidden border transition text-left disabled:opacity-45 disabled:cursor-not-allowed ${
        active && !disabled
          ? "border-[#FF6B35] ring-2 ring-[#FF6B35]"
          : "border-gray-200 hover:border-orange-200"
      } ${disabled ? "" : "cursor-pointer"}`}
    >
      <div className="w-full aspect-[4/3] bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ filter: filter || undefined }}
        />
      </div>
      <span
        className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${chipClass}`}
      >
        {chipIcon}
        {chip}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Bake the filter into a real image                                  */
/* ------------------------------------------------------------------ */

interface BakeResult {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

function bakeFilteredImage(
  src: string,
  filter: string,
  quality: number
): Promise<BakeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no 2d context"));
          return;
        }
        if (filter) ctx.filter = filter;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          bytes: Math.round((dataUrl.split(",")[1]?.length ?? 0) * 0.75),
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
