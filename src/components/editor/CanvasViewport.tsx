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

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 h-[calc(100vh-48px)] overflow-hidden paper-bg select-none ${
        isDragOver ? "ring-2 ring-inset ring-[#4A6CFF]" : ""
      }`}
    >
      {/* Empty State Prompt */}
      {document.objects.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="text-center px-4 py-3 bg-white/75 backdrop-blur-xs border border-[#D9D8D2] rounded-xl shadow-xs">
            <p className="text-sm font-medium text-[#171717]">
              Drop your first sticker here.
            </p>
            <p className="text-xs text-[#6F6F6A] mt-1">
              or paste an image with <kbd className="px-1 py-0.5 bg-[#ECEBE6] rounded text-[11px]">Ctrl+V</kbd>
            </p>
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
