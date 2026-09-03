import { Container } from "pixi.js";
import { ViewportState } from "@/types/editor";

interface ViewportCallbacks {
  onChange: (v: ViewportState) => void;
}

export class ViewportManager {
  private container: Container;
  private containerElement: HTMLElement;
  private callbacks: ViewportCallbacks;

  public zoom = 1;
  public panX = 0;
  public panY = 0;

  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private initialPanX = 0;
  private initialPanY = 0;

  constructor(
    container: Container,
    containerElement: HTMLElement,
    callbacks: ViewportCallbacks
  ) {
    this.container = container;
    this.containerElement = containerElement;
    this.callbacks = callbacks;
  }

  public applyTransform() {
    this.container.position.set(this.panX, this.panY);
    this.container.scale.set(this.zoom);
    this.callbacks.onChange({ zoom: this.zoom, panX: this.panX, panY: this.panY });
  }

  public setZoom(newZoom: number, centerX?: number, centerY?: number) {
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    const rect = this.containerElement.getBoundingClientRect();

    const cx = centerX ?? rect.width / 2;
    const cy = centerY ?? rect.height / 2;

    // Zoom centered at (cx, cy)
    this.panX = cx - (cx - this.panX) * (clampedZoom / this.zoom);
    this.panY = cy - (cy - this.panY) * (clampedZoom / this.zoom);
    this.zoom = clampedZoom;

    this.applyTransform();
  }

  public setPan(x: number, y: number) {
    this.panX = x;
    this.panY = y;
    this.applyTransform();
  }

  public startPan(screenX: number, screenY: number) {
    this.isPanning = true;
    this.panStartX = screenX;
    this.panStartY = screenY;
    this.initialPanX = this.panX;
    this.initialPanY = this.panY;
  }

  public handlePanMove(screenX: number, screenY: number) {
    if (!this.isPanning) return;
    const dx = screenX - this.panStartX;
    const dy = screenY - this.panStartY;
    this.panX = this.initialPanX + dx;
    this.panY = this.initialPanY + dy;
    this.applyTransform();
  }

  public endPan() {
    this.isPanning = false;
  }

  public getIsPanning(): boolean {
    return this.isPanning;
  }

  public handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.containerElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey || !e.shiftKey) {
      // Zoom with wheel
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.setZoom(this.zoom * zoomFactor, mouseX, mouseY);
    } else {
      // Shift + wheel pans horizontally, or normal wheel pans
      this.panX -= e.deltaX;
      this.panY -= e.deltaY;
      this.applyTransform();
    }
  }

  public fitToContent(docWidth: number, docHeight: number) {
    const rect = this.containerElement.getBoundingClientRect();
    const padding = 64;
    const availableW = Math.max(100, rect.width - padding * 2);
    const availableH = Math.max(100, rect.height - padding * 2);

    const scaleX = availableW / docWidth;
    const scaleY = availableH / docHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1.2);

    this.zoom = Math.max(0.1, fitZoom);
    this.panX = (rect.width - docWidth * this.zoom) / 2;
    this.panY = (rect.height - docHeight * this.zoom) / 2;

    this.applyTransform();
  }

  public resetTo100(docWidth: number, docHeight: number) {
    const rect = this.containerElement.getBoundingClientRect();
    this.zoom = 1;
    this.panX = (rect.width - docWidth) / 2;
    this.panY = (rect.height - docHeight) / 2;
    this.applyTransform();
  }

  // ─── Touch Gestures (Pinch to Zoom & Two-Finger Pan) ──────────
  private initialTouchDistance = 0;
  private initialPinchZoom = 1;
  private initialPinchCenter = { x: 0, y: 0 };

  public handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      this.initialTouchDistance = Math.sqrt(dx * dx + dy * dy);
      this.initialPinchZoom = this.zoom;

      const rect = this.containerElement.getBoundingClientRect();
      this.initialPinchCenter = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
      this.startPan((t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2);
    }
  }

  public handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.initialTouchDistance > 0) {
        const factor = dist / this.initialTouchDistance;
        this.setZoom(
          this.initialPinchZoom * factor,
          this.initialPinchCenter.x,
          this.initialPinchCenter.y
        );
      }

      this.handlePanMove(
        (t1.clientX + t2.clientX) / 2,
        (t1.clientY + t2.clientY) / 2
      );
    }
  }

  public handleTouchEnd(e: TouchEvent) {
    if (e.touches.length < 2) {
      this.initialTouchDistance = 0;
      this.endPan();
    }
  }
}
