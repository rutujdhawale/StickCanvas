"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Wand2, Sliders, Sparkles, Layers, Image as ImageIcon, Check, Paintbrush } from "lucide-react";
import { useEditorStore, generateAssetId, generateId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { Asset, StickerObject } from "@/types/editor";
import { removeBackgroundFromImage } from "@/lib/bg-remove";

interface StickerMakerModalProps {
  onStickerCreated: (asset: Asset, initialOpacity?: number) => void;
}

export const StickerMakerModal: React.FC<StickerMakerModalProps> = ({ onStickerCreated }) => {
  const { addAsset, setBackgroundConfig } = useEditorStore();
  const {
    stickerMakerModalOpen,
    closeStickerMaker,
    stickerMakerImage,
    stickerMakerInitialName,
    showToast,
  } = useUIStore();

  const [mode, setMode] = useState<"cutout" | "original">("cutout");
  const [tolerance, setTolerance] = useState(30);
  const [opacity, setOpacity] = useState(100);
  const [addBorder, setAddBorder] = useState(true);
  const [borderWidth, setBorderWidth] = useState(6);
  const [stickerName, setStickerName] = useState("My Sticker");
  const [previewBg, setPreviewBg] = useState<"checkerboard" | "canvas">("checkerboard");

  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");

  const imageRef = useRef<HTMLImageElement | null>(null);

  // Sync initial name when modal opens
  useEffect(() => {
    if (stickerMakerModalOpen && stickerMakerInitialName) {
      setStickerName(stickerMakerInitialName);
    }
  }, [stickerMakerModalOpen, stickerMakerInitialName]);

  // Re-process image whenever options change
  useEffect(() => {
    if (!stickerMakerModalOpen || !stickerMakerImage) return;

    let isMounted = true;
    setIsProcessing(true);
    setProcessingStage("Analyzing…");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      imageRef.current = img;
      try {
        const resultDataUrl = await removeBackgroundFromImage(img, {
          tolerance,
          feather: 1,
          removeBg: mode === "cutout",
          opacity: opacity / 100,
          addStickerBorder: mode === "cutout" && addBorder,
          borderWidth: borderWidth,
          onProgress: (stage) => {
            if (isMounted) setProcessingStage(stage);
          },
        });

        if (isMounted) {
          setProcessedUrl(resultDataUrl);
          setIsProcessing(false);
          setProcessingStage("");
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setIsProcessing(false);
          setProcessingStage("");
        }
      }
    };
    img.src = stickerMakerImage;

    return () => {
      isMounted = false;
    };
  }, [stickerMakerModalOpen, stickerMakerImage, mode, tolerance, opacity, addBorder, borderWidth]);

  if (!stickerMakerModalOpen || !stickerMakerImage) return null;

  const handleApply = (addToCanvas = true) => {
    const finalUrl = processedUrl || stickerMakerImage;
    const img = imageRef.current;

    const asset: Asset = {
      id: generateAssetId(),
      name: stickerName.trim() || "Custom Sticker",
      src: finalUrl,
      thumbnailSrc: finalUrl,
      originalWidth: img?.naturalWidth || 400,
      originalHeight: img?.naturalHeight || 400,
      type: "upload",
    };

    addAsset(asset);

    if (addToCanvas) {
      onStickerCreated(asset, opacity / 100);
      showToast("Added sticker to canvas ✓");
    } else {
      showToast("Saved to My Stickers ✓");
    }

    closeStickerMaker();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-[#D9D8D2] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Mobile pull handle */}
        <div className="sm:hidden w-12 h-1.5 bg-[#D9D8D2] rounded-full mx-auto mt-2.5 mb-0.5" />

        {/* Header */}
        <div className="p-4 border-b border-[#D9D8D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF5A36]/10 text-[#FF5A36] flex items-center justify-center">
              <Wand2 size={16} />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight text-[#171717]">
                Refine Sticker Cutout
              </h2>
              <p className="text-[11px] text-[#6F6F6A]">
                Preview, adjust transparency, and refine edges
              </p>
            </div>
          </div>
          <button
            onClick={closeStickerMaker}
            className="p-1.5 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#ECEBE6] p-1 rounded-xl">
            <button
              onClick={() => setMode("cutout")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "cutout"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#6F6F6A] hover:text-[#171717]"
              }`}
            >
              <Wand2 size={13} />
              <span>Transparent Cutout</span>
            </button>
            <button
              onClick={() => setMode("original")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "original"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#6F6F6A] hover:text-[#171717]"
              }`}
            >
              <ImageIcon size={13} />
              <span>Original Photo</span>
            </button>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="relative aspect-video w-full rounded-xl border border-[#D9D8D2] overflow-hidden flex items-center justify-center bg-[#FAF9F5] select-none">
            {/* Background pattern */}
            <div
              className={`absolute inset-0 ${
                previewBg === "checkerboard" ? "checkerboard" : "paper-bg"
              }`}
            />

            {/* Preview Background Toggle */}
            <div className="absolute top-2.5 left-2.5 z-10 flex gap-1 bg-white/90 backdrop-blur-xs p-0.5 rounded-lg border border-[#D9D8D2] text-[10px]">
              <button
                onClick={() => setPreviewBg("checkerboard")}
                className={`px-2 py-0.5 rounded ${
                  previewBg === "checkerboard" ? "bg-[#171717] text-white font-medium" : "text-[#6F6F6A]"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setPreviewBg("canvas")}
                className={`px-2 py-0.5 rounded ${
                  previewBg === "canvas" ? "bg-[#171717] text-white font-medium" : "text-[#6F6F6A]"
                }`}
              >
                Desk
              </button>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="absolute top-2.5 right-2.5 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-medium border border-[#D9D8D2] text-[#171717] flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-ping" />
                <span>{processingStage || "Processing…"}</span>
              </div>
            )}

            {/* The Image Preview */}
            {processedUrl ? (
              <img
                src={processedUrl}
                alt="Sticker preview"
                className="relative max-h-full max-w-full object-contain p-4 filter drop-shadow-md transition-all duration-150"
              />
            ) : (
              <span className="relative text-xs text-[#6F6F6A]">
                Rendering preview…
              </span>
            )}
          </div>

          {/* Name input */}
          <div>
            <label className="text-xs font-semibold text-[#171717] block mb-1">
              Sticker Name
            </label>
            <input
              type="text"
              value={stickerName}
              onChange={(e) => setStickerName(e.target.value)}
              placeholder="e.g. Vintage Camera, Summer Cat…"
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9D8D2] rounded-lg focus:outline-none focus:border-[#4A6CFF] text-[#171717]"
            />
          </div>

          {/* Cutout Tolerance (only in cutout mode) */}
          {mode === "cutout" && (
            <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#D9D8D2] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                  <Sliders size={13} />
                  <span>Cutout Sensitivity / Tolerance</span>
                </span>
                <span className="text-xs font-medium text-[#171717]">{tolerance}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full accent-[#171717] cursor-pointer"
              />
              {/* Quick thumb-friendly presets */}
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: "Soft Edge", val: 22 },
                  { label: "Optimal Auto ✨", val: 32 },
                  { label: "Deep Cut", val: 48 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    onClick={() => setTolerance(preset.val)}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium transition-all ${
                      tolerance === preset.val
                        ? "bg-[#171717] text-white border-[#171717] shadow-2xs font-semibold"
                        : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717] hover:bg-[#FAF9F5]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6F6F6A]">
                Higher tolerance removes more background; lower tolerance protects similar foreground colors.
              </p>
            </div>
          )}

          {/* Transparency / Opacity Slider */}
          <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#D9D8D2] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                <Layers size={13} />
                <span>Sticker Transparency / Opacity</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[100, 75, 50, 25].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setOpacity(preset)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      opacity === preset
                        ? "bg-[#171717] text-white border-[#171717]"
                        : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-[#171717] cursor-pointer"
            />
          </div>

          {/* Die-Cut White Sticker Border (in cutout mode) */}
          {mode === "cutout" && (
            <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-xl border border-[#D9D8D2]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addBorder}
                  onChange={(e) => setAddBorder(e.target.checked)}
                  className="rounded border-[#D9D8D2] accent-[#171717] w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-[#171717] block">
                    Die-Cut Sticker Border
                  </span>
                  <span className="text-[11px] text-[#6F6F6A]">
                    Adds a clean white contour outline and subtle shadow
                  </span>
                </div>
              </label>

              {addBorder && (
                <div className="flex items-center gap-1.5 text-xs text-[#6F6F6A]">
                  <span>Width:</span>
                  <input
                    type="number"
                    min="2"
                    max="16"
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                    className="w-12 px-1.5 py-0.5 text-xs bg-white border border-[#D9D8D2] rounded text-center text-[#171717]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D9D8D2] bg-[#FAF9F5] flex items-center justify-between gap-2">
          <button
            onClick={closeStickerMaker}
            className="px-3 py-1.5 text-xs font-medium text-[#6F6F6A] hover:text-[#171717] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (stickerMakerImage) {
                  setBackgroundConfig({
                    type: "image",
                    image: {
                      src: stickerMakerImage,
                      opacity: 1,
                      blur: 0,
                    },
                  });
                  closeStickerMaker();
                  showToast("Set as canvas background ✓");
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-[#171717] border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] rounded-lg transition-colors flex items-center gap-1.5"
              title="Set this photo as the full canvas background"
            >
              <Paintbrush size={13} />
              <span>Set as Background</span>
            </button>
            <button
              onClick={() => handleApply(false)}
              className="hidden sm:inline-block px-3.5 py-1.5 text-xs font-medium text-[#171717] border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] rounded-lg transition-colors"
            >
              Save to My Stickers
            </button>
            <button
              onClick={() => handleApply(true)}
              className="px-4 py-1.5 text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Add to Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
