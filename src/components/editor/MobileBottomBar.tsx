"use client";

import React, { useRef } from "react";
import { Plus, Clipboard, Sparkles, Sliders, Download, Paintbrush, Camera } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

interface MobileBottomBarProps {
  onAddFromDevice: (file: File) => void;
  onPasteFromClipboard?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onAddFromDevice,
  onPasteFromClipboard,
}) => {
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          onAddFromDevice(file);
        }
      });
      e.target.value = "";
    }
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between bg-white/95 backdrop-blur-md border border-[#D9D8D2] rounded-2xl shadow-lg px-1.5 py-1.5 select-none">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. Add Photo from Gallery */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
        title="Add photo from device"
      >
        <Plus size={18} strokeWidth={2.5} className="text-[#FF5A36]" />
        <span className="text-[10px] font-semibold mt-0.5">Photo</span>
      </button>

      {/* 2. Take Photo with Camera */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
        title="Take photo with camera"
      >
        <Camera size={18} strokeWidth={2} className="text-[#6F6F6A]" />
        <span className="text-[10px] font-semibold mt-0.5">Camera</span>
      </button>

      {/* 3. Paste From Clipboard */}
      <button
        onClick={onPasteFromClipboard}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 text-[#171717] hover:bg-[#ECEBE6] rounded-xl active:scale-95 transition-all"
        title="Paste copied photo from clipboard"
      >
        <Clipboard size={18} strokeWidth={2} className="text-[#4A6CFF]" />
        <span className="text-[10px] font-semibold mt-0.5">Paste</span>
      </button>

      {/* 4. Stickers Drawer */}
      <button
        onClick={toggleAssetsPanel}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 rounded-xl active:scale-95 transition-all ${
          assetsPanelOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Open stickers drawer"
      >
        <Sparkles size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Stickers</span>
      </button>

      {/* 5. Canvas Background */}
      <button
        onClick={toggleBackgroundDrawer}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 rounded-xl active:scale-95 transition-all ${
          backgroundDrawerOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Canvas background"
      >
        <Paintbrush size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Canvas</span>
      </button>

      {/* 6. Inspector / Adjust */}
      <button
        onClick={toggleInspectorPanel}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 rounded-xl active:scale-95 transition-all relative ${
          inspectorPanelOpen
            ? "bg-[#ECEBE6] text-[#171717] font-semibold"
            : "text-[#6F6F6A] hover:text-[#171717]"
        }`}
        title="Adjust opacity and properties"
      >
        <Sliders size={18} strokeWidth={2} />
        <span className="text-[10px] mt-0.5">Adjust</span>
        {hasSelection && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#4A6CFF]" />
        )}
      </button>

      {/* 7. Export */}
      <button
        onClick={openExportModal}
        className="flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[40px] py-1 bg-[#FF5A36] text-white rounded-xl active:scale-95 transition-all shadow-xs"
        title="Export artwork"
      >
        <Download size={18} strokeWidth={2.5} />
        <span className="text-[10px] font-semibold mt-0.5">Export</span>
      </button>
    </div>
  );
};
