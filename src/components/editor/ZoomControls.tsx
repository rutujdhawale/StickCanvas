"use client";

import React from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
}) => {
  const { viewport } = useEditorStore();
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#D9D8D2] rounded-full shadow-sm px-1.5 py-1 flex items-center gap-1 z-20 select-none">
      <button
        onClick={onZoomOut}
        className="p-1 text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] rounded-full transition-colors"
        title="Zoom out"
      >
        <Minus size={14} />
      </button>

      <button
        onClick={onZoomReset}
        className="px-2 py-0.5 text-xs font-semibold text-[#171717] hover:bg-[#ECEBE6] rounded-md transition-colors min-w-[50px] text-center"
        title="Reset zoom to 100%"
      >
        {zoomPercent}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-1 text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] rounded-full transition-colors"
        title="Zoom in"
      >
        <Plus size={14} />
      </button>

      <div className="w-[1px] h-3.5 bg-[#D9D8D2] mx-0.5" />

      <button
        onClick={onZoomFit}
        className="p-1 text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] rounded-full transition-colors"
        title="Fit artwork to screen"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
};
