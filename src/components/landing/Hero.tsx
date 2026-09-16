"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Scissors,
  Printer,
  Layers,
  ShieldCheck,
  Smartphone,
  MessageSquarePlus,
  User as UserIcon,
  Check,
  Zap,
} from "lucide-react";
import { loadArtwork } from "@/lib/storage";
import { StickerLogoMark } from "@/components/common/StickerLogoMark";
import { AuthModal } from "@/components/auth/AuthModal";
import { FeedbackModal } from "@/components/common/FeedbackModal";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

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
}

const INITIAL_STICKERS: HeroSticker[] = [
  { id: "1", imageUrl: "/stickers/diet-coke.png", name: "Diet Coke", x: 40, y: 30, rotation: -6, scale: 1.15 },
  { id: "2", imageUrl: "/stickers/matcha.png", name: "Iced Matcha", x: 190, y: 35, rotation: 8, scale: 1.1 },
  { id: "3", emoji: "🐱", name: "Orange Cat", x: 340, y: 35, rotation: -14, scale: 1.1 },
  { id: "4", emoji: "🍓", name: "Strawberry", x: 60, y: 190, rotation: 16, scale: 1.15 },
  { id: "5", emoji: "🎧", name: "Studio Cans", x: 380, y: 170, rotation: 12, scale: 1.1 },
  { id: "6", emoji: "⭐", name: "Sparkle Star", x: 220, y: 180, rotation: 22, scale: 0.95 },
  { id: "7", emoji: "📷", name: "Film Camera", x: 310, y: 225, rotation: -6, scale: 1.05 },
  { id: "8", emoji: "🌸", name: "Cherry Blossom", x: 430, y: 20, rotation: 15, scale: 0.9 },
];

