import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { CanvasBackgroundConfig } from "@/types/editor";

export class PixiApp {
  public app: Application | null = null;
  public containerElement: HTMLElement | null = null;

  // Layer hierarchy
  public stage!: Container;
  public viewportContainer!: Container;
  public canvasBackground!: Graphics;
  public backgroundSprite!: Sprite;
  public canvasBorder!: Graphics;
  public sceneContainer!: Container;
  public selectionContainer!: Container;
  public guideContainer!: Graphics;

  // Dimensions
  public docWidth = 1920;
  public docHeight = 1080;

  private isInitialized = false;
  private resizeObserver: ResizeObserver | null = null;
  private bgImageCache: HTMLImageElement | null = null;
  private bgImageSrc: string | null = null;

  public async init(container: HTMLElement): Promise<HTMLCanvasElement> {
    if (this.isInitialized && this.app) {
      return this.app.canvas;
    }

    this.containerElement = container;
    const app = new Application();
    this.app = app;

    await app.init({
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      backgroundAlpha: 0,
      antialias: true,
      width: container.clientWidth || 800,
      height: container.clientHeight || 600,
    });

    // If destroyed while awaiting init, clean up and exit safely
    if (!this.app || this.app !== app) {
      try {
        app.destroy({ removeView: true });
      } catch (err) {
        // Safe ignore
      }
      return app.canvas;
    }

    this.stage = this.app.stage;
    this.stage.eventMode = "static";
    this.stage.hitArea = this.app.screen;

    // Viewport holds all document content and scales/pans
    this.viewportContainer = new Container();
    this.viewportContainer.eventMode = "static";
    this.stage.addChild(this.viewportContainer);

    // Canvas background representing the physical desk / artwork bounds
    this.canvasBackground = new Graphics();
    this.canvasBackground.eventMode = "none";
    this.viewportContainer.addChild(this.canvasBackground);

    // Texture Sprite (solid, gradient, image, pattern)
    this.backgroundSprite = new Sprite();
    this.backgroundSprite.eventMode = "none";
    this.viewportContainer.addChild(this.backgroundSprite);

    // Canvas border outline
    this.canvasBorder = new Graphics();
    this.canvasBorder.eventMode = "none";
    this.viewportContainer.addChild(this.canvasBorder);

    // Scene holds all sticker sprites
    this.sceneContainer = new Container();
    this.sceneContainer.eventMode = "static";
    this.viewportContainer.addChild(this.sceneContainer);

    // Guides layer
    this.guideContainer = new Graphics();
    this.guideContainer.eventMode = "none";
    this.viewportContainer.addChild(this.guideContainer);

    // Selection overlay holds bounding box, handles, rotate pin
    this.selectionContainer = new Container();
    this.selectionContainer.eventMode = "static";
    this.viewportContainer.addChild(this.selectionContainer);

    // Attach canvas to container if not already attached
    if (!container.contains(this.app.canvas)) {
      container.appendChild(this.app.canvas);
    }

    // Window resize observer
    this.resizeObserver = new ResizeObserver(() => {
      if (this.app && this.containerElement) {
        const w = this.containerElement.clientWidth;
        const h = this.containerElement.clientHeight;
        if (w > 0 && h > 0) {
          this.app.renderer.resize(w, h);
          this.stage.hitArea = this.app.screen;
        }
      }
    });
    this.resizeObserver.observe(container);

    this.isInitialized = true;
    return this.app.canvas;
  }

  private lastBgKey = "";

