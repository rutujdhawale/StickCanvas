"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

export type ViewMode = "compare" | "before" | "after";

interface BeforeAfterSliderProps {
  originalUrl: string;
  transparentUrl: string | null;
  isProcessing: boolean;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  zoom?: number;
  pan?: { x: number; y: number };
  hasShadow?: boolean;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalUrl,
  transparentUrl,
  isProcessing,
  mode,
  onModeChange,
  zoom = 1,
  pan = { x: 0, y: 0 },
  hasShadow = false,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle pointer / mouse / touch dragging
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    },
    []
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      handlePointerMove(e.touches[0].clientX);
    },
    [isDragging, handlePointerMove]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handlePointerMove(e.clientX);
    },
    [isDragging, handlePointerMove]
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onPointerUp);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onPointerUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [isDragging, onMouseMove, onTouchMove, onPointerUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== "compare") return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPos((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPos((p) => Math.min(100, p + 5));
    }
  };

  // When still processing and no transparentUrl yet, show original image with subtle pulse
  const hasCutout = Boolean(transparentUrl);

  return (
    <div className="relative w-full h-full flex flex-col items-center select-none overflow-hidden">
      {/* Top Floating View Switcher: [ Before ] [ Compare ] [ After ] */}
      {hasCutout && !isProcessing && (
        <div className="absolute top-4 z-30 flex items-center bg-white/95 backdrop-blur-md rounded-full p-1 border border-[#D9D8D2] shadow-sm text-xs font-medium text-[#6F6F6A] transition-opacity">
          <button
            type="button"
            onClick={() => onModeChange("before")}
            className={`px-3 py-1 rounded-full transition-all ${
              mode === "before"
                ? "bg-[#171717] text-white shadow-xs font-semibold"
                : "hover:text-[#171717] hover:bg-[#ECEBE6]"
            }`}
          >
            Before
          </button>
          <button
            type="button"
            onClick={() => onModeChange("compare")}
            className={`px-3 py-1 rounded-full transition-all ${
              mode === "compare"
                ? "bg-[#171717] text-white shadow-xs font-semibold"
                : "hover:text-[#171717] hover:bg-[#ECEBE6]"
            }`}
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => onModeChange("after")}
            className={`px-3 py-1 rounded-full transition-all ${
              mode === "after"
                ? "bg-[#171717] text-white shadow-xs font-semibold"
                : "hover:text-[#171717] hover:bg-[#ECEBE6]"
            }`}
          >
            After
          </button>
        </div>
      )}

      {/* Main Canvas Viewport with Zoom & Pan */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label="Image comparison viewer"
        onKeyDown={handleKeyDown}
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-default focus:outline-none"
      >
        <div
          className="relative max-w-full max-h-full transition-transform duration-75 ease-out flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Transparent Checkerboard Pattern Layer (Underneath After / Cutout) */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)`,
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              backgroundColor: "#fcfbf9",
            }}
          />

          {/* 1. Base Layer: Transparent Cutout Image (Visible on the right of slider or in 'after' mode) */}
          {transparentUrl ? (
            <img
              src={transparentUrl}
              alt="Removed background cutout"
              draggable={false}
              className={`max-w-[85vw] max-h-[70vh] md:max-w-[70vw] md:max-h-[75vh] object-contain block relative select-none transition-filter duration-200 ${
                hasShadow ? "drop-shadow-xl" : ""
              }`}
              style={{
                filter: hasShadow ? "drop-shadow(0 14px 28px rgba(0,0,0,0.22))" : undefined,
              }}
            />
          ) : (
            // Fallback while processing: original image placeholder
            <img
              src={originalUrl}
              alt="Processing original"
              draggable={false}
              className="max-w-[85vw] max-h-[70vh] md:max-w-[70vw] md:max-h-[75vh] object-contain block relative select-none opacity-90"
            />
          )}

          {/* 2. Top Layer: Original Image (Clipped to slider percentage) */}
          {mode !== "after" && (
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none select-none"
              style={{
                clipPath:
                  mode === "before" || !hasCutout
                    ? "inset(0 0% 0 0)"
                    : `inset(0 ${100 - sliderPos}% 0 0)`,
              }}
            >
              <img
                src={originalUrl}
                alt="Original photo"
                draggable={false}
                className="w-full h-full object-contain block select-none"
              />
            </div>
          )}

          {/* 3. Draggable Split Slider Handle (Only in 'compare' mode when cutout is ready) */}
          {mode === "compare" && hasCutout && !isProcessing && (
            <div
              role="slider"
              aria-valuenow={Math.round(sliderPos)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Before/After comparison position"
              tabIndex={0}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onTouchStart={() => setIsDragging(true)}
              className="absolute top-0 bottom-0 z-20 cursor-ew-resize flex items-center justify-center pointer-events-auto select-none"
              style={{
                left: `${sliderPos}%`,
                transform: "translateX(-50%)",
                width: "40px",
              }}
            >
              {/* Thin Vertical Divider Line */}
              <div className="w-[2px] h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]" />

              {/* Tactile Circular Grab Knob */}
              <div
                className={`absolute w-8 h-8 rounded-full bg-white border border-[#D9D8D2] shadow-md flex items-center justify-center transition-transform ${
                  isDragging ? "scale-110 shadow-lg border-[#171717]" : "hover:scale-105"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#171717"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                  <polyline points="9 18 3 12 9 6" />
                  <polyline points="15 6 21 12 15 18" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtle Bottom Labels in Compare Mode */}
      {mode === "compare" && hasCutout && !isProcessing && (
        <div
          className={`absolute bottom-3 left-4 right-4 flex justify-between pointer-events-none text-[11px] font-semibold uppercase tracking-wider text-[#6F6F6A] transition-opacity duration-200 ${
            isDragging ? "opacity-20" : "opacity-75"
          }`}
        >
          <span className="bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded border border-[#D9D8D2] shadow-2xs">
            Original
          </span>
          <span className="bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded border border-[#D9D8D2] shadow-2xs">
            Removed
          </span>
        </div>
      )}
    </div>
  );
};
