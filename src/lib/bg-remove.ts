// Client-side smart background removal & sticker styling
// Features multi-point corner sampling, adaptive auto-sensitivity, anti-aliased edge smoothing, and die-cut borders

export interface BgRemovalOptions {
  tolerance?: number; // 0 to 100 or undefined for auto-detection
  feather?: number; // feather border radius in pixels (0 to 5)
  removeBg?: boolean; // whether to perform bg removal
  opacity?: number; // 0 to 1
  addStickerBorder?: boolean; // white die-cut border
  borderWidth?: number; // border thickness in px
}

/**
 * Remove background from an image using multi-seed flood fill and adaptive auto-tolerance
 */
export function removeBackgroundFromImage(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions = { removeBg: true, opacity: 1, addStickerBorder: false }
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const origW = imageElement.naturalWidth || imageElement.width;
      const origH = imageElement.naturalHeight || imageElement.height;

      // Extra padding for sticker border if enabled
      const pad = options.addStickerBorder ? (options.borderWidth || 8) + 4 : 0;
      const width = origW + pad * 2;
      const height = origH + pad * 2;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2D canvas context");
      }

      // Draw original centered inside padded canvas
      ctx.drawImage(imageElement, pad, pad, origW, origH);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      if (options.removeBg !== false) {
        // Step 1: Check if already transparent (>4% transparent perimeter pixels)
        let transparentPerimeterCount = 0;
        let totalSampled = 0;
        const step = Math.max(1, Math.floor((origW + origH) / 100));

        for (let x = pad; x < pad + origW; x += step) {
          const topA = data[(pad * width + x) * 4 + 3];
          const btmA = data[((pad + origH - 1) * width + x) * 4 + 3];
          if (topA < 30) transparentPerimeterCount++;
          if (btmA < 30) transparentPerimeterCount++;
          totalSampled += 2;
        }

        // If it's already an alpha-cutout sticker (like PNG with transparency), keep original cutout!
        const alreadyTransparent = totalSampled > 0 && transparentPerimeterCount / totalSampled > 0.05;

        if (!alreadyTransparent) {
          // Step 2: Multi-seed perimeter sampling (Corners & Border edges)
          const cornerSeeds: [number, number, number][] = [];
          const perimeterSamples: [number, number, number][] = [];

          // Corner clusters (top-left, top-right, bottom-left, bottom-right)
          const cornerOffsets = [
            [pad, pad],
            [pad + origW - 1, pad],
            [pad, pad + origH - 1],
            [pad + origW - 1, pad + origH - 1],
          ];

          for (const [cx, cy] of cornerOffsets) {
            const idx = (cy * width + cx) * 4;
            cornerSeeds.push([data[idx], data[idx + 1], data[idx + 2]]);
          }

          // Sample perimeter borders
          for (let x = pad; x < pad + origW; x += step) {
            const tIdx = (pad * width + x) * 4;
            const bIdx = ((pad + origH - 1) * width + x) * 4;
            perimeterSamples.push([data[tIdx], data[tIdx + 1], data[tIdx + 2]]);
            perimeterSamples.push([data[bIdx], data[bIdx + 1], data[bIdx + 2]]);
          }
          for (let y = pad; y < pad + origH; y += step) {
            const lIdx = (y * width + pad) * 4;
            const rIdx = (y * width + (pad + origW - 1)) * 4;
            perimeterSamples.push([data[lIdx], data[lIdx + 1], data[lIdx + 2]]);
            perimeterSamples.push([data[rIdx], data[rIdx + 1], data[rIdx + 2]]);
          }

          // Step 3: Compute Adaptive Auto-Tolerance if not explicitly provided
          let effectiveTolerance = options.tolerance;
          if (effectiveTolerance === undefined || effectiveTolerance === null) {
            // Measure color variance across perimeter
            let meanR = 0, meanG = 0, meanB = 0;
            for (const [r, g, b] of perimeterSamples) {
              meanR += r; meanG += g; meanB += b;
            }
            meanR /= perimeterSamples.length;
            meanG /= perimeterSamples.length;
            meanB /= perimeterSamples.length;

            let variance = 0;
            for (const [r, g, b] of perimeterSamples) {
              variance += Math.sqrt((r - meanR) ** 2 + (g - meanG) ** 2 + (b - meanB) ** 2);
            }
            const avgDev = variance / perimeterSamples.length;

            // Clean solid/studio backdrops get tight precision (28–34); gradients/complex backdrops get adaptive range
            effectiveTolerance = avgDev < 15 ? 30 : avgDev < 35 ? 36 : 42;
          }

          const maxDistance = 441.67; // sqrt(255^2 * 3)
          const threshold = (effectiveTolerance / 100) * (maxDistance * 0.7);

          // Step 4: Multi-seed Flood-Fill from Canvas Outer Boundaries
          const visited = new Uint8Array(width * height);
          const queue: number[] = [];

          // Seed entire outer perimeter of the canvas
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

          function minDistanceToSeeds(r: number, g: number, b: number) {
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

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            const isOutsideOrig = x < pad || x >= pad + origW || y < pad || y >= pad + origH;

            // Match if transparent, outside pad, or within color threshold of any background corner seed
            if (isOutsideOrig || a === 0 || minDistanceToSeeds(r, g, b) <= threshold) {
              data[idx + 3] = 0;

              const neighbors = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
              ];

              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nCoord = ny * width + nx;
                  if (visited[nCoord] === 0) {
                    visited[nCoord] = 1;
                    queue.push(nx, ny);
                  }
                }
              }
            }
          }

          // Step 5: Smooth Alpha Feathering on Cutout Edges (Anti-Aliasing)
          const featherRadius = options.feather ?? 1.5;
          if (featherRadius > 0) {
            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] > 0) {
                  // Count transparent direct neighbors
                  let transparentCount = 0;
                  if (data[((y - 1) * width + x) * 4 + 3] === 0) transparentCount++;
                  if (data[((y + 1) * width + x) * 4 + 3] === 0) transparentCount++;
                  if (data[(y * width + (x - 1)) * 4 + 3] === 0) transparentCount++;
                  if (data[(y * width + (x + 1)) * 4 + 3] === 0) transparentCount++;

                  if (transparentCount > 0) {
                    // Soften edge transition proportionally
                    data[idx + 3] = Math.round(data[idx + 3] * (1 - transparentCount * 0.18));
                  }
                }
              }
            }
          }
        }
      }

      // Step 6: Apply overall transparency/opacity
      const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
      if (opacity < 1) {
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) {
            data[i] = Math.round(data[i] * opacity);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Step 7: Apply Die-Cut Vinyl Sticker Border & Elevation Shadow (if requested)
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

          // Radial dilation for uniform rounded border
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const ox = Math.cos(angle) * bw;
            const oy = Math.sin(angle) * bw;
            bCtx.drawImage(canvas, ox, oy);
          }
          bCtx.globalCompositeOperation = "source-in";
          bCtx.fillStyle = "#ffffff";
          bCtx.fillRect(0, 0, width, height);

          // Place original cutout cleanly on top
          bCtx.globalCompositeOperation = "source-over";
          bCtx.shadowColor = "transparent";
          bCtx.drawImage(canvas, 0, 0);

          resolve(borderCanvas.toDataURL("image/png"));
          return;
        }
      }

      resolve(canvas.toDataURL("image/png"));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Direct 1-step smart sticker creation from any image dataUrl or image file
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
    addStickerBorder: false, // The editor's native WebGL border/shadow handles border dynamically in Inspector!
    ...options,
  });

  return {
    stickerUrl,
    naturalWidth: img.naturalWidth || img.width || 300,
    naturalHeight: img.naturalHeight || img.height || 300,
  };
}

