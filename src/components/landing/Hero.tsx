"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  Scissors,
  Printer,
  UploadCloud,
  Shuffle,
  Eye,
  Check,
  Mail,
  Layers,
  Laptop,
  Maximize2,
  Sliders,
} from "lucide-react";
import { useEditorStore, generateId, generateAssetId } from "@/store/editorStore";

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className="flex-shrink-0"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface HeroSticker {
  id: string;
  emoji?: string;
  imageUrl?: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  borderWidth?: number;
}

const DEFAULT_STICKERS: HeroSticker[] = [
  { id: "s1", imageUrl: "/stickers/diet-coke.png", name: "Diet Coke Can", x: 80, y: 50, rotation: -8, scale: 1.15, borderWidth: 8 },
  { id: "s2", imageUrl: "/stickers/matcha.png", name: "Iced Matcha Latte", x: 270, y: 60, rotation: 7, scale: 1.12, borderWidth: 8 },
  { id: "s3", emoji: "🐱", name: "Ginger Cat", x: 470, y: 45, rotation: -12, scale: 1.1, borderWidth: 6 },
  { id: "s4", emoji: "🎧", name: "Studio Headphones", x: 670, y: 70, rotation: 14, scale: 1.05, borderWidth: 6 },
  { id: "s5", emoji: "🍓", name: "Strawberry", x: 140, y: 220, rotation: 18, scale: 1.15, borderWidth: 6 },
  { id: "s6", emoji: "📷", name: "Film Camera", x: 360, y: 210, rotation: -6, scale: 1.08, borderWidth: 6 },
  { id: "s7", emoji: "⭐", name: "Sparkle Star", x: 570, y: 230, rotation: 22, scale: 1.0, borderWidth: 6 },
  { id: "s8", emoji: "🌸", name: "Sakura Blossom", x: 740, y: 200, rotation: -16, scale: 0.95, borderWidth: 6 },
];

