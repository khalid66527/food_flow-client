import { StudioBackground, StudioColorStyle } from "./aiStudioPresets";

export interface ComposeOptions {
  customWarmth?: number;
  quality?: number;
  selectedBackground?: StudioBackground;
}

export interface ComposeResult {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  backgroundName: string;
  colorStyleName: string;
  isBackgroundReplaced: boolean;
}

/**
 * Loads an image safely, resolving to null on failure.
 */
function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Robustly detects whether an image has a solid, flat, or studio backdrop
 * (such as solid white, black, cyan, blue, yellow, gray, green, etc.).
 * Uses multi-corner median sampling to ignore bottom watermarks.
 */
function detectDominantBackgroundColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): {
  isRemovableBg: boolean;
  bgR: number;
  bgG: number;
  bgB: number;
} {
  // Sample multiple points along corners and outer edges (avoiding the bottom 5% watermark area)
  const safeBottom = Math.max(5, Math.floor(height * 0.92));
  const points: [number, number][] = [
    [12, 12], // Top-Left
    [width - 12, 12], // Top-Right
    [Math.floor(width * 0.5), 10], // Top-Center
    [12, Math.floor(height * 0.35)], // Mid-Left
    [width - 12, Math.floor(height * 0.35)], // Mid-Right
    [12, safeBottom], // Bottom-Left (safe)
    [width - 12, safeBottom], // Bottom-Right (safe)
  ];

  const colors: [number, number, number][] = [];
  for (const [x, y] of points) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    colors.push([pixel[0], pixel[1], pixel[2]]);
  }

  // Find median corner color
  const rList = colors.map((c) => c[0]).sort((a, b) => a - b);
  const gList = colors.map((c) => c[1]).sort((a, b) => a - b);
  const bList = colors.map((c) => c[2]).sort((a, b) => a - b);
  const midIdx = Math.floor(colors.length / 2);
  const medR = rList[midIdx];
  const medG = gList[midIdx];
  const medB = bList[midIdx];

  // Count how many sample points match the median color closely (within Euclidean dist < 55)
  let matchCount = 0;
  for (const [r, g, b] of colors) {
    const dr = r - medR;
    const dg = g - medG;
    const db = b - medB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < 55) {
      matchCount++;
    }
  }

  // If at least 4 out of 7 perimeter sample points share the same dominant color,
  // it is definitely a solid / studio background!
  const isRemovableBg = matchCount >= 4;

  return {
    isRemovableBg,
    bgR: medR,
    bgG: medG,
    bgB: medB,
  };
}

/**
 * Removes the detected solid/studio background using smooth Euclidean color
 * distance thresholding with edge anti-aliasing and color de-spill.
 */
function removeSolidBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number = 46
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const tolSq = tolerance * tolerance;
  const featherSq = (tolerance + 26) * (tolerance + 26);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      // Fully background pixel -> transparent
      data[i + 3] = 0;
    } else if (distSq < featherSq) {
      // Soft edge feathering transition
      const factor = (distSq - tolSq) / (featherSq - tolSq);
      data[i + 3] = Math.round(data[i + 3] * factor);

      // Edge de-spill: if background was heavily colored (e.g. cyan or blue),
      // neutralize the edge tint slightly so no fringe remains
      if (factor < 0.7) {
        data[i] = Math.round(r * 0.85 + 30);
        data[i + 1] = Math.round(g * 0.85 + 20);
        data[i + 2] = Math.round(b * 0.85 + 10);
      }
    }
  }

  // Clean bottom watermark area if it sits on the background
  const watermarkStart = Math.floor(height * 0.94);
  for (let y = watermarkStart; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // If surrounded by transparent or close to background, make transparent
      if (data[idx + 3] > 0) {
        const dr = data[idx] - targetR;
        const dg = data[idx + 1] - targetG;
        const db = data[idx + 2] - targetB;
        if (Math.sqrt(dr * dr + dg * dg + db * db) < 70) {
          data[idx + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Draws procedural high-quality textures if an image fails to load.
 */
function drawFallbackSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: StudioBackground["category"]
) {
  if (type === "wood") {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#4a2810");
    grad.addColorStop(0.3, "#6b3e1b");
    grad.addColorStop(0.7, "#543015");
    grad.addColorStop(1, "#361b0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "marble") {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#f8f9fa");
    grad.addColorStop(0.5, "#eef1f4");
    grad.addColorStop(1, "#e2e6ea");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "stone") {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.8);
    grad.addColorStop(0, "#2d3139");
    grad.addColorStop(1, "#121417");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Luxury bokeh
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.7);
    grad.addColorStop(0, "#4a2a18");
    grad.addColorStop(0.5, "#2a160d");
    grad.addColorStop(1, "#140905");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm bokeh circles
    const orbs = [
      { x: 0.18, y: 0.2, r: 75, a: 0.25, c: "255, 190, 90" },
      { x: 0.82, y: 0.25, r: 90, a: 0.3, c: "255, 210, 120" },
      { x: 0.35, y: 0.15, r: 50, a: 0.2, c: "255, 160, 60" },
      { x: 0.75, y: 0.8, r: 100, a: 0.2, c: "255, 180, 80" },
    ];
    for (const orb of orbs) {
      ctx.fillStyle = `rgba(${orb.c}, ${orb.a})`;
      ctx.beginPath();
      ctx.arc(width * orb.x, height * orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Main AI Studio Composition & Retouch Engine.
 */
export async function composeAiStudioImage(
  foodImageSrc: string,
  background: StudioBackground,
  colorStyle: StudioColorStyle,
  options: ComposeOptions = {}
): Promise<ComposeResult> {
  const foodImg = await loadImageSafe(foodImageSrc);
  if (!foodImg) {
    throw new Error("Could not load the food photo for editing.");
  }

  const width = foodImg.naturalWidth || 1200;
  const height = foodImg.naturalHeight || 800;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize canvas context.");

  // Draw initial food photo to analyze
  ctx.drawImage(foodImg, 0, 0, width, height);

  // Check if image has a solid/flat background (white, black, cyan, blue, yellow, etc.)
  const bgDetect = detectDominantBackgroundColor(ctx, width, height);
  let isBackgroundReplaced = false;

  if (bgDetect.isRemovableBg) {
    isBackgroundReplaced = true;

    // Create an isolated dish buffer
    const dishCanvas = document.createElement("canvas");
    dishCanvas.width = width;
    dishCanvas.height = height;
    const dCtx = dishCanvas.getContext("2d", { willReadFrequently: true });

    if (dCtx) {
      dCtx.drawImage(foodImg, 0, 0, width, height);
      removeSolidBackground(
        dCtx,
        width,
        height,
        bgDetect.bgR,
        bgDetect.bgG,
        bgDetect.bgB,
        48
      );

      // Render the new high-res static background surface
      const bgImg = await loadImageSafe(background.previewUrl);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, width, height);
      } else {
        drawFallbackSurface(ctx, width, height, background.category);
      }

      // Render realistic multi-stage grounding contact drop shadow under the dish
      ctx.save();
      const centerX = width * 0.5;
      const centerY = height * 0.54;
      const shadowRadiusX = width * 0.44;
      const shadowRadiusY = height * 0.28;

      // Soft diffused outer shadow
      const outerShadow = ctx.createRadialGradient(
        centerX,
        centerY + height * 0.05,
        shadowRadiusX * 0.1,
        centerX,
        centerY + height * 0.05,
        shadowRadiusX * 1.1
      );
      outerShadow.addColorStop(0, "rgba(0, 0, 0, 0.65)");
      outerShadow.addColorStop(0.4, "rgba(0, 0, 0, 0.35)");
      outerShadow.addColorStop(0.8, "rgba(0, 0, 0, 0.1)");
      outerShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = outerShadow;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + height * 0.05, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tight base occlusion shadow
      const innerShadow = ctx.createRadialGradient(
        centerX,
        centerY + height * 0.08,
        shadowRadiusX * 0.05,
        centerX,
        centerY + height * 0.08,
        shadowRadiusX * 0.55
      );
      innerShadow.addColorStop(0, "rgba(10, 5, 0, 0.85)");
      innerShadow.addColorStop(0.5, "rgba(10, 5, 0, 0.35)");
      innerShadow.addColorStop(1, "rgba(10, 5, 0, 0)");
      ctx.fillStyle = innerShadow;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + height * 0.08, shadowRadiusX * 0.55, shadowRadiusY * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Composite the cleanly keyed food dish on top
      ctx.drawImage(dishCanvas, 0, 0);
    }
  }

  // Directional Studio Lighting / Golden Hour Sunbeam
  if (colorStyle.lightGlow && colorStyle.glowColor !== "transparent") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    let originX = 0;
    let originY = 0;
    if (colorStyle.glowPosition === "top-right") {
      originX = width;
      originY = 0;
    } else if (colorStyle.glowPosition === "top-center") {
      originX = width * 0.5;
      originY = 0;
    }

    const lightGrad = ctx.createRadialGradient(
      originX,
      originY,
      width * 0.05,
      originX,
      originY,
      width * 0.85
    );
    lightGrad.addColorStop(0, colorStyle.glowColor);
    lightGrad.addColorStop(0.35, colorStyle.glowColor.replace(/[\d.]+\)$/, "0.14)"));
    lightGrad.addColorStop(0.7, colorStyle.glowColor.replace(/[\d.]+\)$/, "0.03)"));
    lightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Soft Cinematic Vignette
  const vignette = colorStyle.vignette ?? 0.18;
  if (vignette > 0) {
    ctx.save();
    const vigGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.35,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(0.7, `rgba(15, 8, 4, ${vignette * 0.4})`);
    vigGrad.addColorStop(1, `rgba(10, 4, 1, ${vignette})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Color Temperature & Appetite Vibrance Grading
  const effectiveWarmth = options.customWarmth ?? colorStyle.warmth ?? background.defaultWarmth ?? 0;

  const filters = [
    `brightness(${colorStyle.brightness}%)`,
    `contrast(${colorStyle.contrast}%)`,
    `saturate(${colorStyle.saturation}%)`,
  ];

  if (effectiveWarmth > 0) {
    filters.push(`sepia(${Math.min(effectiveWarmth, 26)}%)`);
  }

  const finalFilter = filters.join(" ");
  if (finalFilter) {
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorCtx = colorCanvas.getContext("2d");
    if (colorCtx) {
      colorCtx.filter = finalFilter;
      colorCtx.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(colorCanvas, 0, 0);
    }
  }

  const q = options.quality ?? 0.96;
  const dataUrl = canvas.toDataURL("image/jpeg", q);
  const bytes = Math.round((dataUrl.split(",")[1]?.length ?? 0) * 0.75);

  return {
    dataUrl,
    width,
    height,
    bytes,
    backgroundName: background.name,
    colorStyleName: colorStyle.name,
    isBackgroundReplaced,
  };
}
