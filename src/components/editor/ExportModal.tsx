"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Printer, Download, Sparkles, Scissors } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import {
  exportArtwork,
  downloadArtwork,
  exportPrintSheet,
  printStickerSheet,
  PrintSheetOptions,
  PAPER_SIZES_300DPI,
} from "@/lib/export-artwork";

export const ExportModal: React.FC = () => {
  const { document, assets } = useEditorStore();
  const { exportModalOpen, closeExportModal, exportOptions, setExportOptions, showToast } =
    useUIStore();

  const [tab, setTab] = useState<"digital" | "print">("digital");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [printOptions, setPrintOptions] = useState<PrintSheetOptions>({
    paperFormat: "a4",
    orientation: "landscape",
    showCutGuides: true,
    paperFinish: "glossy-vinyl",
  });

  // Generate a live preview when modal opens or options change
  useEffect(() => {
    if (!exportModalOpen) return;

    let isMounted = true;
    if (tab === "digital") {
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
    } else {
      exportPrintSheet(
        document.objects,
        assets,
        printOptions,
        document.canvasWidth,
        document.canvasHeight,
        document.backgroundConfig
      ).then(({ dataUrl }) => {
        if (isMounted) setSheetPreviewUrl(dataUrl);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [
    exportModalOpen,
    tab,
    document.objects,
    assets,
    exportOptions.format,
    exportOptions.transparent,
    document.backgroundConfig,
    printOptions,
  ]);

  if (!exportModalOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (tab === "digital") {
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
      } else {
        const { dataUrl, filename } = await exportPrintSheet(
          document.objects,
          assets,
          printOptions,
          document.canvasWidth,
          document.canvasHeight,
          document.backgroundConfig
        );
        downloadArtwork(dataUrl, filename);
        closeExportModal();
        showToast("Downloaded 300 DPI Print Sheet ✓");
      }
    } catch (err) {
      console.error(err);
      showToast("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectPrint = async () => {
    setIsPrinting(true);
    try {
      const { dataUrl } = await exportPrintSheet(
        document.objects,
        assets,
        printOptions,
        document.canvasWidth,
        document.canvasHeight,
        document.backgroundConfig
      );
      printStickerSheet(dataUrl, printOptions);
      showToast("Opening printer dialog…");
    } catch (err) {
      console.error(err);
      showToast("Printing failed. Try downloading the sheet.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Mode Tabs */}
        <div className="p-3.5 border-b border-[#D9D8D2] flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#FAF9F5] p-1 rounded-xl border border-[#D9D8D2]">
            <button
              onClick={() => setTab("digital")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                tab === "digital"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#6F6F6A] hover:text-[#171717]"
              }`}
            >
              <Download size={13} />
              <span>Digital File</span>
            </button>
            <button
              onClick={() => setTab("print")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                tab === "print"
                  ? "bg-white text-[#171717] shadow-xs"
                  : "text-[#6F6F6A] hover:text-[#171717]"
              }`}
            >
              <Printer size={13} />
              <span>Print Sticker Sheet</span>
            </button>
          </div>

          <button
            onClick={closeExportModal}
            className="p-1 rounded-md text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {tab === "digital" ? (
            <>
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
                  <span className="relative text-xs text-[#6F6F6A]">Rendering preview…</span>
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
            </>
          ) : (
            <>
              {/* Sheet Preview */}
              <div className="relative aspect-video w-full rounded-xl border border-[#D9D8D2] overflow-hidden flex items-center justify-center bg-[#FAF9F5] shadow-inner">
                {sheetPreviewUrl ? (
                  <img
                    src={sheetPreviewUrl}
                    alt="Print sheet preview"
                    className="relative max-h-full max-w-full object-contain p-2 filter drop-shadow-sm"
                  />
                ) : (
                  <span className="relative text-xs text-[#6F6F6A]">Generating 300 DPI sheet preview…</span>
                )}
              </div>

              {/* Paper Format options */}
              <div>
                <span className="text-xs font-semibold text-[#171717] block mb-2">Paper Format</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["a4", "letter", "4x6", "square"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setPrintOptions((p) => ({ ...p, paperFormat: fmt }))}
                      className={`p-2 text-left rounded-lg border transition-all flex flex-col ${
                        printOptions.paperFormat === fmt
                          ? "bg-[#171717] text-white border-[#171717]"
                          : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{PAPER_SIZES_300DPI[fmt].label}</span>
                      <span className="text-[9px] opacity-75">{PAPER_SIZES_300DPI[fmt].dimensions}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation & Cut-guides */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-xs font-semibold text-[#171717] block mb-1.5">Orientation</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["landscape", "portrait"] as const).map((orient) => (
                      <button
                        key={orient}
                        onClick={() => setPrintOptions((p) => ({ ...p, orientation: orient }))}
                        className={`py-1.5 text-xs font-medium capitalize rounded-lg border transition-all ${
                          printOptions.orientation === orient
                            ? "bg-[#171717] text-white border-[#171717]"
                            : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2]"
                        }`}
                      >
                        {orient}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs text-[#171717] cursor-pointer p-2 rounded-lg bg-[#F7F6F2] border border-[#D9D8D2]">
                    <input
                      type="checkbox"
                      checked={printOptions.showCutGuides}
                      onChange={(e) => setPrintOptions((p) => ({ ...p, showCutGuides: e.target.checked }))}
                      className="rounded border-[#D9D8D2] text-[#171717] focus:ring-0 accent-[#171717]"
                    />
                    <span className="flex items-center gap-1 font-medium text-[11px]">
                      <Scissors size={12} />
                      Scissor cut lines
                    </span>
                  </label>
                </div>
              </div>

              {/* Physical Sticker Paper Guidance */}
              <div className="p-3 bg-[#FAF9F5] border border-[#D9D8D2] rounded-xl text-[11px] text-[#6F6F6A] leading-relaxed space-y-1">
                <span className="font-semibold text-[#171717] block flex items-center gap-1">
                  <Sparkles size={12} className="text-[#FF5A36]" />
                  Sticker Paper Advice for Best Results:
                </span>
                <p>
                  • <strong>Vinyl Glossy Paper</strong>: Waterproof & durable — best for laptops, water bottles & phone cases.
                </p>
                <p>
                  • <strong>Matte Sticker Paper</strong>: Non-glare paper touch — best for notebooks, planners & calendars.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D9D8D2] bg-[#FAF9F5] flex items-center justify-between gap-2">
          <button
            onClick={closeExportModal}
            className="px-3 py-1.5 text-xs font-medium text-[#6F6F6A] hover:text-[#171717] rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {tab === "print" && (
              <button
                onClick={handleDownload}
                disabled={isExporting}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-[#D9D8D2] hover:bg-[#ECEBE6] text-[#171717] rounded-lg shadow-xs transition-all flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Save 300 DPI Sheet</span>
              </button>
            )}

            <button
              onClick={tab === "digital" ? handleDownload : handleDirectPrint}
              disabled={isExporting || isPrinting}
              className="px-4 py-1.5 text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {tab === "digital" ? (
                <>
                  <Download size={13} />
                  <span>{isExporting ? "Packing…" : "Export Image"}</span>
                </>
              ) : (
                <>
                  <Printer size={13} />
                  <span>{isPrinting ? "Sending to printer…" : "Print to Printer"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

