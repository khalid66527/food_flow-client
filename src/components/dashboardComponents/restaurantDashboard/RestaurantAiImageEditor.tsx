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
  Info,
  RotateCcw,
  Sun,
  Camera,
  Eraser,
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
  AiImageEditError,
  type AiEditPhase,
} from "@/lib/aiImageEditApi";
import { applyEditedCoverToDraft } from "@/lib/addFoodDraft";

const ADD_FOOD_PATH = "/dashboard/restaurant/add-food";

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/*                                                                     */
/*  Each preset just fills the prompt box with a well-worded            */
/*  instruction. The edit itself is performed by FLUX on the server.    */
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
    id: "remove-background",
    label: "Remove Background",
    hint: "Isolate the dish",
    prompt: "Remove the background and leave the dish on a clean white surface",
    icon: <Scissors className="w-4 h-4" />,
  },
  {
    id: "enhance-food",
    label: "Enhance Food",
    hint: "Richer colour",
    prompt: "Enhance the dish so the textures and colors look fresh and vivid",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "improve-lighting",
    label: "Improve Lighting",
    hint: "Warm and even",
    prompt: "Improve the lighting so the dish looks warm and evenly lit",
    icon: <Sun className="w-4 h-4" />,
  },
  {
    id: "professional-photo",
    label: "Professional Photo",
    hint: "Studio look",
    prompt:
      "Make this look like a professional studio food photograph with soft shadows",
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: "remove-objects",
    label: "Remove Objects",
    hint: "Clear the clutter",
    prompt: "Remove the clutter around the plate and keep only the dish",
    icon: <Eraser className="w-4 h-4" />,
  },
  {
    id: "change-background",
    label: "Change Background",
    hint: "New surface",
    prompt: "Replace the background with a warm wooden restaurant table",
    icon: <Layers className="w-4 h-4" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Adjustments — these are real, not mocked                           */
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
  { key: "brightness", label: "Brightness", min: 50, max: 150, suffix: "%" },
  { key: "contrast", label: "Contrast", min: 50, max: 150, suffix: "%" },
  { key: "saturation", label: "Saturation", min: 0, max: 200, suffix: "%" },
  { key: "warmth", label: "Warmth", min: 0, max: 100, suffix: "%" },
];

const TONES: { id: Tone; label: string; filter: string }[] = [
  { id: "warm", label: "Warm", filter: "sepia(0.18) saturate(1.08)" },
  { id: "neutral", label: "Neutral", filter: "" },
  { id: "cool", label: "Cool", filter: "hue-rotate(-8deg) saturate(0.96)" },
];

const QUALITIES: { id: string; label: string; value: number }[] = [
  { id: "high", label: "High — best quality", value: 0.95 },
  { id: "balanced", label: "Balanced — recommended", value: 0.85 },
  { id: "web", label: "Web — smallest file", value: 0.7 },
];

type ViewMode = "original" | "edited" | "compare";
type GenerationState = "idle" | "generating" | "done";

