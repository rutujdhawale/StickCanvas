"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Hero } from "@/components/landing/Hero";

// Dynamic import with SSR disabled for PixiJS WebGL
const EditorLayout = dynamic(
  () => import("@/components/editor/EditorLayout").then((mod) => mod.EditorLayout),
  { ssr: false }
);

export default function Home() {
  const [entryMode, setEntryMode] = useState<"loading" | "mobile_editor" | "desktop_landing">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check user preference
    const preferStudio = localStorage.getItem("stickercanvas_open_studio_direct") === "true";

    // Viewport width < 768px -> Mobile editor-first
    const isMobileViewport = window.innerWidth < 768;

    if (isMobileViewport || preferStudio) {
      setEntryMode("mobile_editor");
    } else {
      setEntryMode("desktop_landing");
    }

    const handleResize = () => {
      // If window is resized to mobile viewport, adapt to editor-first
      if (window.innerWidth < 768 && entryMode === "desktop_landing") {
        setEntryMode("mobile_editor");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [entryMode]);

  if (entryMode === "mobile_editor") {
    return <EditorLayout />;
  }

  return <Hero />;
}
