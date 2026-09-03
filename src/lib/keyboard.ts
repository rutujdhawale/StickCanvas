import { useEditorStore } from "@/store/editorStore";

export function setupKeyboardShortcuts(onPasteImage: (blob: Blob) => void): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore keyboard shortcuts when typing in inputs/textareas or contenteditables
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute("contenteditable") === "true"
    ) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const store = useEditorStore.getState();

    // ─── Undo / Redo ──────────────────────────────────────────
    if (isCtrlOrCmd && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        store.redo();
      } else {
        store.undo();
      }
      return;
    }
    if (isCtrlOrCmd && e.key.toLowerCase() === "y") {
      e.preventDefault();
      store.redo();
      return;
    }

    // ─── Duplicate (Ctrl+D) ───────────────────────────────────
    if (isCtrlOrCmd && e.key.toLowerCase() === "d") {
      e.preventDefault();
      store.duplicateSelected();
      return;
    }

    // ─── Copy (Ctrl+C) ────────────────────────────────────────
    if (isCtrlOrCmd && e.key.toLowerCase() === "c") {
      e.preventDefault();
      store.copySelected();
      return;
    }

    // ─── Paste (Ctrl+V) ───────────────────────────────────────
    // Internal sticker paste is handled if clipboard has stickers,
    // browser paste event handles external images.
    if (isCtrlOrCmd && e.key.toLowerCase() === "v") {
      if (store.clipboard.length > 0) {
        e.preventDefault();
        store.pasteFromClipboard();
        return;
      }
    }

    // ─── Select All (Ctrl+A) ──────────────────────────────────
    if (isCtrlOrCmd && e.key.toLowerCase() === "a") {
      e.preventDefault();
      store.selectAll();
      return;
    }

    // ─── Delete / Backspace ───────────────────────────────────
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      store.deleteSelected();
      return;
    }

    // ─── Deselect (Escape) ────────────────────────────────────
    if (e.key === "Escape") {
      e.preventDefault();
      store.deselect();
      return;
    }

    // ─── Arrow Keys (Move 1px or 10px with Shift) ─────────────
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      const selected = store.getSelectedObjects();
      if (selected.length === 0) return;

      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;

      if (e.key === "ArrowUp") dy = -step;
      if (e.key === "ArrowDown") dy = step;
      if (e.key === "ArrowLeft") dx = -step;
      if (e.key === "ArrowRight") dx = step;

      selected.forEach((obj) => {
        store.updateObject(obj.id, {
          x: obj.x + dx,
          y: obj.y + dy,
        });
      });
      store.pushHistory();
      return;
    }
  };

  // Global paste handler for images from clipboard
  const handlePaste = (e: ClipboardEvent) => {
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute("contenteditable") === "true"
    ) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          onPasteImage(blob);
          return;
        }
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("paste", handlePaste);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("paste", handlePaste);
  };
}
