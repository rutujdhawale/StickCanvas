// AI-Powered Background Removal Engine — Turbo & Precision Edition
// Uses RMBG-1.4 (briaai) via @huggingface/transformers with high-performance quantized execution,
// connected component main-body saliency detection, noise rejection, and GPU canvas compositing.

import { pipeline, env, RawImage, AutoConfig } from "@huggingface/transformers";
import type { ImageSegmentationPipeline } from "@huggingface/transformers";

// Configure transformers.js for fast in-browser execution
env.allowLocalModels = false;
env.useBrowserCache = true;

// Enable SIMD and multithreaded acceleration for ONNX Runtime WASM
if (typeof navigator !== "undefined" && env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.simd = true;
  env.backends.onnx.wasm.numThreads = Math.min(
    4,
    Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
  );
}

export interface BgRemovalOptions {
  tolerance?: number; // Only used by fallback flood-fill (0-100)
  feather?: number; // feather border radius in pixels (0 to 5)
  removeBg?: boolean; // whether to perform bg removal
  opacity?: number; // 0 to 1
  addStickerBorder?: boolean; // white die-cut border
  borderWidth?: number; // border thickness in px
  onProgress?: (stage: string, progress: number) => void;
}

// ─── ML Model Pipeline Singleton & Fail-Safe Fallback ────────────

let pipelineInstance: ImageSegmentationPipeline | null = null;
let pipelineLoadingPromise: Promise<ImageSegmentationPipeline> | null = null;
let activeBackend: "webgpu" | "wasm" = "wasm";

// Cache masks by image source to make UI adjustments instant (<2ms)
const maskCache = new Map<string, { maskCanvas: HTMLCanvasElement; origW: number; origH: number }>();

async function createSegmentator(preferWasm = false): Promise<ImageSegmentationPipeline> {
  const config = await AutoConfig.from_pretrained("briaai/RMBG-1.4");
  config.model_type = "segformer";

  const isWebGPUAvailable =
    !preferWasm &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    Boolean(navigator.gpu);

  if (isWebGPUAvailable) {
    try {
      console.log("[StickerCanvas] Attempting RMBG-1.4 on WebGPU (fp32)…");
      const seg = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
        config,
        device: "webgpu",
        dtype: "fp32",
      });
      activeBackend = "webgpu";
      console.log("[StickerCanvas] RMBG-1.4 WebGPU pipeline ready!");
      return seg as ImageSegmentationPipeline;
    } catch (gpuErr) {
      console.warn("[StickerCanvas] WebGPU initialization failed, switching to WASM (q8):", gpuErr);
    }
  }

  // Quantized q8 ONNX model is only ~42MB (vs 168MB), loads 4x faster and runs smoothly with SIMD
  console.log("[StickerCanvas] Initializing RMBG-1.4 on WASM (q8 with SIMD)…");
  const seg = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
    config,
    device: "wasm",
    dtype: "q8",
  });
  activeBackend = "wasm";
  console.log("[StickerCanvas] RMBG-1.4 WASM (q8) pipeline ready!");
  return seg as ImageSegmentationPipeline;
}

function getSegmentator(forceWasm = false): Promise<ImageSegmentationPipeline> {
  if (pipelineInstance && (!forceWasm || activeBackend === "wasm")) {
    return Promise.resolve(pipelineInstance);
  }

  if (forceWasm) {
    pipelineInstance = null;
    pipelineLoadingPromise = null;
  }

  if (!pipelineLoadingPromise) {
    pipelineLoadingPromise = createSegmentator(forceWasm)
      .then((inst) => {
        pipelineInstance = inst;
        return inst;
      })
      .catch((err) => {
        console.error("ML model load error:", err);
        pipelineLoadingPromise = null;
        throw err;
      });
  }

  return pipelineLoadingPromise;
}

/**
 * Preload the ML model in the background (called on initial app mount)
 */
export function preloadModel(): void {
  getSegmentator().catch(() => {
    // Silently continue
  });
}

// ─── Instant Pre-Checks & Fast Utilities ──────────────────────────

/**
 * Check if the image already has transparency (e.g. transparent PNG / WebP).
 * Takes <1ms.
 */
