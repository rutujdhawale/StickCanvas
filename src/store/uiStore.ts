import { create } from "zustand";
import type { ContextMenuState, ExportOptions } from "@/types/editor";

interface UIState {
  // Panel visibility
  assetsPanelOpen: boolean;
  inspectorPanelOpen: boolean;
  backgroundDrawerOpen: boolean;

  // Modals
  exportModalOpen: boolean;
  stickerMakerModalOpen: boolean;
  stickerMakerImage: string | null; // data URL of image to process
  stickerMakerInitialName: string;
  previewModalAsset: any | null; // Asset to preview

  // Export
  exportOptions: ExportOptions;

  // Context menu
  contextMenu: ContextMenuState;

  // Toast
  toastMessage: string | null;
  toastVisible: boolean;

  // Active tool
  isPanning: boolean;
  isMultiSelectMode: boolean;

  // ─── Actions ────────────────────────────────────────────────
  toggleMultiSelectMode: () => void;
  setMultiSelectMode: (v: boolean) => void;
  toggleAssetsPanel: () => void;
  toggleInspectorPanel: () => void;
  openBackgroundDrawer: () => void;
  closeBackgroundDrawer: () => void;
  toggleBackgroundDrawer: () => void;

  openExportModal: () => void;
  closeExportModal: () => void;
  setExportOptions: (opts: Partial<ExportOptions>) => void;

  openStickerMaker: (imageSrc: string, defaultName?: string) => void;
  closeStickerMaker: () => void;

  openAssetPreview: (asset: any) => void;
  closeAssetPreview: () => void;

  showContextMenu: (x: number, y: number, targetId: string | null) => void;
  hideContextMenu: () => void;

  showToast: (message: string) => void;
  hideToast: () => void;

  setIsPanning: (v: boolean) => void;
}

const isClient = typeof window !== "undefined";
const isMobile = isClient && window.innerWidth < 768;

export const useUIStore = create<UIState>((set) => ({
  assetsPanelOpen: !isMobile,
  inspectorPanelOpen: !isMobile,
  backgroundDrawerOpen: false,

  exportModalOpen: false,
  stickerMakerModalOpen: false,
  stickerMakerImage: null,
  stickerMakerInitialName: "Custom Sticker",
  previewModalAsset: null,

  exportOptions: {
    format: "png",
    scale: 2,
    transparent: true,
  },

  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
  },

  toastMessage: null,
  toastVisible: false,

  isPanning: false,
  isMultiSelectMode: false,

  // ─── Actions ──────────────────────────────────────────────────

  toggleMultiSelectMode: () =>
    set((s) => ({ isMultiSelectMode: !s.isMultiSelectMode })),
  setMultiSelectMode: (v: boolean) => set({ isMultiSelectMode: v }),

  toggleAssetsPanel: () =>
    set((s) => ({ assetsPanelOpen: !s.assetsPanelOpen })),

  toggleInspectorPanel: () =>
    set((s) => ({ inspectorPanelOpen: !s.inspectorPanelOpen })),

  openBackgroundDrawer: () => set({ backgroundDrawerOpen: true }),
  closeBackgroundDrawer: () => set({ backgroundDrawerOpen: false }),
  toggleBackgroundDrawer: () =>
    set((s) => ({ backgroundDrawerOpen: !s.backgroundDrawerOpen })),

  openExportModal: () => set({ exportModalOpen: true }),
  closeExportModal: () => set({ exportModalOpen: false }),
  setExportOptions: (opts) =>
    set((s) => ({ exportOptions: { ...s.exportOptions, ...opts } })),

  openStickerMaker: (imageSrc, defaultName = "Custom Sticker") =>
    set({
      stickerMakerModalOpen: true,
      stickerMakerImage: imageSrc,
      stickerMakerInitialName: defaultName,
    }),
  closeStickerMaker: () =>
    set({ stickerMakerModalOpen: false, stickerMakerImage: null }),

  openAssetPreview: (asset) => set({ previewModalAsset: asset }),
  closeAssetPreview: () => set({ previewModalAsset: null }),

  showContextMenu: (x, y, targetId) =>
    set({ contextMenu: { visible: true, x, y, targetId } }),
  hideContextMenu: () =>
    set((s) => ({ contextMenu: { ...s.contextMenu, visible: false } })),

  showToast: (message) => {
    set({ toastMessage: message, toastVisible: true });
    setTimeout(() => set({ toastVisible: false }), 2500);
  },
  hideToast: () => set({ toastVisible: false }),

  setIsPanning: (v) => set({ isPanning: v }),
}));
