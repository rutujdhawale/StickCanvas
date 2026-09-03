"use client";

import React, { useRef } from "react";
import { Plus, Sparkles, Sliders, Layers, Download, Laptop, Camera, Paintbrush } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

interface MobileBottomBarProps {
  onAddFromDevice: (file: File) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onAddFromDevice }) => {
  const { selectedIds } = useEditorStore();
  const {
    toggleAssetsPanel,
    toggleInspectorPanel,
    toggleBackgroundDrawer,
    assetsPanelOpen,
    inspectorPanelOpen,
    backgroundDrawerOpen,
    openExportModal,
  } = useUIStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddFromDevice(file);
      e.target.value = "";
    }
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between bg-white/95 backdrop-blur-md border border-[#D9D8D2] rounded-2xl shadow-lg px-2 py-1.5 select-none">
      {/* Hidden File Input for Device Photo / Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. Add From Device (Camera / Photos) */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
        title="Add photo from device"
      >
        <Plus size={18} strokeWidth={2.5} className="text-[#FF5A36]" />
        <span className="text-[10px] font-semibold mt-0.5">Device</span>
      </button>

      {/* 2. Stickers Drawer */}
      <button
        onClick={toggleAssetsPanel}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 rounded-xl active:scale-95 transition-all ${
          assetsPanelOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Open stickers drawer"
      >
        <Sparkles size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Stickers</span>
      </button>

      {/* 3. Canvas Background Drawer */}
      <button
        onClick={toggleBackgroundDrawer}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 rounded-xl active:scale-95 transition-all ${
          backgroundDrawerOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Canvas background"
      >
        <Paintbrush size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Canvas</span>
      </button>

      {/* 4. Inspector / Transparency */}
      <button
        onClick={toggleInspectorPanel}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 rounded-xl active:scale-95 transition-all relative ${
          inspectorPanelOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Adjust opacity and properties"
      >
        <Sliders size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Adjust</span>
        {hasSelection && (
          <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#4A6CFF]" />
        )}
      </button>

      {/* 4. Layers */}
      <button
        onClick={toggleInspectorPanel}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 text-[#6F6F6A] hover:text-[#171717] rounded-xl active:scale-95 transition-all"
        title="Layers list"
      >
        <Layers size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Layers</span>
      </button>

      {/* 5. Export */}
      <button
        onClick={openExportModal}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 bg-[#FF5A36] text-white rounded-xl active:scale-95 transition-all shadow-xs"
        title="Export artwork"
      >
        <Download size={18} strokeWidth={2.5} />
        <span className="text-[10px] font-semibold mt-0.5">Export</span>
      </button>
    </div>
  );
};