function checkAlreadyTransparent(data: Uint8ClampedArray, width: number, height: number): boolean {
  const stepX = Math.max(1, Math.floor(width / 32));
  const stepY = Math.max(1, Math.floor(height / 32));
  let transparentCount = 0;
  let totalSampled = 0;

  for (let x = 0; x < width; x += stepX) {
    if (data[x * 4 + 3] < 30) transparentCount++;
    if (data[((height - 1) * width + x) * 4 + 3] < 30) transparentCount++;
    totalSampled += 2;
  }
  for (let y = 0; y < height; y += stepY) {
    if (data[(y * width) * 4 + 3] < 30) transparentCount++;
    if (data[(y * width + width - 1) * 4 + 3] < 30) transparentCount++;
    totalSampled += 2;
  }

  return totalSampled > 0 && transparentCount / totalSampled > 0.35;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Snug bounding box around alpha > threshold for tight auto-trimming.
 */
function getAlphaBoundingBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 15
): BoundingBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

// ─── Main Body Saliency & Noise Rejection Filter ─────────────────

/**
 * Isolates the main subject/body from raw RMBG-1.4 predictions:
 * - Employs connected component labeling and spatial saliency scoring.
 * - Prioritizes the primary body / center of interest.
 * - Retains significant co-subjects and proximate accessories (bags, hats, shoes, held items).
 * - Discards random peripheral background objects, corner noise, and distant clutter.
 * - Applies smooth Hermite subpixel anti-aliasing curve for crisp, natural contours.
 */
function refineMainSubjectMask(maskData: Uint8Array, w: number, h: number): Uint8ClampedArray {
  const size = w * h;
  const labels = new Int32Array(size);
  let currentLabel = 0;
  const q = new Int32Array(size);

  interface Component {
    label: number;
    area: number;
    score: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    centerX: number;
    centerY: number;
  }
  const components: Component[] = [];

  // 1. Connected Component Labeling on confident foreground (maskData >= 55)
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      if (maskData[idx] < 55 || labels[idx] !== 0) continue;

      currentLabel++;
      labels[idx] = currentLabel;
      q[0] = idx;
      let head = 0, tail = 1;
      let area = 0, sumX = 0, sumY = 0;
      let minX = x, maxX = x, minY = y, maxY = y;

      while (head < tail) {
        const curr = q[head++];
        area++;
        const cx = curr % w;
        const cy = (curr / w) | 0;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const left = cx > 0 ? curr - 1 : -1;
        const right = cx < w - 1 ? curr + 1 : -1;
        const up = cy > 0 ? curr - w : -1;
        const down = cy < h - 1 ? curr + w : -1;

        for (const n of [left, right, up, down]) {
          if (n !== -1 && maskData[n] >= 55 && labels[n] === 0) {
            labels[n] = currentLabel;
            q[tail++] = n;
          }
        }
      }

      const centerX = sumX / area;
      const centerY = sumY / area;
      // Distance from center of image (normalized 0 to 1)
      const distFromCenter = Math.hypot(centerX / w - 0.5, centerY / h - 0.5);
      // Saliency score: larger mass + closer to center of focus
      const score = area * (1 - 0.45 * distFromCenter);

      components.push({
        label: currentLabel,
        area,
        score,
        minX,
        maxX,
        minY,
        maxY,
        centerX,
        centerY,
      });
    }
  }

  // 2. Select primary main body and legitimate connected/proximate elements
  const acceptedLabels = new Set<number>();

  if (components.length > 0) {
    components.sort((a, b) => b.score - a.score);
    const primary = components[0];
    acceptedLabels.add(primary.label);

    // Accept secondary components if:
    // - Significant mass (>= 12% of primary body, e.g. second person or large pet)
    // - OR in spatial proximity to primary body (held cup, phone, purse, shoes)
    const proximityMargin = Math.max(20, Math.min(w, h) * 0.06);

    for (let i = 1; i < components.length; i++) {
      const c = components[i];
      const isSignificantSize = c.area >= primary.area * 0.12;
      const isNearby =
        c.minX <= primary.maxX + proximityMargin &&
        c.maxX >= primary.minX - proximityMargin &&
        c.minY <= primary.maxY + proximityMargin &&
        c.maxY >= primary.minY - proximityMargin;

      // Filter out small distant background clutter, wall pictures, ceiling lights
      if ((isSignificantSize || isNearby) && c.area > 40) {
        acceptedLabels.add(c.label);
      }
    }
  }

  // 3. Generate smooth, anti-aliased alpha map
  const finalAlpha = new Uint8ClampedArray(size * 4);

  for (let i = 0; i < size; i++) {
    const lbl = labels[i];
    const val = maskData[i];

    if (acceptedLabels.has(lbl)) {
      // Direct main subject interior
      if (val >= 140) {
        finalAlpha[i * 4 + 3] = 255;
      } else if (val <= 30) {
        finalAlpha[i * 4 + 3] = 0;
      } else {
        const t = (val - 30) / (140 - 30);
        finalAlpha[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
      }
    } else if (components.length === 0 && val >= 60) {
      // Fallback if no single distinct component formed
      finalAlpha[i * 4 + 3] = val;
    } else {
      // Check for soft anti-aliased boundary around accepted subjects (hair, soft edge)
      const cx = i % w;
      const cy = (i / w) | 0;
      let nearAccepted = false;

      if (val > 35) {
        for (let dy = -2; dy <= 2 && !nearAccepted; dy++) {
          for (let dx = -2; dx <= 2 && !nearAccepted; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (acceptedLabels.has(labels[nIdx])) {
                nearAccepted = true;
              }
            }
          }
        }
      }

      if (nearAccepted && val > 35) {
        const t = (val - 35) / (140 - 35);
        finalAlpha[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, t * t * (3 - 2 * t))) * 255);
      } else {
        finalAlpha[i * 4 + 3] = 0;
      }
    }
  }

  return finalAlpha;
}

