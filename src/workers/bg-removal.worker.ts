// Background Removal Web Worker
// Isolated thread for RMBG-1.4 ML inference, connected component saliency detection,
// hole filling, edge-aware alpha refinement, and mask generation.

import { pipeline, env, RawImage, AutoConfig } from "@huggingface/transformers";
import type { ImageSegmentationPipeline } from "@huggingface/transformers";

// Configure transformers.js for fast execution
env.allowLocalModels = false;
env.useBrowserCache = true;

if (typeof navigator !== "undefined" && env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.simd = true;
  env.backends.onnx.wasm.numThreads = Math.min(
    4,
    Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
  );
}

export type QualityPreset = "fast" | "balanced" | "high";

export interface WorkerProcessOptions {
  tolerance?: number;
  feather?: number;
  removeBg?: boolean;
  quality?: QualityPreset;
  maxInferenceDim?: number;
}

// Global worker state
let pipelineInstance: ImageSegmentationPipeline | null = null;
let pipelineLoadingPromise: Promise<ImageSegmentationPipeline> | null = null;
let activeBackend: "webgpu" | "wasm" = "wasm";
let isModelReady = false;

// Cancellation tracking
const cancelledJobIds = new Set<number>();

// ─── Pipeline Singleton & Warm-Up ────────────────────────────────

async function createSegmentator(forceWasm = false): Promise<ImageSegmentationPipeline> {
  const config = await AutoConfig.from_pretrained("briaai/RMBG-1.4");
  config.model_type = "segformer";

  const isWebGPUAvailable =
    !forceWasm &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    Boolean((navigator as unknown as { gpu?: unknown }).gpu);

  if (isWebGPUAvailable) {
    try {
      const seg = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
        config,
        device: "webgpu",
        dtype: "fp32",
      });
      activeBackend = "webgpu";
      return seg as ImageSegmentationPipeline;
    } catch (gpuErr) {
      console.warn("[Worker] WebGPU initialization failed, falling back to WASM q8:", gpuErr);
    }
  }

  // Quantized q8 ONNX model: fast, robust, SIMD-accelerated
  const seg = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
    config,
    device: "wasm",
    dtype: "q8",
  });
  activeBackend = "wasm";
  return seg as ImageSegmentationPipeline;
}

async function getSegmentator(forceWasm = false): Promise<ImageSegmentationPipeline> {
  if (pipelineInstance && (!forceWasm || activeBackend === "wasm")) {
    return pipelineInstance;
  }

  if (forceWasm) {
    pipelineInstance = null;
    pipelineLoadingPromise = null;
  }

  if (!pipelineLoadingPromise) {
    pipelineLoadingPromise = createSegmentator(forceWasm)
      .then(async (inst) => {
        pipelineInstance = inst;
        isModelReady = true;

        // Warm-up inference with a tiny dummy image to prime JIT & GPU shaders
        try {
          const dummySize = 64;
          const dummyData = new Uint8ClampedArray(dummySize * dummySize * 4);
          // Fill dummy data with neutral grey circle
          for (let y = 0; y < dummySize; y++) {
            for (let x = 0; x < dummySize; x++) {
              const idx = (y * dummySize + x) * 4;
              const dist = Math.hypot(x - 32, y - 32);
              dummyData[idx] = dist < 20 ? 200 : 50;
              dummyData[idx + 1] = dist < 20 ? 200 : 50;
              dummyData[idx + 2] = dist < 20 ? 200 : 50;
              dummyData[idx + 3] = 255;
            }
          }
          const dummyRaw = new RawImage(dummyData, dummySize, dummySize, 4);
          await inst(dummyRaw);
        } catch {
          // Warm-up failure is non-fatal
        }

        return inst;
      })
      .catch((err) => {
        pipelineLoadingPromise = null;
        throw err;
      });
  }

  return pipelineLoadingPromise;
}

// ─── Connected Component Saliency & Hole Filling Pipeline ─────────

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

/**
 * Enhanced Mask Refinement:
 * 1. Connected Component Labeling (foreground >= 55)
 * 2. Spatial saliency scoring (area * center proximity)
 * 3. Primary subject selection + proximity merging + multi-subject detection
 * 4. Hole filling: interior holes enclosed by foreground are identified and filled
 * 5. Hermite smoothstep anti-aliasing curve with adaptive boundary smoothing
 */
