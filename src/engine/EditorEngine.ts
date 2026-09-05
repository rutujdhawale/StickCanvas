import { FederatedPointerEvent, Graphics } from "pixi.js";
import { PixiApp } from "./PixiApp";
import { SceneManager } from "./SceneManager";
import { SelectionManager } from "./SelectionManager";
import { TransformManager } from "./TransformManager";
import { ViewportManager } from "./ViewportManager";
import { StickerObject, Asset, ViewportState, HandleDirection, CanvasBackgroundConfig } from "@/types/editor";

export interface EditorEngineCallbacks {
  onSelect: (id: string, shiftKey: boolean) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onDeselect: () => void;
  onUpdateObject: (id: string, patch: Partial<StickerObject>) => void;
  onCommitHistory: () => void;
  onAngleChange: (angle: number | null) => void;
  onViewportChange: (viewport: ViewportState) => void;
  onContextMenu: (x: number, y: number, targetId: string | null) => void;
}

export class EditorEngine {
  public pixiApp: PixiApp;
  public sceneManager!: SceneManager;
  public selectionManager!: SelectionManager;
  public transformManager!: TransformManager;
  public viewportManager!: ViewportManager;
  public marqueeGraphics!: import("pixi.js").Graphics;

  public containerElement: HTMLElement | null = null;
  private callbacks: EditorEngineCallbacks;

  private isSpaceDown = false;
  private isMiddleMouseDown = false;

  // Marquee drag-box selection state
  private isMarqueeActive = false;
  private isMarqueeDragging = false;
  private marqueeStart = { x: 0, y: 0 };
  private marqueeShift = false;
  private initialSelectedIds: string[] = [];

  constructor(callbacks: EditorEngineCallbacks) {
    this.callbacks = callbacks;
    this.pixiApp = new PixiApp();
  }

  public async init(container: HTMLElement): Promise<HTMLCanvasElement> {
    this.containerElement = container;
    const canvas = await this.pixiApp.init(container);
    if (!this.pixiApp.viewportContainer) {
      return canvas;
    }

    // Initialize ViewportManager
    this.viewportManager = new ViewportManager(
      this.pixiApp.viewportContainer,
      container,
      {
        onChange: (v) => this.callbacks.onViewportChange(v),
      }
    );

    // Initialize TransformManager
    this.transformManager = new TransformManager(
      this.pixiApp.viewportContainer,
      {
        onUpdate: (id, patch) => this.callbacks.onUpdateObject(id, patch),
        onCommit: () => this.callbacks.onCommitHistory(),
        onAngleChange: (angle) => this.callbacks.onAngleChange(angle),
      },
      container
    );

    const getPointerCoords = (e: FederatedPointerEvent) => {
      const native = e.originalEvent as any;
      const clientX = e.clientX ?? native?.clientX ?? native?.touches?.[0]?.clientX ?? native?.changedTouches?.[0]?.clientX ?? e.global.x;
      const clientY = e.clientY ?? native?.clientY ?? native?.touches?.[0]?.clientY ?? native?.changedTouches?.[0]?.clientY ?? e.global.y;
      return { x: clientX, y: clientY };
    };

    // Initialize SelectionManager
    this.selectionManager = new SelectionManager(
      this.pixiApp.selectionContainer,
      (handle: HandleDirection, e: FederatedPointerEvent) => {
        const selected = this.getSelectedObjectsRef();
        if (selected.length === 1) {
          const coords = getPointerCoords(e);
          if (handle === "rotate") {
            this.transformManager.startRotate(selected[0], coords.x, coords.y);
          } else {
            this.transformManager.startResize(selected[0], handle, coords.x, coords.y);
          }
        }
      }
    );

    // Initialize SceneManager
    this.sceneManager = new SceneManager(
      this.pixiApp.sceneContainer,
      (id: string, shiftKey: boolean) => {
        this.callbacks.onSelect(id, shiftKey);
      },
      (id: string, e: FederatedPointerEvent) => {
        const native = e.originalEvent as any;
        const isLeftOrTouch = e.pointerType === "touch" || native?.button === 0 || native?.button === undefined;
        if (isLeftOrTouch && !this.isSpaceDown) {
          const obj = this.findObjectById(id);
          if (obj) {
            const coords = getPointerCoords(e);
            this.transformManager.startDrag(obj, coords.x, coords.y, this.getSelectedObjectsRef());
          }
        }
      }
    );

    // Initialize Marquee Graphics overlay
    this.marqueeGraphics = new Graphics();
    this.marqueeGraphics.eventMode = "none";
    this.pixiApp.selectionContainer.addChild(this.marqueeGraphics);

    // Stage background click & drag marquee box selection
    this.pixiApp.stage.on("pointerdown", (e: FederatedPointerEvent) => {
      const native = e.originalEvent as any;
      const isLeftOrTouch = e.pointerType === "touch" || native?.button === 0 || native?.button === undefined;
      if (isLeftOrTouch && !this.transformManager.isBusy() && !this.isSpaceDown) {
        const coords = getPointerCoords(e);
        const world = this.screenToCanvas(coords.x, coords.y);
        this.isMarqueeActive = true;
        this.isMarqueeDragging = false;
        this.marqueeStart = { x: world.x, y: world.y };
        this.marqueeShift = Boolean(e.shiftKey);
        this.initialSelectedIds = [...this.selectedIds];
      }
    });

    this.attachEventListeners(container);

    // Initial fit to content
    setTimeout(() => {
      this.viewportManager.fitToContent(this.pixiApp.docWidth, this.pixiApp.docHeight);
    }, 50);

    return canvas;
  }