// ─── High-Speed Canvas Compositor & Auto-Trim ─────────────────────

function createFinalSticker(
  srcCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement | null,
  options: BgRemovalOptions
): string {
  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  // 1. Offscreen canvas for compositing at full source resolution
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = srcW;
  tempCanvas.height = srcH;
  const tCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!tCtx) throw new Error("Could not create temp canvas");

  tCtx.drawImage(srcCanvas, 0, 0);

  if (maskCanvas) {
    // Hardware-accelerated bilinear mask application
    tCtx.globalCompositeOperation = "destination-in";
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = "high";
    tCtx.drawImage(maskCanvas, 0, 0, srcW, srcH);
    tCtx.globalCompositeOperation = "source-over";
  }

  // Apply overall opacity if specified
  const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
  if (opacity < 1) {
    const imgData = tCtx.getImageData(0, 0, srcW, srcH);
    const d = imgData.data;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 0) d[i] = Math.round(d[i] * opacity);
    }
    tCtx.putImageData(imgData, 0, 0);
  }

  // 2. Smart auto-trim to snug subject bounding box
  const subjectData = tCtx.getImageData(0, 0, srcW, srcH).data;
  const bbox = getAlphaBoundingBox(subjectData, srcW, srcH, 15);

  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (bbox) {
    const margin = 8;
    cropX = Math.max(0, bbox.minX - margin);
    cropY = Math.max(0, bbox.minY - margin);
    const rightX = Math.min(srcW - 1, bbox.maxX + margin);
    const bottomY = Math.min(srcH - 1, bbox.maxY + margin);
    cropW = rightX - cropX + 1;
    cropH = bottomY - cropY + 1;
  }

  // 3. Create cropped output canvas
  const pad = options.addStickerBorder ? (options.borderWidth || 8) + 4 : 0;
  const outW = cropW + pad * 2;
  const outH = cropH + pad * 2;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const oCtx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!oCtx) throw new Error("Could not create output canvas");

  oCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, pad, pad, cropW, cropH);

  // 4. Apply die-cut vinyl border if requested
  if (options.addStickerBorder) {
    const borderCanvas = document.createElement("canvas");
    borderCanvas.width = outW;
    borderCanvas.height = outH;
    const bCtx = borderCanvas.getContext("2d");
    if (bCtx) {
      const bw = options.borderWidth || 8;
      bCtx.shadowColor = "rgba(0, 0, 0, 0.16)";
      bCtx.shadowBlur = 6;
      bCtx.shadowOffsetY = 3;

      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const ox = Math.cos(angle) * bw;
        const oy = Math.sin(angle) * bw;
        bCtx.drawImage(outCanvas, ox, oy);
      }
      bCtx.globalCompositeOperation = "source-in";
      bCtx.fillStyle = "#ffffff";
      bCtx.fillRect(0, 0, outW, outH);

      bCtx.globalCompositeOperation = "source-over";
      bCtx.shadowColor = "transparent";
      bCtx.drawImage(outCanvas, 0, 0);

      return borderCanvas.toDataURL("image/png");
    }
  }

  return outCanvas.toDataURL("image/png");
}

