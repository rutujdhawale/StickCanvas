"use client";

import React, { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

export const ContextMenu: React.FC = () => {
  const { contextMenu, hideContextMenu } = useUIStore();
  const {
    document,
    select,
    duplicateSelected,
    copySelected,
    pasteFromClipboard,
    deleteSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    updateObject,
    clipboard,
  } = useEditorStore();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    if (contextMenu.visible) {
      window.addEventListener("pointerdown", handleGlobalClick);
    }
    return () => {
      window.removeEventListener("pointerdown", handleGlobalClick);
    };
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible) return null;

  const targetObj = contextMenu.targetId
    ? document.objects.find((o) => o.id === contextMenu.targetId)
    : null;

  const handleAction = (action: () => void) => {
    if (contextMenu.targetId) {
      select(contextMenu.targetId);
    }
    action();
    hideContextMenu();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: contextMenu.x, top: contextMenu.y }}
      className="fixed z-50 min-w-[170px] bg-white border border-[#D9D8D2] rounded-xl shadow-lg py-1.5 text-xs text-[#171717] select-none"
    >
      {targetObj ? (
        <>
          <button
            onClick={() => handleAction(duplicateSelected)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#ECEBE6] text-left"
          >
            <span>Duplicate</span>
            <kbd className="text-[10px] text-[#6F6F6A]">Ctrl+D</kbd>
          </button>
          <button
            onClick={() => handleAction(copySelected)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#ECEBE6] text-left"
          >
            <span>Copy</span>
            <kbd className="text-[10px] text-[#6F6F6A]">Ctrl+C</kbd>
          </button>
          <button
            onClick={() => handleAction(pasteFromClipboard)}
            disabled={clipboard.length === 0}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#ECEBE6] disabled:opacity-40 text-left"
          >
            <span>Paste</span>
            <kbd className="text-[10px] text-[#6F6F6A]">Ctrl+V</kbd>
          </button>

          <div className="h-[1px] bg-[#D9D8D2] my-1" />

          <button
            onClick={() => handleAction(() => bringForward(targetObj.id))}
            className="w-full px-3 py-1.5 hover:bg-[#ECEBE6] text-left"
          >
            Bring forward
          </button>
          <button
            onClick={() => handleAction(() => sendBackward(targetObj.id))}
            className="w-full px-3 py-1.5 hover:bg-[#ECEBE6] text-left"
          >
            Send backward
          </button>
          <button
            onClick={() => handleAction(() => bringToFront(targetObj.id))}
            className="w-full px-3 py-1.5 hover:bg-[#ECEBE6] text-left"
          >
            Bring to front
          </button>
          <button
            onClick={() => handleAction(() => sendToBack(targetObj.id))}
            className="w-full px-3 py-1.5 hover:bg-[#ECEBE6] text-left"
          >
            Send to back
          </button>

          <div className="h-[1px] bg-[#D9D8D2] my-1" />

          <button
            onClick={() =>
              handleAction(() => updateObject(targetObj.id, { locked: !targetObj.locked }))
            }
            className="w-full px-3 py-1.5 hover:bg-[#ECEBE6] text-left"
          >
            {targetObj.locked ? "Unlock" : "Lock"}
          </button>

          <button
            onClick={() => handleAction(deleteSelected)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#FF5A36]/10 text-[#FF5A36] text-left"
          >
            <span>Delete</span>
            <kbd className="text-[10px] text-[#FF5A36]/70">Del</kbd>
          </button>
        </>
      ) : (
        <button
          onClick={() => handleAction(pasteFromClipboard)}
          disabled={clipboard.length === 0}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#ECEBE6] disabled:opacity-40 text-left"
        >
          <span>Paste</span>
          <kbd className="text-[10px] text-[#6F6F6A]">Ctrl+V</kbd>
        </button>
      )}
    </div>
  );
};
