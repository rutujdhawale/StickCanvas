"use client";

import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import { exportArtwork, downloadArtwork } from "@/lib/export-artwork";

export const ExportModal: React.FC = () => {
  const { document, assets } = useEditorStore();
  const { exportModalOpen, closeExportModal, exportOptions, setExportOptions, showToast } =
    useUIStore();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Generate a live preview when modal opens or options change
  useEffect(() => {
    if (!exportModalOpen) return;

    let isMounted = true;
    exportArtwork(
      document.objects,
      assets,
      { ...exportOptions, scale: 1 },
      document.canvasWidth,
      document.canvasHeight,
      document.backgroundColor,
      document.backgroundConfig
    ).then(({ dataUrl }) => {
      if (isMounted) setPreviewUrl(dataUrl);
    });

    return () => {
      isMounted = false;
    };
  }, [
    exportModalOpen,
    document.objects,
    assets,
    exportOptions.format,
    exportOptions.transparent,
    document.backgroundConfig,
  ]);

  if (!exportModalOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const { dataUrl, filename } = await exportArtwork(
        document.objects,
        assets,
        exportOptions,
        document.canvasWidth,
        document.canvasHeight,
        document.backgroundColor,
        document.backgroundConfig
      );
      downloadArtwork(dataUrl, filename);
      closeExportModal();
      showToast("Exported ✓");
    } catch (err) {
      console.error(err);
      showToast("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D9D8D2] flex items-center justify-between">
          <h2 className="font-semibold text-sm tracking-tight text-[#171717]">
            Export Artwork
          </h2>
          <button
            onClick={closeExportModal}
            className="p-1 rounded-md text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Artwork Preview */}
          <div className="relative aspect-video w-full rounded-xl border border-[#D9D8D2] overflow-hidden flex items-center justify-center bg-[#FAF9F5]">
            <div className={`absolute inset-0 ${exportOptions.transparent ? "checkerboard" : "bg-[#ECEBE6]"}`} />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Artwork preview"
                className="relative max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <span className="relative text-xs text-[#6F6F6A]">Packing preview…</span>
            )}
          </div>

          {/* Format options */}
          <div>
            <span className="text-xs font-semibold text-[#171717] block mb-2">Format</span>
            <div className="grid grid-cols-3 gap-2">
              {(["png", "jpeg", "webp"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportOptions({ format: fmt })}
                  className={`py-1.5 text-xs font-medium uppercase rounded-lg border transition-all ${
                    exportOptions.format === fmt
                      ? "bg-[#171717] text-white border-[#171717]"
                      : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Scale options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#171717]">Resolution</span>
              <span className="text-[11px] text-[#6F6F6A]">
                {document.canvasWidth * exportOptions.scale} × {document.canvasHeight * exportOptions.scale} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setExportOptions({ scale: s })}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    exportOptions.scale === s
                      ? "bg-[#171717] text-white border-[#171717]"
                      : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Transparent option */}
          {exportOptions.format !== "jpeg" && (
            <label className="flex items-center gap-2 text-xs text-[#171717] cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.transparent}
                onChange={(e) => setExportOptions({ transparent: e.target.checked })}
                className="rounded border-[#D9D8D2] text-[#171717] focus:ring-0 accent-[#171717]"
              />
              <span>Transparent background</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D9D8D2] bg-[#FAF9F5] flex justify-end gap-2">
          <button
            onClick={closeExportModal}
            className="px-3 py-1.5 text-xs font-medium text-[#6F6F6A] hover:text-[#171717] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-1.5 text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isExporting ? "Packing your artwork…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};
