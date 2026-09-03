import { FederatedPointerEvent } from "pixi.js";
import { PixiApp } from "./PixiApp";
import { SceneManager } from "./SceneManager";
import { SelectionManager } from "./SelectionManager";
import { TransformManager } from "./TransformManager";
import { ViewportManager } from "./ViewportManager";
import { StickerObject, Asset, ViewportState, HandleDirection, CanvasBackgroundConfig } from "@/types/editor";

export interface EditorEngineCallbacks {
  onSelect: (id: string, shiftKey: boolean) => void;
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

  public containerElement: HTMLElement | null = null;
  private callbacks: EditorEngineCallbacks;

  private isSpaceDown = false;
  private isMiddleMouseDown = false;

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
      }
    );

    // Initialize SelectionManager
    this.selectionManager = new SelectionManager(
      this.pixiApp.selectionContainer,
      (handle: HandleDirection, e: FederatedPointerEvent) => {
        const native = e.originalEvent as unknown as MouseEvent;
        const selected = this.getSelectedObjectsRef();
        if (selected.length === 1) {
          if (handle === "rotate") {
            this.transformManager.startRotate(selected[0], native.clientX, native.clientY);
          } else {
            this.transformManager.startResize(selected[0], handle, native.clientX, native.clientY);
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
        const native = e.originalEvent as unknown as MouseEvent;
        if (native.button === 0 && !this.isSpaceDown) {
          const obj = this.findObjectById(id);
          if (obj) {
            this.transformManager.startDrag(obj, native.clientX, native.clientY);
          }
        }
      }
    );

    // Stage background click to deselect
    this.pixiApp.stage.on("pointerdown", (e: FederatedPointerEvent) => {
      const native = e.originalEvent as unknown as MouseEvent;
      if (native && native.button === 0 && !this.transformManager.isBusy() && !this.isSpaceDown) {
        // If clicking canvas background, deselect
        this.callbacks.onDeselect();
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

    // Multi-touch gestures (pinch zoom & 2-finger pan)
    const touchStartHandler = (e: TouchEvent) => this.viewportManager.handleTouchStart(e);
    const touchMoveHandler = (e: TouchEvent) => this.viewportManager.handleTouchMove(e);
    const touchEndHandler = (e: TouchEvent) => this.viewportManager.handleTouchEnd(e);
    container.addEventListener("touchstart", touchStartHandler, { passive: false });
    container.addEventListener("touchmove", touchMoveHandler, { passive: false });
    container.addEventListener("touchend", touchEndHandler, { passive: false });

    // Pointer move / up
    const pointerMoveHandler = (e: PointerEvent) => {
      if (this.viewportManager.getIsPanning()) {
        this.viewportManager.handlePanMove(e.clientX, e.clientY);
        return;
      }
      this.transformManager.handlePointerMove(e.clientX, e.clientY, e.shiftKey);
    };

    const pointerUpHandler = () => {
      if (this.viewportManager.getIsPanning()) {
        this.viewportManager.endPan();
        container.style.cursor = this.isSpaceDown ? "grab" : "default";
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
