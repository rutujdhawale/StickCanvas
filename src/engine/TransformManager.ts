import { Container, FederatedPointerEvent, Point } from "pixi.js";
import { StickerObject, HandleDirection } from "@/types/editor";

interface TransformCallbacks {
  onUpdate: (id: string, patch: Partial<StickerObject>) => void;
  onCommit: () => void;
  onAngleChange: (angle: number | null) => void;
}

export class TransformManager {
  private viewportContainer: Container;
  private callbacks: TransformCallbacks;

  private activeMode: "none" | "drag" | "resize" | "rotate" = "none";
  private activeObjectId: string | null = null;
  private activeHandle: HandleDirection | null = null;

  // Drag initial state
  private startPointerWorld: { x: number; y: number } = { x: 0, y: 0 };
  private startObjectPos: { x: number; y: number } = { x: 0, y: 0 };

  // Resize initial state
  private startWidth = 0;
  private startHeight = 0;
  private startRotation = 0;
  private oppositeAnchorWorld: { x: number; y: number } = { x: 0, y: 0 };
  private aspectRatio = 1;

  // Rotate initial state
  private rotateCenter: { x: number; y: number } = { x: 0, y: 0 };
  private startAngleOffset = 0;

  constructor(viewportContainer: Container, callbacks: TransformCallbacks) {
    this.viewportContainer = viewportContainer;
    this.callbacks = callbacks;
  }

  // Convert global/screen pointer coords to viewport local coords
  public screenToWorld(globalX: number, globalY: number): { x: number; y: number } {
    const local = this.viewportContainer.toLocal(new Point(globalX, globalY));
    return { x: local.x, y: local.y };
  }

  public startDrag(obj: StickerObject, globalX: number, globalY: number) {
    if (obj.locked) return;
    this.activeMode = "drag";
    this.activeObjectId = obj.id;
    this.startPointerWorld = this.screenToWorld(globalX, globalY);
    this.startObjectPos = { x: obj.x, y: obj.y };
  }

  public startResize(
    obj: StickerObject,
    handle: HandleDirection,
    globalX: number,
    globalY: number
  ) {
    if (obj.locked) return;
    this.activeMode = "resize";
    this.activeObjectId = obj.id;
    this.activeHandle = handle;

    this.startWidth = obj.width;
    this.startHeight = obj.height;
    this.aspectRatio = obj.width / obj.height;
    this.startRotation = (obj.rotation * Math.PI) / 180;

    const hw = obj.width / 2;
    const hh = obj.height / 2;
    const cos = Math.cos(this.startRotation);
    const sin = Math.sin(this.startRotation);

    // Identify opposite corner in local space, then convert to world space
    let oppLocal = { x: 0, y: 0 };
    if (handle === "nw") oppLocal = { x: hw, y: hh };       // opp is se
    else if (handle === "ne") oppLocal = { x: -hw, y: hh };  // opp is sw
    else if (handle === "se") oppLocal = { x: -hw, y: -hh }; // opp is nw
    else if (handle === "sw") oppLocal = { x: hw, y: -hh };  // opp is ne

    this.oppositeAnchorWorld = {
      x: obj.x + (oppLocal.x * cos - oppLocal.y * sin),
      y: obj.y + (oppLocal.x * sin + oppLocal.y * cos),
    };
  }

  public startRotate(obj: StickerObject, globalX: number, globalY: number) {
    if (obj.locked) return;
    this.activeMode = "rotate";
    this.activeObjectId = obj.id;
    this.rotateCenter = { x: obj.x, y: obj.y };

    const worldPtr = this.screenToWorld(globalX, globalY);
    const currentMouseAngle = Math.atan2(
      worldPtr.y - obj.y,
      worldPtr.x - obj.x
    );
    // Offset so dragging starts seamlessly from current angle
    this.startAngleOffset = ((obj.rotation * Math.PI) / 180) - currentMouseAngle;
  }

