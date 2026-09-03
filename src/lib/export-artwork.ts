import { StickerObject, Asset, ExportOptions, CanvasBackgroundConfig } from "@/types/editor";
import { createBorderedImageCanvas } from "./sticker-border";

export async function exportArtwork(
  objects: StickerObject[],
  assets: Asset[],
  options: ExportOptions,
  canvasWidth = 1920,
  canvasHeight = 1080,
  backgroundColor = "#ECEBE6",
  backgroundConfig?: CanvasBackgroundConfig
): Promise<{ dataUrl: string; filename: string }> {
  // If there are objects, find bounding box or use canvas bounds
  const visibleObjects = objects
    .filter((o) => o.visible && o.opacity > 0)
    .sort((a, b) => a.zIndex - b.zIndex);

  const scale = options.scale;
  const outWidth = canvasWidth * scale;
  const outHeight = canvasHeight * scale;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = outWidth;
  exportCanvas.height = outHeight;
  const ctx = exportCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create export canvas context");
  }

  const isTransparent = options.transparent || backgroundConfig?.type === "transparent";

  // Draw background if not transparent
  if (!isTransparent) {
    const type = backgroundConfig?.type || "solid";
    const baseColor = backgroundConfig?.color || backgroundColor;

    if (type === "gradient" && backgroundConfig?.gradient) {
      const g = backgroundConfig.gradient;
      const rad = ((g.angle ?? 45) * Math.PI) / 180;
      const cx = outWidth / 2;
      const cy = outHeight / 2;
      const r = Math.sqrt(outWidth * outWidth + outHeight * outHeight) / 2;
      const x0 = cx - Math.cos(rad) * r;
      const y0 = cy - Math.sin(rad) * r;
      const x1 = cx + Math.cos(rad) * r;
      const y1 = cy + Math.sin(rad) * r;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, g.from || "#FF6B6B");
      grad.addColorStop(1, g.to || "#FFE66D");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, outWidth, outHeight);
    } else if (type === "image" && backgroundConfig?.image?.src) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, outWidth, outHeight);

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => resolve();
        bgImg.src = backgroundConfig.image!.src;
      });

      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.save();
        if (backgroundConfig.image.blur && backgroundConfig.image.blur > 0) {
          ctx.filter = `blur(${backgroundConfig.image.blur * scale}px)`;
        }
        ctx.globalAlpha = backgroundConfig.image.opacity ?? 1;

        const imgScale = Math.max(outWidth / bgImg.naturalWidth, outHeight / bgImg.naturalHeight);
        const nw = bgImg.naturalWidth * imgScale;
        const nh = bgImg.naturalHeight * imgScale;
        const nx = (outWidth - nw) / 2;
        const ny = (outHeight - nh) / 2;
        ctx.drawImage(bgImg, nx, ny, nw, nh);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, outWidth, outHeight);
    }

    // Pattern overlay
    if (backgroundConfig?.pattern === "dots") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      const spacing = 24 * scale;
      for (let y = spacing / 2; y < outHeight; y += spacing) {
        for (let x = spacing / 2; x < outWidth; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.25 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (backgroundConfig?.pattern === "grid") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
      ctx.lineWidth = 1 * scale;
      const spacing = 32 * scale;
      for (let x = 0; x <= outWidth; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, outHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= outHeight; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(outWidth, y);
        ctx.stroke();
      }
    }
  } else {
    ctx.clearRect(0, 0, outWidth, outHeight);
  }

  // Pre-load all required image elements
  const assetMap = new Map<string, Asset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  const imageCache = new Map<string, HTMLImageElement>();
  for (const obj of visibleObjects) {
    const asset = assetMap.get(obj.assetId);
    const src = asset?.src;
    if (src && !imageCache.has(src)) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache.set(src, img);
          resolve();
        };
        img.onerror = () => {
          resolve();
        };
        img.src = src;
      });
    }
  }

  // Render objects at high resolution
  ctx.save();
  ctx.scale(scale, scale);

  for (const obj of visibleObjects) {
    const asset = assetMap.get(obj.assetId);
    const img = asset ? imageCache.get(asset.src) : null;
    if (!img) continue;

    ctx.save();
    // Center-based transformation
    ctx.translate(obj.x, obj.y);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    ctx.scale(obj.flipX ? -obj.scaleX : obj.scaleX, obj.flipY ? -obj.scaleY : obj.scaleY);
    const bw = obj.borderWidth || 0;
    const bc = obj.borderColor || "#ffffff";
    const sh = obj.hasShadow ?? false;

    if (bw > 0 || sh) {
      const borderedCanvas = createBorderedImageCanvas(img, bw, bc, sh);
      const padRatio = borderedCanvas.width / img.width;
      const drawW = obj.width * padRatio;
      const drawH = obj.height * padRatio;
      ctx.drawImage(borderedCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Subtle physical shadow for sticker feel on opaque backgrounds
      if (!options.transparent) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
      }

      const drawW = obj.width;
      const drawH = obj.height;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();
  }

  ctx.restore();

  let mimeType = "image/png";
  let ext = "png";
  let quality: number | undefined = undefined;

  if (options.format === "jpeg") {
    mimeType = "image/jpeg";
    ext = "jpg";
    quality = 0.95;
  } else if (options.format === "webp") {
    mimeType = "image/webp";
    ext = "webp";
    quality = 0.95;
  }

  const dataUrl = exportCanvas.toDataURL(mimeType, quality);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `stickercanvas-${timestamp}-${options.scale}x.${ext}`;

  return { dataUrl, filename };
}

export function downloadArtwork(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
