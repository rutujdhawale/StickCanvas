"use client";

import React, { useEffect, useRef, useCallback } from "react";
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

import { AssetPreviewModal } from "./AssetPreviewModal";
import { MobileBottomBar } from "./MobileBottomBar";
import { BackgroundPanel } from "./BackgroundPanel";

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
  } = useUIStore();

  // Load persisted artwork on initial mount
  useEffect(() => {
    loadSavedArtwork().then((restored) => {
      if (restored) {
        showToast("Restored your artwork ✓");
      }
    });
  }, [loadSavedArtwork, showToast]);

  // Helper to add sticker directly to center or specific position with custom opacity
  const handleAddStickerDirectly = useCallback(
    (asset: Asset, initialOpacity = 1, initialX?: number, initialY?: number) => {
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

      const newObj: StickerObject = {
        id: generateId(),
        assetId: asset.id,
        name: asset.name,
        x: posX + offset,
        y: posY + offset,
        width: 150,
        height: 150,
        rotation: 0,
        opacity: initialOpacity,
        zIndex: document.objects.length,
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        locked: false,
        visible: true,
      };

      addObject(newObj);
      select(newObj.id);
      pushHistory();
    },
    [document.canvasWidth, document.canvasHeight, document.objects.length, addObject, select, pushHistory]
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

        // If it's already a transparent PNG, add it directly or prompt "Make sticker"
        if (blob.type === "image/png") {
          const img = new Image();
          img.onload = () => {
            const asset: Asset = {
              id: generateAssetId(),
              name: "Pasted Image",
              src: dataUrl,
              thumbnailSrc: dataUrl,
              originalWidth: img.width,
              originalHeight: img.height,
              type: "paste",
            };
            addAsset(asset);
            handleAddStickerDirectly(asset);
          };
          img.src = dataUrl;
        } else {
          // Open "Make it a sticker" background remover
          openStickerMaker(dataUrl);
        }
      };
      reader.readAsDataURL(blob);
    },
    [addAsset, handleAddStickerDirectly, openStickerMaker, backgroundDrawerOpen, setBackgroundConfig, showToast]
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
        openStickerMaker(dataUrl, file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F7F6F2] overflow-hidden select-none">
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative">
        <AssetsPanel onAddStickerDirectly={handleAddStickerDirectly} />
        <CanvasViewport onEngineReady={(engine) => (engineRef.current = engine)} />
        <InspectorPanel />
      </div>

      {/* Mobile touch navigation dock */}
      <MobileBottomBar onAddFromDevice={handleAddFromDevice} />

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
      <Toast />
    </div>
  );
  };
