"use client";

import React from "react";
import { X, Plus, Image as ImageIcon } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Asset } from "@/types/editor";

interface AssetPreviewModalProps {
  onAddSticker: (asset: Asset) => void;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ onAddSticker }) => {
  const { previewModalAsset, closeAssetPreview } = useUIStore();

  if (!previewModalAsset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#D9D8D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[#6F6F6A]" />
            <h2 className="font-semibold text-sm tracking-tight text-[#171717]">
              {previewModalAsset.name}
            </h2>
          </div>
          <button
            onClick={closeAssetPreview}
            className="p-1 rounded-md text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* High-res Preview Box with Checkerboard for Transparency */}
          <div className="relative aspect-square w-full rounded-xl border border-[#D9D8D2] checkerboard overflow-hidden flex items-center justify-center p-4 shadow-inner">
            <img
              src={previewModalAsset.src}
              alt={previewModalAsset.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-md"
            />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF9F5] p-3 rounded-xl border border-[#D9D8D2]">
            <div>
              <span className="text-[#6F6F6A] block text-[10px] uppercase font-semibold">
                Resolution
              </span>
              <span className="font-medium text-[#171717]">
                {previewModalAsset.originalWidth || 256} × {previewModalAsset.originalHeight || 256} px
              </span>
            </div>
            <div>
              <span className="text-[#6F6F6A] block text-[10px] uppercase font-semibold">
                Type
              </span>
              <span className="font-medium text-[#171717] capitalize">
                {previewModalAsset.type} Sticker
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#D9D8D2] bg-[#FAF9F5] flex justify-end gap-2">
          <button
            onClick={closeAssetPreview}
            className="px-3.5 py-1.5 text-xs font-medium text-[#6F6F6A] hover:text-[#171717] rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onAddSticker(previewModalAsset);
              closeAssetPreview();
            }}
            className="px-4 py-1.5 text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Place on Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
