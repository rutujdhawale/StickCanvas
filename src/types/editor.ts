// ─── Core Data Types ────────────────────────────────────────────

export interface StickerObject {
  id: string;
  assetId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0–1
  zIndex: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
  visible: boolean;
}

export interface Asset {
  id: string;
  name: string;
  src: string; // data URL, blob URL, or remote URL
  thumbnailSrc: string;
  originalWidth: number;
  originalHeight: number;
  type: "emoji" | "upload" | "paste";
}

// ─── Editor State ───────────────────────────────────────────────

export interface DocumentState {
  projectName: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  objects: StickerObject[];
}

export interface HistoryEntry {
  objects: StickerObject[];
  timestamp: number;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ExportOptions {
  format: "png" | "jpeg" | "webp";
  scale: 1 | 2 | 4;
  transparent: boolean;
}

// ─── Interaction Types ──────────────────────────────────────────

export type HandleDirection =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate";

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  objectStartX: number;
  objectStartY: number;
}

export interface ResizeState {
  isResizing: boolean;
  handle: HandleDirection;
  startMouseX: number;
  startMouseY: number;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  aspectRatio: number;
}

export interface RotateState {
  isRotating: boolean;
  startAngle: number;
  objectStartRotation: number;
}

// ─── Context Menu ───────────────────────────────────────────────

export type ContextMenuAction =
  | "duplicate"
  | "copy"
  | "paste"
  | "delete"
  | "bring-forward"
  | "send-backward"
  | "bring-front"
  | "send-back"
  | "lock"
  | "unlock";

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
}

// ─── Tool Palette ───────────────────────────────────────────────

export type ActiveTool = "select" | "pan";
