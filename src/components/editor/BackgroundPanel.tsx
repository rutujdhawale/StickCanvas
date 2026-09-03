"use client";

import React, { useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import {
  CanvasBackgroundConfig,
  BackgroundType,
  BackgroundGradient,
} from "@/types/editor";
import {
  Paintbrush,
  Sparkles,
  Image as ImageIcon,
  Upload,
  ClipboardPaste,
  Trash2,
  X,
  Check,
  RotateCw,
  EyeOff,
} from "lucide-react";

// Curated studio solid colors
const SOLID_PRESETS = [
  { name: "Studio Paper", hex: "#FAF9F5", textDark: true },
  { name: "Warm Cream", hex: "#FAF7EE", textDark: true },
  { name: "Dark Ink", hex: "#171717", textDark: false },
  { name: "Moody Slate", hex: "#262626", textDark: false },
  { name: "Matcha Mint", hex: "#E9F4EC", textDark: true },
  { name: "Lavender", hex: "#F0EDF9", textDark: true },
  { name: "Rosy Blush", hex: "#FDEAE2", textDark: true },
  { name: "Sunshine", hex: "#FEF3D6", textDark: true },
  { name: "Sky Blue", hex: "#E6F0FA", textDark: true },
  { name: "Terracotta", hex: "#FADED6", textDark: true },
  { name: "Desk Grey", hex: "#ECEBE6", textDark: true },
  { name: "Pure White", hex: "#FFFFFF", textDark: true },
];

// Curated tactile gradient presets
const GRADIENT_PRESETS: { name: string; from: string; to: string; angle: number }[] = [
  { name: "Warm Sunrise", from: "#FF6B6B", to: "#FFE66D", angle: 45 },
  { name: "Soft Morning", from: "#FBC2EB", to: "#A6C1EE", angle: 135 },
  { name: "Matcha Dew", from: "#BBF7D0", to: "#E0F2FE", angle: 45 },
  { name: "Lavender Mist", from: "#E0C3FC", to: "#8EC5FC", angle: 90 },
  { name: "Peachy Studio", from: "#FF9A8B", to: "#FF6A88", angle: 45 },
  { name: "Midnight Moody", from: "#1E1E24", to: "#2B303A", angle: 135 },
  { name: "Sunset Sky", from: "#FA709A", to: "#FEE140", angle: 90 },
  { name: "Paper Fade", from: "#FAF9F5", to: "#ECEBE6", angle: 180 },
];

interface BackgroundPanelProps {
  isModalOrDrawer?: boolean;
  onClose?: () => void;
}

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({
  isModalOrDrawer = false,
  onClose,
}) => {
  const { document, setBackgroundConfig } = useEditorStore();
  const { showToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = document.backgroundConfig || {
    type: "solid",
    color: "#FAF9F5",
    gradient: { from: "#FF6B6B", to: "#FFE66D", angle: 45 },
    pattern: "none",
  };

  const [activeTab, setActiveTab] = useState<BackgroundType>(config.type || "solid");

  const setType = (type: BackgroundType) => {
    setActiveTab(type);
    setBackgroundConfig({ type });
  };

  // Upload background image from file
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBackgroundConfig({
        type: "image",
        image: {
          src: dataUrl,
          opacity: config.image?.opacity ?? 1,
          blur: config.image?.blur ?? 0,
        },
      });
      setActiveTab("image");
      showToast("Background image set ✓");
    };
    reader.readAsDataURL(file);
  };

  // Direct paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showToast("Clipboard access not supported. Use Ctrl+V on canvas");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setBackgroundConfig({
              type: "image",
              image: {
                src: dataUrl,
                opacity: config.image?.opacity ?? 1,
                blur: config.image?.blur ?? 0,
              },
            });
            setActiveTab("image");
            showToast("Pasted as background ✓");
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      showToast("No image found in clipboard");
    } catch (err) {
      showToast("Could not access clipboard");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9F5] text-[#171717] select-none">
      {/* Drawer Header (if rendered as slide-up sheet or modal) */}
      {isModalOrDrawer && (
        <div className="flex items-center justify-between p-4 border-b border-[#D9D8D2] bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF5A36]" />
            <h3 className="font-semibold text-sm text-[#171717]">Canvas Background</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Mode Selector Tabs (Mobile & Desktop friendly 44px height) */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#ECEBE6] rounded-xl border border-[#D9D8D2]/60">
          <button
            onClick={() => setType("solid")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "solid"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
          >
            <Paintbrush size={14} />
            <span>Solid</span>
          </button>

          <button
            onClick={() => setType("gradient")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "gradient"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
          >
            <Sparkles size={14} />
            <span>Gradient</span>
          </button>

          <button
            onClick={() => setType("image")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "image"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
          >
            <ImageIcon size={14} />
            <span>Image</span>
          </button>

          <button
            onClick={() => setType("transparent")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "transparent"
                ? "bg-white text-[#171717] shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
          >
            <EyeOff size={14} />
            <span>Clear</span>
          </button>
        </div>

        {/* ─── SOLID COLOR MODE ────────────────────────────────────── */}
        {activeTab === "solid" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-2">
                Studio Palette
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {SOLID_PRESETS.map((preset) => {
                  const isSelected =
                    config.type === "solid" &&
                    config.color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      onClick={() =>
                        setBackgroundConfig({
                          type: "solid",
                          color: preset.hex,
                        })
                      }
                      title={preset.name}
                      style={{ backgroundColor: preset.hex }}
                      className={`h-11 rounded-xl border relative flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xs ${
                        isSelected
                          ? "border-[#171717] ring-2 ring-[#171717]/20 scale-105"
                          : "border-[#D9D8D2]"
                      }`}
                    >
                      {isSelected && (
                        <Check
                          size={14}
                          className={preset.textDark ? "text-[#171717]" : "text-white"}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Input */}
            <div className="p-3 bg-white rounded-xl border border-[#D9D8D2] space-y-2">
              <label className="text-xs font-semibold text-[#171717] block">
                Custom Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.color || "#FAF9F5"}
                  onChange={(e) =>
                    setBackgroundConfig({
                      type: "solid",
                      color: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[#D9D8D2] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={config.color || "#FAF9F5"}
                  onChange={(e) =>
                    setBackgroundConfig({
                      type: "solid",
                      color: e.target.value,
                    })
                  }
                  placeholder="#FAF9F5"
                  className="flex-1 bg-[#FAF9F5] border border-[#D9D8D2] px-3 py-2 text-xs font-mono rounded-lg focus:outline-none focus:border-[#171717]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── GRADIENT MODE ───────────────────────────────────────── */}
        {activeTab === "gradient" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-2">
                Curated Gradients
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {GRADIENT_PRESETS.map((p) => {
                  const isSelected =
                    config.type === "gradient" &&
                    config.gradient?.from === p.from &&
                    config.gradient?.to === p.to;
                  return (
                    <button
                      key={p.name}
                      onClick={() =>
                        setBackgroundConfig({
                          type: "gradient",
                          gradient: { from: p.from, to: p.to, angle: p.angle },
                        })
                      }
                      style={{
                        background: `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})`,
                      }}
                      className={`h-16 rounded-xl border relative flex flex-col justify-end p-2 transition-all hover:scale-102 active:scale-98 shadow-2xs text-left ${
                        isSelected
                          ? "border-[#171717] ring-2 ring-[#171717]/20 scale-102"
                          : "border-[#D9D8D2]"
                      }`}
                    >
                      <span className="text-[10px] font-semibold text-[#171717] bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md inline-block max-w-fit shadow-2xs">
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Gradient Builder */}
            <div className="p-3 bg-white rounded-xl border border-[#D9D8D2] space-y-3">
              <label className="text-xs font-semibold text-[#171717] block">
                Custom Gradient Colors & Angle
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.gradient?.from || "#FF6B6B"}
                    onChange={(e) =>
                      setBackgroundConfig({
                        type: "gradient",
                        gradient: {
                          from: e.target.value,
                          to: config.gradient?.to || "#FFE66D",
                          angle: config.gradient?.angle ?? 45,
                        },
                      })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[#D9D8D2] p-0.5"
                  />
                  <span className="text-xs text-[#6F6F6A]">Start</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.gradient?.to || "#FFE66D"}
                    onChange={(e) =>
                      setBackgroundConfig({
                        type: "gradient",
                        gradient: {
                          from: config.gradient?.from || "#FF6B6B",
                          to: e.target.value,
                          angle: config.gradient?.angle ?? 45,
                        },
                      })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[#D9D8D2] p-0.5"
                  />
                  <span className="text-xs text-[#6F6F6A]">End</span>
                </div>
              </div>

              {/* Angle selector */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#6F6F6A] flex items-center gap-1">
                    <RotateCw size={12} /> Angle
                  </span>
                  <span className="font-mono font-medium">{config.gradient?.angle ?? 45}°</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 45, 90, 135, 180].map((deg) => (
                    <button
                      key={deg}
                      onClick={() =>
                        setBackgroundConfig({
                          type: "gradient",
                          gradient: {
                            from: config.gradient?.from || "#FF6B6B",
                            to: config.gradient?.to || "#FFE66D",
                            angle: deg,
                          },
                        })
                      }
                      className={`flex-1 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                        config.gradient?.angle === deg
                          ? "bg-[#171717] text-white border-[#171717]"
                          : "bg-[#FAF9F5] border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717]"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── IMAGE / PHOTO MODE ──────────────────────────────────── */}
        {activeTab === "image" && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Upload / Paste Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] hover:border-[#171717] rounded-xl text-xs font-semibold text-[#171717] transition-all shadow-2xs active:scale-95"
              >
                <Upload size={16} />
                <span>Upload Photo</span>
              </button>

              <button
                onClick={handlePasteFromClipboard}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] hover:border-[#171717] rounded-xl text-xs font-semibold text-[#171717] transition-all shadow-2xs active:scale-95"
              >
                <ClipboardPaste size={16} />
                <span>Direct Paste</span>
              </button>
            </div>

            {/* Current Image Adjustments (if image is present) */}
            {config.image?.src ? (
              <div className="p-3 bg-white rounded-xl border border-[#D9D8D2] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">
                    Image Adjustments
                  </span>
                  <button
                    onClick={() =>
                      setBackgroundConfig({
                        type: "solid",
                        image: undefined,
                      })
                    }
                    className="text-xs text-[#FF5A36] hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6F6F6A]">Opacity</span>
                    <span className="font-mono font-medium">
                      {Math.round((config.image.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={config.image.opacity ?? 1}
                    onChange={(e) =>
                      setBackgroundConfig({
                        type: "image",
                        image: {
                          src: config.image!.src,
                          blur: config.image?.blur ?? 0,
                          opacity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#FF5A36] h-1.5 bg-[#ECEBE6] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Blur Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6F6F6A]">Blur / Soft Focus</span>
                    <span className="font-mono font-medium">
                      {config.image.blur ?? 0}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={config.image.blur ?? 0}
                    onChange={(e) =>
                      setBackgroundConfig({
                        type: "image",
                        image: {
                          src: config.image!.src,
                          opacity: config.image?.opacity ?? 1,
                          blur: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#FF5A36] h-1.5 bg-[#ECEBE6] rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-[#D9D8D2] rounded-2xl bg-white space-y-2">
                <ImageIcon size={28} className="mx-auto text-[#6F6F6A]" />
                <p className="text-xs text-[#6F6F6A]">
                  Upload an image from your device or click Direct Paste.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TRANSPARENT MODE ────────────────────────────────────── */}
        {activeTab === "transparent" && (
          <div className="p-4 bg-white rounded-xl border border-[#D9D8D2] space-y-2 text-center">
            <div className="w-12 h-12 rounded-xl border border-[#D9D8D2] mx-auto flex items-center justify-center checkerboard-bg">
              <EyeOff size={20} className="text-[#6F6F6A]" />
            </div>
            <h4 className="text-xs font-semibold text-[#171717]">
              Transparent Canvas
            </h4>
            <p className="text-[11px] text-[#6F6F6A] leading-relaxed max-w-xs mx-auto">
              Displays as a subtle checkerboard desk in the editor. Exports as a transparent PNG with no background.
            </p>
          </div>
        )}

        {/* ─── TACTILE PATTERN OVERLAY ─────────────────────────────── */}
        <div className="pt-2 border-t border-[#D9D8D2]">
          <label className="text-xs font-semibold text-[#171717] block mb-2">
            Paper Texture / Pattern
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "none", label: "Clean / Solid" },
              { id: "dots", label: "Subtle Dots" },
              { id: "grid", label: "Paper Grid" },
            ].map((p) => {
              const isSelected = (config.pattern || "none") === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setBackgroundConfig({
                      pattern: p.id as "none" | "dots" | "grid",
                    })
                  }
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-[#171717] text-white border-[#171717] shadow-xs"
                      : "bg-white border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
