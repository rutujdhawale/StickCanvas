"use client";

import React, { useState } from "react";
import {
  Plus,
  Sparkles,
  Sliders,
  Download,
  Shield,
  Sun,
  Wand2,
  MoreHorizontal,
  X,
  Scissors,
  RotateCcw,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { removeBackground } from "@/lib/bg-remove";

interface MobileBottomBarProps {
  onOpenAddSheet: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onOpenAddSheet,
}) => {
  const {
    document,
    selectedIds,
    assets,
    updateObject,
    updateAsset,
    deselect,
    pushHistory,
  } = useEditorStore();
  const {
    toggleAssetsPanel,
    toggleInspectorPanel,
    assetsPanelOpen,
    inspectorPanelOpen,
    openExportModal,
    openStickerMaker,
    showToast,
    setProcessing,
  } = useUIStore();

  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const selectedObj = document.objects.find((o) => selectedIds.includes(o.id));
  const hasSelection = Boolean(selectedObj);
  const selectedAsset = selectedObj ? assets.find((a) => a.id === selectedObj.assetId) : undefined;

  // Quick toggle border width for selected sticker
  const handleToggleBorder = () => {
    if (!selectedObj) return;
    const current = selectedObj.borderWidth || 0;
    // Cycle: 0 -> 6 -> 12 -> 0
    const nextBorder = current === 0 ? 6 : current === 6 ? 12 : 0;
    updateObject(selectedObj.id, {
      borderWidth: nextBorder,
      borderColor: "#ffffff",
      hasShadow: nextBorder > 0,
    });
    pushHistory();
  };

  // Quick toggle shadow for selected sticker
  const handleToggleShadow = () => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, {
      hasShadow: !selectedObj.hasShadow,
    });
    pushHistory();
  };

  // Remove or restore background on selected image asset
  const handleBgAction = async () => {
    if (!selectedObj || !selectedAsset) return;

    if (selectedAsset.isCutout) {
      // Restore original
      if (selectedAsset.originalSrc) {
        updateAsset(selectedAsset.id, {
          src: selectedAsset.originalSrc,
          thumbnailSrc: selectedAsset.originalSrc,
          isCutout: false,
        });
        pushHistory();
        showToast("Restored original background ✓");
      }
    } else {
      // Remove background
      setIsRemovingBg(true);
      setProcessing(true, "Removing background…");
      try {
        const res = await removeBackground(selectedAsset.src, {
          autoTrim: false,
          onProgress: (stage) => setProcessing(true, stage),
        });
        updateAsset(selectedAsset.id, {
          originalSrc: selectedAsset.originalSrc || selectedAsset.src,
          src: res.transparentUrl,
          thumbnailSrc: res.transparentUrl,
          isCutout: true,
        });
        pushHistory();
        showToast("Background removed ✨");
      } catch (err) {
        console.error("Mobile background removal failed:", err);
        showToast("Failed to remove background");
      } finally {
        setIsRemovingBg(false);
        setProcessing(false);
      }
    }
  };

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-[#D9D8D2] rounded-2xl shadow-xl px-2 py-1.5 select-none transition-all">
      {hasSelection && selectedObj ? (
        /* ─── State B: Contextual Selected Sticker Toolbar ─── */
        <div className="flex items-center justify-between gap-1 animate-in fade-in duration-150">
          {/* Border Cycle */}
          <button
            onClick={handleToggleBorder}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-all active:scale-95 ${
              (selectedObj.borderWidth || 0) > 0
                ? "bg-[#FF5A36]/10 text-[#FF5A36] font-semibold"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
            title="Toggle die-cut border"
          >
            <Shield size={18} strokeWidth={2} />
            <span className="text-[10px] mt-0.5">
              {(selectedObj.borderWidth || 0) > 0 ? `${selectedObj.borderWidth}px` : "Border"}
            </span>
          </button>

          {/* Shadow Toggle */}
          <button
            onClick={handleToggleShadow}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-all active:scale-95 ${
              selectedObj.hasShadow
                ? "bg-[#4A6CFF]/10 text-[#4A6CFF] font-semibold"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
            title="Toggle shadow"
          >
            <Sun size={18} strokeWidth={2} />
            <span className="text-[10px] mt-0.5">Shadow</span>
          </button>

          {/* Background Removal / Restore */}
          {selectedAsset && (selectedAsset.type === "upload" || selectedAsset.type === "paste") ? (
            <button
              onClick={handleBgAction}
              disabled={isRemovingBg}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-all active:scale-95 ${
                selectedAsset.isCutout
                  ? "bg-[#E8F5E9] text-[#2E7D32] font-semibold"
                  : "text-[#FF5A36] hover:bg-[#FF5A36]/10"
              } ${isRemovingBg ? "opacity-50" : ""}`}
              title={selectedAsset.isCutout ? "Restore original background" : "Remove background"}
            >
              {selectedAsset.isCutout ? (
                <RotateCcw size={18} strokeWidth={2} />
              ) : (
                <Scissors size={18} strokeWidth={2} />
              )}
              <span className="text-[10px] font-semibold mt-0.5">
                {isRemovingBg ? "Working…" : selectedAsset.isCutout ? "Restore" : "Cut BG"}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (selectedAsset) openStickerMaker(selectedAsset.src, selectedObj.name);
              }}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl transition-all active:scale-95"
              title="Fine-tune cutout / eraser"
            >
              <Wand2 size={18} strokeWidth={2} className="text-[#FF5A36]" />
              <span className="text-[10px] font-semibold mt-0.5">Edit</span>
            </button>
          )}

          {/* More Controls (Bottom Sheet) */}
          <button
            onClick={toggleInspectorPanel}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-all active:scale-95 ${
              inspectorPanelOpen
                ? "bg-[#ECEBE6] text-[#171717] font-semibold"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
            title="More adjustments"
          >
            <MoreHorizontal size={18} strokeWidth={2} />
            <span className="text-[10px] mt-0.5">More…</span>
          </button>

          {/* Deselect / Close button */}
          <button
            onClick={() => deselect()}
            className="w-10 h-10 flex items-center justify-center text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
            title="Done editing sticker"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        /* ─── State A: Standard 4-Key Navigation (Assets, + Add, Edit, Sheet) ─── */
        <div className="flex items-center justify-between gap-1">
          {/* 1. Assets Drawer */}
          <button
            onClick={toggleAssetsPanel}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl active:scale-95 transition-all ${
              assetsPanelOpen
                ? "bg-[#ECEBE6] text-[#171717] font-semibold"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
            title="Sticker library & assets"
          >
            <Sparkles size={18} strokeWidth={2} />
            <span className="text-[10px] mt-0.5">Assets</span>
          </button>

          {/* 2. Central + Add Action */}
          <button
            onClick={onOpenAddSheet}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-xl shadow-xs active:scale-95 transition-all font-semibold"
            title="Add photo, image link, or sticker"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-bold mt-0.5">+ Add</span>
          </button>

          {/* 3. Edit / Adjust Properties */}
          <button
            onClick={toggleInspectorPanel}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl active:scale-95 transition-all ${
              inspectorPanelOpen
                ? "bg-[#ECEBE6] text-[#171717] font-semibold"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
            title="Adjust canvas & properties"
          >
            <Sliders size={18} strokeWidth={2} />
            <span className="text-[10px] mt-0.5">Edit</span>
          </button>

          {/* 4. Sheet / Export Modal */}
          <button
            onClick={openExportModal}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
            title="Export sheet or print layout"
          >
            <Download size={18} strokeWidth={2.2} className="text-[#171717]" />
            <span className="text-[10px] font-semibold mt-0.5">Sheet</span>
          </button>
        </div>
      )}
    </div>
  );
};
