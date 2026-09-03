import { Container, Graphics, FederatedPointerEvent } from "pixi.js";
import { StickerObject, HandleDirection } from "@/types/editor";

export class SelectionManager {
  private container: Container;
  private selectionGraphics: Graphics;
  private handleGraphicsMap: Map<HandleDirection, Graphics> = new Map();
  private onHandleDownCallback: (handle: HandleDirection, e: FederatedPointerEvent) => void;

  constructor(
    container: Container,
    onHandleDown: (handle: HandleDirection, e: FederatedPointerEvent) => void
  ) {
    this.container = container;
    this.onHandleDownCallback = onHandleDown;

    this.selectionGraphics = new Graphics();
    this.container.addChild(this.selectionGraphics);

    this.createHandles();
  }

  private createHandles() {
    const handles: HandleDirection[] = ["nw", "ne", "se", "sw", "rotate"];

    handles.forEach((h) => {
      const g = new Graphics();
      g.eventMode = "static";

      g.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.onHandleDownCallback(h, e);
      });

      this.handleGraphicsMap.set(h, g);
      this.container.addChild(g);
    });
  }

  public update(selectedObjects: StickerObject[], zoom: number) {
    this.selectionGraphics.clear();
    this.handleGraphicsMap.forEach((g) => {
      g.clear();
      g.visible = false;
    });

    if (selectedObjects.length === 0) return;

    // Single selected object: show full transform box & handles
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0];
      if (!obj.visible) return;

      const w = obj.width;
      const h = obj.height;
      const rad = (obj.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Local offsets from center
      const hw = w / 2;
      const hh = h / 2;

      // Draw oriented outline in world/viewport coordinates
      const corners = [
        { x: -hw, y: -hh }, // nw
        { x: hw, y: -hh },  // ne
        { x: hw, y: hh },   // se
        { x: -hw, y: hh },  // sw
      ].map((p) => ({
        x: obj.x + (p.x * cos - p.y * sin),
        y: obj.y + (p.x * sin + p.y * cos),
      }));

      // Selection outline
      this.selectionGraphics
        .moveTo(corners[0].x, corners[0].y)
        .lineTo(corners[1].x, corners[1].y)
        .lineTo(corners[2].x, corners[2].y)
        .lineTo(corners[3].x, corners[3].y)
        .closePath()
        .stroke({ color: 0x4a6cff, width: Math.max(1, 1.5 / zoom) });

      // Rotation stem (top center extended)
      const stemDist = 24 / zoom;
      const topCenter = {
        x: obj.x + (0 * cos - -hh * sin),
        y: obj.y + (0 * sin + -hh * cos),
      };
      const rotatePos = {
        x: obj.x + (0 * cos - (-hh - stemDist) * sin),
        y: obj.y + (0 * sin + (-hh - stemDist) * cos),
      };

      this.selectionGraphics
        .moveTo(topCenter.x, topCenter.y)
        .lineTo(rotatePos.x, rotatePos.y)
        .stroke({ color: 0x4a6cff, width: Math.max(1, 1 / zoom) });

      if (obj.locked) return; // Don't show interactive transform handles if locked

      // Draw corner handles
      const handleSize = 8 / zoom;
      const halfS = handleSize / 2;

      const cornerMap: [HandleDirection, { x: number; y: number }, string][] = [
        ["nw", corners[0], "nwse-resize"],
        ["ne", corners[1], "nesw-resize"],
        ["se", corners[2], "nwse-resize"],
        ["sw", corners[3], "nesw-resize"],
      ];

      cornerMap.forEach(([hType, pos, cursor]) => {
        const g = this.handleGraphicsMap.get(hType);
        if (g) {
          g.visible = true;
          g.cursor = cursor;
          g.clear()
            .rect(pos.x - halfS, pos.y - halfS, handleSize, handleSize)
            .fill({ color: 0xffffff })
            .stroke({ color: 0x4a6cff, width: Math.max(1, 1.5 / zoom) });
        }
      });

      // Draw rotate handle (small pill/circle)
      const rotG = this.handleGraphicsMap.get("rotate");
      if (rotG) {
        rotG.visible = true;
        rotG.cursor = "grab";
        const rSize = 5 / zoom;
        rotG.clear()
          .circle(rotatePos.x, rotatePos.y, rSize)
          .fill({ color: 0xffffff })
          .stroke({ color: 0x4a6cff, width: Math.max(1, 1.5 / zoom) });
      }
    } else {
      // Multiple selection: Draw boundary box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedObjects.forEach((o) => {
        minX = Math.min(minX, o.x - o.width / 2);
        minY = Math.min(minY, o.y - o.height / 2);
        maxX = Math.max(maxX, o.x + o.width / 2);
        maxY = Math.max(maxY, o.y + o.height / 2);
      });

      this.selectionGraphics
        .rect(minX, minY, maxX - minX, maxY - minY)
        .stroke({ color: 0x4a6cff, width: Math.max(1, 1.5 / zoom) });
    }
  }

  public clear() {
    this.selectionGraphics.clear();
    this.handleGraphicsMap.forEach((g) => {
      g.clear();
      g.visible = false;
    });
  }
}