// ─── Core ML-Based Background Removal ────────────────────────────

/**
 * High-speed background removal using RMBG-1.4 with automatic WASM/WebGPU fallback.
 */
async function removeBackgroundML(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions
): Promise<string> {
  const origW = imageElement.naturalWidth || imageElement.width;
  const origH = imageElement.naturalHeight || imageElement.height;

  // Keep full source canvas for crisp high-resolution output
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = origW;
  srcCanvas.height = origH;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Could not create source canvas");
  srcCtx.drawImage(imageElement, 0, 0);

  // 1. Instant check: Is the image already transparent? (<1ms)
  const previewData = srcCtx.getImageData(0, 0, origW, origH).data;
  if (checkAlreadyTransparent(previewData, origW, origH)) {
    options.onProgress?.("Instant cutout…", 1);
    return createFinalSticker(srcCanvas, null, options);
  }

  // 2. Check mask cache (makes slider adjustments instant)
  const cacheKey = imageElement.src || "";
  let maskCanvas: HTMLCanvasElement | null = null;

  if (cacheKey && maskCache.has(cacheKey)) {
    const cached = maskCache.get(cacheKey)!;
    maskCanvas = cached.maskCanvas;
  } else {
    // 3. Optimal neural network inference resolution (512–640px)
    // 640px provides razor-sharp boundary details while running 5x faster than 1024px
    const maxInferenceDim = 640;
    let infW = origW;
    let infH = origH;
    if (infW > maxInferenceDim || infH > maxInferenceDim) {
      const scale = maxInferenceDim / Math.max(infW, infH);
      infW = Math.max(64, Math.round(infW * scale));
      infH = Math.max(64, Math.round(infH * scale));
    }

    const infCanvas = document.createElement("canvas");
    infCanvas.width = infW;
    infCanvas.height = infH;
    const infCtx = infCanvas.getContext("2d", { willReadFrequently: true });
    if (!infCtx) throw new Error("Could not create inference canvas");
    infCtx.imageSmoothingEnabled = true;
    infCtx.imageSmoothingQuality = "high";
    infCtx.drawImage(imageElement, 0, 0, infW, infH);
    const infImgData = infCtx.getImageData(0, 0, infW, infH);

    options.onProgress?.("Detecting main body…", 0.35);

    // Run inference with fail-safe WebGPU -> WASM fallback
    const rawImg = new RawImage(infImgData.data, infW, infH, 4);
    let result;

    try {
      const seg = await getSegmentator(false);
      result = await seg(rawImg);
    } catch (runErr) {
      console.warn("[StickerCanvas] Primary pipeline error, falling back to WASM q8:", runErr);
      options.onProgress?.("Optimizing engine…", 0.45);
      const segWasm = await getSegmentator(true);
      result = await segWasm(rawImg);
    }

    const maskOutput = result[0];
    if (!maskOutput || !maskOutput.mask) {
      throw new Error("No segmentation mask returned");
    }

    const maskRaw = maskOutput.mask as RawImage;
    const maskW = maskRaw.width;
    const maskH = maskRaw.height;
    const maskData = maskRaw.data as Uint8Array;

    options.onProgress?.("Refining edges & contours…", 0.85);

    // 4. Refine mask: isolate main body, reject background clutter, apply smooth anti-aliasing
    const refinedAlpha = refineMainSubjectMask(maskData, maskW, maskH);

    maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskW;
    maskCanvas.height = maskH;
    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) throw new Error("Could not create mask canvas");
    const maskImgData = mCtx.createImageData(maskW, maskH);
    maskImgData.data.set(refinedAlpha);
    mCtx.putImageData(maskImgData, 0, 0);

    if (cacheKey) {
      maskCache.set(cacheKey, { maskCanvas, origW, origH });
      if (maskCache.size > 20) {
        const firstKey = maskCache.keys().next().value;
        if (firstKey) maskCache.delete(firstKey);
      }
    }
  }

  options.onProgress?.("Done!", 1);
  return createFinalSticker(srcCanvas, maskCanvas, options);
}

// ─── Resilient Saliency Flood-Fill Fallback ──────────────────────

