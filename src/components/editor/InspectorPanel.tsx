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
  Scissors,
  Wand2,
  AlignStartVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
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
    toggleSelect,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    duplicateSelected,
    deleteSelected,
    pushHistory,
  } = useEditorStore();

  const { inspectorPanelOpen, toggleInspectorPanel, openStickerMaker } = useUIStore();
  const [lockRatio, setLockRatio] = useState(true);
  const [tab, setTab] = useState<"object" | "canvas">("object");

  if (!inspectorPanelOpen) return null;

  const selectedObjs = document.objects.filter((o) => selectedIds.includes(o.id));
  const selectedObj = selectedObjs[0];
  const isMulti = selectedObjs.length > 1;
  const currentTab = selectedObjs.length > 0 ? tab : "canvas";
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const selectedAsset = !isMulti && selectedObj ? assetMap.get(selectedObj.assetId) : undefined;

  // Batch states
  const allLocked = selectedObjs.length > 0 && selectedObjs.every((o) => o.locked);
  const anyBorderActive = selectedObjs.some((o) => (o.borderWidth ?? 0) > 0);
  const batchOpacity =
    selectedObjs.length > 0
      ? Math.round(
          (selectedObjs.reduce((sum, o) => sum + o.opacity, 0) / selectedObjs.length) * 100
        )
      : 100;
  const batchBorderWidth =
    selectedObjs.length > 0
      ? (selectedObjs.find((o) => (o.borderWidth ?? 0) > 0)?.borderWidth ?? 8)
      : 8;

  // Batch actions
  const handleToggleLockAll = () => {
    selectedObjs.forEach((o) => updateObject(o.id, { locked: !allLocked }));
    pushHistory();
  };

  const handleBatchOpacity = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val)) / 100;
    selectedObjs.forEach((o) => updateObject(o.id, { opacity: clamped }));
    pushHistory();
  };

  const handleToggleBatchBorder = () => {
    const nextBorder = !anyBorderActive;
    selectedObjs.forEach((o) =>
      updateObject(o.id, {
        borderWidth: nextBorder ? 8 : 0,
        borderColor: o.borderColor || "#ffffff",
        hasShadow: true,
      })
    );
    pushHistory();
  };

  const handleBatchBorderWidth = (width: number) => {
    selectedObjs.forEach((o) => updateObject(o.id, { borderWidth: width }));
    pushHistory();
  };

  const handleBatchBorderColor = (color: string) => {
    selectedObjs.forEach((o) => updateObject(o.id, { borderColor: color }));
    pushHistory();
  };

  const alignLeft = () => {
    if (selectedObjs.length < 2) return;
    const minL = Math.min(...selectedObjs.map((o) => o.x - o.width / 2));
    selectedObjs.forEach((o) => {
      updateObject(o.id, { x: Math.round(minL + o.width / 2) });
    });
    pushHistory();
  };

  const alignCenterH = () => {
    if (selectedObjs.length < 2) return;
    const avgX = selectedObjs.reduce((sum, o) => sum + o.x, 0) / selectedObjs.length;
    selectedObjs.forEach((o) => {
      updateObject(o.id, { x: Math.round(avgX) });
    });
    pushHistory();
  };

  const alignRight = () => {
    if (selectedObjs.length < 2) return;
    const maxR = Math.max(...selectedObjs.map((o) => o.x + o.width / 2));
    selectedObjs.forEach((o) => {
      updateObject(o.id, { x: Math.round(maxR - o.width / 2) });
    });
    pushHistory();
  };

  const alignTop = () => {
    if (selectedObjs.length < 2) return;
    const minT = Math.min(...selectedObjs.map((o) => o.y - o.height / 2));
    selectedObjs.forEach((o) => {
      updateObject(o.id, { y: Math.round(minT + o.height / 2) });
    });
    pushHistory();
  };

  const alignMiddleV = () => {
    if (selectedObjs.length < 2) return;
    const avgY = selectedObjs.reduce((sum, o) => sum + o.y, 0) / selectedObjs.length;
    selectedObjs.forEach((o) => {
      updateObject(o.id, { y: Math.round(avgY) });
    });
    pushHistory();
  };

  const alignBottom = () => {
    if (selectedObjs.length < 2) return;
    const maxB = Math.max(...selectedObjs.map((o) => o.y + o.height / 2));
    selectedObjs.forEach((o) => {
      updateObject(o.id, { y: Math.round(maxB - o.height / 2) });
    });
    pushHistory();
  };

  const distributeH = () => {
    if (selectedObjs.length < 3) return;
    const sorted = [...selectedObjs].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpan = last.x - first.x;
    const step = totalSpan / (sorted.length - 1);
    sorted.forEach((o, i) => {
      if (i > 0 && i < sorted.length - 1) {
        updateObject(o.id, { x: Math.round(first.x + step * i) });
      }
    });
    pushHistory();
  };

  const distributeV = () => {
    if (selectedObjs.length < 3) return;
    const sorted = [...selectedObjs].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpan = last.y - first.y;
    const step = totalSpan / (sorted.length - 1);
    sorted.forEach((o, i) => {
      if (i > 0 && i < sorted.length - 1) {
        updateObject(o.id, { y: Math.round(first.y + step * i) });
      }
    });
    pushHistory();
  };

  const handleBringGroupToFront = () => {
    const ordered = [...selectedObjs].sort((a, b) => a.zIndex - b.zIndex);
    ordered.forEach((o) => bringToFront(o.id));
    pushHistory();
  };

  const handleSendGroupToBack = () => {
    const ordered = [...selectedObjs].sort((a, b) => b.zIndex - a.zIndex);
    ordered.forEach((o) => sendToBack(o.id));
    pushHistory();
  };

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
            disabled={selectedObjs.length === 0}
            className={`flex-1 py-1 px-2 rounded-md transition-all ${
              currentTab === "object"
                ? "bg-white text-[#171717] font-semibold shadow-xs"
                : "text-[#6F6F6A] hover:text-[#171717] disabled:opacity-40 disabled:hover:text-[#6F6F6A]"
            }`}
          >
            {isMulti ? `Group (${selectedObjs.length})` : "Sticker"}
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
          {isMulti ? (
            /* Multi-Selection Group Controls */
            <div className="p-3 space-y-3.5">
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#4A6CFF]/15 text-[#4A6CFF]">
                    {selectedObjs.length} Stickers
                  </span>
                  <span className="text-[11px] text-[#6F6F6A] font-medium">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleLockAll}
                    className={`p-1 rounded transition-colors ${
                      allLocked ? "text-[#FF5A36] bg-[#FF5A36]/10" : "text-[#6F6F6A] hover:text-[#171717]"
                    }`}
                    title={allLocked ? "Unlock All" : "Lock All"}
                  >
                    {allLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    onClick={duplicateSelected}
                    className="p-1 rounded text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
                    title="Duplicate All (Ctrl+D)"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="p-1 rounded text-[#6F6F6A] hover:text-[#FF5A36] hover:bg-[#ECEBE6] transition-colors"
                    title="Delete All (Del)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Align & Distribute */}
              <div>
                <span className="text-[11px] font-medium text-[#6F6F6A] block mb-1.5">
                  Align & Distribute
                </span>
                <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-lg border border-[#D9D8D2]">
                  <button
                    onClick={alignLeft}
                    title="Align Left"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignStartVertical size={14} />
                  </button>
                  <button
                    onClick={alignCenterH}
                    title="Align Center Horizontal"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignCenterHorizontal size={14} />
                  </button>
                  <button
                    onClick={alignRight}
                    title="Align Right"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignEndVertical size={14} />
                  </button>
                  <button
                    onClick={alignTop}
                    title="Align Top"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignStartHorizontal size={14} />
                  </button>
                  <button
                    onClick={alignMiddleV}
                    title="Align Middle Vertical"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignCenterVertical size={14} />
                  </button>
                  <button
                    onClick={alignBottom}
                    title="Align Bottom"
                    className="p-1.5 rounded hover:bg-[#ECEBE6] text-[#171717] flex items-center justify-center transition-colors"
                  >
                    <AlignEndHorizontal size={14} />
                  </button>
                </div>
                {selectedObjs.length >= 3 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      onClick={distributeH}
                      className="text-[10px] py-1 px-1.5 rounded bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717] flex items-center justify-center gap-1 transition-colors"
                    >
                      <AlignHorizontalDistributeCenter size={12} />
                      <span>Distribute H</span>
                    </button>
                    <button
                      onClick={distributeV}
                      className="text-[10px] py-1 px-1.5 rounded bg-white hover:bg-[#ECEBE6] border border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717] flex items-center justify-center gap-1 transition-colors"
                    >
                      <AlignVerticalDistributeCenter size={12} />
                      <span>Distribute V</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Group Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[#6F6F6A]">
                    Group Opacity
                  </span>
                  <span className="text-xs font-mono font-medium text-[#171717]">{batchOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={batchOpacity}
                  onChange={(e) => handleBatchOpacity(Number(e.target.value))}
                  className="w-full accent-[#171717] cursor-pointer"
                />
                <div className="flex gap-1.5 mt-2">
                  {[100, 75, 50, 25].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleBatchOpacity(val)}
                      className={`flex-1 py-1 text-[10px] rounded border transition-colors ${
                        batchOpacity === val
                          ? "bg-[#171717] text-white border-[#171717] font-semibold"
                          : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Die-Cut Border */}
              <div className="pt-3 border-t border-[#D9D8D2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">
                    Die-cut Border (All)
                  </span>
                  <button
                    onClick={handleToggleBatchBorder}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                      anyBorderActive ? "bg-[#FF5A36]" : "bg-[#D9D8D2]"
                    }`}
                    title="Toggle die-cut border for all selected stickers"
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${
                        anyBorderActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {anyBorderActive && (
                  <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#D9D8D2] space-y-2.5 animate-in fade-in duration-150">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#6F6F6A]">Thickness</span>
                        <span className="font-mono font-semibold text-[#171717]">
                          {batchBorderWidth}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="18"
                        step="1"
                        value={batchBorderWidth}
                        onChange={(e) => handleBatchBorderWidth(Number(e.target.value))}
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
                            onClick={() => handleBatchBorderWidth(preset.val)}
                            className={`flex-1 py-0.5 text-[10px] rounded border transition-colors ${
                              batchBorderWidth === preset.val
                                ? "bg-[#171717] text-white border-[#171717] font-semibold"
                                : "bg-white text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
                            onClick={() => handleBatchBorderColor(colorPreset.hex)}
                            title={colorPreset.name}
                            style={{ backgroundColor: colorPreset.hex }}
                            className="w-5 h-5 rounded-full border border-[#D9D8D2] shadow-2xs hover:scale-110 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Arrange */}
              <div className="pt-3 border-t border-[#D9D8D2]">
                <span className="text-[11px] font-medium text-[#6F6F6A] block mb-1.5">
                  Group Layer Order
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleBringGroupToFront}
                    className="py-1.5 px-2 bg-white hover:bg-[#ECEBE6] text-[#171717] border border-[#D9D8D2] rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <ChevronUp size={13} />
                    <span>Bring to Top</span>
                  </button>
                  <button
                    onClick={handleSendGroupToBack}
                    className="py-1.5 px-2 bg-white hover:bg-[#ECEBE6] text-[#171717] border border-[#D9D8D2] rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <ChevronDown size={13} />
                    <span>Send to Bottom</span>
                  </button>
                </div>
              </div>
            </div>
          ) : selectedObj ? (
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
                  onClick={deleteSelected}
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

            {/* ─── Sticker Cutout Section ─── */}
            {selectedAsset && (selectedAsset.type === "upload" || selectedAsset.type === "paste") && (
              <div className="pt-3 border-t border-[#D9D8D2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                    <Scissors size={13} className="text-[#FF5A36]" />
                    Sticker Cutout
                  </span>
                  <span className="text-[10px] text-[#2E7D32] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#C8E6C9]">
                    Auto-Cutout Active ✓
                  </span>
                </div>
                <p className="text-[11px] text-[#6F6F6A] leading-relaxed">
                  Smart boundary eraser extracted this subject and softened edges.
                </p>
                <button
                  onClick={() => openStickerMaker(selectedAsset.src, selectedObj.name)}
                  className="w-full py-1.5 px-2.5 bg-white hover:bg-[#ECEBE6] text-[#171717] border border-[#D9D8D2] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors active:scale-98"
                >
                  <Wand2 size={13} className="text-[#FF5A36]" />
                  <span>Fine-Tune Cutout / Eraser</span>
                </button>
              </div>
            )}
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
                    onClick={(e) => {
                      if (e.shiftKey) {
                        toggleSelect(obj.id);
                      } else {
                        select(obj.id);
                      }
                    }}
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
