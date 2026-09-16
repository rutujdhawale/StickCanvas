// AI-Powered Background Removal Engine — Web Worker & GPU Orchestrator
// High-performance background removal pipeline:
// 1. Off-thread Web Worker ML inference (RMBG-1.4) via WebGPU / WASM SIMD
// 2. Instant transparent PNG fast-path (<1ms)
// 3. Multi-level mask refinement: Connected components, spatial saliency, hole-filling
// 4. Color/halo decontamination around hair and soft edges
// 5. Zero-copy ImageBitmap transfers and GPU canvas compositing
// 6. Built-in cancellation and mask caching for instant UI adjustments

export interface BgRemovalOptions {
  tolerance?: number; // Only used by fallback flood-fill (0-100)
  feather?: number; // feather border radius in pixels (0 to 5)
  removeBg?: boolean; // whether to perform bg removal
  opacity?: number; // 0 to 1
  addStickerBorder?: boolean; // white die-cut border
  borderWidth?: number; // border thickness in px
  autoTrim?: boolean; // If false, preserves original image dimensions (for Before/After alignment)
  quality?: "fast" | "balanced" | "high"; // Adaptive inference preset
  onProgress?: (stage: string, progress: number) => void;
}

export interface ModelStatus {
  ready: boolean;
  loading: boolean;
  backend: "webgpu" | "wasm" | null;
  error: string | null;
}

// ─── Status & Event Listeners ────────────────────────────────────

let currentStatus: ModelStatus = {
  ready: false,
  loading: false,
  backend: null,
  error: null,
};

const statusListeners = new Set<(status: ModelStatus) => void>();

function notifyStatusChange(update: Partial<ModelStatus>): void {
  currentStatus = { ...currentStatus, ...update };
  statusListeners.forEach((fn) => {
    try {
      fn(currentStatus);
    } catch {
      // Ignore listener errors
    }
  });
}

export function getModelStatus(): ModelStatus {
  return currentStatus;
}

export function onModelStatusChange(listener: (status: ModelStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

// ─── Mask Cache ──────────────────────────────────────────────────
// Cache masks by image source to make UI adjustments instant (<2ms)
const maskCache = new Map<string, { maskCanvas: HTMLCanvasElement; origW: number; origH: number }>();

function getCacheKey(imageElement: HTMLImageElement): string {
  return imageElement.src || imageElement.currentSrc || "";
}

// ─── Web Worker Singleton ────────────────────────────────────────

let workerInstance: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;
let activeJobId = 0;

interface ActiveJob {
  resolve: (result: { maskBitmap: ImageBitmap; origW: number; origH: number }) => void;
  reject: (err: Error) => void;
  onProgress?: (stage: string, progress: number) => void;
}

const activeJobs = new Map<number, ActiveJob>();

function initWorker(): Promise<Worker> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Web Worker cannot be initialized on the server"));
  }

  if (workerInstance) {
    return Promise.resolve(workerInstance);
  }

  if (workerInitPromise) {
    return workerInitPromise;
  }

  notifyStatusChange({ loading: true, error: null });

  workerInitPromise = new Promise<Worker>((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL("../workers/bg-removal.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        if (data.type === "ready") {
          workerInstance = worker;
          notifyStatusChange({
            ready: true,
            loading: false,
            backend: data.backend,
            error: null,
          });
          resolve(worker);
          return;
        }

        if (data.type === "progress") {
          const job = activeJobs.get(data.jobId);
          if (job && job.onProgress) {
            job.onProgress(data.stage, data.progress);
          }
          return;
        }

        if (data.type === "result") {
          const job = activeJobs.get(data.jobId);
          if (job) {
            activeJobs.delete(data.jobId);
            job.resolve({
              maskBitmap: data.maskBitmap,
              origW: data.originalWidth,
              origH: data.originalHeight,
            });
          }
          return;
        }

        if (data.type === "error") {
          if (data.jobId !== undefined) {
            const job = activeJobs.get(data.jobId);
            if (job) {
              activeJobs.delete(data.jobId);
              job.reject(new Error(data.message || "Worker inference error"));
            }
          }
          if (data.fatal) {
            notifyStatusChange({
              loading: false,
              ready: false,
              error: data.message || "Model failed to load",
            });
            reject(new Error(data.message));
          }
        }
      };

      worker.onerror = (err) => {
        console.error("[StickerCanvas] Worker error:", err);
        notifyStatusChange({
          loading: false,
          error: "Worker runtime error",
        });
        reject(new Error("Background removal worker encountered an error"));
      };

      // Send initial init message to load model and run warm-up
      worker.postMessage({ type: "init" });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      notifyStatusChange({ loading: false, error: errMsg });
      reject(err);
    }
  });

  return workerInitPromise;
}

