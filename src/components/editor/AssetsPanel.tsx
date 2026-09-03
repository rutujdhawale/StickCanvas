"use client";

import React, { useState, useRef } from "react";
import { Search, Plus, UploadCloud, X, Eye, Laptop } from "lucide-react";
import { useEditorStore, generateId, generateAssetId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { Asset } from "@/types/editor";
import { PRESET_STICKERS } from "@/lib/emoji-stickers";

interface AssetsPanelProps {
  onAddStickerDirectly: (asset: Asset) => void;
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ onAddStickerDirectly }) => {
  const { assets, addAsset } = useEditorStore();
  const { assetsPanelOpen, toggleAssetsPanel, openStickerMaker, openAssetPreview } = useUIStore();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDragOverDrawer, setIsDragOverDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!assetsPanelOpen) return null;

  // Filter preset stickers
  const filteredPresets = PRESET_STICKERS.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Uploaded assets
  const userUploads = assets.filter((a) => a.type === "upload" || a.type === "paste");

  // Handle local file upload from device
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        // Open the Add & Customize Sticker modal with live preview and transparency slider
        openStickerMaker(dataUrl, cleanName);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData("application/stickercanvas-asset", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Drawer file drop handler
  const handleDrawerDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragOverDrawer(true);
    }
  };

  const handleDrawerDragLeave = () => {
    setIsDragOverDrawer(false);
  };

  const handleDrawerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDrawer(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <>
      {/* Mobile touch backdrop */}
      <div
        onClick={toggleAssetsPanel}
        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity animate-in fade-in"
      />

      <aside
        onDragOver={handleDrawerDragOver}
        onDragLeave={handleDrawerDragLeave}
        onDrop={handleDrawerDrop}
        className={`fixed md:relative bottom-0 md:bottom-auto left-0 right-0 md:right-auto h-[72vh] md:h-[calc(100vh-48px)] w-full md:w-[270px] border-t md:border-t-0 md:border-r border-[#D9D8D2] bg-[#F7F6F2] rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none flex flex-col z-40 select-none flex-shrink-0 transition-all animate-in slide-in-from-bottom-6 md:animate-none ${
          isDragOverDrawer ? "ring-2 ring-inset ring-[#FF5A36] bg-[#FAF9F5]" : ""
        }`}
      >
        {/* Mobile Pull Handle Pill */}
        <div className="md:hidden w-12 h-1.5 bg-[#D9D8D2] rounded-full mx-auto mt-2.5 mb-0.5" />
      {/* Header */}
      <div className="p-3 border-b border-[#D9D8D2] flex items-center justify-between">
        <span className="font-semibold text-xs tracking-wider uppercase text-[#171717]">
          My Stickers
        </span>
        <button
          onClick={toggleAssetsPanel}
          className="p-1 rounded text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          title="Close drawer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Prominent "Add from Device" Action Button */}
      <div className="p-3 border-b border-[#D9D8D2]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 bg-white hover:bg-[#FAF9F5] border border-[#D9D8D2] hover:border-[#171717] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#171717] shadow-xs active:scale-98 transition-all group"
        >
          <Laptop size={15} className="text-[#FF5A36] group-hover:scale-110 transition-transform" />
          <span>Add from Device</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-[#D9D8D2] flex flex-col gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6F6F6A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stickers…"
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#D9D8D2] rounded-lg focus:outline-none focus:border-[#4A6CFF] text-[#171717] placeholder-[#6F6F6A]"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
          {["all", "cuties", "stationery", "food", "cool", "nature"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-[#171717] text-white font-medium"
                  : "bg-[#ECEBE6] text-[#6F6F6A] hover:text-[#171717]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable stickers */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* User Uploads (from device) */}
        {userUploads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F6F6A]">
                From Device ({userUploads.length})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {userUploads.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onClick={() => onAddStickerDirectly(asset)}
                  className="group relative aspect-square rounded-lg border border-[#D9D8D2] bg-white p-1 flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-[#171717] hover:shadow-sm hover:-translate-y-0.5 transition-all"
                  title={`${asset.name} (Click or drag to place)`}
                >
                  <img
                    src={asset.thumbnailSrc || asset.src}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />

                  {/* Preview action icon on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssetPreview(asset);
                    }}
                    className="absolute top-1 right-1 p-1 bg-white/90 rounded border border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                    title="Preview sticker"
                  >
                    <Eye size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preset Stickers */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F6F6A] block mb-2">
            Sticker Drawer
          </span>
          <div className="grid grid-cols-3 gap-2">
            {filteredPresets.map((preset) => {
              const asset = assets.find((a) => a.id === preset.id);
              if (!asset) return null;

              return (
                <div
                  key={preset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onClick={() => onAddStickerDirectly(asset)}
                  className="group relative aspect-square rounded-lg border border-[#D9D8D2] bg-white p-1 flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-[#171717] hover:shadow-sm hover:-translate-y-0.5 transition-all"
                  title={`${preset.name} (Click or drag)`}
                >
                  <img
                    src={asset.thumbnailSrc}
                    alt={preset.name}
                    className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-110 transition-transform duration-150"
                  />

                  {/* Preview button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssetPreview(asset);
                    }}
                    className="absolute top-1 right-1 p-1 bg-white/90 rounded border border-[#D9D8D2] text-[#6F6F6A] hover:text-[#171717] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                    title="Preview in detail"
                  >
                    <Eye size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dropzone for device files */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F6F6A] block mb-2">
            Drag Files Here
          </span>
          <label
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-[#D9D8D2] hover:border-[#171717] rounded-xl p-3 bg-[#FAF9F5] hover:bg-white flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center transition-all group"
          >
            <UploadCloud size={20} className="text-[#6F6F6A] group-hover:text-[#FF5A36] group-hover:scale-110 transition-all" />
            <span className="text-xs font-medium text-[#171717]">Drop files from device</span>
            <span className="text-[10px] text-[#6F6F6A]">PNG · JPG · WEBP · SVG</span>
          </label>
        </div>
      </div>
    </aside>
  </>
);
};