export const Hero: React.FC = () => {
  const router = useRouter();
  const { addObject, addAsset } = useEditorStore();

  const [stickers, setStickers] = useState<HeroSticker[]>(DEFAULT_STICKERS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [borderThickness, setBorderThickness] = useState<number>(8);
  const [isHeroDragOver, setIsHeroDragOver] = useState(false);
  const [interactiveCompare, setInteractiveCompare] = useState<number>(50);

  // Email updates
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const heroMatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag sticker handler on the interactive cutting mat
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker || !heroMatRef.current) return;

    const rect = heroMatRef.current.getBoundingClientRect();
    setActiveId(id);
    setDragOffset({
      x: e.clientX - rect.left - sticker.x,
      y: e.clientY - rect.top - sticker.y,
    });

    // Bring clicked sticker to top
    setStickers((prev) => [...prev.filter((s) => s.id !== id), sticker]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeId || !heroMatRef.current) return;
    const rect = heroMatRef.current.getBoundingClientRect();

    setStickers((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              x: Math.max(10, Math.min(rect.width - 110, e.clientX - rect.left - dragOffset.x)),
              y: Math.max(10, Math.min(rect.height - 110, e.clientY - rect.top - dragOffset.y)),
            }
          : s
      )
    );
  };

  const handlePointerUp = () => {
    setActiveId(null);
  };

  // Shuffle sticker positions organically
  const handleShuffle = () => {
    if (!heroMatRef.current) return;
    const rect = heroMatRef.current.getBoundingClientRect();
    const maxX = Math.max(200, rect.width - 120);
    const maxY = Math.max(160, rect.height - 120);

    setStickers((prev) =>
      prev.map((s, idx) => ({
        ...s,
        x: 40 + ((idx * 95) % (maxX - 60)) + (Math.random() * 30 - 15),
        y: 40 + (Math.floor((idx * 95) / (maxX - 60)) * 140) % (maxY - 40) + (Math.random() * 30 - 15),
        rotation: Math.round(Math.random() * 40 - 20),
      }))
    );
  };

  // Global paste handler on landing page: drop an image anywhere to enter editor directly!
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvt) => {
              const dataUrl = uploadEvt.target?.result as string;
              if (dataUrl) {
                // Store asset and jump directly to editor
                const assetId = generateAssetId();
                addAsset({
                  id: assetId,
                  name: "Pasted Photo",
                  src: dataUrl,
                  thumbnailSrc: dataUrl,
                  originalWidth: 500,
                  originalHeight: 500,
                  type: "paste",
                });
                addObject({
                  id: generateId(),
                  assetId,
                  name: "Pasted Photo",
                  x: 600,
                  y: 400,
                  width: 320,
                  height: 320,
                  rotation: 0,
                  opacity: 1,
                  scaleX: 1,
                  scaleY: 1,
                  flipX: false,
                  flipY: false,
                  zIndex: 1,
                  visible: true,
                  locked: false,
                  borderWidth: 8,
                  borderColor: "#ffffff",
                  hasShadow: true,
                });
                router.push("/editor");
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addAsset, addObject, router]);

  // Handle direct file drop on the hero section
  const handleHeroDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHeroDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith("image/")) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        const dataUrl = uploadEvt.target?.result as string;
        if (dataUrl) {
          const assetId = generateAssetId();
          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          addAsset({
            id: assetId,
            name: cleanName,
            src: dataUrl,
            thumbnailSrc: dataUrl,
            originalWidth: 500,
            originalHeight: 500,
            type: "upload",
          });
          addObject({
            id: generateId(),
            assetId,
            name: cleanName,
            x: 600,
            y: 400,
            width: 320,
            height: 320,
            rotation: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            flipX: false,
            flipY: false,
            zIndex: 1,
            visible: true,
            locked: false,
            borderWidth: 8,
            borderColor: "#ffffff",
            hasShadow: true,
          });
          router.push("/editor");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsHeroDragOver(true);
        }
      }}
      onDragLeave={() => setIsHeroDragOver(false)}
      onDrop={handleHeroDrop}
      className="min-h-screen bg-[#FBFBF9] text-[#141414] flex flex-col selection:bg-[#FF5A36] selection:text-white font-sans antialiased"
    >
      {/* Drop overlay if user drags an image onto the window */}
      {isHeroDragOver && (
        <div className="fixed inset-0 z-50 bg-[#171717]/80 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
          <UploadCloud size={54} className="text-[#FF5A36] animate-bounce mb-3" />
          <p className="text-2xl font-bold tracking-tight">Drop your photo to create a sticker</p>
          <p className="text-sm text-white/70 mt-1 font-mono">Instant Turbo AI segmentation · 100% in-browser</p>
        </div>
      )}

      {/* ─── Minimal High-Design Navigation ─── */}
      <header className="h-16 border-b border-[#E7E5DF] flex items-center justify-between px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          {/* Tactile Logo Mark */}
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-6 rounded-full bg-[#141414] -rotate-12 transform origin-bottom transition-transform hover:rotate-0" />
            <span className="w-2.5 h-6 rounded-full bg-[#FF5A36] rotate-0 transform transition-transform hover:scale-110" />
            <span className="w-2.5 h-6 rounded-full bg-[#4A6CFF] rotate-12 transform origin-bottom transition-transform hover:rotate-0" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#141414]">
            StickerCanvas
          </span>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#ECEAE3] text-[#6F6F6A]">
            v2.4 Turbo AI
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#6F6F6A] font-mono">
            <kbd className="px-1.5 py-0.5 bg-[#ECEAE3] border border-[#D9D8D2] rounded text-[10px] text-[#141414]">⌘V</kbd>
            <span>paste anywhere</span>
          </span>
          <Link
            href="/editor"
            className="px-4 py-2 text-xs font-semibold bg-[#141414] hover:bg-[#2A2A2A] text-white rounded-xl shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
          >
            <span>Open Studio</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* ─── Hero Statement & Visual Stage ─── */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 pt-12 pb-16 flex flex-col items-center">
        {/* Minimal pill badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2DFD7] shadow-2xs text-xs font-medium text-[#4A4A46] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
          <span>Instant WebGPU AI · Zero Cloud Uploads · 100% Client-Side Privacy</span>
        </div>

        {/* Minimalist Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-[#141414] text-center leading-[1.06] max-w-4xl">
          The tactile canvas for{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10 text-[#FF5A36]">stickers</span>
            <span className="absolute bottom-1.5 left-0 right-0 h-3.5 bg-[#FF5A36]/15 rounded-md -rotate-1 -z-0" />
          </span>
          , cutouts & ideas.
        </h1>

        <p className="text-base sm:text-lg text-[#6F6F6A] text-center max-w-xl mt-5 leading-relaxed">
          Drop any photo. Our browser-native engine removes the background in milliseconds, wraps it in authentic die-cut vinyl, and places it on a 60 FPS cutting mat.
        </p>

        {/* Primary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 w-full sm:w-auto">
          <Link
            href="/editor"
            className="w-full sm:w-auto px-7 py-3.5 bg-[#FF5A36] hover:bg-[#E84E2C] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 group"
          >
            <span>Start creating — it’s free</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-[#F3F2EE] text-[#141414] border border-[#D9D8D2] text-sm font-semibold rounded-xl shadow-2xs transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Laptop size={16} className="text-[#6F6F6A]" />
            <span>Upload from device</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (uploadEvt) => {
                  const dataUrl = uploadEvt.target?.result as string;
                  if (dataUrl) {
                    const assetId = generateAssetId();
                    addAsset({
                      id: assetId,
                      name: file.name.replace(/\.[^/.]+$/, ""),
                      src: dataUrl,
                      thumbnailSrc: dataUrl,
                      originalWidth: 500,
                      originalHeight: 500,
                      type: "upload",
                    });
                    router.push("/editor");
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>

        {/* ─── Section: The Living Cutting Mat (Interactive Hero Canvas) ─── */}
        <div className="w-full mt-12">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
              <span className="text-xs font-semibold text-[#141414] tracking-tight">Interactive Desk</span>
              <span className="text-xs text-[#6F6F6A] hidden sm:inline">• Drag stickers anywhere · Test border thickness</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Border tuner */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#D9D8D2] shadow-2xs">
                <Sliders size={12} className="text-[#6F6F6A]" />
                <span className="text-[11px] font-medium text-[#6F6F6A]">Die-cut Border:</span>
                {[0, 4, 8, 14].map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      setBorderThickness(w);
                      setStickers((prev) => prev.map((s) => ({ ...s, borderWidth: w })));
                    }}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-mono font-medium transition-colors ${
                      borderThickness === w
                        ? "bg-[#141414] text-white"
                        : "text-[#6F6F6A] hover:text-[#141414]"
                    }`}
                  >
                    {w === 0 ? "Off" : `${w}px`}
                  </button>
                ))}
              </div>

              {/* Shuffle button */}
              <button
                onClick={handleShuffle}
                className="px-2.5 py-1 bg-white hover:bg-[#F3F2EE] border border-[#D9D8D2] rounded-lg text-xs font-medium text-[#141414] flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                title="Shuffle positions"
              >
                <Shuffle size={12} className="text-[#6F6F6A]" />
                <span className="text-[11px]">Scatter</span>
              </button>

              <Link
                href="/editor"
                className="px-3 py-1 bg-white hover:bg-[#F3F2EE] border border-[#D9D8D2] rounded-lg text-xs font-semibold text-[#FF5A36] flex items-center gap-1 shadow-2xs transition-all"
              >
                <Maximize2 size={12} />
                <span className="text-[11px]">Full Studio</span>
              </Link>
            </div>
          </div>

          {/* Canvas Workspace Box */}
          <div
            ref={heroMatRef}
            className="relative h-[440px] sm:h-[520px] w-full rounded-2xl border border-[#D9D8D2] bg-[#FAF9F5] shadow-sm overflow-hidden select-none"
          >
            {/* Architectural Cutting Mat Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#D5D2C9_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

            {/* Subtle center alignment crosshair */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-full h-px bg-[#141414]" />
              <div className="h-full w-px bg-[#141414] absolute" />
            </div>

            {/* Draggable Stickers */}
            {stickers.map((s) => {
              const isSelected = activeId === s.id;
              const hasBorder = (s.borderWidth ?? borderThickness) > 0;
              const bw = s.borderWidth ?? borderThickness;

              return (
                <div
                  key={s.id}
                  onPointerDown={(e) => handlePointerDown(s.id, e)}
                  style={{
                    transform: `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rotation}deg) scale(${s.scale})`,
                    cursor: isSelected ? "grabbing" : "grab",
                  }}
                  className={`absolute select-none flex items-center justify-center transition-shadow duration-150 ${
                    isSelected ? "z-30 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)]" : "z-10"
                  }`}
                >
                  {s.imageUrl ? (
                    <div
                      style={{
                        padding: hasBorder ? `${bw / 2}px` : "0",
                        filter: hasBorder ? `drop-shadow(0 0 ${bw}px #ffffff) drop-shadow(0 6px 14px rgba(0,0,0,0.16))` : "drop-shadow(0 6px 14px rgba(0,0,0,0.14))",
                      }}
                      className="transition-all duration-150"
                    >
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        draggable={false}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain pointer-events-none select-none"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        filter: hasBorder ? `drop-shadow(0 0 ${bw}px #ffffff) drop-shadow(0 6px 14px rgba(0,0,0,0.16))` : "drop-shadow(0 4px 10px rgba(0,0,0,0.12))",
                      }}
                      className="text-6xl sm:text-7xl select-none"
                    >
                      {s.emoji}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom hint pill */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-[#D9D8D2] shadow-2xs text-[11px] text-[#6F6F6A] pointer-events-none flex items-center gap-1.5">
              <span>💡 Grab any sticker to rearrange · Paste photos directly with</span>
              <kbd className="px-1 py-0.2 bg-[#ECEAE3] border border-[#D9D8D2] rounded text-[9px] text-[#141414] font-mono">Ctrl+V</kbd>
            </div>
          </div>
        </div>

        {/* ─── 3 Minimalist Craft Pillars ─── */}
        <section className="w-full mt-24">
          <div className="mb-10 text-center">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#FF5A36]">
              ENGINEERED FOR FLOW
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141414] mt-1.5">
              Everything you need. Nothing in the way.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Turbo AI Background Removal */}
            <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:border-[#141414]/40 transition-colors">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#FF5A36]/10 text-[#FF5A36] flex items-center justify-center mb-4">
                  <Sparkles size={18} />
                </div>
                <div className="font-mono text-[10px] text-[#6F6F6A] uppercase tracking-wider mb-1">
                  01 · Segmentation
                </div>
                <h3 className="text-lg font-bold text-[#141414]">
                  Turbo AI Background Removal
                </h3>
                <p className="text-xs text-[#6F6F6A] leading-relaxed mt-2">
                  Drop any camera photo. RMBG-1.4 executes via in-browser WebGPU in ~150ms. Preserves handheld items, accessories, hair, and multiple people.
                </p>
              </div>

              {/* Interactive interactive preview slider */}
              <div className="mt-6 pt-5 border-t border-[#EAE8E1]">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#D9D8D2] select-none">
                  {/* Checkerboard background */}
                  <div className="absolute inset-0 checkerboard opacity-40" />
                  
                  {/* Cutout sticker image */}
                  <img
                    src="/stickers/diet-coke.png"
                    alt="Cutout"
                    className="absolute inset-0 w-full h-full object-contain p-2 filter drop-shadow-md"
                  />
                  
                  {/* Slidable original overlay */}
                  <div
                    style={{ clipPath: `inset(0 ${100 - interactiveCompare}% 0 0)` }}
                    className="absolute inset-0 bg-[#EFECE5] flex items-center justify-center"
                  >
                    <img
                      src="/stickers/diet-coke.jpg"
                      alt="Original"
                      className="w-full h-full object-contain p-2"
                    />
                  </div>

                  {/* Split handle */}
                  <div
                    style={{ left: `${interactiveCompare}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
                  >
                    <div className="w-4 h-4 rounded-full bg-white border border-[#D9D8D2] shadow-xs -ml-[7px] top-1/2 -translate-y-1/2 absolute" />
                  </div>

                  {/* Slider control */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={interactiveCompare}
                    onChange={(e) => setInteractiveCompare(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                    title="Slide to compare original vs cutout"
                  />
                </div>
                <span className="text-[10px] text-[#6F6F6A] text-center block mt-2 font-mono">
                  Drag slider to compare photo vs cutout
                </span>
              </div>
            </div>

            {/* Card 2: Authentic Die-Cut Vinyl */}
            <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:border-[#141414]/40 transition-colors">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#4A6CFF]/10 text-[#4A6CFF] flex items-center justify-center mb-4">
                  <Scissors size={18} />
                </div>
                <div className="font-mono text-[10px] text-[#6F6F6A] uppercase tracking-wider mb-1">
                  02 · Vinyl Finish
                </div>
                <h3 className="text-lg font-bold text-[#141414]">
                  Physical Die-Cut Vinyl Contour
                </h3>
                <p className="text-xs text-[#6F6F6A] leading-relaxed mt-2">
                  True vinyl stickers aren’t just cutouts — they have uniform white sticker margins and physical 3D drop shadows that lift right off the screen.
                </p>
              </div>

              {/* Visual preview of die-cut contour */}
              <div className="mt-6 pt-5 border-t border-[#EAE8E1]">
                <div className="aspect-video rounded-xl bg-[#FAF9F5] border border-[#D9D8D2] flex items-center justify-center p-3 relative overflow-hidden">
                  <div className="w-24 h-24 relative flex items-center justify-center">
                    <img
                      src="/stickers/matcha.png"
                      alt="Matcha Sticker"
                      className="w-full h-full object-contain filter drop-shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6F6F6A] mt-2 font-medium px-1">
                  <span>Customizable 2px – 18px</span>
                  <span className="text-[#2E7D32] font-semibold">Vinyl Contour ✓</span>
                </div>
              </div>
            </div>

            {/* Card 3: 300 DPI Print Studio */}
            <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:border-[#141414]/40 transition-colors">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center mb-4">
                  <Printer size={18} />
                </div>
                <div className="font-mono text-[10px] text-[#6F6F6A] uppercase tracking-wider mb-1">
                  03 · Physical Output
                </div>
                <h3 className="text-lg font-bold text-[#141414]">
                  300 DPI Print Sticker Sheets
                </h3>
                <p className="text-xs text-[#6F6F6A] leading-relaxed mt-2">
                  Ready for home inkjet printers, Cricut, and Silhouette. Export pristine sheets formatted for A4, US Letter, or 4×6 photo card sticker paper.
                </p>
              </div>

              {/* Visual preview of print sheet */}
              <div className="mt-6 pt-5 border-t border-[#EAE8E1]">
                <div className="aspect-video rounded-xl bg-white border border-[#D9D8D2] p-2.5 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#6F6F6A] border-b border-[#ECEAE3] pb-1">
                    <span>A4 · 300 DPI</span>
                    <span className="text-[#FF5A36]">Scissor lines ✓</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 py-2">
                    {["🥤", "🍵", "🐱", "📷"].map((em, i) => (
                      <div key={i} className="aspect-square border border-dashed border-[#D9D8D2] rounded flex items-center justify-center text-xl bg-[#FAF9F5]">
                        {em}
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] font-mono text-[#6F6F6A] text-right">
                    Subpixel vector rasterization
                  </div>
                </div>
                <span className="text-[10px] text-[#6F6F6A] text-center block mt-2 font-mono">
                  Direct browser print or high-res download
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Updates & Community Section ─── */}
        <section className="w-full mt-20">
          <div className="border border-[#E2DFD7] bg-white rounded-2xl p-7 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xs">
            <div className="space-y-2 text-center md:text-left max-w-md">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECEAE3] text-[11px] font-medium text-[#141414]">
                Release Updates
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#141414]">
                Fresh sticker packs & tools dropping weekly.
              </h3>
              <p className="text-xs sm:text-sm text-[#6F6F6A] leading-relaxed">
                Stay in the loop as new background tools, cutting guides, and community packs arrive.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {subscribed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/30 rounded-xl text-xs font-semibold">
                  <Check size={16} />
                  <span>You’re subscribed! We’ll keep you posted.</span>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!email || submitting) return;
                    setSubmitting(true);
                    try {
                      await fetch("/api/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                      });
                      setSubscribed(true);
                    } catch {
                      setSubscribed(true);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 w-full sm:w-auto border border-[#D9D8D2] bg-[#FAF9F5] p-1 rounded-xl focus-within:border-[#141414] transition-all"
                >
                  <Mail size={16} className="text-[#6F6F6A] ml-2.5 flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    disabled={submitting}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="bg-transparent px-2 py-1.5 text-xs text-[#141414] focus:outline-none w-full sm:w-52 placeholder-[#6F6F6A] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#141414] hover:bg-[#2A2A2A] disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs active:scale-95 transition-all whitespace-nowrap"
                  >
                    {submitting ? "Joining..." : "Join list"}
                  </button>
                </form>
              )}

              <a
                href="https://github.com/rutujdhawale"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#D9D8D2] hover:border-[#141414] bg-white hover:bg-[#F3F2EE] text-xs font-semibold text-[#141414] rounded-xl transition-all shadow-2xs w-full sm:w-auto active:scale-98"
              >
                <GithubIcon size={16} />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#E7E5DF] py-8 px-6 sm:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F6F6A]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[#141414]">StickerCanvas</span>
          <span>· Designed for human craft & tactile creativity</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/rutujdhawale"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#141414] transition-colors flex items-center gap-1.5"
          >
            <GithubIcon size={14} />
            <span>GitHub</span>
          </a>
          <Link href="/editor" className="text-[#FF5A36] font-semibold hover:underline">
            Open Studio Canvas →
          </Link>
        </div>
      </footer>
    </div>
  );
};
