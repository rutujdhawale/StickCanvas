import { create } from "zustand";
import type {
  StickerObject,
  Asset,
  DocumentState,
  HistoryEntry,
  ViewportState,
  CanvasBackgroundConfig,
} from "@/types/editor";
import {
  saveArtworkDebounced,
  loadArtwork,
  clearArtwork,
  getFastCachedDocument,
  getFastCachedAssets,
} from "@/lib/storage";

// ─── Helpers ────────────────────────────────────────────────────

const defaultDocument: DocumentState = {
  projectName: "Untitled artwork",
  canvasWidth: 1920,
  canvasHeight: 1080,
  backgroundColor: "#FAF9F5",
  backgroundConfig: {
    type: "solid",
    color: "#FAF9F5",
    gradient: {
      from: "#FF6B6B",
      to: "#FFE66D",
      angle: 45,
    },
    pattern: "none",
  },
  objects: [],
};

const initialCached = getFastCachedDocument();
const initialCachedAssets = getFastCachedAssets();
let nextId = 1;
if (initialCached?.objects) {
  const highestId = initialCached.objects.reduce((max, o) => {
    const match = o.id.match(/^sticker_(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  if (highestId >= nextId) nextId = highestId + 1;
}

export const generateId = () => `sticker_${nextId++}`;
export const generateAssetId = () => `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const MAX_HISTORY = 50;

function cloneObjects(objects: StickerObject[]): StickerObject[] {
  return objects.map((o) => ({ ...o }));
}

// ─── Store Types ────────────────────────────────────────────────

interface EditorState {
  // Document
  document: DocumentState;
  assets: Asset[];
  isHydrated: boolean;

  // Selection
  selectedIds: string[];

  // Viewport
  viewport: ViewportState;

  // History
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Internal clipboard
  clipboard: StickerObject[];

  // ─── Document Actions ───────────────────────────────────────
  setProjectName: (name: string) => void;
  setBackgroundConfig: (config: Partial<CanvasBackgroundConfig>) => void;

  // ─── Object Actions ─────────────────────────────────────────
  addObject: (obj: StickerObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, patch: Partial<StickerObject>) => void;
  getObject: (id: string) => StickerObject | undefined;
  getSelectedObjects: () => StickerObject[];

  // ─── Selection ──────────────────────────────────────────────
  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselect: () => void;

  // ─── Ordering ───────────────────────────────────────────────
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // ─── Clipboard ──────────────────────────────────────────────
  copySelected: () => void;
  pasteFromClipboard: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;

  // ─── Viewport ───────────────────────────────────────────────
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setViewport: (v: Partial<ViewportState>) => void;

  // ─── Assets ─────────────────────────────────────────────────
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // ─── History ────────────────────────────────────────────────
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ─── Persistence ────────────────────────────────────────────
  loadSavedArtwork: () => Promise<boolean>;
  resetProject: () => Promise<void>;
}

// ─── Store ──────────────────────────────────────────────────────

export const useEditorStore = create<EditorState>((set, get) => ({
  // ─── Initial State ──────────────────────────────────────────

  document: initialCached || defaultDocument,
  assets: initialCachedAssets || [],
  isHydrated: false,
  selectedIds: [],
  viewport: { zoom: 1, panX: 0, panY: 0 },
  undoStack: [],
  redoStack: [],
  clipboard: [],

  // ─── Document Actions ───────────────────────────────────────

  setProjectName: (name) =>
    set((s) => ({
      document: { ...s.document, projectName: name },
    })),

  setBackgroundConfig: (config) =>
    set((s) => {
      const updated = {
        ...s.document.backgroundConfig,
        ...config,
      };
      return {
        document: {
          ...s.document,
          backgroundColor: updated.color,
          backgroundConfig: updated,
        },
      };
    }),

  // ─── Object Actions ─────────────────────────────────────────

  addObject: (obj) =>
    set((s) => ({
      document: {
        ...s.document,
        objects: [...s.document.objects, obj],
      },
    })),

  removeObject: (id) =>
    set((s) => ({
      document: {
        ...s.document,
        objects: s.document.objects.filter((o) => o.id !== id),
      },
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),

  updateObject: (id, patch) =>
    set((s) => ({
      document: {
        ...s.document,
        objects: s.document.objects.map((o) =>
          o.id === id ? { ...o, ...patch } : o
        ),
      },
    })),

  getObject: (id) => get().document.objects.find((o) => o.id === id),

  getSelectedObjects: () => {
    const { document, selectedIds } = get();
    return document.objects.filter((o) => selectedIds.includes(o.id));
  },

  // ─── Selection ──────────────────────────────────────────────

  select: (id) => set({ selectedIds: [id] }),
  selectMultiple: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) =>
    set((s) => {
      const exists = s.selectedIds.includes(id);
      return {
        selectedIds: exists
          ? s.selectedIds.filter((x) => x !== id)
          : [...s.selectedIds, id],
      };
    }),
  selectAll: () =>
    set((s) => ({
      selectedIds: s.document.objects
        .filter((o) => !o.locked)
        .map((o) => o.id),
    })),
  deselect: () => set({ selectedIds: [] }),

  // ─── Ordering ───────────────────────────────────────────────

  bringForward: (id) =>
    set((s) => {
      const objects = [...s.document.objects];
      const idx = objects.findIndex((o) => o.id === id);
      if (idx < objects.length - 1) {
        [objects[idx], objects[idx + 1]] = [objects[idx + 1], objects[idx]];
        // Reassign zIndex
        objects.forEach((o, i) => (o.zIndex = i));
      }
      return { document: { ...s.document, objects } };
    }),

  sendBackward: (id) =>
    set((s) => {
      const objects = [...s.document.objects];
      const idx = objects.findIndex((o) => o.id === id);
      if (idx > 0) {
        [objects[idx], objects[idx - 1]] = [objects[idx - 1], objects[idx]];
        objects.forEach((o, i) => (o.zIndex = i));
      }
      return { document: { ...s.document, objects } };
    }),

  bringToFront: (id) =>
    set((s) => {
      const objects = s.document.objects.filter((o) => o.id !== id);
      const obj = s.document.objects.find((o) => o.id === id);
      if (obj) {
        objects.push(obj);
        objects.forEach((o, i) => (o.zIndex = i));
      }
      return { document: { ...s.document, objects } };
    }),

  sendToBack: (id) =>
    set((s) => {
      const objects = s.document.objects.filter((o) => o.id !== id);
      const obj = s.document.objects.find((o) => o.id === id);
      if (obj) {
        objects.unshift(obj);
        objects.forEach((o, i) => (o.zIndex = i));
      }
      return { document: { ...s.document, objects } };
    }),

  reorderLayers: (fromIndex, toIndex) =>
    set((s) => {
      const objects = [...s.document.objects];
      const [moved] = objects.splice(fromIndex, 1);
      objects.splice(toIndex, 0, moved);
      objects.forEach((o, i) => (o.zIndex = i));
      return { document: { ...s.document, objects } };
    }),

  // ─── Clipboard ──────────────────────────────────────────────

  copySelected: () => {
    const selected = get().getSelectedObjects();
    set({ clipboard: cloneObjects(selected) });
  },

  pasteFromClipboard: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    const newObjects = clipboard.map((o) => ({
      ...o,
      id: generateId(),
      x: o.x + 20,
      y: o.y + 20,
    }));

    set((s) => ({
      document: {
        ...s.document,
        objects: [...s.document.objects, ...newObjects],
      },
      selectedIds: newObjects.map((o) => o.id),
      clipboard: cloneObjects(newObjects), // so next paste offsets again
    }));
    get().pushHistory();
  },

  duplicateSelected: () => {
    const selected = get().getSelectedObjects();
    if (selected.length === 0) return;

    const newObjects = selected.map((o) => ({
      ...o,
      id: generateId(),
      x: o.x + 20,
      y: o.y + 20,
    }));

    set((s) => ({
      document: {
        ...s.document,
        objects: [...s.document.objects, ...newObjects],
      },
      selectedIds: newObjects.map((o) => o.id),
    }));
    get().pushHistory();
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;

    set((s) => ({
      document: {
        ...s.document,
        objects: s.document.objects.filter(
          (o) => !selectedIds.includes(o.id)
        ),
      },
      selectedIds: [],
    }));
    get().pushHistory();
  },

  // ─── Viewport ───────────────────────────────────────────────

  setZoom: (zoom) =>
    set((s) => ({
      viewport: { ...s.viewport, zoom: Math.max(0.1, Math.min(5, zoom)) },
    })),

  setPan: (x, y) =>
    set((s) => ({ viewport: { ...s.viewport, panX: x, panY: y } })),

  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  // ─── Assets ─────────────────────────────────────────────────

  addAsset: (asset) => set((s) => ({ assets: [...s.assets, asset] })),

  removeAsset: (id) =>
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

  // ─── History ────────────────────────────────────────────────

  pushHistory: () =>
    set((s) => {
      const entry: HistoryEntry = {
        objects: cloneObjects(s.document.objects),
        timestamp: Date.now(),
      };
      const undoStack = [...s.undoStack, entry].slice(-MAX_HISTORY);
      return { undoStack, redoStack: [] };
    }),

  undo: () => {
    const { undoStack, document } = get();
    if (undoStack.length === 0) return;

    const current: HistoryEntry = {
      objects: cloneObjects(document.objects),
      timestamp: Date.now(),
    };

    const prev = undoStack[undoStack.length - 1];
    set((s) => ({
      document: { ...s.document, objects: cloneObjects(prev.objects) },
      undoStack: undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
      selectedIds: [],
    }));
  },

  redo: () => {
    const { redoStack, document } = get();
    if (redoStack.length === 0) return;

    const current: HistoryEntry = {
      objects: cloneObjects(document.objects),
      timestamp: Date.now(),
    };

    const next = redoStack[redoStack.length - 1];
    set((s) => ({
      document: { ...s.document, objects: cloneObjects(next.objects) },
      redoStack: redoStack.slice(0, -1),
      undoStack: [...s.undoStack, current],
      selectedIds: [],
    }));
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  // ─── Persistence ────────────────────────────────────────────
  loadSavedArtwork: async () => {
    try {
      const saved = await loadArtwork();
      if (saved && saved.document) {
        set({
          document: saved.document,
          assets: saved.assets && saved.assets.length > 0 ? saved.assets : get().assets,
          selectedIds: [],
          undoStack: [],
          redoStack: [],
          isHydrated: true,
        });

        // Ensure nextId does not collide with loaded objects
        const highestId = saved.document.objects.reduce((max, o) => {
          const match = o.id.match(/^sticker_(\d+)$/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        if (highestId >= nextId) {
          nextId = highestId + 1;
        }

        return true;
      }
    } catch (e) {
      console.warn("Failed to load saved artwork:", e);
    }
    set({ isHydrated: true });
    return false;
  },

  resetProject: async () => {
    await clearArtwork();
    set({
      document: {
        projectName: "Untitled artwork",
        canvasWidth: 1920,
        canvasHeight: 1080,
        backgroundColor: "#FAF9F5",
        backgroundConfig: {
          type: "solid",
          color: "#FAF9F5",
          gradient: {
            from: "#FF6B6B",
            to: "#FFE66D",
            angle: 45,
          },
          pattern: "none",
        },
        objects: [],
      },
      selectedIds: [],
      undoStack: [],
      redoStack: [],
    });
  },
}));

// Automatically persist document and assets with debounced saves
if (typeof window !== "undefined") {
  useEditorStore.subscribe((state, prevState) => {
    // Prevent unhydrated store with empty assets from overwriting stored work
    if (!state.isHydrated && state.assets.length === 0 && (initialCached?.objects?.length ?? 0) > 0) {
      return;
    }
    if (
      state.document !== prevState.document ||
      state.assets !== prevState.assets
    ) {
      saveArtworkDebounced(state.document, state.assets);
    }
  });
}
