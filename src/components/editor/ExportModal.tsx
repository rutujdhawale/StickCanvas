"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Printer, Download, Sparkles, Scissors, Copy, Lock } from "lucide-react";
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
import {
  hasActivePrintAccess,
  savePrintEntitlement,
  consumePrintCredit,
} from "@/lib/print-entitlements";
import { PrintPaywallModal } from "./PrintPaywallModal";

export const ExportModal: React.FC = () => {
  const { document, assets } = useEditorStore();
  const { exportModalOpen, closeExportModal, exportOptions, setExportOptions, showToast } =
    useUIStore();

  const [tab, setTab] = useState<"digital" | "print">("digital");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Paywall states
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const [printOptions, setPrintOptions] = useState<PrintSheetOptions>({
    paperFormat: "a4",
    orientation: "landscape",
    showCutGuides: true,
    paperFinish: "glossy-vinyl",
  });

  // Track entitlement state
  useEffect(() => {
    setHasAccess(hasActivePrintAccess());
  }, [exportModalOpen, tab, isPaywallOpen]);

  // Handle return from Stripe checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const tier = (params.get("tier") as any) || "single_sheet";
      savePrintEntitlement({
        type: tier,
        credits: tier === "pack" ? 5 : 1,
        unlockedAt: Date.now(),
      });
      setHasAccess(true);
      showToast("🎉 300 DPI Print Sheet Unlocked!");
      setTab("print");

      // Clean query parameters from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("session_id");
      url.searchParams.delete("tier");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [showToast]);

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
      const isUnlocked = hasActivePrintAccess();
      exportPrintSheet(
        document.objects,
        assets,
        { ...printOptions, watermarked: !isUnlocked },
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
    hasAccess,
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
        if (!hasActivePrintAccess()) {
          setIsPaywallOpen(true);
          return;
        }

        const { dataUrl, filename } = await exportPrintSheet(
          document.objects,
          assets,
          { ...printOptions, watermarked: false },
          document.canvasWidth,
          document.canvasHeight,
          document.backgroundConfig
        );
        downloadArtwork(dataUrl, filename);
        consumePrintCredit();
        setHasAccess(hasActivePrintAccess());
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
    if (!hasActivePrintAccess()) {
      setIsPaywallOpen(true);
      return;
    }

    setIsPrinting(true);
    try {
      const { dataUrl } = await exportPrintSheet(
        document.objects,
        assets,
        { ...printOptions, watermarked: false },
        document.canvasWidth,
        document.canvasHeight,
        document.backgroundConfig
      );
      printStickerSheet(dataUrl, printOptions);
      consumePrintCredit();
      setHasAccess(hasActivePrintAccess());
      showToast("Opening printer dialog…");
    } catch (err) {
      console.error(err);
      showToast("Printing failed. Try downloading the sheet.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      const { dataUrl } = await exportArtwork(
        document.objects,
        assets,
        { ...exportOptions, format: "png" },
        document.canvasWidth,
        document.canvasHeight,
        document.backgroundColor,
        document.backgroundConfig
      );

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("Copied to clipboard ✓");
      } else {
        // Fallback: download instead
        downloadArtwork(dataUrl, `stickercanvas-copy.png`);
        showToast("Clipboard unavailable — downloaded instead ✓");
      }
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
      showToast("Could not copy. Try downloading instead.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
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
                {!hasAccess && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5A36] text-white uppercase tracking-wider">
                    Pro
                  </span>
                )}
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
                      alt="Preview"
                      className="relative max-h-full max-w-full object-contain shadow-xs"
                    />
                  ) : (
                    <div className="text-xs text-[#6F6F6A]">Generating preview…</div>
                  )}
                </div>

                {/* Format selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setExportOptions({ format: fmt })}
                        className={`py-1.5 text-xs font-medium uppercase rounded-lg border transition-all ${
                          exportOptions.format === fmt
                            ? "bg-[#171717] text-white border-[#171717]"
                            : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2] hover:bg-[#ECEBE6]"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#171717]">Resolution</span>
                    <span className="text-[#6F6F6A]">
                      {Math.round(document.canvasWidth * exportOptions.scale)} ×{" "}
                      {Math.round(document.canvasHeight * exportOptions.scale)} px
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
                            : "bg-[#F7F6F2] text-[#6F6F6A] border-[#D9D8D2] hover:bg-[#ECEBE6]"
                        }`}
                      >
                        {s}× {s === 4 ? "(Ultra HD)" : s === 2 ? "(Retina)" : "(Standard)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transparent background toggle */}
                {exportOptions.format !== "jpeg" && (
                  <label className="flex items-center justify-between py-1 cursor-pointer">
                    <span className="text-xs font-medium text-[#171717]">
                      Transparent background
                    </span>
                    <input
                      type="checkbox"
                      checked={exportOptions.transparent}
                      onChange={(e) => setExportOptions({ transparent: e.target.checked })}
                      className="rounded border-[#D9D8D2] text-[#171717] focus:ring-0 accent-[#171717]"
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                {/* 300 DPI Print Sheet Preview */}
                <div className="relative aspect-[1.414/1] w-full rounded-xl border border-[#D9D8D2] overflow-hidden flex items-center justify-center bg-[#E5E4DE] shadow-inner">
                  {sheetPreviewUrl ? (
                    <img
                      src={sheetPreviewUrl}
                      alt="Print Sheet Preview"
                      className="relative max-h-full max-w-full object-contain shadow-md"
                    />
                  ) : (
                    <div className="text-xs text-[#6F6F6A] flex items-center gap-1.5">
                      <Sparkles size={14} className="animate-spin text-[#FF5A36]" />
                      <span>Compositing 300 DPI layout…</span>
                    </div>
                  )}

                  {!hasAccess && (
                    <div
                      onClick={() => setIsPaywallOpen(true)}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-[#171717]/80 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#171717] backdrop-blur-xs transition-all shadow-xs"
                    >
                      <Lock size={10} className="text-[#FF5A36]" />
                      <span>Preview Watermarked · Unlock Clean 300 DPI</span>
                    </div>
                  )}
                </div>

                {/* Paper Format Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#171717]">Paper Size (300 DPI)</span>
                    <span className="text-[#6F6F6A] font-mono text-[11px]">
                      {PAPER_SIZES_300DPI[printOptions.paperFormat].dimensions}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PAPER_SIZES_300DPI) as PrintSheetOptions["paperFormat"][]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setPrintOptions((p) => ({ ...p, paperFormat: fmt }))}
                        className={`py-1.5 px-2 text-left rounded-lg border transition-all text-xs flex items-center justify-between ${
                          printOptions.paperFormat === fmt
                            ? "bg-[#171717] text-white border-[#171717]"
                            : "bg-[#F7F6F2] text-[#171717] border-[#D9D8D2] hover:bg-[#ECEBE6]"
                        }`}
                      >
                        <span className="font-medium">{PAPER_SIZES_300DPI[fmt].label}</span>
                        {printOptions.paperFormat === fmt && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation & Cut Guides */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#171717]">Orientation</label>
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
              {tab === "digital" && (
                <button
                  onClick={handleCopyToClipboard}
                  disabled={isCopying}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-[#D9D8D2] hover:bg-[#ECEBE6] text-[#171717] rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>{isCopying ? "Copying…" : "Copy to Clipboard"}</span>
                </button>
              )}

              {tab === "print" && (
                <button
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-[#D9D8D2] hover:bg-[#ECEBE6] text-[#171717] rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                >
                  {!hasAccess && <Lock size={12} className="text-[#FF5A36]" />}
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
                    {!hasAccess && <Lock size={12} />}
                    <Printer size={13} />
                    <span>{isPrinting ? "Sending to printer…" : "Print to Printer"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PrintPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        printOptions={printOptions}
        onSuccessUnlocked={() => {
          setHasAccess(true);
          showToast("🎉 300 DPI Print Sheet Unlocked!");
        }}
      />
    </>
  );
};