/**
 * Cancel all currently active background removal jobs
 */
export function cancelAllBackgroundJobs(): void {
  if (workerInstance) {
    for (const jobId of Array.from(activeJobs.keys())) {
      try {
        workerInstance.postMessage({ type: "cancel", jobId });
      } catch {
        // ignore
      }
      const job = activeJobs.get(jobId);
      if (job) {
        job.reject(new Error("Cancelled"));
      }
    }
    activeJobs.clear();
  }
}

/**
 * Preload the ML model in the background (called on initial app mount)
 */
export function preloadModel(): void {
  if (typeof window !== "undefined") {
    initWorker().catch(() => {
      // Silently catch background preload errors; fallback will handle on demand
    });
  }
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
    if (data[y * width * 4 + 3] < 30) transparentCount++;
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

// ─── Halo Decontamination Filter ─────────────────────────────────

/**
 * Halo / Fringe Decontamination:
 * Removes color bleeding from the background on semi-transparent edge pixels (alpha between 10 and 245).
 * Samples nearby confident foreground pixels (alpha >= 245) to colorize edge pixels with true subject color,
 * eliminating harsh white or dark fringe around hair, fur, and thin details.
 */
function decontaminateHalos(
  imgData: ImageData,
  width: number,
  height: number,
  bbox: BoundingBox
): void {
  const data = imgData.data;
  const startX = Math.max(0, bbox.minX - 1);
  const endX = Math.min(width - 1, bbox.maxX + 1);
  const startY = Math.max(0, bbox.minY - 1);
  const endY = Math.min(height - 1, bbox.maxY + 1);

  const radius = 2;

  for (let y = startY; y <= endY; y++) {
    const rowOffset = y * width * 4;
    for (let x = startX; x <= endX; x++) {
      const idx = rowOffset + x * 4;
      const alpha = data[idx + 3];

      // Only decontaminate transition edge pixels
      if (alpha >= 10 && alpha < 240) {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const nRow = ny * width * 4;

          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            const nIdx = nRow + nx * 4;

            // Sample confident solid foreground
            if (data[nIdx + 3] >= 245) {
              sumR += data[nIdx];
              sumG += data[nIdx + 1];
              sumB += data[nIdx + 2];
              count++;
            }
          }
        }

        if (count > 0) {
          const avgR = sumR / count;
          const avgG = sumG / count;
          const avgB = sumB / count;

          // Blend edge color toward foreground color based on alpha
          const blendFactor = 1 - alpha / 255;
          data[idx] = Math.round(data[idx] * (1 - blendFactor) + avgR * blendFactor);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - blendFactor) + avgG * blendFactor);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - blendFactor) + avgB * blendFactor);
        }
      }
    }
  }
}

// ─── High-Speed Canvas Compositor & Auto-Trim ─────────────────────

function createFinalSticker(
  srcCanvas: HTMLCanvasElement,
  maskSource: HTMLCanvasElement | ImageBitmap | null,
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

  if (maskSource) {
    // Hardware-accelerated bilinear mask application
    tCtx.globalCompositeOperation = "destination-in";
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = "high";
    tCtx.drawImage(maskSource, 0, 0, srcW, srcH);
    tCtx.globalCompositeOperation = "source-over";
  }

  // 2. Read composited pixels once for halo decontamination, opacity, and bounding box
  const imgData = tCtx.getImageData(0, 0, srcW, srcH);
  const data = imgData.data;

  const bbox = getAlphaBoundingBox(data, srcW, srcH, 15);

  // Apply halo decontamination if subject was cut out
  if (bbox && maskSource) {
    decontaminateHalos(imgData, srcW, srcH, bbox);
  }

  // Apply overall opacity if specified
  const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
  if (opacity < 1) {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        data[i] = Math.round(data[i] * opacity);
      }
    }
  }

  tCtx.putImageData(imgData, 0, 0);

  // 3. Smart auto-trim to snug subject bounding box
  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (options.autoTrim !== false && bbox) {
    const margin = 8;
    cropX = Math.max(0, bbox.minX - margin);
    cropY = Math.max(0, bbox.minY - margin);
    const rightX = Math.min(srcW - 1, bbox.maxX + margin);
    const bottomY = Math.min(srcH - 1, bbox.maxY + margin);
    cropW = rightX - cropX + 1;
    cropH = bottomY - cropY + 1;
  }

  // 4. Create cropped output canvas
  const pad = options.addStickerBorder ? (options.borderWidth || 8) + 4 : 0;
  const outW = cropW + pad * 2;
  const outH = cropH + pad * 2;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const oCtx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!oCtx) throw new Error("Could not create output canvas");

  oCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, pad, pad, cropW, cropH);

  // 5. Apply die-cut vinyl border if requested
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

