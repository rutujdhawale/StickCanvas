# GitHub Copilot Instructions for StickerCanvas

## Project Overview
StickerCanvas is a high-performance, tactile web canvas for creating sticker collages, removing photo backgrounds, applying die-cut vinyl borders, and exporting high-resolution artwork (PNG, JPEG, WebP at 1×, 2×, 4×).

## Architecture & Conventions
- **Framework**: Next.js 16+ (App Router), React 19, TypeScript (Strict).
- **Graphics Engine**: PixiJS v8 (`src/engine/`) managing a 2D scene graph on HTML5 WebGL canvas.
  - `SceneManager.ts`: Handles sprite creation and texture caching (`spriteTextureKeyMap`).
  - `TransformManager.ts`: Handles dragging, rotation, and resizing using true diagonal vector projection (`(v · d) / ||d||^2`).
  - `ViewportManager.ts`: Zooming, panning, and coordinate translation (`screenToCanvas`).
- **State Management**: Zustand (`src/store/editorStore.ts`).
  - History snapshot stack for multi-step Undo/Redo.
  - Debounced auto-save to IndexedDB + LocalStorage (`src/lib/storage.ts`).
  - Synchronous frame-0 cache (`getFastCachedDocument`) for instant, lag-free reload.
- **Styling**: Tailwind CSS v4 with custom utility tokens and tactile studio aesthetic (`#FAF9F5` warm paper, `#171717` dark ink, `#D9D8D2` subtle borders).

## Maintenance Rules
- Maintain client-side execution: All sticker manipulation, background removal, and exports must remain 100% client-side (no heavy server compute required).
- Always ensure `npx tsc --noEmit` and `npm run build` pass without warnings or errors.
- Never add unnecessary external dependencies when vanilla JavaScript / Canvas API suffices.
