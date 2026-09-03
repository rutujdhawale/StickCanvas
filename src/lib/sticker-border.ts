/**
 * Die-Cut Sticker Border & Shadow Generator
 * Renders an authentic physical vinyl white border and tactile drop shadow
 * around any non-transparent silhouette.
 */

const borderedCanvasCache = new Map<string, HTMLCanvasElement>();

export function createBorderedImageCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  borderWidth = 6,
  borderColor = "#ffffff",
  hasShadow = true
): HTMLCanvasElement {
  const pad = (borderWidth + (hasShadow ? 8 : 2)) * 2;
  const width = source.width + pad * 2;
  const height = source.height + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const ox = pad;
  const oy = pad;

  if (borderWidth > 0) {
    // 1. First pass: Draw shadow if enabled
    if (hasShadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
      ctx.shadowBlur = Math.max(4, borderWidth * 0.8);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(2, borderWidth * 0.4);

      // Radial passes to expand silhouette
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dx = Math.cos(angle) * borderWidth;
        const dy = Math.sin(angle) * borderWidth;
        ctx.drawImage(source, ox + dx, oy + dy);
      }
      ctx.restore();
    }

    // 2. Second pass: Draw crisp solid border contour
    const borderCanvas = document.createElement("canvas");
    borderCanvas.width = width;
    borderCanvas.height = height;
    const bCtx = borderCanvas.getContext("2d");

    if (bCtx) {
      const steps = 24;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dx = Math.cos(angle) * borderWidth;
        const dy = Math.sin(angle) * borderWidth;
        bCtx.drawImage(source, ox + dx, oy + dy);
      }

      // Turn the expanded silhouette into the border color
      bCtx.globalCompositeOperation = "source-in";
      bCtx.fillStyle = borderColor;
      bCtx.fillRect(0, 0, width, height);

      // Draw border layer onto main canvas
      ctx.drawImage(borderCanvas, 0, 0);
    }
  } else if (hasShadow) {
    // Shadow without border
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(source, ox, oy);
    ctx.restore();
  }

  // 3. Draw original sticker graphic crisp on top
  ctx.drawImage(source, ox, oy);

  return canvas;
}