function refineMaskData(maskData: Uint8Array, w: number, h: number): Uint8ClampedArray {
  const size = w * h;
  const labels = new Int32Array(size);
  let currentLabel = 0;
  const q = new Int32Array(size);

  const components: Component[] = [];

  // 1. Connected Component Labeling on confident foreground (threshold >= 55)
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      if (maskData[idx] < 55 || labels[idx] !== 0) continue;

      currentLabel++;
      labels[idx] = currentLabel;
      q[0] = idx;
      let head = 0;
      let tail = 1;
      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

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
      const distFromCenter = Math.hypot(centerX / w - 0.5, centerY / h - 0.5);
      // Saliency score: larger mass + center focus
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

  // 2. Select primary subject and proximate accessories / co-subjects
  const acceptedLabels = new Set<number>();

  if (components.length > 0) {
    components.sort((a, b) => b.score - a.score);
    const primary = components[0];
    acceptedLabels.add(primary.label);

    const proximityMargin = Math.max(20, Math.min(w, h) * 0.08);

    for (let i = 1; i < components.length; i++) {
      const c = components[i];
      const isSignificantSize = c.area >= primary.area * 0.12;
      const isNearby =
        c.minX <= primary.maxX + proximityMargin &&
        c.maxX >= primary.minX - proximityMargin &&
        c.minY <= primary.maxY + proximityMargin &&
        c.maxY >= primary.minY - proximityMargin;

      if ((isSignificantSize || isNearby) && c.area > 35) {
        acceptedLabels.add(c.label);
      }
    }
  }

  // 3. Hole Filling: identify interior holes enclosed by accepted foreground
  // Mark external background via flood-fill from boundaries
  const isExternalBg = new Uint8Array(size);
  let bgHead = 0;
  let bgTail = 0;

  // Add all border non-foreground pixels to queue
  for (let x = 0; x < w; x++) {
    const topIdx = x;
    const botIdx = (h - 1) * w + x;
    if (!acceptedLabels.has(labels[topIdx]) && !isExternalBg[topIdx]) {
      isExternalBg[topIdx] = 1;
      q[bgTail++] = topIdx;
    }
    if (!acceptedLabels.has(labels[botIdx]) && !isExternalBg[botIdx]) {
      isExternalBg[botIdx] = 1;
      q[bgTail++] = botIdx;
    }
  }
  for (let y = 0; y < h; y++) {
    const leftIdx = y * w;
    const rightIdx = y * w + (w - 1);
    if (!acceptedLabels.has(labels[leftIdx]) && !isExternalBg[leftIdx]) {
      isExternalBg[leftIdx] = 1;
      q[bgTail++] = leftIdx;
    }
    if (!acceptedLabels.has(labels[rightIdx]) && !isExternalBg[rightIdx]) {
      isExternalBg[rightIdx] = 1;
      q[bgTail++] = rightIdx;
    }
  }

  // BFS for external background
  while (bgHead < bgTail) {
    const curr = q[bgHead++];
    const cx = curr % w;
    const cy = (curr / w) | 0;

    const left = cx > 0 ? curr - 1 : -1;
    const right = cx < w - 1 ? curr + 1 : -1;
    const up = cy > 0 ? curr - w : -1;
    const down = cy < h - 1 ? curr + w : -1;

    for (const n of [left, right, up, down]) {
      if (n !== -1 && !isExternalBg[n] && !acceptedLabels.has(labels[n])) {
        isExternalBg[n] = 1;
        q[bgTail++] = n;
      }
    }
  }

  // 4. Generate anti-aliased, hole-filled alpha map
  const finalAlpha = new Uint8ClampedArray(size * 4);

  for (let i = 0; i < size; i++) {
    const lbl = labels[i];
    const val = maskData[i];
    const isAccepted = acceptedLabels.has(lbl);

    if (isAccepted) {
      // Main subject interior
      if (val >= 140) {
        finalAlpha[i * 4 + 3] = 255;
      } else if (val <= 30) {
        finalAlpha[i * 4 + 3] = 0;
      } else {
        const t = (val - 30) / (140 - 30);
        finalAlpha[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
      }
    } else if (!isExternalBg[i] && components.length > 0) {
      // Internal enclosed hole! Fill to preserve solid subject interior
      finalAlpha[i * 4 + 3] = 255;
    } else if (components.length === 0 && val >= 60) {
      // Fallback if no distinct component formed
      finalAlpha[i * 4 + 3] = val;
    } else {
      // Check soft boundary around accepted foreground
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

// ─── Worker Message Handling ─────────────────────────────────────

self.addEventListener("message", async (event: MessageEvent) => {
  const { type, jobId } = event.data || {};

  if (type === "init") {
    try {
      const seg = await getSegmentator(false);
      self.postMessage({
        type: "ready",
        backend: activeBackend,
        hardwareConcurrency: navigator.hardwareConcurrency,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: "error",
        message: `Failed to initialize model: ${errMsg}`,
        fatal: true,
      });
    }
    return;
  }

  if (type === "cancel") {
    if (jobId !== undefined) {
      cancelledJobIds.add(jobId);
    }
    return;
  }

  if (type === "dispose") {
    pipelineInstance = null;
    pipelineLoadingPromise = null;
    isModelReady = false;
    cancelledJobIds.clear();
    return;
  }

  if (type === "process") {
    const { imageBitmap, options } = event.data as {
      imageBitmap: ImageBitmap;
      options?: WorkerProcessOptions;
    };

    if (!imageBitmap) {
      self.postMessage({
        type: "error",
        jobId,
        message: "No image bitmap provided",
      });
      return;
    }

    const startTime = performance.now();

    try {
      if (cancelledJobIds.has(jobId)) {
        imageBitmap.close();
        cancelledJobIds.delete(jobId);
        return;
      }

      const origW = imageBitmap.width;
      const origH = imageBitmap.height;

      // Determine inference resolution
      let maxInferenceDim = 640;
      if (options?.maxInferenceDim) {
        maxInferenceDim = options.maxInferenceDim;
      } else if (options?.quality === "fast") {
        maxInferenceDim = 384;
      } else if (options?.quality === "high") {
        maxInferenceDim = 1024;
      }

      let infW = origW;
      let infH = origH;
      if (infW > maxInferenceDim || infH > maxInferenceDim) {
        const scale = maxInferenceDim / Math.max(infW, infH);
        infW = Math.max(64, Math.round(infW * scale));
        infH = Math.max(64, Math.round(infH * scale));
      }

      // Draw resized image onto OffscreenCanvas for inference
      const infCanvas = new OffscreenCanvas(infW, infH);
      const infCtx = infCanvas.getContext("2d", { willReadFrequently: true });
      if (!infCtx) throw new Error("Could not create offscreen context");

      infCtx.imageSmoothingEnabled = true;
      infCtx.imageSmoothingQuality = "high";
      infCtx.drawImage(imageBitmap, 0, 0, infW, infH);
      const infImgData = infCtx.getImageData(0, 0, infW, infH);

      if (cancelledJobIds.has(jobId)) {
        imageBitmap.close();
        cancelledJobIds.delete(jobId);
        return;
      }

      self.postMessage({
        type: "progress",
        jobId,
        stage: "Analyzing subject…",
        progress: 0.35,
      });

      // Prepare RawImage for pipeline
      const rawImg = new RawImage(infImgData.data, infW, infH, 4);

      // Run inference with WebGPU -> WASM fallback
      let result;
      try {
        const seg = await getSegmentator(false);
        result = await seg(rawImg);
      } catch (gpuErr) {
        console.warn("[Worker] Primary inference failed, falling back to WASM q8:", gpuErr);
        self.postMessage({
          type: "progress",
          jobId,
          stage: "Optimizing engine…",
          progress: 0.5,
        });
        const segWasm = await getSegmentator(true);
        result = await segWasm(rawImg);
      }

      if (cancelledJobIds.has(jobId)) {
        imageBitmap.close();
        cancelledJobIds.delete(jobId);
        return;
      }

      const maskOutput = result[0];
      if (!maskOutput || !maskOutput.mask) {
        throw new Error("No segmentation mask returned");
      }

      const maskRaw = maskOutput.mask as RawImage;
      const maskW = maskRaw.width;
      const maskH = maskRaw.height;
      const maskData = maskRaw.data as Uint8Array;

      self.postMessage({
        type: "progress",
        jobId,
        stage: "Refining edges…",
        progress: 0.8,
      });

      // Refine mask
      const refinedAlpha = refineMaskData(maskData, maskW, maskH);

      // Create mask canvas at model resolution
      const refinedCanvas = new OffscreenCanvas(maskW, maskH);
      const rCtx = refinedCanvas.getContext("2d");
      if (!rCtx) throw new Error("Could not create refined mask context");
      const maskImgData = rCtx.createImageData(maskW, maskH);
      maskImgData.data.set(refinedAlpha);
      rCtx.putImageData(maskImgData, 0, 0);

      // Upscale mask to full original resolution using high-quality bicubic smoothing
      const finalMaskCanvas = new OffscreenCanvas(origW, origH);
      const fCtx = finalMaskCanvas.getContext("2d");
      if (!fCtx) throw new Error("Could not create final mask context");
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = "high";
      fCtx.drawImage(refinedCanvas, 0, 0, origW, origH);

      if (cancelledJobIds.has(jobId)) {
        imageBitmap.close();
        cancelledJobIds.delete(jobId);
        return;
      }

      // Convert to zero-copy ImageBitmap
      const maskBitmap = finalMaskCanvas.transferToImageBitmap();
      const timeMs = Math.round(performance.now() - startTime);

      // Clean up original imageBitmap
      imageBitmap.close();

      // Send result with transferable ImageBitmap
      (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage(
        {
          type: "result",
          jobId,
          maskBitmap,
          originalWidth: origW,
          originalHeight: origH,
          timeMs,
        },
        [maskBitmap]
      );
    } catch (err: unknown) {
      if (imageBitmap) {
        try {
          imageBitmap.close();
        } catch {
          // ignore
        }
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: "error",
        jobId,
        message: errMsg,
      });
    }
  }
});