function removeBackgroundFloodFill(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const origW = imageElement.naturalWidth || imageElement.width;
      const origH = imageElement.naturalHeight || imageElement.height;

      const pad = options.addStickerBorder ? (options.borderWidth || 8) + 4 : 0;
      const width = origW + pad * 2;
      const height = origH + pad * 2;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not get 2D canvas context");

      ctx.drawImage(imageElement, pad, pad, origW, origH);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      if (options.removeBg !== false) {
        if (!checkAlreadyTransparent(data, width, height)) {
          // Perimeter sample seeds
          const perimeterSeeds: [number, number, number][] = [];
          const step = Math.max(1, Math.floor(Math.min(origW, origH) / 16));

          for (let x = pad; x < pad + origW; x += step) {
            const idxTop = (pad * width + x) * 4;
            const idxBot = ((pad + origH - 1) * width + x) * 4;
            perimeterSeeds.push([data[idxTop], data[idxTop + 1], data[idxTop + 2]]);
            perimeterSeeds.push([data[idxBot], data[idxBot + 1], data[idxBot + 2]]);
          }

          const effectiveTolerance = options.tolerance ?? 28;
          const maxDistance = 441.67;
          const threshold = (effectiveTolerance / 100) * (maxDistance * 0.55);

          const visited = new Uint8Array(width * height);
          const queue: number[] = [];

          for (let x = 0; x < width; x++) {
            queue.push(x, 0);
            queue.push(x, height - 1);
            visited[x] = 1;
            visited[(height - 1) * width + x] = 1;
          }
          for (let y = 1; y < height - 1; y++) {
            queue.push(0, y);
            queue.push(width - 1, y);
            visited[y * width] = 1;
            visited[y * width + (width - 1)] = 1;
          }

          function minDist(r: number, g: number, b: number) {
            let minD = Infinity;
            for (const [sr, sg, sb] of perimeterSeeds) {
              const d = Math.hypot(r - sr, g - sg, b - sb);
              if (d < minD) minD = d;
            }
            return minD;
          }

          let head = 0;
          while (head < queue.length) {
            const x = queue[head++];
            const y = queue[head++];
            const idx = (y * width + x) * 4;
            const isOut = x < pad || x >= pad + origW || y < pad || y >= pad + origH;

            if (
              isOut ||
              data[idx + 3] === 0 ||
              minDist(data[idx], data[idx + 1], data[idx + 2]) <= threshold
            ) {
              data[idx + 3] = 0;
              for (const [nx, ny] of [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
              ]) {
                if (
                  nx >= 0 &&
                  nx < width &&
                  ny >= 0 &&
                  ny < height &&
                  visited[ny * width + nx] === 0
                ) {
                  visited[ny * width + nx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Remove background from an image.
 * Uses high-speed RMBG-1.4 with automatic WASM q8 fallback.
 */
export async function removeBackgroundFromImage(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions = { removeBg: true, opacity: 1, addStickerBorder: false }
): Promise<string> {
  if (options.removeBg === false) {
    return removeBackgroundFloodFill(imageElement, { ...options, removeBg: false });
  }

  try {
    return await removeBackgroundML(imageElement, options);
  } catch (err) {
    console.warn("[StickerCanvas] ML segmentation failed, falling back to flood-fill:", err);
    options.onProgress?.("Using basic mode…", 0.5);
    return removeBackgroundFloodFill(imageElement, options);
  }
}

/**
 * Direct 1-step smart sticker creation from any image dataUrl.
 * Computes snug bounding box dimensions so selection frames tightly hug the subject.
 */
export async function smartAutoCreateSticker(
  dataUrl: string,
  options?: Partial<BgRemovalOptions>
): Promise<{ stickerUrl: string; naturalWidth: number; naturalHeight: number }> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });

  const stickerUrl = await removeBackgroundFromImage(img, {
    removeBg: true,
    opacity: 1,
    addStickerBorder: false,
    ...options,
  });

  const finalImg = new Image();
  await new Promise<void>((resolve) => {
    finalImg.onload = () => resolve();
    finalImg.onerror = () => resolve();
    finalImg.src = stickerUrl;
  });

  const finalW = finalImg.naturalWidth || img.naturalWidth || 300;
  const finalH = finalImg.naturalHeight || img.naturalHeight || 300;

  return {
    stickerUrl,
    naturalWidth: finalW,
    naturalHeight: finalH,
  };
}
