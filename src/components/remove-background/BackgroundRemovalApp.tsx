"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  Clipboard,
  Link as LinkIcon,
  Camera,
  Download,
  Copy,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  ShieldCheck,
  Zap,
  HelpCircle,
  X,
  ChevronDown,
  ArrowRight,
  Sliders,
  MessageSquarePlus,
  User as UserIcon,
} from "lucide-react";
import { BeforeAfterSlider, ViewMode } from "./BeforeAfterSlider";
import { removeBackground, cancelAllBackgroundJobs, preloadModel } from "@/lib/bg-remove";
import { StickerLogoMark } from "@/components/common/StickerLogoMark";
import { AuthModal } from "@/components/auth/AuthModal";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

export const BackgroundRemovalApp: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { openFeedbackModal } = useUIStore();

  // State
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [transparentUrl, setTransparentUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("image.png");
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>("Analyzing image…");
  const [progressValue, setProgressValue] = useState<number>(0.1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View & Inspector
  const [viewMode, setViewMode] = useState<ViewMode>("compare");
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasShadow, setHasShadow] = useState<boolean>(false);
  const [showFineTune, setShowFineTune] = useState<boolean>(false);

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Preload model on mount
  useEffect(() => {
    preloadModel();
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  // ─── Background Removal Process ──────────────────────────────────

  const processFile = useCallback(
    async (file: File | Blob, name = "cutout.png") => {
      setErrorMsg(null);
      setFileName(name);

      // 1. Immediately create local URL for instant preview before ML begins
      const previewUrl = URL.createObjectURL(file);
      setOriginalUrl(previewUrl);
      setTransparentUrl(null);
      setIsProcessing(true);
      setProgressStage("Analyzing subject…");
      setProgressValue(0.15);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setViewMode("compare");

      try {
        const result = await removeBackground(file, {
          autoTrim: false, // Match 1:1 original dimensions for perfect Before/After alignment
          onProgress: (stage, progress) => {
            setProgressStage(stage);
            setProgressValue(progress);
          },
        });

        setTransparentUrl(result.transparentUrl);
        setDimensions({ width: result.width, height: result.height });
        setIsProcessing(false);
      } catch (err: unknown) {
        console.error("Background removal error:", err);
        const msg = err instanceof Error ? err.message : "Failed to remove background";
        if (msg !== "Cancelled") {
          setErrorMsg("Could not remove background. Please try another image.");
        }
        setIsProcessing(false);
      }
    },
    []
  );

  const handleCancel = useCallback(() => {
    cancelAllBackgroundJobs();
    setIsProcessing(false);
    setProgressStage("");
  }, []);

  const handleReset = useCallback(() => {
    cancelAllBackgroundJobs();
    if (originalUrl && originalUrl.startsWith("blob:")) {
      URL.revokeObjectURL(originalUrl);
    }
    setOriginalUrl(null);
    setTransparentUrl(null);
    setIsProcessing(false);
    setErrorMsg(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [originalUrl]);

  // ─── Input Handlers ──────────────────────────────────────────────

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, file.name);
    }
    // reset input so same file can be selected again
    e.target.value = "";
  };

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        triggerToast("Clipboard image access not supported by your browser");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          processFile(blob, "pasted-image.png");
          triggerToast("Image pasted from clipboard");
          return;
        }
      }
      triggerToast("No image found on clipboard");
    } catch {
      triggerToast("Please use Ctrl+V or allow clipboard permission");
    }
  };

  // Global Ctrl+V / Command+V paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file, "pasted-image.png");
            triggerToast("Pasted image from clipboard");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [processFile]);

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file, file.name);
    }
  };

  // URL Proxy Input
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;

    setUrlModalOpen(false);
    const targetUrl = imageUrlInput.trim();
    setImageUrlInput("");

    setIsProcessing(true);
    setProgressStage("Fetching image…");
    setProgressValue(0.1);

    try {
      const proxyRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(targetUrl)}`);
      if (!proxyRes.ok) {
        throw new Error("Unable to fetch image from URL");
      }
      const blob = await proxyRes.blob();
      processFile(blob, "web-image.png");
    } catch {
      setErrorMsg("Failed to load image from URL. Make sure the link is a direct image.");
      setIsProcessing(false);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!transparentUrl) return;
    const a = document.createElement("a");
    a.href = transparentUrl;
    const base = fileName.replace(/\.[^/.]+$/, "");
    a.download = `${base}-transparent.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerToast("Transparent PNG downloaded");
  };

  const handleCopy = async () => {
    if (!transparentUrl) return;
    try {
      const res = await fetch(transparentUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      triggerToast("Transparent PNG copied to clipboard!");
    } catch {
      triggerToast("Could not copy directly. Use Download instead.");
    }
  };

  const handleMakeSticker = () => {
    if (!transparentUrl) return;
    try {
      sessionStorage.setItem(
        "stickercanvas_pending_sticker",
        JSON.stringify({
          dataUrl: transparentUrl,
          name: fileName || "Cutout Sticker",
          width: dimensions.width || 600,
          height: dimensions.height || 600,
        })
      );
      router.push("/editor");
    } catch {
      router.push("/editor");
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] flex flex-col font-sans selection:bg-[#FF5A36] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 border border-[#333333]">
          <Check size={14} className="text-[#FF5A36]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="h-16 border-b border-[#D9D8D2] bg-[#F7F6F2]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-[#171717] hover:opacity-85 transition-opacity"
          >
            <StickerLogoMark size={24} />
            <span className="font-semibold text-base tracking-tight text-[#171717]">
              StickerCanvas
            </span>
          </Link>
          <span className="text-[#D9D8D2]">/</span>
          <span className="text-xs font-medium text-[#6F6F6A]">Remove Background</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openFeedbackModal}
            className="text-xs font-medium text-[#6F6F6A] hover:text-[#171717] px-2.5 py-1.5 rounded-lg hover:bg-[#ECEBE6] transition-colors flex items-center gap-1.5"
            title="Send feedback or report an issue"
          >
            <MessageSquarePlus size={14} />
            {/* <span className="hidden sm:inline">Feedback</span> */}
          </button>

          {/* Sign in and user profile temporarily hidden per user request */}
          {/*
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg text-xs font-medium text-[#171717] bg-white border border-[#D9D8D2]">
              <div className="w-5 h-5 rounded-full bg-[#FF5A36] text-white flex items-center justify-center text-[10px] font-bold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline truncate max-w-[90px]">{user.name}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="text-xs font-medium text-[#171717] px-2.5 py-1.5 rounded-lg border border-[#D9D8D2] hover:border-[#171717] bg-white transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <UserIcon size={13} />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
          */}

          <Link
            href="/editor"
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#171717] hover:bg-[#333333] text-white rounded-lg transition-all shadow-xs active:scale-95 hidden sm:inline-flex items-center gap-1.5"
          >
            <span>Open Studio</span>
            <ArrowRight size={13} />
          </Link>
          {originalUrl && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-[#6F6F6A] hover:text-[#171717] px-3 py-1.5 rounded-lg hover:bg-[#ECEBE6] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>New</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-6xl w-full mx-auto">
        {/* If no image loaded: Dropzone / Hero */}
        {!originalUrl ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-16">
            <div className="text-center max-w-xl mx-auto mb-8 px-4">

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#171717] leading-[1.12] mb-3">
                Remove image backgrounds<br className="hidden sm:inline" />{" "}
                <span className="underline decoration-[#FF5A36] decoration-4 underline-offset-4">
                  instantly.
                </span>
              </h1>
            </div>

            {/* Interactive Dropzone Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-xl mx-auto rounded-2xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-white shadow-xs ${isDraggingOver
                  ? "border-[#FF5A36] bg-[#FF5A36]/5 scale-[1.01]"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] hover:bg-[#FAF9F5]"
                }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#ECEBE6] flex items-center justify-center text-[#171717] mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <Upload size={24} className="text-[#171717]" />
              </div>

              <span className="text-base font-bold text-[#171717] mb-1">
                Drop your image here, or{" "}
                <span className="text-[#FF5A36] underline decoration-[#D9D8D2] underline-offset-4 hover:decoration-[#FF5A36]">
                  browse
                </span>
              </span>
              <p className="text-xs text-[#6F6F6A] mb-6">
                Supports JPG, PNG, WebP, HEIC · Up to 20MB
              </p>

              {/* Quick Input Bar: Paste / URL / Camera */}
              <div
                className="flex flex-wrap items-center justify-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] text-xs font-medium text-[#171717] flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Clipboard size={14} className="text-[#4A6CFF]" />
                  <span>Paste (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrlModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] text-xs font-medium text-[#171717] flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <LinkIcon size={14} className="text-[#6F6F6A]" />
                  <span>Image URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] text-xs font-medium text-[#171717] flex items-center gap-1.5 shadow-2xs transition-colors sm:hidden"
                >
                  <Camera size={14} className="text-[#6F6F6A]" />
                  <span>Camera</span>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Privacy & Trust Badge */}
            <div className="flex items-center gap-2 mt-6 text-xs text-[#6F6F6A] font-medium">
              <ShieldCheck size={16} className="text-[#2E7D32]" />
              <span>Your image stays on your device</span>
            </div>
          </div>
        ) : (
          /* Active Image Viewport & Controls */
          <div className="w-full flex-1 flex flex-col items-center">
            {/* Canvas Container */}
            <div className="relative w-full h-[55vh] sm:h-[65vh] rounded-2xl border border-[#D9D8D2] bg-white shadow-sm overflow-hidden flex flex-col items-center justify-center">
              {/* Thin Canvas-Edge Animated Progress Line */}
              {isProcessing && (
                <div className="absolute top-0 left-0 right-0 z-30 flex flex-col">
                  <div className="w-full h-1 bg-[#ECEBE6] overflow-hidden">
                    <div
                      className="h-full bg-[#FF5A36] transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(15, progressValue * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-white/95 backdrop-blur-md border-b border-[#D9D8D2] text-xs font-medium text-[#171717] shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
                      <span className="text-[#171717]">{progressStage || "Removing background…"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="text-[11px] text-[#6F6F6A] hover:text-[#171717] px-2 py-0.5 rounded hover:bg-[#ECEBE6] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner if something went wrong */}
              {errorMsg && (
                <div className="absolute top-4 left-4 right-4 z-40 bg-[#FFF1F0] border border-[#FFCCC7] text-[#CF1322] px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-xs">
                  <span className="font-medium">{errorMsg}</span>
                  <button type="button" onClick={() => setErrorMsg(null)} className="text-[#CF1322] hover:opacity-80">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Before / After Slider Canvas */}
              <BeforeAfterSlider
                originalUrl={originalUrl}
                transparentUrl={transparentUrl}
                isProcessing={isProcessing}
                mode={viewMode}
                onModeChange={setViewMode}
                zoom={zoom}
                pan={pan}
                hasShadow={hasShadow}
              />

              {/* Floating Zoom & Reset Toolbar in bottom left corner */}
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#D9D8D2] rounded-full px-2.5 py-1 shadow-xs text-xs text-[#6F6F6A]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1 text-[#6F6F6A] hover:text-[#171717] rounded-full hover:bg-[#ECEBE6] transition-colors"
                >
                  <ZoomOut size={13} strokeWidth={2} />
                </button>
                <span className="text-[11px] font-medium min-w-8 text-center text-[#171717]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1 text-[#6F6F6A] hover:text-[#171717] rounded-full hover:bg-[#ECEBE6] transition-colors"
                >
                  <ZoomIn size={13} strokeWidth={2} />
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    title="Reset Zoom"
                    className="p-1 text-[#6F6F6A] hover:text-[#171717] rounded-full hover:bg-[#ECEBE6] transition-colors"
                  >
                    <Maximize2 size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-[#D9D8D2] shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setShowFineTune(!showFineTune)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${showFineTune
                      ? "border-[#171717] bg-[#171717] text-white"
                      : "border-[#D9D8D2] text-[#171717] hover:bg-[#ECEBE6]"
                    }`}
                >
                  <Sliders size={13} />
                  <span>Fine-tune</span>
                </button>

                <span className="text-xs text-[#6F6F6A] sm:hidden">
                  {dimensions.width ? `${dimensions.width} × ${dimensions.height}px` : ""}
                </span>
              </div>

              {/* Action Buttons: Download, Copy, Make Sticker */}
              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!transparentUrl || isProcessing}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium border border-[#D9D8D2] bg-white hover:bg-[#ECEBE6] text-[#171717] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Copy size={13} />
                  <span>Copy PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!transparentUrl || isProcessing}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#171717] hover:bg-[#333333] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-2xs active:scale-[0.98]"
                >
                  <Download size={14} />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleMakeSticker}
                  disabled={!transparentUrl || isProcessing}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98]"
                >
                  <Sparkles size={14} />
                  <span>Make a Sticker →</span>
                </button>
              </div>
            </div>

            {/* Collapsible Fine-Tuning Settings */}
            {showFineTune && (
              <div className="w-full mt-2 p-4 bg-white rounded-xl border border-[#D9D8D2] shadow-xs flex flex-wrap items-center gap-6 text-xs text-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#171717]">Subtle Shadow:</span>
                  <button
                    type="button"
                    onClick={() => setHasShadow(!hasShadow)}
                    className={`px-3 py-1 rounded-full border text-xs transition-colors ${hasShadow
                        ? "bg-[#171717] text-white border-[#171717] font-medium"
                        : "bg-[#ECEBE6] text-[#6F6F6A] border-[#D9D8D2] hover:text-[#171717]"
                      }`}
                  >
                    {hasShadow ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[#6F6F6A]">
                  <span>Dimensions:</span>
                  <span className="font-mono text-[#171717]">
                    {dimensions.width ? `${dimensions.width} × ${dimensions.height}px` : "Original resolution"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Below-the-fold SEO & Explanatory Content ───────────────── */}
        <div className="w-full mt-16 sm:mt-24 pt-12 border-t border-[#D9D8D2] max-w-4xl mx-auto">
          {/* 3 Step Guide */}
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] mb-2 tracking-tight">
              How to remove image backgrounds for free
            </h2>
            <p className="text-sm text-[#6F6F6A]">
              High precision cutouts in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="p-6 rounded-2xl bg-white border border-[#D9D8D2] shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="font-bold text-sm text-[#171717] mb-1">Select an Image</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Upload from your files, paste directly with Ctrl+V, or paste any image link.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#D9D8D2] shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="font-bold text-sm text-[#171717] mb-1">Instant AI Cutout</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Our on-device machine learning model isolates your subject and cleans edges with zero lag.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#D9D8D2] shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="font-bold text-sm text-[#171717] mb-1">Download or Make a Sticker</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Export transparent PNG at 100% original resolution or jump right into StickerCanvas Studio.
              </p>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="mb-16">
            <h3 className="text-xl font-bold text-[#171717] mb-6 text-center tracking-tight">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3 max-w-2xl mx-auto">
              <details className="group p-4 bg-white rounded-xl border border-[#D9D8D2] shadow-2xs [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-semibold text-xs text-[#171717] cursor-pointer select-none">
                  <span>Is this background remover really free?</span>
                  <ChevronDown size={15} className="text-[#6F6F6A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-[#6F6F6A] leading-relaxed">
                  Yes, 100% free with no watermark and no limits. No signup or credit card required.
                </p>
              </details>

              <details className="group p-4 bg-white rounded-xl border border-[#D9D8D2] shadow-2xs [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-semibold text-xs text-[#171717] cursor-pointer select-none">
                  <span>Are my photos uploaded to a cloud server?</span>
                  <ChevronDown size={15} className="text-[#6F6F6A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-[#6F6F6A] leading-relaxed">
                  No. The background removal model runs directly inside your browser via WebGPU and WASM. Your photos never leave your device.
                </p>
              </details>

              <details className="group p-4 bg-white rounded-xl border border-[#D9D8D2] shadow-2xs [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-semibold text-xs text-[#171717] cursor-pointer select-none">
                  <span>Does it reduce my image quality?</span>
                  <ChevronDown size={15} className="text-[#6F6F6A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-[#6F6F6A] leading-relaxed">
                  No. We preserve your photo&apos;s full native resolution, applying the segmented alpha mask at 1:1 original pixel dimensions.
                </p>
              </details>

              <details className="group p-4 bg-white rounded-xl border border-[#D9D8D2] shadow-2xs [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-semibold text-xs text-[#171717] cursor-pointer select-none">
                  <span>How can I turn this cutout into a printed sticker?</span>
                  <ChevronDown size={15} className="text-[#6F6F6A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-[#6F6F6A] leading-relaxed">
                  Click the &quot;Make a Sticker →&quot; button. Your cutout will automatically be placed onto the StickerCanvas Studio canvas where you can add white die-cut borders, custom shadows, and arrange on printable sheets.
                </p>
              </details>
            </div>
          </div>
        </div>
      </main>

      {/* URL Input Modal */}
      {urlModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUrlModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#D9D8D2] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#ECEBE6]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF5A36]/10 text-[#FF5A36] flex items-center justify-center">
                  <LinkIcon size={14} />
                </div>
                <h3 className="font-semibold text-sm text-[#171717]">Paste Image Link</h3>
              </div>
              <button
                type="button"
                onClick={() => setUrlModalOpen(false)}
                className="text-[#6F6F6A] hover:text-[#171717] p-1 rounded-md hover:bg-[#ECEBE6] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://example.com/photo.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-[#D9D8D2] rounded-xl focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-[#171717] placeholder:text-[#9E9E98] transition-all"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUrlModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6F6F6A] hover:bg-[#ECEBE6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#171717] text-white hover:bg-[#333333] transition-colors shadow-2xs active:scale-95"
                >
                  Load Image
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#D9D8D2] py-6 px-6 sm:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F6F6A]">
        <div className="flex items-center gap-2">
          <StickerLogoMark size={18} />
          <span className="font-semibold text-[#171717]">StickerCanvas</span>
          <span>· On-Device Background Removal</span>
        </div>

        <div className="flex items-center gap-5">
          {/* <button
            type="button"
            onClick={openFeedbackModal}
            className="hover:text-[#171717] transition-colors"
          >
            Feedback & Bugs
          </button> */}
          <Link href="/" className="hover:text-[#171717] transition-colors">
            Home
          </Link>
          <Link href="/editor" className="text-[#FF5A36] font-semibold hover:underline">
            Open Editor →
          </Link>
        </div>
      </footer>

      {/* Modals */}
      <FeedbackModal />
      <AuthModal />
    </div>
  );
};
