"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Undo2, Redo2, Download, Layers, Sparkles, Paintbrush, FilePlus } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

export const TopBar: React.FC = () => {
  const { document, setProjectName, undo, redo, canUndo, canRedo, resetProject } = useEditorStore();
  const {
    openExportModal,
    toggleAssetsPanel,
    toggleInspectorPanel,
    toggleBackgroundDrawer,
    assetsPanelOpen,
    inspectorPanelOpen,
    backgroundDrawerOpen,
    showToast,
  } = useUIStore();
  const nameInputRef = useRef<HTMLSpanElement>(null);

  const handleBlur = () => {
    if (nameInputRef.current) {
      const text = nameInputRef.current.innerText.trim();
      setProjectName(text || "Untitled artwork");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nameInputRef.current?.blur();
    }
  };

  return (
    <header className="h-12 border-b border-[#D9D8D2] bg-[#F7F6F2] flex items-center justify-between px-3 z-30 select-none">
      {/* Left: Brand & Back */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-1.5 rounded-md hover:bg-[#ECEBE6] text-[#6F6F6A] hover:text-[#171717] transition-colors"
          title="Back to home"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="logo-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="font-semibold text-[14px] tracking-tight text-[#171717] hidden sm:inline">
            StickerCanvas
          </span>
        </div>

        {/* Assets panel toggle */}
        <button
          onClick={toggleAssetsPanel}
          className={`ml-2 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
            assetsPanelOpen
              ? "bg-[#ECEBE6] border-[#D9D8D2] text-[#171717]"
              : "bg-transparent border-transparent text-[#6F6F6A] hover:bg-[#ECEBE6]"
          }`}
          title="Toggle Stickers drawer"
        >
          <Sparkles size={14} />
          <span>Stickers</span>
        </button>

        {/* Background toggle */}
        <button
          onClick={toggleBackgroundDrawer}
          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
            backgroundDrawerOpen
              ? "bg-[#ECEBE6] border-[#D9D8D2] text-[#171717]"
              : "bg-transparent border-transparent text-[#6F6F6A] hover:bg-[#ECEBE6]"
          }`}
          title="Change Canvas Background"
        >
          <Paintbrush size={14} />
          <span className="hidden sm:inline">Background</span>
        </button>

        {/* New / Reset Canvas */}
        <button
          onClick={async () => {
            if (document.objects.length === 0) return;
            if (window.confirm("Start a new artwork? This will clear the canvas.")) {
              await resetProject();
              showToast("New canvas created ✓");
            }
          }}
          disabled={document.objects.length === 0}
          className="px-2 py-1 text-xs font-medium rounded-md border border-transparent text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-1"
          title="Start a new artwork (Clear canvas)"
        >
          <FilePlus size={14} />
          <span className="hidden md:inline">New</span>
        </button>
      </div>

      {/* Center: Editable Project Title */}
      <div className="flex items-center justify-center flex-1 max-w-xs mx-2">
        <span
          ref={nameInputRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="px-2 py-0.5 text-xs sm:text-sm font-medium text-[#171717] hover:bg-[#ECEBE6] focus:bg-white focus:ring-1 focus:ring-[#4A6CFF] rounded transition-all outline-none truncate max-w-[200px] text-center cursor-text"
          title="Double click to rename"
        >
          {document.projectName}
        </span>
      </div>

      {/* Right: History & Export */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 rounded-md text-[#171717] hover:bg-[#ECEBE6] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} strokeWidth={1.75} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 rounded-md text-[#171717] hover:bg-[#ECEBE6] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} strokeWidth={1.75} />
        </button>

        <div className="w-[1px] h-4 bg-[#D9D8D2] mx-1" />

        <button
          onClick={toggleInspectorPanel}
          className={`p-1.5 rounded-md border transition-colors ${
            inspectorPanelOpen
              ? "bg-[#ECEBE6] border-[#D9D8D2] text-[#171717]"
              : "bg-transparent border-transparent text-[#6F6F6A] hover:bg-[#ECEBE6]"
          }`}
          title="Toggle Inspector & Layers"
        >
          <Layers size={16} strokeWidth={1.75} />
        </button>

        <button
          onClick={openExportModal}
          className="ml-1 px-3 py-1.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
        >
          <Download size={14} strokeWidth={2} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
