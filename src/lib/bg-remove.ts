// AI-Powered Background Removal Engine
// Uses RMBG-1.4 (briaai) via @huggingface/transformers for real ML-based subject segmentation
// Falls back to client-side flood-fill if ML model fails to load

import { pipeline, env, RawImage, AutoConfig } from "@huggingface/transformers";
import type { ImageSegmentationPipeline } from "@huggingface/transformers";

// Configure transformers.js for browser
env.allowLocalModels = false;

export interface BgRemovalOptions {
  tolerance?: number; // Only used by fallback flood-fill (0-100)
  feather?: number; // feather border radius in pixels (0 to 5)
  removeBg?: boolean; // whether to perform bg removal
  opacity?: number; // 0 to 1
  addStickerBorder?: boolean; // white die-cut border
  borderWidth?: number; // border thickness in px
  onProgress?: (stage: string, progress: number) => void;
}

// ─── ML Model Singleton ─────────────────────────────────────────

let segmentatorPromise: Promise<ImageSegmentationPipeline> | null = null;
let segmentatorInstance: ImageSegmentationPipeline | null = null;

function getSegmentator(): Promise<ImageSegmentationPipeline> {
  if (segmentatorInstance) return Promise.resolve(segmentatorInstance);

  if (!segmentatorPromise) {
    segmentatorPromise = (async () => {
      try {
        const config = await AutoConfig.from_pretrained("briaai/RMBG-1.4");
        config.model_type = "segformer";

        const seg = await pipeline("image-segmentation", "briaai/RMBG-1.4", {
          config,
          device: "auto",
          dtype: "q8",
        });
        segmentatorInstance = seg as ImageSegmentationPipeline;
        return segmentatorInstance;
      } catch (err) {
        console.error("ML model load error:", err);
        segmentatorPromise = null;
        throw err;
      }
    })();
  }

  return segmentatorPromise;
}

/**
 * Preload the ML model in the background (call once on app start)
 */
export function preloadModel(): void {
  getSegmentator().catch(() => {
    // Silently fail — will use fallback
  });
}

// ─── ML-Based Background Removal ────────────────────────────────

/**
 * Remove background using RMBG-1.4 ML model
 * Returns a transparent PNG data URL
 */
async function removeBackgroundML(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions
): Promise<string> {
  options.onProgress?.("Loading AI model…", 0.15);

  const seg = await getSegmentator();

  options.onProgress?.("Analyzing subject…", 0.3);

  const origW = imageElement.naturalWidth || imageElement.width;
  const origH = imageElement.naturalHeight || imageElement.height;

  // Create a canvas from the source image to get a clean data URL
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = origW;
  srcCanvas.height = origH;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Could not create source canvas");
  srcCtx.drawImage(imageElement, 0, 0, origW, origH);
  const srcDataUrl = srcCanvas.toDataURL("image/png");

  // Load as RawImage for transformers.js
  const rawImg = await RawImage.fromURL(srcDataUrl);

  options.onProgress?.("Removing background…", 0.5);

  // Run the segmentation pipeline
  const result = await seg(rawImg);

  options.onProgress?.("Applying mask…", 0.75);

  // The result contains the mask — apply it to the original image
  // result is an array of segmentation outputs
  const maskOutput = result[0];
  if (!maskOutput || !maskOutput.mask) {
    throw new Error("No segmentation mask returned");
  }

  // Resize mask to match original image dimensions
  const mask = await (maskOutput.mask as RawImage).resize(origW, origH);

  // Apply the mask to the original image
  const pad = options.addStickerBorder ? (options.borderWidth || 8) + 4 : 0;
  const outW = origW + pad * 2;
  const outH = origH + pad * 2;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create output canvas");

  // Draw original image centered (with padding if border needed)
  ctx.drawImage(imageElement, pad, pad, origW, origH);
  const imageData = ctx.getImageData(0, 0, outW, outH);
  const pixels = imageData.data;

  // Apply mask to alpha channel
  const maskData = mask.data as Uint8Array;
  const maskChannels = mask.channels;

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const imgIdx = ((y + pad) * outW + (x + pad)) * 4;
      const maskIdx = (y * origW + x) * maskChannels;
      // Mask value: 0 = background, 255 = foreground
      const maskVal = maskData[maskIdx];
      // Modulate existing alpha to preserve any native transparency
      pixels[imgIdx + 3] = Math.round((pixels[imgIdx + 3] * maskVal) / 255);
    }
  }

  // Clear padding area alpha
  if (pad > 0) {
    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        if (x < pad || x >= pad + origW || y < pad || y >= pad + origH) {
          pixels[(y * outW + x) * 4 + 3] = 0;
        }
      }
    }
  }

  // Apply opacity
  const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
  if (opacity < 1) {
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) {
        pixels[i] = Math.round(pixels[i] * opacity);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  options.onProgress?.("Finishing up…", 0.9);

  // Apply die-cut border if requested
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

      options.onProgress?.("Done!", 1);
      return borderCanvas.toDataURL("image/png");
    }
  }

  options.onProgress?.("Done!", 1);
  return outCanvas.toDataURL("image/png");
}