  public async drawBackground(config?: CanvasBackgroundConfig): Promise<void> {
    if (!this.canvasBackground || !this.backgroundSprite || !this.canvasBorder) return;

    const type = config?.type || "solid";
    const color = config?.color || "#FAF9F5";
    const pattern = config?.pattern || "none";
    const key = `${type}_${color}_${pattern}_${config?.gradient ? JSON.stringify(config.gradient) : ""}_${config?.image?.src || ""}_${config?.image?.opacity ?? 1}_${config?.image?.blur ?? 0}`;

    if (key === this.lastBgKey) return;
    this.lastBgKey = key;

    // 1. Draw subtle paper shadow
    this.canvasBackground.clear();
    this.canvasBackground
      .rect(4, 4, this.docWidth, this.docHeight)
      .fill({ color: 0x000000, alpha: 0.05 });

    // 2. Draw border outline
    this.canvasBorder.clear();
    this.canvasBorder
      .rect(0, 0, this.docWidth, this.docHeight)
      .stroke({ color: 0xd9d8d2, width: 1.5 });

    // Fast direct GPU path for solid fills with clean paper
    if (type === "solid" && pattern === "none") {
      const hexNum = parseInt(color.replace("#", ""), 16);
      this.canvasBackground
        .rect(0, 0, this.docWidth, this.docHeight)
        .fill({ color: isNaN(hexNum) ? 0xfaf9f5 : hexNum });
      this.backgroundSprite.visible = false;
      return;
    }

    this.backgroundSprite.visible = true;

    // 3. Render offscreen canvas texture for complex gradients, images, or patterns
    const offCanvas = document.createElement("canvas");
    offCanvas.width = this.docWidth;
    offCanvas.height = this.docHeight;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return;

    if (type === "transparent") {
      // Draw subtle desk checkerboard pattern (20px grid)
      const size = 20;
      for (let y = 0; y < this.docHeight; y += size) {
        for (let x = 0; x < this.docWidth; x += size) {
          const isEven = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
          ctx.fillStyle = isEven ? "#F5F4EF" : "#EBEAE3";
          ctx.fillRect(x, y, size, size);
        }
      }
    } else if (type === "gradient" && config?.gradient) {
      const g = config.gradient;
      const rad = ((g.angle ?? 45) * Math.PI) / 180;
      const w = this.docWidth;
      const h = this.docHeight;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.sqrt(w * w + h * h) / 2;
      const x0 = cx - Math.cos(rad) * r;
      const y0 = cy - Math.sin(rad) * r;
      const x1 = cx + Math.cos(rad) * r;
      const y1 = cy + Math.sin(rad) * r;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, g.from || "#FF6B6B");
      grad.addColorStop(1, g.to || "#FFE66D");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (type === "image" && config?.image?.src) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.docWidth, this.docHeight);

      const src = config.image.src;
      let img = this.bgImageCache;
      if (!img || this.bgImageSrc !== src) {
        img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img!.onload = () => resolve();
          img!.onerror = () => resolve();
          img!.src = src;
        });
        this.bgImageCache = img;
        this.bgImageSrc = src;
      }

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (config.image.blur && config.image.blur > 0) {
          ctx.filter = `blur(${config.image.blur}px)`;
        }
        ctx.globalAlpha = config.image.opacity ?? 1;

        const scale = Math.max(this.docWidth / img.naturalWidth, this.docHeight / img.naturalHeight);
        const nw = img.naturalWidth * scale;
        const nh = img.naturalHeight * scale;
        const nx = (this.docWidth - nw) / 2;
        const ny = (this.docHeight - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.docWidth, this.docHeight);
    }

    // Pattern overlay
    if (config?.pattern === "dots") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      const spacing = 24;
      for (let y = spacing / 2; y < this.docHeight; y += spacing) {
        for (let x = spacing / 2; x < this.docWidth; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (config?.pattern === "grid") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
      ctx.lineWidth = 1;
      const spacing = 32;
      for (let x = 0; x <= this.docWidth; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.docHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= this.docHeight; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.docWidth, y);
        ctx.stroke();
      }
    }

    this.backgroundSprite.texture = Texture.from(offCanvas);
    this.backgroundSprite.width = this.docWidth;
    this.backgroundSprite.height = this.docHeight;
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.app) {
      try {
        if (this.app.canvas && this.app.canvas.parentElement) {
          this.app.canvas.parentElement.removeChild(this.app.canvas);
        }
        this.app.destroy({ removeView: true });
      } catch (err) {
        // Silently ignore strict mode race conditions
      }
      this.app = null;
    }
    this.isInitialized = false;
  }
}