const PHASE_LABELS: Record<AiEditPhase, string> = {
  submitting: "Sending the photo to the model...",
  queued: "Waiting for the model to pick up the job...",
  rendering: "Rendering the edited photo...",
  downloading: "Bringing the result back...",
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export default function RestaurantAiImageEditor() {
  // The photo is parked in sessionStorage by the Add Food gallery.
  const handoff = useSyncExternalStore(
    subscribeAiImageEditHandoff,
    getAiImageEditHandoff,
    getAiImageEditHandoffServerSnapshot,
  );

  const [prompt, setPrompt] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationState>("idle");
  const [phase, setPhase] = useState<AiEditPhase>("submitting");
  const [elapsed, setElapsed] = useState(0);
  // The photo FLUX sent back, as a data URI. Null until an edit succeeds.
  const [editedImage, setEditedImage] = useState<string | null>(null);

  const [adjustments, setAdjustments] =
    useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [tone, setTone] = useState<Tone>("neutral");
  const [quality, setQuality] = useState("balanced");
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [comparePos, setComparePos] = useState(50);
  const [zoom, setZoom] = useState(1);

  const [notice, setNotice] = useState<{
    tone: "ok" | "warn";
    title: string;
    detail?: string;
  } | null>(null);

  const router = useRouter();

  const abortRef = useRef<AbortController | null>(null);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Leaving the page mid-edit should not leave a poll loop running.
  useEffect(() => cancelGeneration, [cancelGeneration]);

  // A FLUX edit takes roughly 5-15s, so show the wait rather than hiding it.
  useEffect(() => {
    if (generation !== "generating") return;
    const started = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
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
    adjustments.warmth > 0 ? `sepia(${adjustments.warmth}%)` : "",
    TONES.find((t) => t.id === tone)?.filter || "",
  ]
    .filter(Boolean)
    .join(" ");

  const isGenerating = generation === "generating";
  const hasEdit = !!editedImage || adjusted;

  // The "after" photo is the FLUX result once there is one, with the local
  // slider adjustments layered on top of it.
  const afterSrc = editedImage ?? handoff?.image ?? "";
  const showsBefore = viewMode === "original" || viewMode === "compare";

  /* ---------------------------- handlers ---------------------------- */

  // Touching an adjustment while the stage shows the untouched photo would
  // look like nothing happened, so promote the view to the edited result.
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
    setNotice(null);
  };

  const handleGenerate = async () => {
    if (!handoff) return;

    const instruction = prompt.trim();
    if (!instruction) {
      setNotice({
        tone: "warn",
        title: "Describe the edit you want, or pick a preset, then generate.",
      });
      return;
    }

    // A second Generate replaces the first rather than racing it.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Held so a failure can fall back to whatever was already on the stage.
    const previous = editedImage;

    setNotice(null);
    setGeneration("generating");
    setPhase("submitting");
    setElapsed(0);

    try {
      const result = await requestAiImageEdit({
        image: handoff.image,
        prompt: instruction,
        signal: controller.signal,
        onPhase: setPhase,
      });
      setEditedImage(result);
      setGeneration("done");
      setViewMode("compare");
      setComparePos(50);
    } catch (error: any) {
      setGeneration(previous ? "done" : "idle");
      if (error?.name === "AbortError") return;
      setNotice({
        tone: "warn",
        title: "The AI edit did not go through",
        detail:
          error instanceof AiImageEditError
            ? error.message
            : error?.message || "Something went wrong. Please try again.",
      });
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
    setGeneration("idle");
    setElapsed(0);
    setActivePreset(null);
    setPrompt("");
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setTone("neutral");
    setViewMode("original");
    setComparePos(50);
    setZoom(1);
    setNotice(null);
  };

  const handleApply = async () => {
    if (!handoff || !hasEdit) return;
    const q = QUALITIES.find((item) => item.id === quality)?.value ?? 0.85;

    try {
      let dataUrl: string;
      let detail: string;

      if (editedImage && !adjusted) {
        // The FLUX result is already a finished image — pushing it back through
        // the canvas would only re-encode it for nothing.
        dataUrl = editedImage;
        detail = "AI edit applied · kept for this editing session only";
      } else {
        const result = await bakeFilteredImage(afterSrc, adjustmentFilter, q);
        dataUrl = result.dataUrl;
        detail = `${result.width} × ${result.height}px · ${formatBytes(
          result.bytes,
        )} · kept for this editing session only`;
      }

      if (!applyAiImageEditResult(dataUrl)) {
        throw new Error("could not store the edited photo");
      }
      // Keep the Add Food draft in step so the restored form shows this cover.
      applyEditedCoverToDraft(dataUrl);

      // handoff.image is now the edited photo, so it becomes the new baseline.
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

      // The edit is saved to the draft now, so there is nothing left to do
      // here — go straight back to Add Food instead of making the owner
      // find the Back link.
      router.push(ADD_FOOD_PATH);
    } catch {
      setNotice({
        tone: "warn",
        title: "Could not save the edited photo",
        detail:
          "The image host blocks canvas export, or the photo is too large to keep in this session. The preview above still shows the result.",
      });
    }
  };

  const handleDiscard = () => {
    // The store notifies, so the view drops back to its empty state on its own.
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
        {/* ======================= WORKSPACE ======================= */}
        <div className="lg:col-span-7 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-black text-gray-900">
              <Camera className="w-4 h-4 text-[#FF6B35]" />
              <span>Editing Workspace</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              AI Powered
            </span>
          </div>

          {/* Dark preview frame */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-900">
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
              {/* Compare keeps the untouched photo underneath the clipped result. */}
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
                    className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none"
                    style={{ left: `${comparePos}%` }}
                  />
                </>
              ) : null}

              {editedImage && viewMode !== "original" ? (
                <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/95 text-white text-[10px] font-black">
                  <Sparkles className="w-3 h-3" />
                  AI edited
                </span>
              ) : null}

              {isGenerating ? (
                <div className="absolute inset-0 z-20 bg-gray-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <Loader2 className="w-9 h-9 text-[#FF8C42] animate-spin" />
                  <span className="text-xs font-bold text-white">
                    {PHASE_LABELS[phase]}
                  </span>
                  <span className="text-[10px] text-white/60 tabular-nums">
                    {elapsed}s elapsed · usually 5-15 seconds
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelGeneration}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : null}

              {/* Floating toolbar */}
              <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur shadow-md p-1">
                <ToolButton
                  label="Zoom out"
                  onClick={() => nudgeZoom(-0.25)}
                  disabled={zoom <= ZOOM_MIN}
                >
                  <ZoomOut className="w-4 h-4" />
                </ToolButton>
                <span className="px-1.5 text-[10px] font-black text-gray-600 tabular-nums select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <ToolButton
                  label="Zoom in"
                  onClick={() => nudgeZoom(0.25)}
                  disabled={zoom >= ZOOM_MAX}
                >
                  <ZoomIn className="w-4 h-4" />
                </ToolButton>
                <span className="w-px h-4 bg-gray-200 mx-0.5" />
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
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide shrink-0">
                Before
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
                After
              </span>
            </div>
          ) : null}

          {/* Two-up result thumbnails */}
          <div className="grid grid-cols-2 gap-3">
            <ResultThumb
              src={handoff.image}
              alt="Original photo"
              chip="Original"
              chipClass="bg-gray-100 text-gray-600"
              active={viewMode === "original"}
              onClick={() => setViewMode("original")}
            />
            <ResultThumb
              src={afterSrc}
              alt="AI enhanced preview"
              chip="AI Enhanced"
              chipClass="bg-emerald-100 text-emerald-700"
              chipIcon={<Check className="w-2.5 h-2.5" />}
              filter={adjustmentFilter}
              active={viewMode !== "original"}
              disabled={!hasEdit}
              onClick={() => setViewMode("edited")}
            />
          </div>
        </div>

        {/* ======================== CONTROLS ======================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-5">
          {/* --- Prompt + generate --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-black text-gray-900">
                <Wand2 className="w-4 h-4 text-[#FF6B35]" />
                <span>Describe Your Edit</span>
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

            <div className="relative">
              <Sparkles className="w-4 h-4 text-[#FF6B35] absolute left-3 top-3 pointer-events-none" />
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setActivePreset(null);
                }}
                rows={3}
                placeholder="e.g. Make the lighting warmer and blur the background slightly"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white focus:border-[#FF6B35] outline-none resize-none transition"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF6B35] via-orange-500 to-amber-500 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                isGenerating
                  ? ""
                  : "hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate with AI</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasEdit}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-45 disabled:cursor-not-allowed ${
                hasEdit
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 cursor-pointer shadow-sm"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>

            {notice ? (
              <div
                className={`p-3 rounded-2xl flex items-start gap-2.5 border ${
                  notice.tone === "ok"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                {notice.tone === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-px text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px text-amber-600" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold ${
                      notice.tone === "ok"
                        ? "text-emerald-700"
                        : "text-amber-800"
                    }`}
                  >
                    {notice.title}
                  </p>
                  {notice.detail ? (
                    <p className="text-[10px] font-semibold text-gray-500 mt-0.5 leading-relaxed">
                      {notice.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* --- Presets --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-wide">
                Quick Presets
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {PRESETS.length} options
              </span>
            </div>

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
          </div>

          {/* --- Adjustments --- */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-black text-gray-900">
                <SlidersHorizontal className="w-4 h-4 text-[#FF6B35]" />
                <span>Adjustments</span>
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

            {adjustmentsOpen ? (
              <div className="space-y-4">
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
                    Tone
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
            ) : null}
          </div>

          {/* --- Selected photo + what Generate actually does --- */}
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
                  {handoff.foodName || "Untitled dish"}
                </p>
                <p className="text-[10px] font-bold text-gray-400">
                  Cover photo from Add Food
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-start gap-2 text-[10px] leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                <strong className="font-black">How this works.</strong> Generate
                sends this photo and your instruction to Black Forest Labs
                (FLUX) to perform the edit. The Adjustments above are applied
                locally in your browser and are baked in on Apply.
              </span>
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
            <span>AI-Powered Food Image Editor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            {foodName ? `Edit ${foodName}` : "AI Food Image Editor"}
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm">
            Retouch your dish photo with AI presets and fine adjustments, then
            apply the result before it goes live on your menu.
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
          : "text-gray-600 hover:bg-gray-100"
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
        className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${chipClass}`}
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
  quality: number,
): Promise<BakeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed so the canvas is not tainted for remotely hosted photos.
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
          // A base64 payload is ~4 characters per 3 bytes.
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
