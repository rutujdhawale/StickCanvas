"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Link2, ArrowRight, Loader2, AlertCircle, Upload, Clipboard } from "lucide-react";

interface PasteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageLoaded: (dataUrl: string, name: string) => void;
  onOpenUploadFallback?: () => void;
}

export const PasteLinkModal: React.FC<PasteLinkModalProps> = ({
  isOpen,
  onClose,
  onImageLoaded,
  onOpenUploadFallback,
}) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setErrorMessage(null);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);

      // Auto-check clipboard for image URL
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        navigator.clipboard
          .readText()
          .then((text) => {
            const clean = text?.trim();
            if (clean && (clean.startsWith("http://") || clean.startsWith("https://"))) {
              setUrl(clean);
            }
          })
          .catch(() => {
            // Ignore clipboard permission blocks
          });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/proxy-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();

      if (!res.ok || !data.dataUrl) {
        throw new Error(data.error || "Couldn't load this image.");
      }

      // Extract sensible name from URL path
      let name = "Linked Sticker";
      try {
        const u = new URL(cleanUrl);
        const segments = u.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          name = decodeURIComponent(last).replace(/\.[^/.]+$/, "").slice(0, 30);
        }
      } catch {
        // fallback
      }

      onImageLoaded(data.dataUrl, name || "Linked Sticker");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Couldn't load this image.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D9D8D2] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF5A36]/10 text-[#FF5A36] flex items-center justify-center">
              <Link2 size={16} />
            </div>
            <h3 className="font-semibold text-sm text-[#171717] tracking-tight">
              Paste image link
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6F6F6A] mb-1.5">
              Enter any web image URL (PNG, JPG, WebP, SVG)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="url"
                required
                disabled={isLoading}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/sticker.png"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from clipboard"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6F6A] hover:text-[#171717] p-1 rounded transition-colors"
              >
                <Clipboard size={15} />
              </button>
            </div>
          </div>

          {/* Error Recovery State */}
          {errorMessage && (
            <div className="p-3 bg-[#FFF1F0] border border-[#FFCCC7] rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[#FF4D4F] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#CF1322]">
                  <p className="font-semibold">Couldn't load this image</p>
                  <p className="mt-0.5 text-[11px] text-[#A8071A] leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {onOpenUploadFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUploadFallback();
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white border border-[#FFCCC7] text-[#171717] text-xs font-medium rounded-lg hover:bg-[#FAF9F5] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Upload size={12} />
                    <span>Upload instead</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setUrl("");
                    inputRef.current?.focus();
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-white border border-[#FFCCC7] text-[#171717] text-xs font-medium rounded-lg hover:bg-[#FAF9F5] transition-colors shadow-2xs"
                >
                  Try another link
                </button>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-5 py-2.5 bg-[#FF5A36] hover:bg-[#e84e2c] disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Fetching image…</span>
                </>
              ) : (
                <>
                  <span>Add image</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