  // References used by callbacks
  private currentObjects: StickerObject[] = [];
  private selectedIds: string[] = [];

  private getSelectedObjectsRef(): StickerObject[] {
    return this.currentObjects.filter((o) => this.selectedIds.includes(o.id));
  }

  private findObjectById(id: string): StickerObject | undefined {
    return this.currentObjects.find((o) => o.id === id);
  }

  public async sync(
    objects: StickerObject[],
    assets: Asset[],
    selectedIds: string[]
  ) {
    this.currentObjects = objects;
    this.selectedIds = selectedIds;

    await this.sceneManager.syncObjects(objects, assets);

    const selectedObjs = this.getSelectedObjectsRef();
    this.selectionManager.update(selectedObjs, this.viewportManager.zoom);
  }

  public async updateBackground(config: CanvasBackgroundConfig): Promise<void> {
    await this.pixiApp.drawBackground(config);
  }

  public screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    return this.transformManager.screenToWorld(clientX, clientY);
  }

  private attachEventListeners(container: HTMLElement) {
    // Wheel zoom
    const wheelHandler = (e: WheelEvent) => this.viewportManager.handleWheel(e);
    container.addEventListener("wheel", wheelHandler, { passive: false });

    // Multi-touch gestures (pinch zoom & 2-finger pan) and single-touch sticker drag
    const touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        this.viewportManager.handleTouchStart(e);
      }
    };
    const handleMarqueeMove = (clientX: number, clientY: number) => {
      const world = this.screenToCanvas(clientX, clientY);
      const dx = world.x - this.marqueeStart.x;
      const dy = world.y - this.marqueeStart.y;
      if (Math.hypot(dx, dy) > 4) {
        this.isMarqueeDragging = true;
        const boxX = Math.min(this.marqueeStart.x, world.x);
        const boxY = Math.min(this.marqueeStart.y, world.y);
        const boxW = Math.abs(dx);
        const boxH = Math.abs(dy);

        const zoom = this.viewportManager.zoom;
        this.marqueeGraphics
          .clear()
          .rect(boxX, boxY, boxW, boxH)
          .fill({ color: 0x4a6cff, alpha: 0.12 })
          .stroke({ color: 0x4a6cff, width: Math.max(1, 1.5 / zoom), alpha: 0.85 });

        // Test intersection with all visible stickers
        const matchedIds: string[] = [];
        for (const obj of this.currentObjects) {
          if (!obj.visible) continue;
          const hw = obj.width / 2;
          const hh = obj.height / 2;
          const rad = (obj.rotation * Math.PI) / 180;
          const cos = Math.abs(Math.cos(rad));
          const sin = Math.abs(Math.sin(rad));
          const aabbW = hw * cos + hh * sin;
          const aabbH = hw * sin + hh * cos;
          const sMinX = obj.x - aabbW;
          const sMaxX = obj.x + aabbW;
          const sMinY = obj.y - aabbH;
          const sMaxY = obj.y + aabbH;

          const intersects =
            boxX <= sMaxX &&
            boxX + boxW >= sMinX &&
            boxY <= sMaxY &&
            boxY + boxH >= sMinY;

          if (intersects) {
            matchedIds.push(obj.id);
          }
        }

        const nextSelected = this.marqueeShift
          ? Array.from(new Set([...this.initialSelectedIds, ...matchedIds]))
          : matchedIds;

        this.callbacks.onSelectMultiple?.(nextSelected);
      }
    };

    const handleMarqueeUp = () => {
      this.marqueeGraphics.clear();
      if (!this.isMarqueeDragging) {
        // Single click on background without dragging: deselect
        this.callbacks.onDeselect();
      }
      this.isMarqueeActive = false;
      this.isMarqueeDragging = false;
    };

    const touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        this.viewportManager.handleTouchMove(e);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (this.transformManager.isBusy()) {
          e.preventDefault();
          this.transformManager.handlePointerMove(t.clientX, t.clientY, false);
        } else if (this.isMarqueeActive) {
          e.preventDefault();
          handleMarqueeMove(t.clientX, t.clientY);
        }
      }
    };
    const touchEndHandler = (e: TouchEvent) => {
      if (e.touches.length < 2 && this.viewportManager.getIsPanning()) {
        this.viewportManager.handleTouchEnd(e);
      }
      if (this.isMarqueeActive) {
        handleMarqueeUp();
      }
      if (this.transformManager.isBusy()) {
        this.transformManager.handlePointerUp();
        const selectedObjs = this.getSelectedObjectsRef();
        this.selectionManager.update(selectedObjs, this.viewportManager.zoom);
      }
    };
    container.addEventListener("touchstart", touchStartHandler, { passive: false });
    container.addEventListener("touchmove", touchMoveHandler, { passive: false });
    container.addEventListener("touchend", touchEndHandler, { passive: false });

    // Pointer move / up
    const pointerMoveHandler = (e: PointerEvent) => {
      if (this.viewportManager.getIsPanning()) {
        this.viewportManager.handlePanMove(e.clientX, e.clientY);
        return;
      }
      if (this.isMarqueeActive) {
        handleMarqueeMove(e.clientX, e.clientY);
        return;
      }
      this.transformManager.handlePointerMove(e.clientX, e.clientY, e.shiftKey);
    };

    const pointerUpHandler = () => {
      if (this.viewportManager.getIsPanning()) {
        this.viewportManager.endPan();
        container.style.cursor = this.isSpaceDown ? "grab" : "default";
      }
      if (this.isMarqueeActive) {
        handleMarqueeUp();
      }
      this.transformManager.handlePointerUp();
      const selectedObjs = this.getSelectedObjectsRef();
      this.selectionManager.update(selectedObjs, this.viewportManager.zoom);
    };

    window.addEventListener("pointermove", pointerMoveHandler);
    window.addEventListener("pointerup", pointerUpHandler);

    // Pan via Space + Drag or Middle Click
    const pointerDownHandler = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && this.isSpaceDown)) {
        this.viewportManager.startPan(e.clientX, e.clientY);
        container.style.cursor = "grabbing";
        e.preventDefault();
      }
    };
    container.addEventListener("pointerdown", pointerDownHandler);

    // Context Menu
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
      const world = this.screenToCanvas(e.clientX, e.clientY);
      // Check if clicking on an existing sticker
      const hit = [...this.currentObjects]
        .reverse()
        .find(
          (o) =>
            o.visible &&
            Math.abs(world.x - o.x) <= o.width / 2 &&
            Math.abs(world.y - o.y) <= o.height / 2
        );

      this.callbacks.onContextMenu(e.clientX, e.clientY, hit ? hit.id : null);
    };
    container.addEventListener("contextmenu", contextMenuHandler);

    // Keyboard Space toggle
    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !this.isSpaceDown && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        this.isSpaceDown = true;
        container.style.cursor = "grab";
      }
    };
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        this.isSpaceDown = false;
        container.style.cursor = "default";
      }
    };
    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);
  }

  public destroy() {
    this.pixiApp.destroy();
  }
}
