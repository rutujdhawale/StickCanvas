"use client";

import dynamic from "next/dynamic";

// Dynamically import EditorLayout with SSR disabled for PixiJS WebGL
const EditorLayout = dynamic(
  () => import("@/components/editor/EditorLayout").then((mod) => mod.EditorLayout),
  { ssr: false }
);

export default function EditorPage() {
  return <EditorLayout />;
}
