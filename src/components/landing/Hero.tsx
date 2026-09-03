"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Layers, Image as ImageIcon, Zap, Mail, Check } from "lucide-react";

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
  emoji: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const INITIAL_STICKERS: HeroSticker[] = [
  { id: "1", emoji: "🐱", name: "Orange Cat", x: 120, y: 80, rotation: -12, scale: 1.1 },
  { id: "2", emoji: "🍓", name: "Strawberry", x: 340, y: 160, rotation: 18, scale: 1.2 },
  { id: "3", emoji: "🌸", name: "Cherry Blossom", x: 220, y: 220, rotation: -6, scale: 1 },
  { id: "4", emoji: "🎧", name: "Studio Cans", x: 480, y: 90, rotation: 14, scale: 1.15 },
  { id: "5", emoji: "⭐", name: "Sparkle Star", x: 260, y: 40, rotation: 25, scale: 0.9 },
  { id: "6", emoji: "📷", name: "Film Camera", x: 80, y: 260, rotation: 8, scale: 1.1 },
  { id: "7", emoji: "🍵", name: "Matcha", x: 420, y: 250, rotation: -15, scale: 1.05 },
];

export const Hero: React.FC = () => {
  const [stickers, setStickers] = useState<HeroSticker[]>(INITIAL_STICKERS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    setActiveId(id);
    setDragOffset({
      x: e.clientX - sticker.x,
      y: e.clientY - sticker.y,
    });

    // Bring clicked sticker to top
    setStickers((prev) => [...prev.filter((s) => s.id !== id), sticker]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeId) return;

    setStickers((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? {
              ...s,
              x: e.clientX - dragOffset.x,
              y: e.clientY - dragOffset.y,
            }
          : s
      )
    );
  };

  const handlePointerUp = () => {
    setActiveId(null);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="min-h-screen bg-[#F7F6F2] text-[#171717] flex flex-col selection:bg-[#FF5A36] selection:text-white"
    >
      {/* Header */}
      <header className="h-16 border-b border-[#D9D8D2] flex items-center justify-between px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="logo-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="font-semibold text-base tracking-tight text-[#171717]">
            StickerCanvas
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/editor"
            className="px-4 py-2 text-xs font-semibold bg-[#171717] hover:bg-[#333333] text-white rounded-lg transition-all shadow-sm active:scale-95"
          >
            Open editor
          </Link>
        </div>
      </header>

      {/* Main Hero Viewport (Self-contained, perfectly framed) */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 flex flex-col justify-between min-h-[calc(100vh-4rem)] py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
          {/* Left: Editorial Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D9D8D2] bg-white text-xs font-medium text-[#171717] shadow-2xs select-none">
              <span className="w-2 h-2 rounded-full bg-[#69A875]" />
              <span className="text-[#6F6F6A]">Creative ·</span>
              <span className="font-handwriting text-[18px] text-[#FF5A36] -rotate-3 inline-block font-bold tracking-wide -my-1">
                tactile
              </span>
              <span className="text-[#6F6F6A]">· Fast</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#171717] leading-[1.08]">
              Put stuff together.<br />
              <span className="underline decoration-[#FF5A36] decoration-4 underline-offset-4">
                Make something good.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#6F6F6A] leading-relaxed max-w-lg">
              Drag in stickers, photos, screenshots, and whatever else you’ve got. Move them around until it feels right. Export in sharp 4K.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/editor"
                className="px-7 py-3.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-sm font-semibold rounded-xl flex items-center gap-2.5 shadow-sm transition-all active:scale-95 group"
              >
                <span>Start making</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className="text-xs text-[#6F6F6A]">
                Free · In your browser · No login
              </span>
            </div>
          </div>

          {/* Right: Interactive Tactile Playground */}
          <div className="lg:col-span-6">
            <div className="relative h-[340px] sm:h-[390px] w-full rounded-2xl border border-[#D9D8D2] paper-bg shadow-sm overflow-hidden select-none">
              <div className="absolute top-3 left-4 text-[11px] font-medium text-[#6F6F6A] pointer-events-none">
                Interactive playground · Drag stickers around ↘
              </div>

              {stickers.map((s) => (
                <div
                  key={s.id}
                  onPointerDown={(e) => handlePointerDown(s.id, e)}
                  style={{
                    transform: `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rotation}deg) scale(${s.scale})`,
                    cursor: activeId === s.id ? "grabbing" : "grab",
                  }}
                  className="absolute text-5xl sm:text-6xl select-none filter drop-shadow-sm hover:scale-110 active:scale-125 transition-transform duration-100 ease-out"
                >
                  {s.emoji}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Bottom Anchor Strip */}
        <div className="pt-4 border-t border-[#D9D8D2]/70 flex items-center justify-between text-xs text-[#6F6F6A] mt-4 select-none">
          <span className="hidden sm:inline font-mono text-[11px]">
            PIXIJS GPU ENGINE · 60 FPS
          </span>
          <a
            href="#craft"
            className="font-handwriting text-base text-[#171717] hover:text-[#FF5A36] transition-colors flex items-center gap-1.5 mx-auto sm:mx-0"
          >
            <span>the craft under the hood</span>
            <span className="inline-block translate-y-0.5">↓</span>
          </a>
          <span className="hidden sm:inline font-mono text-[11px]">
            ORIGINAL QUALITY PRESERVED
          </span>
        </div>
      </main>

      {/* Feature Section: Tactile Studio Cards */}
      <section id="craft" className="py-20 border-t border-[#D9D8D2] max-w-7xl mx-auto w-full px-6 sm:px-12">
        <div className="max-w-xl mb-12 space-y-2">
          <span className="font-handwriting text-xl text-[#FF5A36] -rotate-2 inline-block font-bold">
            the studio engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
            Digital speed. Physical feel.
          </h2>
          <p className="text-xs sm:text-sm text-[#6F6F6A] leading-relaxed">
            Every interaction is tuned to feel direct, responsive, and tactile under your fingers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 01 */}
          <div className="bg-white border border-[#D9D8D2] hover:border-[#171717] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9D8D2] flex items-center justify-center text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                  <Zap size={15} />
                </div>
                <span className="font-mono text-[10px] text-[#6F6F6A] tracking-wider">01</span>
              </div>
              <h3 className="font-semibold text-sm text-[#171717]">Direct & Tactile</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                GPU-accelerated 2D scene graph powered by PixiJS. Move 100+ objects with direct 60 FPS response.
              </p>
            </div>
          </div>

          {/* Card 02 */}
          <div className="bg-white border border-[#D9D8D2] hover:border-[#171717] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9D8D2] flex items-center justify-center text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                  <Sparkles size={15} />
                </div>
                <span className="font-mono text-[10px] text-[#6F6F6A] tracking-wider">02</span>
              </div>
              <h3 className="font-semibold text-sm text-[#171717]">Paste Anything</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Hit <kbd className="px-1 py-0.5 bg-[#FAF9F5] border border-[#D9D8D2] rounded text-[10px] font-mono text-[#171717]">Ctrl+V</kbd> anytime. Paste photos or screenshots directly from your clipboard without file dialogs.
              </p>
            </div>
          </div>

          {/* Card 03 */}
          <div className="bg-white border border-[#D9D8D2] hover:border-[#171717] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9D8D2] flex items-center justify-center text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                  <ImageIcon size={15} />
                </div>
                <span className="font-mono text-[10px] text-[#6F6F6A] tracking-wider">03</span>
              </div>
              <h3 className="font-semibold text-sm text-[#171717]">Make It a Sticker</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Drop any photo to instantly remove backgrounds with adjustable sensitivity and optional die-cut white border.
              </p>
            </div>
          </div>

          {/* Card 04 */}
          <div className="bg-white border border-[#D9D8D2] hover:border-[#171717] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D9D8D2] flex items-center justify-center text-[#171717] group-hover:bg-[#171717] group-hover:text-white transition-colors">
                  <Layers size={15} />
                </div>
                <span className="font-mono text-[10px] text-[#6F6F6A] tracking-wider">04</span>
              </div>
              <h3 className="font-semibold text-sm text-[#171717]">High-Res Export</h3>
              <p className="text-xs text-[#6F6F6A] leading-relaxed">
                Export in pristine 1×, 2×, or 4× resolution with transparent PNG, JPEG, or WebP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Updates & GitHub Banner */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 pb-16">
        <div className="border border-[#D9D8D2] bg-white rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xs">
          <div className="space-y-2 text-center md:text-left max-w-md">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECEBE6] text-[11px] font-medium text-[#171717]">
              Product Updates
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#171717]">
              Fresh stickers & tools dropping regularly.
            </h3>
            <p className="text-xs sm:text-sm text-[#6F6F6A] leading-relaxed">
              Get notified when new sticker packs, background tools, and canvas features arrive.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Email Subscribe Form */}
            {subscribed ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#69A875]/10 text-[#69A875] border border-[#69A875]/30 rounded-xl text-xs font-semibold">
                <Check size={16} />
                <span>You’re on the list! We’ll keep you posted.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) {
                    setSubscribed(true);
                  }
                }}
                className="flex items-center gap-1.5 w-full sm:w-auto border border-[#D9D8D2] bg-[#FAF9F5] p-1 rounded-xl focus-within:border-[#171717] transition-all"
              >
                <Mail size={16} className="text-[#6F6F6A] ml-2.5 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-transparent px-2 py-1.5 text-xs text-[#171717] focus:outline-none w-full sm:w-48 placeholder-[#6F6F6A]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold rounded-lg shadow-xs active:scale-95 transition-all whitespace-nowrap"
                >
                  Join updates
                </button>
              </form>
            )}

            {/* GitHub Button */}
            <a
              href="https://github.com/rutujdhawale"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#D9D8D2] hover:border-[#171717] bg-white hover:bg-[#ECEBE6] text-xs font-semibold text-[#171717] rounded-xl transition-all shadow-xs w-full sm:w-auto active:scale-95"
            >
              <GithubIcon size={16} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D9D8D2] py-8 px-6 sm:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F6F6A]">
        <div className="flex items-center gap-2">
          <div className="logo-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="font-semibold text-[#171717]">StickerCanvas</span>
          <span>· Designed for human creativity</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/rutujdhawale"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#171717] transition-colors flex items-center gap-1.5"
          >
            <GithubIcon size={14} />
            <span>GitHub</span>
          </a>
          <a
            href="mailto:hello@stickercanvas.com"
            className="hover:text-[#171717] transition-colors flex items-center gap-1"
          >
            <Mail size={14} />
            <span>Contact</span>
          </a>
          <Link href="/editor" className="text-[#FF5A36] font-medium hover:underline">
            Open Editor →
          </Link>
        </div>
      </footer>
    </div>
  );
};
