"use client";

import React from "react";
import { useUIStore } from "@/store/uiStore";

export const Toast: React.FC = () => {
  const { toastMessage, toastVisible } = useUIStore();

  if (!toastVisible || !toastMessage) return null;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
      {toastMessage}
    </div>
  );
};
