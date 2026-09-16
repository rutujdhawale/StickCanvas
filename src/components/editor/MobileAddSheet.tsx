"use client";

import React, { useRef } from "react";
import { X, Upload, Clipboard, Link2, Camera, Smile } from "lucide-react";

interface MobileAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;
  onPasteClipboard: () => void;
  onOpenPasteLink: () => void;
  onOpenEmoji: () => void;
}

export const MobileAddSheet: React.FC<MobileAddSheetProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  onPasteClipboard,
  onOpenPasteLink,
  onOpenEmoji,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          onSelectFile(file);
        }
      });
      e.target.value = "";
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      />

      {/* Hidden file inputs */}
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

      {/* Bottom Sheet Container */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-[#D9D8D2] shadow-2xl pb-8 pt-3 px-5 animate-in slide-in-from-bottom duration-200 select-none">
        {/* Pull handle */}
        <div className="w-12 h-1.5 bg-[#D9D8D2] rounded-full mx-auto mb-3" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEBE6]">
          <div>
            <h3 className="text-base font-bold tracking-tight text-[#171717]">
              Add sticker
            </h3>
            <p className="text-xs text-[#6F6F6A]">
              Background is removed automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6F6F6A] hover:bg-[#ECEBE6] active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action List */}
        <div className="grid grid-cols-1 gap-2 pt-3">
          {/* 1. Upload from Device */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF9F5] active:bg-[#ECEBE6] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FF5A36]/10 text-[#FF5A36] flex items-center justify-center flex-shrink-0 group-active:scale-95 transition-transform">
              <Upload size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#171717]">
                Upload image
              </span>
              <span className="block text-xs text-[#6F6F6A]">
                From your photo library or files
              </span>
            </div>
          </button>

          {/* 2. Paste Image */}
          <button
            onClick={() => {
              onClose();
              onPasteClipboard();
            }}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF9F5] active:bg-[#ECEBE6] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4A6CFF]/10 text-[#4A6CFF] flex items-center justify-center flex-shrink-0 group-active:scale-95 transition-transform">
              <Clipboard size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#171717]">
                Paste image
              </span>
              <span className="block text-xs text-[#6F6F6A]">
                From clipboard (copy any photo first)
              </span>
            </div>
          </button>

          {/* 3. Paste Image Link */}
          <button
            onClick={() => {
              onClose();
              onOpenPasteLink();
            }}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF9F5] active:bg-[#ECEBE6] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center flex-shrink-0 group-active:scale-95 transition-transform">
              <Link2 size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#171717]">
                Paste image link
              </span>
              <span className="block text-xs text-[#6F6F6A]">
                Enter any web URL or image address
              </span>
            </div>
          </button>

          {/* 4. Take Photo */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF9F5] active:bg-[#ECEBE6] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center flex-shrink-0 group-active:scale-95 transition-transform">
              <Camera size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#171717]">
                Take photo
              </span>
              <span className="block text-xs text-[#6F6F6A]">
                Use camera to capture physical objects
              </span>
            </div>
          </button>

          {/* 5. Emoji & Presets */}
          <button
            onClick={() => {
              onClose();
              onOpenEmoji();
            }}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#FAF9F5] active:bg-[#ECEBE6] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center flex-shrink-0 group-active:scale-95 transition-transform">
              <Smile size={20} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#171717]">
                Choose emoji & sticker library
              </span>
              <span className="block text-xs text-[#6F6F6A]">
                Curated sticker collection & emojis
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