// ─── Resilient Flood-Fill Fallback ───────────────────────────────

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
 * Uses off-thread Web Worker with WebGPU / WASM SIMD acceleration,
 * instant transparent image fast-path, and automatic fallback.
 */
export async function removeBackgroundFromImage(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions = { removeBg: true, opacity: 1, addStickerBorder: false }
): Promise<string> {
  const origW = imageElement.naturalWidth || imageElement.width;
  const origH = imageElement.naturalHeight || imageElement.height;

  if (origW === 0 || origH === 0) {
    throw new Error("Invalid image dimensions");
  }

  // Draw source image to source canvas
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = origW;
  srcCanvas.height = origH;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Could not create source canvas");
  srcCtx.drawImage(imageElement, 0, 0);

  // If user requested NOT to remove background, return original with border/opacity
  if (options.removeBg === false) {
    return createFinalSticker(srcCanvas, null, options);
  }

  // 1. Instant check: Is the image already transparent? (<1ms)
  const previewData = srcCtx.getImageData(0, 0, origW, origH).data;
  if (checkAlreadyTransparent(previewData, origW, origH)) {
    options.onProgress?.("Instant cutout…", 1);
    return createFinalSticker(srcCanvas, null, options);
  }

  // 2. Check mask cache (instant slider updates <2ms)
  const cacheKey = getCacheKey(imageElement);
  if (cacheKey && maskCache.has(cacheKey)) {
    const cached = maskCache.get(cacheKey)!;
    options.onProgress?.("Ready!", 1);
    return createFinalSticker(srcCanvas, cached.maskCanvas, options);
  }

  // 3. Offload heavy ML inference & refinement to Web Worker
  try {
    const worker = await initWorker();
    const jobId = ++activeJobId;

    // Create transferable ImageBitmap from source
    const imageBitmap = await createImageBitmap(srcCanvas);

    options.onProgress?.("Starting AI analysis…", 0.1);

    const workerResult = await new Promise<{
      maskBitmap: ImageBitmap;
      origW: number;
      origH: number;
    }>((resolve, reject) => {
      activeJobs.set(jobId, {
        resolve,
        reject,
        onProgress: options.onProgress,
      });

      worker.postMessage(
        {
          type: "process",
          jobId,
          imageBitmap,
          options: {
            tolerance: options.tolerance,
            feather: options.feather,
            removeBg: options.removeBg,
            quality: options.quality || "balanced",
          },
        },
        [imageBitmap]
      );
    });

    // Store mask in persistent cache canvas for instant slider re-renders
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = origW;
    maskCanvas.height = origH;
    const mCtx = maskCanvas.getContext("2d");
    if (mCtx) {
      mCtx.drawImage(workerResult.maskBitmap, 0, 0);
      try {
        workerResult.maskBitmap.close();
      } catch {
        // ignore
      }

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
  } catch (workerErr) {
    console.warn("[StickerCanvas] Worker ML segmentation failed, using resilient fallback:", workerErr);
    options.onProgress?.("Using standard mode…", 0.5);
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

/**
 * Universal background removal helper for standalone tool and studio.
 * Returns both originalUrl and transparentUrl with matched natural dimensions (autoTrim: false).
 */
export async function removeBackground(
  fileOrUrl: File | Blob | string,
  options?: Partial<BgRemovalOptions>
): Promise<{
  originalUrl: string;
  transparentUrl: string;
  width: number;
  height: number;
}> {
  let originalUrl: string;
  let shouldRevoke = false;

  if (typeof fileOrUrl === "string") {
    originalUrl = fileOrUrl;
  } else {
    originalUrl = URL.createObjectURL(fileOrUrl);
    shouldRevoke = true;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = originalUrl;
    });

    const transparentUrl = await removeBackgroundFromImage(img, {
      autoTrim: false,
      removeBg: true,
      opacity: 1,
      addStickerBorder: false,
      ...options,
    });

    return {
      originalUrl,
      transparentUrl,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } catch (err) {
    if (shouldRevoke) {
      URL.revokeObjectURL(originalUrl);
    }
    throw err;
  }
}

