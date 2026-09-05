"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore, generateId, generateAssetId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { EditorEngine } from "@/engine/EditorEngine";
import { Asset, StickerObject } from "@/types/editor";
import { ZoomControls } from "./ZoomControls";
import { getDefaultAssets } from "@/lib/emoji-stickers";

interface CanvasViewportProps {
  onEngineReady?: (engine: EditorEngine) => void;
  onDropImage?: (dataUrl: string, name: string, worldX?: number, worldY?: number) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ onEngineReady, onDropImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);

  const {
    document,
    assets,
    selectedIds,
    addObject,
    updateObject,
    select,
    deselect,
    pushHistory,
    setViewport,
    addAsset,
  } = useEditorStore();

  const { showContextMenu, openStickerMaker } = useUIStore();
  const [rotationAngle, setRotationAngle] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Initialize preset assets on first mount
  useEffect(() => {
    const presets = getDefaultAssets();
    presets.forEach((p) => {
      if (!assets.some((a) => a.id === p.id)) {
        addAsset(p);
      }
    });
  }, [assets, addAsset]);

  // Initialize Pixi engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new EditorEngine({
      onSelect: (id, shiftKey) => {
        select(id);
      },
      onDeselect: () => {
        deselect();
      },
      onUpdateObject: (id, patch) => {
        updateObject(id, patch);
      },
      onCommitHistory: () => {
        pushHistory();
      },
      onAngleChange: (angle) => {
        setRotationAngle(angle);
      },
      onViewportChange: (v) => {
        setViewport(v);
      },
      onContextMenu: (x, y, targetId) => {
        showContextMenu(x, y, targetId);
      },
    });

    let isCancelled = false;
    engine.init(containerRef.current).then(() => {
      if (isCancelled) {
        engine.destroy();
        return;
      }
      engineRef.current = engine;
      engine.sync(document.objects, assets, selectedIds);
      if (document.backgroundConfig) {
        engine.updateBackground(document.backgroundConfig);
      }
      if (onEngineReady) onEngineReady(engine);
    });

    return () => {
      isCancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Synchronize scene graph with Zustand store
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.sync(document.objects, assets, selectedIds);
    }
  }, [document.objects, assets, selectedIds]);

  // Synchronize background with Zustand store
  useEffect(() => {
    if (engineRef.current && document.backgroundConfig) {
      engineRef.current.updateBackground(document.backgroundConfig);
    }
  }, [document.backgroundConfig]);

  // Handle HTML5 drop on the canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!engineRef.current) return;

    // 1. Check if it's an internal asset from the Assets drawer
    const assetJson = e.dataTransfer.getData("application/stickercanvas-asset");
    if (assetJson) {
      try {
        const asset: Asset = JSON.parse(assetJson);
        const world = engineRef.current.screenToCanvas(e.clientX, e.clientY);

        const newObj: StickerObject = {
          id: generateId(),
          assetId: asset.id,
          name: asset.name,
          x: Math.round(world.x),
          y: Math.round(world.y),
          width: 140,
          height: 140,
          rotation: 0,
          opacity: 1,
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
        return;
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Check if external files were dropped from device / desktop
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const world = engineRef.current ? engineRef.current.screenToCanvas(e.clientX, e.clientY) : undefined;

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (!dataUrl) return;

          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          if (onDropImage) {
            onDropImage(
              dataUrl,
              cleanName,
              world ? Math.round(world.x) : undefined,
              world ? Math.round(world.y) : undefined
            );
          } else {
            openStickerMaker(dataUrl, cleanName);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Zoom control callbacks
  const handleZoomIn = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.viewportManager.setZoom(
        engineRef.current.viewportManager.zoom * 1.2
      );
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.viewportManager.setZoom(
        engineRef.current.viewportManager.zoom / 1.2
      );
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.viewportManager.resetTo100(
        engineRef.current.pixiApp.docWidth,
        engineRef.current.pixiApp.docHeight
      );
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.viewportManager.fitToContent(
        engineRef.current.pixiApp.docWidth,
        engineRef.current.pixiApp.docHeight
      );
    }
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 h-[calc(100vh-48px)] overflow-hidden paper-bg select-none touch-none"
    >
      {/* Hidden file input for gallery/photo selection (supports multiple images) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0 && onDropImage) {
            Array.from(files).forEach((file) => {
              if (!file.type.startsWith("image/")) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                if (dataUrl) onDropImage(dataUrl, file.name.replace(/\.[^/.]+$/, ""));
              };
              reader.readAsDataURL(file);
            });
          }
          e.target.value = "";
        }}
      />

      {/* Drag-Over Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#4A6CFF]/8 border-2 border-dashed border-[#4A6CFF] rounded-lg pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border border-[#4A6CFF]/30 text-center">
            <div className="text-2xl mb-1">📸</div>
            <p className="text-sm font-semibold text-[#171717]">Drop your image here</p>
            <p className="text-xs text-[#6F6F6A]">It'll become a sticker instantly</p>
          </div>
        </div>
      )}

      {/* Empty State — Paste-First UX */}
      {document.objects.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="text-center px-6 py-6 sm:px-8 sm:py-8 bg-white/80 backdrop-blur-sm border border-[#D9D8D2] rounded-2xl shadow-sm max-w-sm mx-4">
            <div className="text-3xl mb-3">✨</div>
            <h2 className="text-lg font-bold text-[#171717] tracking-tight">
              Make a sticker
            </h2>
            <p className="text-sm text-[#6F6F6A] mt-1.5 leading-relaxed">
              Paste, drop, or upload any image.<br />
              Background is removed automatically.
            </p>

            {/* Primary: Keyboard shortcut hint (desktop) / Choose Photo (mobile) */}
            {isMobile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="pointer-events-auto mt-4 w-full px-5 py-3 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
              >
                Choose Photo
              </button>
            ) : (
              <div className="mt-4 pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FAF9F5] border border-[#D9D8D2] rounded-xl text-sm font-medium text-[#171717]">
                  <span>Press</span>
                  <kbd className="px-2 py-0.5 bg-white border border-[#D9D8D2] rounded-md text-xs font-mono font-semibold shadow-2xs">
                    {isMac ? "⌘" : "Ctrl"}
                  </kbd>
                  <span>+</span>
                  <kbd className="px-2 py-0.5 bg-white border border-[#D9D8D2] rounded-md text-xs font-mono font-semibold shadow-2xs">
                    V
                  </kbd>
                  <span>to paste</span>
                </div>
              </div>
            )}

            {/* Secondary actions */}
            <div className="mt-3 flex items-center justify-center gap-3 pointer-events-auto">
              {!isMobile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold text-[#171717] bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] rounded-lg transition-all active:scale-95"
                >
                  Upload Image
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => {
                    const camInput = window.document.createElement("input");
                    camInput.type = "file";
                    camInput.accept = "image/*";
                    camInput.capture = "environment";
                    camInput.onchange = (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0];
                      if (file && onDropImage) {
                        const reader = new FileReader();
                        reader.onload = (rev) => {
                          const dataUrl = rev.target?.result as string;
                          if (dataUrl) onDropImage(dataUrl, "Camera Photo");
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    camInput.click();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#171717] bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] rounded-lg transition-all active:scale-95"
                >
                  📷 Take Photo
                </button>
              )}
            </div>

            {!isMobile && (
              <p className="text-[11px] text-[#6F6F6A] mt-3">
                or drag & drop an image anywhere
              </p>
            )}
          </div>
        </div>
      )}

      {/* Temporary Rotation Angle Indicator */}
      {rotationAngle !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#171717] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md z-20 pointer-events-none">
          {rotationAngle}°
        </div>
      )}

      {/* Floating Zoom Controls */}
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomFit={handleZoomFit}
      />
    </div>
  );
};