// ─── Fallback: Client-Side Flood Fill ───────────────────────────

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

      options.onProgress?.("Processing image…", 0.3);

      ctx.drawImage(imageElement, pad, pad, origW, origH);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      if (options.removeBg !== false) {
        // Check if already transparent
        let transparentCount = 0;
        let totalSampled = 0;
        const step = Math.max(1, Math.floor((origW + origH) / 100));

        for (let x = pad; x < pad + origW; x += step) {
          if (data[(pad * width + x) * 4 + 3] < 30) transparentCount++;
          if (data[((pad + origH - 1) * width + x) * 4 + 3] < 30) transparentCount++;
          totalSampled += 2;
        }

        const alreadyTransparent = totalSampled > 0 && transparentCount / totalSampled > 0.05;

        if (!alreadyTransparent) {
          options.onProgress?.("Removing background…", 0.5);

          // Corner seed colors
          const cornerSeeds: [number, number, number][] = [];
          const corners = [
            [pad, pad], [pad + origW - 1, pad],
            [pad, pad + origH - 1], [pad + origW - 1, pad + origH - 1],
          ];
          for (const [cx, cy] of corners) {
            const idx = (cy * width + cx) * 4;
            cornerSeeds.push([data[idx], data[idx + 1], data[idx + 2]]);
          }

          const effectiveTolerance = options.tolerance ?? 32;
          const maxDistance = 441.67;
          const threshold = (effectiveTolerance / 100) * (maxDistance * 0.65);

          const visited = new Uint8Array(width * height);
          const queue: number[] = [];

          for (let x = 0; x < width; x++) {
            queue.push(x, 0); queue.push(x, height - 1);
            visited[x] = 1; visited[(height - 1) * width + x] = 1;
          }
          for (let y = 1; y < height - 1; y++) {
            queue.push(0, y); queue.push(width - 1, y);
            visited[y * width] = 1; visited[y * width + (width - 1)] = 1;
          }

          function minDist(r: number, g: number, b: number) {
            let minD = Infinity;
            for (const [sr, sg, sb] of cornerSeeds) {
              const d = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
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

            if (isOut || data[idx + 3] === 0 || minDist(data[idx], data[idx + 1], data[idx + 2]) <= threshold) {
              data[idx + 3] = 0;
              for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && visited[ny * width + nx] === 0) {
                  visited[ny * width + nx] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }

          // Feathering
          options.onProgress?.("Smoothing edges…", 0.7);
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = (y * width + x) * 4;
              if (data[idx + 3] > 0) {
                let tc = 0;
                if (data[((y-1)*width+x)*4+3]===0) tc++;
                if (data[((y+1)*width+x)*4+3]===0) tc++;
                if (data[(y*width+(x-1))*4+3]===0) tc++;
                if (data[(y*width+(x+1))*4+3]===0) tc++;
                if (tc > 0) data[idx + 3] = Math.round(data[idx + 3] * (1 - tc * 0.2));
              }
            }
          }
        }
      }

      // Apply opacity
      const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
      if (opacity < 1) {
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) data[i] = Math.round(data[i] * opacity);
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Border
      if (options.addStickerBorder) {
        const borderCanvas = document.createElement("canvas");
        borderCanvas.width = width;
        borderCanvas.height = height;
        const bCtx = borderCanvas.getContext("2d");
        if (bCtx) {
          const bw = options.borderWidth || 8;
          bCtx.shadowColor = "rgba(0, 0, 0, 0.16)";
          bCtx.shadowBlur = 6;
          bCtx.shadowOffsetY = 3;
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            bCtx.drawImage(canvas, Math.cos(angle) * bw, Math.sin(angle) * bw);
          }
          bCtx.globalCompositeOperation = "source-in";
          bCtx.fillStyle = "#ffffff";
          bCtx.fillRect(0, 0, width, height);
          bCtx.globalCompositeOperation = "source-over";
          bCtx.shadowColor = "transparent";
          bCtx.drawImage(canvas, 0, 0);
          resolve(borderCanvas.toDataURL("image/png"));
          return;
        }
      }

      options.onProgress?.("Done!", 1);
      resolve(canvas.toDataURL("image/png"));
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Remove background from an image.
 * Tries ML model first, falls back to flood-fill if model unavailable.
 */
export async function removeBackgroundFromImage(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions = { removeBg: true, opacity: 1, addStickerBorder: false }
): Promise<string> {
  if (options.removeBg === false) {
    // No background removal requested — just apply opacity/border
    return removeBackgroundFloodFill(imageElement, { ...options, removeBg: false });
  }

  try {
    return await removeBackgroundML(imageElement, options);
  } catch (err) {
    console.warn("ML background removal failed, using fallback:", err);
    options.onProgress?.("Using basic mode…", 0.3);
    return removeBackgroundFloodFill(imageElement, options);
  }
}

/**
 * Direct 1-step smart sticker creation from any image dataUrl
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

  return {
    stickerUrl,
    naturalWidth: img.naturalWidth || img.width || 300,
    naturalHeight: img.naturalHeight || img.height || 300,
  };
}
