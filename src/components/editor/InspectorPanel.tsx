"use client";

import React, { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { StickerObject } from "@/types/editor";
import { BackgroundPanel } from "./BackgroundPanel";

export const InspectorPanel: React.FC = () => {
  const {
    document,
    selectedIds,
    assets,
    updateObject,
    removeObject,
    select,
    bringForward,
    sendBackward,
    duplicateSelected,
    pushHistory,
  } = useEditorStore();

  const { inspectorPanelOpen, toggleInspectorPanel } = useUIStore();
  const [lockRatio, setLockRatio] = useState(true);
  const [tab, setTab] = useState<"object" | "canvas">("object");

  if (!inspectorPanelOpen) return null;

  const selectedObj = document.objects.find((o) => selectedIds.includes(o.id));
  const currentTab = selectedObj ? tab : "canvas";
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  // Layers list sorted with highest z-index on top
  const layers = [...document.objects].sort((a, b) => b.zIndex - a.zIndex);

  const handlePropChange = (patch: Partial<StickerObject>) => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, patch);
    pushHistory();
  };

  const handleWidthChange = (val: number) => {
    if (!selectedObj || isNaN(val) || val <= 0) return;
    if (lockRatio && selectedObj.width > 0) {
      const ratio = selectedObj.height / selectedObj.width;
      handlePropChange({ width: val, height: Math.round(val * ratio) });
    } else {
      handlePropChange({ width: val });
    }
  };

  const handleHeightChange = (val: number) => {
    if (!selectedObj || isNaN(val) || val <= 0) return;
    if (lockRatio && selectedObj.height > 0) {
      const ratio = selectedObj.width / selectedObj.height;
      handlePropChange({ height: val, width: Math.round(val * ratio) });
    } else {
      handlePropChange({ height: val });
    }
  };

  return (
    <>
      {/* Mobile touch backdrop */}
      <div
        onClick={toggleInspectorPanel}
        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity animate-in fade-in"
      />

      <aside className="fixed md:relative bottom-0 md:bottom-auto left-0 right-0 md:right-auto h-[65vh] md:h-[calc(100vh-48px)] w-full md:w-[260px] border-t md:border-t-0 md:border-l border-[#D9D8D2] bg-[#F7F6F2] rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none flex flex-col z-40 select-none flex-shrink-0 transition-all animate-in slide-in-from-bottom-6 md:animate-none">
        {/* Mobile Pull Handle Pill */}
        <div className="md:hidden w-12 h-1.5 bg-[#D9D8D2] rounded-full mx-auto mt-2.5 mb-0.5" />
      {/* Header with Sticker / Canvas Segmented Tabs */}
      <div className="p-2.5 border-b border-[#D9D8D2] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#ECEBE6] p-0.5 rounded-lg text-xs font-medium flex-1">
          <button
            onClick={() => setTab("object")}
            disabled={!selectedObj}
            className={`flex-1 py-1 px-2 rounded-md transition-all ${
              currentTab === "object"
                ? "bg-white text-[#171717] font-semibold shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717] disabled:opacity-40 disabled:hover:text-[#6F6F6A]"
            }`}
          >
            Sticker
          </button>
          <button
            onClick={() => setTab("canvas")}
            className={`flex-1 py-1 px-2 rounded-md transition-all ${
              currentTab === "canvas"
                ? "bg-white text-[#171717] font-semibold shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717]"
            }`}
          >
            Canvas
          </button>
        </div>

        <button
          onClick={toggleInspectorPanel}
          className="p-1.5 rounded text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          title="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      {currentTab === "canvas" ? (
        <div className="flex-1 overflow-y-auto">
          <BackgroundPanel />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-[#D9D8D2]">
          {/* Selected Object Properties */}
          {selectedObj ? (
            <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#171717] truncate max-w-[150px]">
                {selectedObj.name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePropChange({ locked: !selectedObj.locked })}
                  className={`p-1 rounded transition-colors ${
                    selectedObj.locked
                      ? "text-[#FF5A36] bg-[#FF5A36]/10"
                      : "text-[#6F6F6A] hover:text-[#171717]"
                  }`}
                  title={selectedObj.locked ? "Unlock" : "Lock"}
                >
                  {selectedObj.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  onClick={duplicateSelected}
                  className="p-1 rounded text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => removeObject(selectedObj.id)}
                  className="p-1 rounded text-[#6F6F6A] hover:text-[#FF5A36] hover:bg-[#ECEBE6] transition-colors"
                  title="Delete (Del)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Position */}
            <div>
              <span className="text-[11px] font-medium text-[#6F6F6A] block mb-1">
                Position
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center border border-[#D9D8D2] bg-white rounded-md px-2 py-1 text-xs">
                  <span className="text-[#6F6F6A] mr-2">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedObj.x)}
                    onChange={(e) => handlePropChange({ x: Number(e.target.value) })}
                    className="w-full focus:outline-none text-[#171717]"
                  />
                </label>
                <label className="flex items-center border border-[#D9D8D2] bg-white rounded-md px-2 py-1 text-xs">
                  <span className="text-[#6F6F6A] mr-2">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedObj.y)}
                    onChange={(e) => handlePropChange({ y: Number(e.target.value) })}
                    className="w-full focus:outline-none text-[#171717]"
                  />
                </label>
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-[#6F6F6A]">Size</span>
                <button
                  onClick={() => setLockRatio(!lockRatio)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    lockRatio
                      ? "bg-[#171717] text-white border-[#171717]"
                      : "bg-transparent text-[#6F6F6A] border-[#D9D8D2]"
                  }`}
                >
                  {lockRatio ? "Locked ratio" : "Free ratio"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center border border-[#D9D8D2] bg-white rounded-md px-2 py-1 text-xs">
                  <span className="text-[#6F6F6A] mr-2">W</span>
                  <input
                    type="number"
                    value={Math.round(selectedObj.width)}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-full focus:outline-none text-[#171717]"
                  />
                </label>
                <label className="flex items-center border border-[#D9D8D2] bg-white rounded-md px-2 py-1 text-xs">
                  <span className="text-[#6F6F6A] mr-2">H</span>
                  <input
                    type="number"
                    value={Math.round(selectedObj.height)}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-full focus:outline-none text-[#171717]"
                  />
                </label>
              </div>
            </div>

            {/* Rotation & Flip */}
            <div>
              <span className="text-[11px] font-medium text-[#6F6F6A] block mb-1">
                Rotation & Flip
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center border border-[#D9D8D2] bg-white rounded-md px-2 py-1 text-xs flex-1">
                  <span className="text-[#6F6F6A] mr-2">°</span>
                  <input
                    type="number"
                    value={Math.round(selectedObj.rotation)}
                    onChange={(e) => handlePropChange({ rotation: Number(e.target.value) % 360 })}
                    className="w-full focus:outline-none text-[#171717]"
                  />
                </label>
                <button
                  onClick={() => handlePropChange({ rotation: (selectedObj.rotation + 90) % 360 })}
                  className="p-1.5 border border-[#D9D8D2] bg-white rounded-md text-[#171717] hover:bg-[#ECEBE6] transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  onClick={() => handlePropChange({ flipX: !selectedObj.flipX })}
                  className={`p-1.5 border rounded-md transition-colors ${
                    selectedObj.flipX
                      ? "bg-[#171717] text-white border-[#171717]"
                      : "bg-white text-[#171717] border-[#D9D8D2] hover:bg-[#ECEBE6]"
                  }`}
                  title="Flip horizontally"
                >
                  <FlipHorizontal size={14} />
                </button>
                <button
                  onClick={() => handlePropChange({ flipY: !selectedObj.flipY })}
                  className={`p-1.5 border rounded-md transition-colors ${
                    selectedObj.flipY
                      ? "bg-[#171717] text-white border-[#171717]"
                      : "bg-white text-[#171717] border-[#D9D8D2] hover:bg-[#ECEBE6]"
                  }`}
                  title="Flip vertically"
                >
                  <FlipVertical size={14} />
                </button>
              </div>
            </div>

            {/* Opacity / Transparency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[#6F6F6A]">
                  Transparency / Opacity
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(selectedObj.opacity * 100)}
                    onChange={(e) =>
                      handlePropChange({
                        opacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100,
                      })
                    }
                    className="w-12 px-1 py-0.5 text-xs text-right border border-[#D9D8D2] rounded bg-white font-medium text-[#171717]"
                  />
                  <span className="text-xs text-[#6F6F6A]">%</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(selectedObj.opacity * 100)}
                onChange={(e) => handlePropChange({ opacity: Number(e.target.value) / 100 })}
                className="w-full accent-[#171717] cursor-pointer"
              />

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 mt-2">
                {[100, 75, 50, 25, 10].map((val) => {
                  const currentPercent = Math.round(selectedObj.opacity * 100);
                  return (
                    <button
                      key={val}
                      onClick={() => handlePropChange({ opacity: val / 100 })}
                      className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                        currentPercent === val
                          ? "bg-[#171717] text-white border-[#171717] font-semibold"
                          : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {val}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── Die-Cut Sticker Border & Shadow ─── */}
            <div className="pt-3 border-t border-[#D9D8D2] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#171717]">
                  Die-cut Border
                </span>
                {/* Toggle on/off switch */}
                <button
                  onClick={() => {
                    const hasBorder = (selectedObj.borderWidth ?? 0) > 0;
                    handlePropChange({
                      borderWidth: hasBorder ? 0 : 8,
                      borderColor: selectedObj.borderColor || "#ffffff",
                      hasShadow: true,
                    });
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    (selectedObj.borderWidth ?? 0) > 0 ? "bg-[#FF5A36]" : "bg-[#D9D8D2]"
                  }`}
                  title="Toggle white die-cut sticker border"
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${
                      (selectedObj.borderWidth ?? 0) > 0 ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* If border is active, show width & color controls */}
              {(selectedObj.borderWidth ?? 0) > 0 && (
                <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#D9D8D2] space-y-2.5 animate-in fade-in duration-150">
                  {/* Width slider & presets */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#6F6F6A]">Thickness</span>
                      <span className="font-mono font-semibold text-[#171717]">
                        {selectedObj.borderWidth ?? 8}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="18"
                      step="1"
                      value={selectedObj.borderWidth ?? 8}
                      onChange={(e) => handlePropChange({ borderWidth: Number(e.target.value) })}
                      className="w-full accent-[#FF5A36] h-1.5 bg-[#ECEBE6] rounded-lg cursor-pointer"
                    />
                    <div className="flex gap-1 mt-1.5">
                      {[
                        { label: "Thin", val: 4 },
                        { label: "Medium", val: 8 },
                        { label: "Bold", val: 14 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          onClick={() => handlePropChange({ borderWidth: preset.val })}
                          className={`flex-1 py-0.5 text-[10px] rounded border transition-colors ${
                            (selectedObj.borderWidth ?? 8) === preset.val
                              ? "bg-[#171717] text-white border-[#171717] font-semibold"
                              : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Color */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#D9D8D2]/60">
                    <span className="text-[11px] text-[#6F6F6A]">Border Color</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { name: "Classic White", hex: "#ffffff" },
                        { name: "Vintage Cream", hex: "#FAF7EE" },
                        { name: "Ink Black", hex: "#171717" },
                        { name: "Tomato Accent", hex: "#FF5A36" },
                      ].map((colorPreset) => (
                        <button
                          key={colorPreset.hex}
                          onClick={() => handlePropChange({ borderColor: colorPreset.hex })}
                          title={colorPreset.name}
                          style={{ backgroundColor: colorPreset.hex }}
                          className={`w-5 h-5 rounded-full border shadow-2xs transition-transform ${
                            (selectedObj.borderColor || "#ffffff").toLowerCase() === colorPreset.hex.toLowerCase()
                              ? "border-[#171717] scale-110 ring-1 ring-[#171717]"
                              : "border-[#D9D8D2]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Physical Drop Shadow Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#D9D8D2]/60">
                    <span className="text-[11px] text-[#6F6F6A]">Drop Shadow</span>
                    <button
                      onClick={() => handlePropChange({ hasShadow: !(selectedObj.hasShadow ?? true) })}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                        selectedObj.hasShadow ?? true
                          ? "bg-[#171717] text-white border-[#171717] font-semibold"
                          : "bg-white text-[#6F6F6A] border-[#D9D8D2]"
                      }`}
                    >
                      {selectedObj.hasShadow ?? true ? "On" : "Off"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-[#6F6F6A] leading-relaxed">
              Select a sticker on canvas to edit its position, scale, rotation, and opacity.
            </p>
          </div>
        )}

        {/* Layers Stack */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F6F6A]">
              Layers ({layers.length})
            </span>
            {selectedObj && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => bringForward(selectedObj.id)}
                  className="p-1 rounded hover:bg-[#ECEBE6] text-[#6F6F6A] hover:text-[#171717] transition-colors"
                  title="Bring forward"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => sendBackward(selectedObj.id)}
                  className="p-1 rounded hover:bg-[#ECEBE6] text-[#6F6F6A] hover:text-[#171717] transition-colors"
                  title="Send backward"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>

          {layers.length === 0 ? (
            <p className="text-[11px] text-[#6F6F6A] text-center py-4">No stickers on canvas</p>
          ) : (
            <div className="space-y-1">
              {layers.map((obj) => {
                const asset = assetMap.get(obj.assetId);
                const isSelected = selectedIds.includes(obj.id);

                return (
                  <div
                    key={obj.id}
                    onClick={() => select(obj.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-[#4A6CFF] shadow-xs"
                        : "bg-transparent border-transparent hover:bg-[#ECEBE6]"
                    }`}
                  >
                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateObject(obj.id, { visible: !obj.visible });
                      }}
                      className="text-[#6F6F6A] hover:text-[#171717]"
                    >
                      {obj.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>

                    {/* Thumbnail */}
                    <div className="w-6 h-6 rounded bg-[#ECEBE6] flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
                      {asset && (
                        <img
                          src={asset.thumbnailSrc || asset.src}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                    </div>

                    {/* Name */}
                    <span className="text-xs text-[#171717] truncate flex-1 font-medium">
                      {obj.name}
                    </span>

                    {/* Lock indicator */}
                    {obj.locked && (
                      <Lock size={12} className="text-[#FF5A36] flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
  </aside>
</>
);
};
