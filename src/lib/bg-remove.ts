// Client-side smart background removal & sticker styling
// Supports transparency tuning, tolerance adjustment, edge feathering, and die-cut borders

export interface BgRemovalOptions {
  tolerance: number; // 0 to 100
  feather?: number; // feather border radius in pixels (0 to 5)
  removeBg?: boolean; // whether to perform bg removal
  opacity?: number; // 0 to 1
  addStickerBorder?: boolean; // white die-cut border
  borderWidth?: number; // border thickness in px
}

export function removeBackgroundFromImage(
  imageElement: HTMLImageElement,
  options: BgRemovalOptions = { tolerance: 30, feather: 1, removeBg: true, opacity: 1, addStickerBorder: false }
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
        // 1. Sample perimeter border pixels around the original image bounds
        const sampleColors: [number, number, number][] = [];
        const step = Math.max(1, Math.floor((origW + origH) / 200));

        for (let x = pad; x < pad + origW; x += step) {
          const topIdx = (pad * width + x) * 4;
          const btmIdx = ((pad + origH - 1) * width + x) * 4;
          sampleColors.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
          sampleColors.push([data[btmIdx], data[btmIdx + 1], data[btmIdx + 2]]);
        }
        for (let y = pad; y < pad + origH; y += step) {
          const leftIdx = (y * width + pad) * 4;
          const rightIdx = (y * width + (pad + origW - 1)) * 4;
          sampleColors.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
          sampleColors.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
        }

        // Average background color
        let avgR = 0, avgG = 0, avgB = 0;
        for (const [r, g, b] of sampleColors) {
          avgR += r;
          avgG += g;
          avgB += b;
        }
        avgR = Math.round(avgR / Math.max(1, sampleColors.length));
        avgG = Math.round(avgG / Math.max(1, sampleColors.length));
        avgB = Math.round(avgB / Math.max(1, sampleColors.length));

        // 2. Tolerance mapping
        const maxDistance = 441.67;
        const threshold = (options.tolerance / 100) * (maxDistance * 0.7);

        // 3. Flood-fill from borders
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

        function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
          const dr = r1 - r2;
          const dg = g1 - g2;
          const db = b1 - b2;
          return Math.sqrt(dr * dr + dg * dg + db * db);
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

          // If outside original image padding, it's transparent
          const isOutsideOrig = x < pad || x >= pad + origW || y < pad || y >= pad + origH;

          if (isOutsideOrig || a === 0 || colorDistance(r, g, b, avgR, avgG, avgB) <= threshold) {
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

        // Feathering
        if ((options.feather ?? 1) > 0) {
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = (y * width + x) * 4;
              if (data[idx + 3] > 0) {
                const hasTransparentNeighbor =
                  data[((y - 1) * width + x) * 4 + 3] === 0 ||
                  data[((y + 1) * width + x) * 4 + 3] === 0 ||
                  data[(y * width + (x - 1)) * 4 + 3] === 0 ||
                  data[(y * width + (x + 1)) * 4 + 3] === 0;

                if (hasTransparentNeighbor) {
                  data[idx + 3] = Math.round(data[idx + 3] * 0.7);
                }
              }
            }
          }
        }
      }

      // 4. Apply overall transparency adjustment
      const opacity = Math.max(0.05, Math.min(1, options.opacity ?? 1));
      if (opacity < 1) {
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) {
            data[i] = Math.round(data[i] * opacity);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // 5. Die-cut Sticker White Border (if enabled)
      if (options.addStickerBorder) {
        const borderCanvas = document.createElement("canvas");
        borderCanvas.width = width;
        borderCanvas.height = height;
        const bCtx = borderCanvas.getContext("2d");
        if (bCtx) {
          const bw = options.borderWidth || 8;
          bCtx.shadowColor = "rgba(0, 0, 0, 0.15)";
          bCtx.shadowBlur = 6;
          bCtx.shadowOffsetY = 3;

          // Draw outline in multiple directions for clean outline
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const ox = Math.cos(angle) * bw;
            const oy = Math.sin(angle) * bw;
            bCtx.drawImage(canvas, ox, oy);
          }
          bCtx.globalCompositeOperation = "source-in";
          bCtx.fillStyle = "#ffffff";
          bCtx.fillRect(0, 0, width, height);

          // Place original cutout on top of the white border
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
