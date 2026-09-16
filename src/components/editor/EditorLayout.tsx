"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { TopBar } from "./TopBar";
import { AssetsPanel } from "./AssetsPanel";
import { CanvasViewport } from "./CanvasViewport";
import { InspectorPanel } from "./InspectorPanel";
import { ContextMenu } from "./ContextMenu";
import { ExportModal } from "./ExportModal";
import { StickerMakerModal } from "./StickerMakerModal";
import { Toast } from "./Toast";
import { setupKeyboardShortcuts } from "@/lib/keyboard";
import { useEditorStore, generateId, generateAssetId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { Asset, StickerObject } from "@/types/editor";
import { EditorEngine } from "@/engine/EditorEngine";
import { smartAutoCreateSticker, preloadModel } from "@/lib/bg-remove";

import { AssetPreviewModal } from "./AssetPreviewModal";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileAddSheet } from "./MobileAddSheet";
import { PasteLinkModal } from "./PasteLinkModal";
import { BackgroundPanel } from "./BackgroundPanel";
import { AuthModal } from "@/components/auth/AuthModal";
import { FeedbackModal } from "@/components/common/FeedbackModal";

export const EditorLayout: React.FC = () => {
  const engineRef = useRef<EditorEngine | null>(null);
  const {
    document,
    addObject,
    select,
    pushHistory,
    addAsset,
    setBackgroundConfig,
    loadSavedArtwork,
  } = useEditorStore();
  const {
    openStickerMaker,
    backgroundDrawerOpen,
    closeBackgroundDrawer,
    showToast,
    isProcessing: uiProcessing,
    processingStage: uiProcessingStage,
  } = useUIStore();

  // Processing overlay state
  const [localProcessing, setLocalProcessing] = useState(false);
  const [localProcessingStage, setLocalProcessingStage] = useState("");

  const isProcessing = localProcessing || uiProcessing;
  const processingStage = localProcessing ? localProcessingStage : uiProcessingStage;

  const setIsProcessing = setLocalProcessing;
  const setProcessingStage = setLocalProcessingStage;

  // Mobile sheets & modals state
  const [mobileAddSheetOpen, setMobileAddSheetOpen] = useState(false);
  const [pasteLinkModalOpen, setPasteLinkModalOpen] = useState(false);

  // Load persisted artwork on initial mount & preload ML model
  useEffect(() => {
    // Start preloading the AI background removal model in the background
    preloadModel();

    loadSavedArtwork().then((restored) => {
      if (restored) {
        showToast("Restored your artwork ✓");
      }
    });
  }, [loadSavedArtwork, showToast]);

  // Helper to compute ideal sticker size from source dimensions
  const computeStickerSize = useCallback(
    (srcW: number, srcH: number) => {
      // Target: sticker should occupy ~20% of canvas width, capped at reasonable bounds
      const maxSide = Math.min(document.canvasWidth * 0.25, 400);
      const minSide = 80;
      const aspect = srcW / srcH;

      let w: number, h: number;
      if (aspect >= 1) {
        // Wider than tall
        w = Math.max(minSide, Math.min(maxSide, srcW));
        h = w / aspect;
      } else {
        // Taller than wide
        h = Math.max(minSide, Math.min(maxSide, srcH));
        w = h * aspect;
      }
      return { width: Math.round(w), height: Math.round(h) };
    },
    [document.canvasWidth]
  );

  // Helper to add sticker directly to center or specific position
  const handleAddStickerDirectly = useCallback(
    (asset: Asset, initialOpacity = 1, initialX?: number, initialY?: number, defaultBorder = 6) => {
      let posX = initialX ?? document.canvasWidth / 2;
      let posY = initialY ?? document.canvasHeight / 2;

      if (initialX === undefined || initialY === undefined) {
        if (engineRef.current && engineRef.current.containerElement) {
          const rect = engineRef.current.containerElement.getBoundingClientRect();
          const world = engineRef.current.screenToCanvas(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          );
          posX = Math.round(world.x);
          posY = Math.round(world.y);
        }
      }

      // Add a slight random offset so multiple additions don't overlap completely
      const offset = (Math.random() - 0.5) * 40;

      // Compute intelligent size from source image dimensions
      const { width, height } = computeStickerSize(
        asset.originalWidth || 300,
        asset.originalHeight || 300
      );

      const newObj: StickerObject = {
        id: generateId(),
        assetId: asset.id,
        name: asset.name,
        x: posX + offset,
        y: posY + offset,
        width,
        height,
        rotation: 0,
        opacity: initialOpacity,
        zIndex: document.objects.length,
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        locked: false,
        visible: true,
        borderWidth: defaultBorder,
        borderColor: "#ffffff",
        hasShadow: defaultBorder > 0,
      };

      addObject(newObj);
      select(newObj.id);
      pushHistory();
    },
    [document.canvasWidth, document.canvasHeight, document.objects.length, addObject, select, pushHistory, computeStickerSize]
  );

  // Check for pending sticker handoff from /remove-background
  useEffect(() => {
    try {
      const pendingRaw = sessionStorage.getItem("stickercanvas_pending_sticker");
      if (pendingRaw) {
        sessionStorage.removeItem("stickercanvas_pending_sticker");
        const pending = JSON.parse(pendingRaw);
        if (pending && pending.dataUrl) {
          const asset: Asset = {
            id: generateAssetId(),
            name: pending.name || "Removed BG Sticker",
            src: pending.dataUrl,
            thumbnailSrc: pending.dataUrl,
            originalWidth: pending.width || 500,
            originalHeight: pending.height || 500,
            type: "upload",
            isCutout: true,
          };
          addAsset(asset);
          handleAddStickerDirectly(asset, 1, undefined, undefined, 6);
          showToast("Cutout placed on canvas ✨");
        }
      }
    } catch (err) {
      console.error("Failed to restore pending sticker:", err);
    }
  }, [addAsset, handleAddStickerDirectly, showToast]);

  // Queue for processing multiple images sequentially without crashing ML/WASM memory
  const processingQueueRef = useRef<Array<{ dataUrl: string; name: string; initialX?: number; initialY?: number }>>([]);
  const isProcessingQueueRef = useRef(false);
  const totalInBatchRef = useRef(0);
  const completedInBatchRef = useRef(0);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || processingQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    setIsProcessing(true);

    while (processingQueueRef.current.length > 0) {
      const item = processingQueueRef.current.shift()!;
      completedInBatchRef.current++;
      const currentIdx = completedInBatchRef.current;
      const total = totalInBatchRef.current;
      const prefix = total > 1 ? `[${currentIdx}/${total}] ` : "";

      setProcessingStage(`${prefix}Making sticker — analyzing subject…`);

      try {
        const { stickerUrl, naturalWidth, naturalHeight } = await smartAutoCreateSticker(item.dataUrl, {
          onProgress: (stage) => setProcessingStage(`${prefix}${stage}`),
        });

        const asset: Asset = {
          id: generateAssetId(),
          name: item.name,
          src: stickerUrl,
          thumbnailSrc: stickerUrl,
          originalWidth: naturalWidth,
          originalHeight: naturalHeight,
          type: "upload",
          originalSrc: item.dataUrl,
          isCutout: true,
        };

        addAsset(asset);

        // Stagger positions slightly for batch additions so they don't completely overlap
        const staggerOffset = total > 1 ? (currentIdx - 1) * 35 : 0;
        const posX = item.initialX !== undefined ? item.initialX + staggerOffset : undefined;
        const posY = item.initialY !== undefined ? item.initialY + staggerOffset : undefined;

        handleAddStickerDirectly(asset, 1, posX, posY, 6);
        showToast(total > 1 ? `✨ Sticker ${currentIdx} of ${total} added!` : "✨ Sticker added!");
      } catch (err) {
        console.error("Auto sticker creation fallback:", err);
        try {
          const fallbackImg = new Image();
          fallbackImg.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            fallbackImg.onload = () => resolve();
            fallbackImg.onerror = () => resolve();
            fallbackImg.src = item.dataUrl;
          });

          const fallbackAsset: Asset = {
            id: generateAssetId(),
            name: item.name,
            src: item.dataUrl,
            thumbnailSrc: item.dataUrl,
            originalWidth: fallbackImg.naturalWidth || 300,
            originalHeight: fallbackImg.naturalHeight || 300,
            type: "upload",
          };
          addAsset(fallbackAsset);
          handleAddStickerDirectly(fallbackAsset, 1, item.initialX, item.initialY, 0);
          showToast(`Added ${item.name} (background removal skipped)`);
        } catch {
          showToast(`Could not process ${item.name}. Try another image.`);
        }
      }
    }

    isProcessingQueueRef.current = false;
    totalInBatchRef.current = 0;
    completedInBatchRef.current = 0;
    setIsProcessing(false);
    setProcessingStage("");
  }, [addAsset, handleAddStickerDirectly, showToast]);

  // 1-step smart auto sticker creator from any image source (paste, drop, device camera)
  const handleAutoCreateAndAddSticker = useCallback(
    (dataUrl: string, name = "Custom Sticker", initialX?: number, initialY?: number) => {
      totalInBatchRef.current++;
      processingQueueRef.current.push({ dataUrl, name, initialX, initialY });
      processQueue();
    },
    [processQueue]
  );

  // Handle system clipboard paste of images
  const handlePasteImage = useCallback(
    (blob: Blob) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        // If background drawer is open, set as canvas background directly
        if (backgroundDrawerOpen) {
          setBackgroundConfig({
            type: "image",
            image: {
              src: dataUrl,
              opacity: 1,
              blur: 0,
            },
          });
          showToast("Pasted as canvas background ✓");
          return;
        }

        // Directly auto-convert pasted image into a sticker
        handleAutoCreateAndAddSticker(dataUrl, "Pasted Sticker");
      };
      reader.readAsDataURL(blob);
    },
    [backgroundDrawerOpen, setBackgroundConfig, showToast, handleAutoCreateAndAddSticker]
  );

  // Set up keyboard shortcuts & global paste
  useEffect(() => {
    const cleanup = setupKeyboardShortcuts(handlePasteImage);
    return cleanup;
  }, [handlePasteImage]);

  const handleAddFromDevice = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        handleAutoCreateAndAddSticker(dataUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  // Browser Async Clipboard API for mobile and touch devices
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard?.read) {
        showToast("Clipboard not supported. Tap Device to select a photo!");
        return;
      }

      showToast("Reading clipboard…");
      const items = await navigator.clipboard.read();
      let foundImage = false;

      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          foundImage = true;
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
              handleAutoCreateAndAddSticker(dataUrl, "Pasted Sticker");
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }

      if (!foundImage) {
        showToast("No image in clipboard. Copy a photo first!");
      }
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error?.name === "NotAllowedError") {
        showToast("Clipboard permission needed to paste photos.");
      } else {
        showToast("Copy an image first, or tap Device to select a photo!");
      }
    }
  }, [handleAutoCreateAndAddSticker, showToast]);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-screen flex flex-col bg-[#F7F6F2] overflow-hidden select-none">
      <TopBar onPasteClipboard={handlePasteFromClipboard} />
      <div className="flex-1 flex overflow-hidden relative">
        <AssetsPanel
          onAddStickerDirectly={handleAddStickerDirectly}
          onAddPhotoDirectly={handleAutoCreateAndAddSticker}
        />
        <CanvasViewport
          onEngineReady={(engine) => (engineRef.current = engine)}
          onDropImage={handleAutoCreateAndAddSticker}
          onOpenAdd={() => setMobileAddSheetOpen(true)}
        />
        <InspectorPanel />
      </div>

      {/* Non-blocking canvas-edge progress line during background removal */}
      {isProcessing && (
        <div className="fixed top-14 left-0 right-0 z-50 pointer-events-none">
          <div className="h-1 bg-transparent w-full overflow-hidden">
            <div className="h-full bg-[#FF5A36] animate-pulse w-full shadow-[0_0_8px_#FF5A36]" />
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-[#D9D8D2] px-3.5 py-1.5 rounded-full text-xs font-medium text-[#171717] shadow-lg flex items-center gap-2 pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-[#FF5A36] animate-ping" />
            <span>{processingStage || "Processing image…"}</span>
          </div>
        </div>
      )}

      {/* Mobile touch navigation dock */}
      <MobileBottomBar
        onOpenAddSheet={() => setMobileAddSheetOpen(true)}
      />

      {/* Mobile Add Sticker Action Sheet */}
      <MobileAddSheet
        isOpen={mobileAddSheetOpen}
        onClose={() => setMobileAddSheetOpen(false)}
        onSelectFile={handleAddFromDevice}
        onPasteClipboard={handlePasteFromClipboard}
        onOpenPasteLink={() => setPasteLinkModalOpen(true)}
        onOpenEmoji={() => useUIStore.getState().toggleAssetsPanel()}
      />

      {/* Paste Image Link Modal */}
      <PasteLinkModal
        isOpen={pasteLinkModalOpen}
        onClose={() => setPasteLinkModalOpen(false)}
        onImageLoaded={handleAutoCreateAndAddSticker}
        onOpenUploadFallback={() => setMobileAddSheetOpen(true)}
      />

      {/* Dedicated Background Drawer (Mobile bottom sheet / Desktop flyout) */}
      {backgroundDrawerOpen && (
        <>
          <div
            onClick={closeBackgroundDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-in fade-in"
          />
          <div className="fixed bottom-0 md:bottom-auto md:top-14 md:right-4 left-0 right-0 md:left-auto w-full md:w-[320px] h-[72vh] md:h-[calc(100vh-4.5rem)] max-h-[640px] bg-[#FAF9F5] rounded-t-3xl md:rounded-2xl border border-[#D9D8D2] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 md:slide-in-from-right-6 transition-all">
            {/* Mobile pull handle */}
            <div className="md:hidden w-12 h-1.5 bg-[#D9D8D2] rounded-full mx-auto mt-2.5 mb-1" />
            <BackgroundPanel isModalOrDrawer onClose={closeBackgroundDrawer} />
          </div>
        </>
      )}

      <ContextMenu />
      <ExportModal />
      <StickerMakerModal onStickerCreated={handleAddStickerDirectly} />
      <AssetPreviewModal onAddSticker={handleAddStickerDirectly} />
      <FeedbackModal />
      <AuthModal />
      <Toast />
    </div>
  );
};