export const Hero: React.FC = () => {
  const [stickers, setStickers] = useState<HeroSticker[]>(INITIAL_STICKERS);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [hasSavedArtwork, setHasSavedArtwork] = useState(false);
  const [preferStudioDirect, setPreferStudioDirect] = useState(false);

  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { openFeedbackModal } = useUIStore();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPreferStudioDirect(localStorage.getItem("stickercanvas_open_studio_direct") === "true");
      loadArtwork()
        .then((data) => {
          if (data?.document?.objects && data.document.objects.length > 0) {
            setHasSavedArtwork(true);
          }
        })
        .catch(() => { });
    }
  }, []);

  // High-performance drag tracking ref
  const dragRef = useRef<{
    id: string;
    element: HTMLElement;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    currentX: number;
    currentY: number;
    rotation: number;
    scale: number;
    rafId: number | null;
  } | null>(null);

  const handlePointerDown = useCallback((id: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;

    try {
      el.setPointerCapture(e.pointerId);
    } catch { }

    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;

    setActiveDragId(id);

    dragRef.current = {
      id,
      element: el,
      startX: e.clientX,
      startY: e.clientY,
      initialX: sticker.x,
      initialY: sticker.y,
      currentX: sticker.x,
      currentY: sticker.y,
      rotation: sticker.rotation,
      scale: sticker.scale,
      rafId: null,
    };

    // Instant response: zero transition latency and elevated z-index while dragging
    el.style.transition = "none";
    el.style.zIndex = "50";
    el.style.cursor = "grabbing";
    el.style.transform = `translate3d(${sticker.x}px, ${sticker.y}px, 0) rotate(${sticker.rotation}deg) scale(${sticker.scale * 1.1})`;

    // Reorder in state so active sticker is on top
    setStickers((prev) => [...prev.filter((s) => s.id !== id), sticker]);
  }, [stickers]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    drag.currentX = drag.initialX + deltaX;
    drag.currentY = drag.initialY + deltaY;

    // Direct GPU transform update on animation frame for silky smooth 120 FPS
    if (drag.rafId === null) {
      drag.rafId = requestAnimationFrame(() => {
        if (dragRef.current) {
          const d = dragRef.current;
          d.element.style.transform = `translate3d(${d.currentX}px, ${d.currentY}px, 0) rotate(${d.rotation}deg) scale(${d.scale * 1.1})`;
          d.rafId = null;
        }
      });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.rafId !== null) {
      cancelAnimationFrame(drag.rafId);
      drag.rafId = null;
    }

    try {
      drag.element.releasePointerCapture(e.pointerId);
    } catch { }

    const finalX = drag.currentX;
    const finalY = drag.currentY;
    const id = drag.id;

    drag.element.style.transition = "";
    drag.element.style.zIndex = "";
    drag.element.style.cursor = "grab";

    dragRef.current = null;
    setActiveDragId(null);

    // Commit final position to React state
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: finalX, y: finalY } : s))
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] flex flex-col justify-between selection:bg-[#FF5A36] selection:text-white">
      {/* Header */}
      <header className="h-16 border-b border-[#D9D8D2] flex items-center justify-between px-6 sm:px-12 max-w-7xl mx-auto w-full sticky top-0 bg-[#F7F6F2]/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-[#171717] hover:opacity-85 transition-opacity">
            <StickerLogoMark size={24} />
            <span className="font-semibold text-base tracking-tight text-[#171717]">
              StickerCanvas
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-[#6F6F6A]">
            <Link
              href="/remove-background"
              className="hover:text-[#171717] transition-colors flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#ECEBE6]"
            >
              <Scissors size={13} className="text-[#FF5A36]" />
              <span>Remove Background</span>
            </Link>

            <button
              type="button"
              onClick={openFeedbackModal}
              className="hover:text-[#171717] transition-colors flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#ECEBE6]"
            >
              <MessageSquarePlus size={13} />
              <span>Feedback</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg text-xs font-medium text-[#171717] bg-white border border-[#D9D8D2]">
              <div className="w-5 h-5 rounded-full bg-[#FF5A36] text-white flex items-center justify-center text-[10px] font-bold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden sm:inline truncate max-w-[100px]">{user.name}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="text-xs font-medium text-[#171717] px-3 py-1.5 rounded-lg border border-[#D9D8D2] hover:border-[#171717] bg-white transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <UserIcon size={13} />
              <span>Sign in</span>
            </button>
          )}

          <Link
            href="/editor"
            className="px-4 py-2 text-xs font-semibold bg-[#171717] hover:bg-[#333333] text-white rounded-lg transition-all shadow-sm active:scale-95"
          >
            Open editor
          </Link>
        </div>
      </header>

      {/* Main Hero Viewport */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 flex-1 flex flex-col justify-center py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Editorial Copy */}
          <div className="lg:col-span-6 space-y-6">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171717] leading-[1.08]">
              Put stuff together.<br />
              <span className="underline decoration-[#FF5A36] decoration-4 underline-offset-4">
                Make something
              </span><br />
              <span className="underline decoration-[#FF5A36] decoration-4 underline-offset-4">
                good.
              </span>
            </h1>

            {/* <p className="text-sm sm:text-base text-[#6F6F6A] max-w-md leading-relaxed">
              Cut out stickers with on-device AI, arrange them with smooth physics, add vinyl die-cut borders, and export 300 DPI production sheets.
            </p> */}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {hasSavedArtwork ? (
                <>
                  <Link
                    href="/editor"
                    className="inline-flex px-7 py-3.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-sm font-bold rounded-xl items-center gap-2.5 shadow-xs transition-all active:scale-95 group"
                  >
                    <span>Continue editing</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>

                </>
              ) : (
                <>
                  <Link
                    href="/editor"
                    className="inline-flex px-7 py-3.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-sm font-bold rounded-xl items-center gap-2.5 shadow-xs transition-all active:scale-95 group"
                  >
                    <span>Start creating</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/remove-background"
                    className="inline-flex px-5 py-3.5 bg-white hover:bg-[#ECEBE6] text-[#171717] border border-[#D9D8D2] text-sm font-semibold rounded-xl items-center gap-2 transition-all active:scale-95"
                  >
                    <Scissors size={15} className="text-[#FF5A36]" />
                    <span>Remove BG Tool</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right: Interactive Tactile Playground */}
          <div className="lg:col-span-6">
            <div className="relative h-[340px] sm:h-[390px] w-full rounded-2xl border border-[#D9D8D2] paper-bg shadow-sm overflow-hidden select-none touch-none">
              <div className="absolute top-3 left-4 text-[11px] font-medium text-[#6F6F6A] pointer-events-none z-10 select-none">
                Interactive playground · Drag stickers around ↘
              </div>

              {stickers.map((s) => {
                const isDragging = activeDragId === s.id;
                return (
                  <div
                    key={s.id}
                    onPointerDown={(e) => handlePointerDown(s.id, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      transform: `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rotation}deg) scale(${s.scale})`,
                      cursor: isDragging ? "grabbing" : "grab",
                      touchAction: "none",
                      willChange: "transform",
                    }}
                    className={`absolute select-none flex items-center justify-center cursor-grab ${isDragging
                        ? "transition-none"
                        : "transition-transform duration-150 ease-out hover:scale-110 active:scale-115"
                      }`}
                  >
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        draggable={false}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.16)] select-none"
                      />
                    ) : (
                      <span className="text-5xl sm:text-6xl filter drop-shadow-[0_3px_6px_rgba(0,0,0,0.12)] select-none">
                        {s.emoji}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>



      {/* Footer */}
      <footer className="border-t border-[#D9D8D2] py-8 px-6 sm:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#6F6F6A]">
        <div className="flex items-center gap-3">
          <StickerLogoMark size={22} />
          <span className="font-semibold text-[#171717]">StickerCanvas</span>
          <span>· Designed for human creativity</span>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={openFeedbackModal}
            className="hover:text-[#171717] transition-colors flex items-center gap-1.5"
          >
            <MessageSquarePlus size={13} />
            <span>Feedback & Bug Reports</span>
          </button>
          <Link href="/remove-background" className="hover:text-[#171717] transition-colors">
            Remove Background
          </Link>
          <button
            type="button"
            onClick={() => {
              const nextVal = !preferStudioDirect;
              setPreferStudioDirect(nextVal);
              localStorage.setItem("stickercanvas_open_studio_direct", nextVal ? "true" : "false");
            }}
            className="text-xs text-[#6F6F6A] hover:text-[#171717] transition-colors"
          >
            {preferStudioDirect ? "✓ Studio-first enabled" : "Open directly in Studio"}
          </button>
          <a
            href="https://github.com/rutujdhawale"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#171717] transition-colors flex items-center gap-1.5"
          >
            <GithubIcon size={14} />
            <span>GitHub</span>
          </a>
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