  public handlePointerMove(globalX: number, globalY: number, shiftKey = false) {
    if (this.activeMode === "none" || !this.activeObjectId) return;

    const worldPtr = this.screenToWorld(globalX, globalY);

    if (this.activeMode === "drag") {
      const dx = worldPtr.x - this.startPointerWorld.x;
      const dy = worldPtr.y - this.startPointerWorld.y;

      let newX = this.startObjectPos.x + dx;
      let newY = this.startObjectPos.y + dy;

      // Shift key locks axis to 45 deg or vertical/horizontal
      if (shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newY = this.startObjectPos.y;
        } else {
          newX = this.startObjectPos.x;
        }
      }

      this.callbacks.onUpdate(this.activeObjectId, {
        x: Math.round(newX),
        y: Math.round(newY),
      });
    } else if (this.activeMode === "resize" && this.activeHandle) {
      // Vector from fixed opposite anchor to current mouse pointer in world space
      const vX = worldPtr.x - this.oppositeAnchorWorld.x;
      const vY = worldPtr.y - this.oppositeAnchorWorld.y;

      // Project onto the sticker's local axes
      const cos = Math.cos(this.startRotation);
      const sin = Math.sin(this.startRotation);

      let localW = vX * cos + vY * sin;
      let localH = -vX * sin + vY * cos;

      if (this.activeHandle === "nw") {
        localW = -localW;
        localH = -localH;
      } else if (this.activeHandle === "ne") {
        localH = -localH;
      } else if (this.activeHandle === "sw") {
        localW = -localW;
      }

      // Maintain aspect ratio
      const calculatedW = Math.max(24, Math.abs(localW));
      const calculatedH = Math.max(24, calculatedW / this.aspectRatio);

      // New center is midpoint between opposite anchor and new corner
      // Direction signs depending on handle
      let signX = 1, signY = 1;
      if (this.activeHandle === "nw") { signX = -1; signY = -1; }
      else if (this.activeHandle === "ne") { signX = 1; signY = -1; }
      else if (this.activeHandle === "se") { signX = 1; signY = 1; }
      else if (this.activeHandle === "sw") { signX = -1; signY = 1; }

      const newCornerLocal = {
        x: signX * calculatedW,
        y: signY * calculatedH,
      };

      const newCornerWorld = {
        x: this.oppositeAnchorWorld.x + (newCornerLocal.x * cos - newCornerLocal.y * sin),
        y: this.oppositeAnchorWorld.y + (newCornerLocal.x * sin + newCornerLocal.y * cos),
      };

      const newCenter = {
        x: (this.oppositeAnchorWorld.x + newCornerWorld.x) / 2,
        y: (this.oppositeAnchorWorld.y + newCornerWorld.y) / 2,
      };

      this.callbacks.onUpdate(this.activeObjectId, {
        x: Math.round(newCenter.x),
        y: Math.round(newCenter.y),
        width: Math.round(calculatedW),
        height: Math.round(calculatedH),
      });
    } else if (this.activeMode === "rotate") {
      const mouseAngle = Math.atan2(
        worldPtr.y - this.rotateCenter.y,
        worldPtr.x - this.rotateCenter.x
      );
      let deg = ((mouseAngle + this.startAngleOffset) * 180) / Math.PI;

      // Shift key snaps to 15 degree increments
      if (shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      deg = ((deg % 360) + 360) % 360;
      const roundedDeg = Math.round(deg);

      this.callbacks.onUpdate(this.activeObjectId, {
        rotation: roundedDeg,
      });
      this.callbacks.onAngleChange(roundedDeg);
    }
  }

  public handlePointerUp() {
    if (this.activeMode !== "none") {
      this.activeMode = "none";
      this.activeObjectId = null;
      this.activeHandle = null;
      this.callbacks.onAngleChange(null);
      this.callbacks.onCommit();
    }
  }

  public isBusy(): boolean {
    return this.activeMode !== "none";
  }
}
