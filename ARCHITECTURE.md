# StickerCanvas — Architecture, File Map & AI Guidelines

This document explains the codebase architecture, file responsibilities, data flow, and **rules of engagement** for any AI agent or developer extending or modifying this repository.

---

## 1. High-Level Architecture & Core Principles

StickerCanvas is built around one non-negotiable architectural rule:

> **React builds the UI around the canvas. PixiJS (WebGL / GPU) renders the visual scene.**
> **React MUST NEVER render every sticker as a DOM `<div>` or `<img>` element.**

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js / React UI                     │
│  (TopBar, AssetsPanel, InspectorPanel, Modals, Menus)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Reads/writes
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        Zustand Stores                       │
│  - editorStore: Document, Objects, Assets, History, Viewport│
│  - uiStore: Panel states, Modals, ContextMenu, Toast        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Subscribes & Syncs
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PixiJS v8 Canvas Engine                  │
│  - EditorEngine: Coordinator Facade                         │
│  - PixiApp: Application, Stage, Layers, Canvas Mount        │
│  - SceneManager: GPU Sprites & Texture Cache                │
│  - TransformManager: Direct Drag, Corner Resize, Rotate Math│
│  - SelectionManager: Bounding box, Handles, Rotate Stem     │
│  - ViewportManager: Pan & Cursor-centered Zoom              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Renders directly to
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        WebGL / GPU                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. File Map & Responsibilities

### Root & Configuration

| File | Purpose | What NOT to break |
|---|---|---|
| [`package.json`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/package.json) | Project dependencies & scripts (`next`, `pixi.js@^8`, `zustand`, `lucide-react`, `tailwindcss@^4`). | Keep Next.js App Router and PixiJS v8. Do not downgrade to PixiJS v7 (`app.init()` and `app.canvas` are v8 specific). |
| [`next.config.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/next.config.ts) | Next.js configuration. | Keep Turbopack / Webpack defaults intact. |
| [`tsconfig.json`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/tsconfig.json) | TypeScript compiler options and `@/*` alias path mapping. | Do not remove `@/*` path mapping pointing to `./src/*`. |

---

### Data Models & State Management (`src/types/`, `src/store/`)

| File | Contains | Relationships | Critical Rules |
|---|---|---|---|
| [`src/types/editor.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/types/editor.ts) | TypeScript interfaces for `StickerObject`, `Asset`, `DocumentState`, `HistoryEntry`, `ViewportState`, `ExportOptions`, `HandleDirection`. | Imported by all store, engine, and UI files. | **Positions are center-based (`x`, `y`)** to simplify rotation around center. Do not switch to top-left coordinates without updating all rotation/resize math. |
| [`src/store/editorStore.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/store/editorStore.ts) | Zustand store for document state: stickers list, active selection, undo/redo snapshot stacks, internal clipboard, viewport zoom/pan, assets list. | Read by React components and synced to PixiJS via `CanvasViewport`. | **DO NOT call API saves or heavy computations on every pointer movement**. `pushHistory()` is called only when an interaction completes (e.g. pointerup). |
| [`src/store/uiStore.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/store/uiStore.ts) | Zustand store for UI visibility: drawer open/close, inspector open/close, active modals (Export, StickerMaker), context menu coordinates, toasts. | Completely decoupled from document data. | Keeps UI transient state separate from document data. |

---

### PixiJS Engine Core (`src/engine/`)

The engine code is completely decoupled from React component rendering.

| File | Contains | Relationships | Critical Rules |
|---|---|---|---|
| [`src/engine/PixiApp.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/PixiApp.ts) | PixiJS v8 Application wrapper. Creates the stage layer hierarchy: `viewportContainer` -> `canvasBackground`, `sceneContainer`, `guideContainer`, `selectionContainer`. | Initialized by `EditorEngine`. Mounts `<canvas>` into DOM container. | **Pixi v8 API**: Uses `await app.init()`, `app.canvas`, and `app.destroy({ removeView: true })`. Never call `app.destroy(true)` (v7 syntax causes runtime error). |
| [`src/engine/EditorEngine.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/EditorEngine.ts) | Top-level coordinator facade. Binds `PixiApp`, `SceneManager`, `SelectionManager`, `TransformManager`, and `ViewportManager`. Handles global pointer/key events (e.g., Space for pan). | Instantiated inside `CanvasViewport.tsx`. Provides `sync()` and `screenToCanvas()`. | Central point of contact between React and the engine. Expose methods here rather than accessing engine internals. |
| [`src/engine/SceneManager.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/SceneManager.ts) | Synchronizes Zustand `document.objects` into GPU `Sprite`s. Manages texture caching (`Assets.load` / `Texture.from`), z-index ordering, anchor centering (`0.5, 0.5`), and sprite pointer hit-testing. | Called by `EditorEngine.sync()`. Delegates clicks/drags to callbacks. | Never recreate existing sprites unnecessarily — reuse sprites from `spriteMap` and only update transform attributes. |
| [`src/engine/SelectionManager.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/SelectionManager.ts) | Draws selection outline, 4 corner resize handles (`nw`, `ne`, `se`, `sw`), and the top rotation stem and handle. Includes generous invisible touch targets (28px+) for mobile fingertips. | Attached to `selectionContainer`. Delegates handle clicks to `TransformManager`. | Selection graphics stroke and handle sizes scale with `1 / zoom` so handles remain visually crisp and proportional at any zoom level. |
| [`src/engine/TransformManager.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/TransformManager.ts) | Direct pointer & touch tracking for 3 interaction modes: **Drag** (direct 1:1 screen-to-world delta with container bounding rect compensation), **Corner Resize** (projects mouse/touch vector onto sticker's rotated local axes while pinning the opposite corner anchor in world space), and **Rotate** (`atan2` math with 15° Shift-snap). | Modifies sticker properties live via `onUpdate` and triggers `onCommit` on pointerup to record undo history. | **DO NOT break the corner anchor math**; rotating stickers while scaling requires the opposite corner to remain strictly stationary in world space. |
| [`src/engine/ViewportManager.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/engine/ViewportManager.ts) | Pan & zoom manager. Supports Space+drag, middle-mouse drag, cursor-centered mouse wheel zoom, 2-finger pinch-to-zoom, 2-finger pan, and `fitToContent`. | Directly transforms `pixiApp.viewportContainer`. Updates `viewport` state. | Wheel zoom MUST zoom towards the cursor (`mouseX`, `mouseY`), not the canvas center. |

---

### Utilities & Processing (`src/lib/`)

| File | Contains | Relationships | Critical Rules |
|---|---|---|---|
| [`src/lib/bg-remove.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/lib/bg-remove.ts) | **AI-Powered Background Removal Engine**. Uses `briaai/RMBG-1.4` via `@huggingface/transformers` with WebGPU hardware acceleration and quantized Q8 ONNX weights. Preloads on mount. Gracefully falls back to high-accuracy multi-pass edge flood-fill if offline or unsupported. | Called by `EditorLayout.tsx` and `StickerMakerModal.tsx`. | 100% in-browser client-side execution with zero external server dependencies. |
| [`src/lib/export-artwork.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/lib/export-artwork.ts) | High-resolution scene exporter. Renders visible stickers at 1×, 2×, or 4× output resolution onto an offscreen `<canvas>`, triggers download, and provides **Copy to Clipboard** via async Clipboard API. | Called by `ExportModal.tsx`. | **Renders from original asset textures at target resolution** rather than simply upscaling a 1080p canvas snapshot. Preserves source sharpness. |
| [`src/lib/emoji-stickers.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/lib/emoji-stickers.ts) | Preset sticker library (5 categories: Cuties, Stationery, Food, Cool, Nature). Renders high-res 256px emoji stickers to PNG DataURLs. | Loaded by `AssetsPanel.tsx` and `CanvasViewport.tsx`. | Provides instant stickers out of the box so the user never starts with an empty library. |
| [`src/lib/keyboard.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/lib/keyboard.ts) | Global keyboard shortcut listeners (Undo, Redo, Copy, Paste, Duplicate, Delete, Arrow nudging, Escape) and clipboard paste listener. | Initialized in `EditorLayout.tsx`. | **MUST ignore shortcuts when user is typing in inputs** (`<input>`, `<textarea>`, `contenteditable`). |
| [`src/lib/utils.ts`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/lib/utils.ts) | `cn()` helper combining `clsx` and `tailwind-merge`. | Standard UI styling utility. | — |

---

### React UI Components (`src/components/`)

| File | Component | Role |
|---|---|---|
| [`src/components/editor/EditorLayout.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/EditorLayout.tsx) | `EditorLayout` | Top-level editor view; renders `TopBar`, `AssetsPanel`, `CanvasViewport`, `InspectorPanel`, `ContextMenu`, `ExportModal`, `StickerMakerModal`, and `Toast`. Mounts global keyboard shortcuts. |
| [`src/components/editor/TopBar.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/TopBar.tsx) | `TopBar` | Logo mark, editable project name, Undo/Redo buttons, panel visibility toggles, and "Export" button. |
| [`src/components/editor/AssetsPanel.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/AssetsPanel.tsx) | `AssetsPanel` | "My Stickers" creative drawer: search, category pills, preset grid, upload zone, and HTML5 `onDragStart`. |
| [`src/components/editor/CanvasViewport.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/CanvasViewport.tsx) | `CanvasViewport` | Container that mounts the PixiJS canvas, listens for dropped assets or OS files, displays empty state prompt (`Drop your first sticker here`), shows live rotation angle badge (`32°`), and hosts `ZoomControls`. |
| [`src/components/editor/InspectorPanel.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/InspectorPanel.tsx) | `InspectorPanel` | Right panel: displays X, Y, W, H (with lock ratio), rotation, flip buttons, opacity slider, and the visual layer stack (reorder, eye visibility toggle, lock toggle). |
| [`src/components/editor/ZoomControls.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/ZoomControls.tsx) | `ZoomControls` | Floating zoom pill at bottom center: `−`, percentage (click to reset 100%), `+`, and `Fit`. |
| [`src/components/editor/ContextMenu.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/ContextMenu.tsx) | `ContextMenu` | Right-click contextual menu: Duplicate, Copy, Paste, Bring Forward/Backward, Front/Back, Lock/Unlock, Delete. |
| [`src/components/editor/ExportModal.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/ExportModal.tsx) | `ExportModal` | Artwork export dialog with live preview, format selection (PNG/JPG/WEBP), scale selection (1×/2×/4×), and transparent background toggle. |
| [`src/components/editor/StickerMakerModal.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/StickerMakerModal.tsx) | `StickerMakerModal` | "Add & Customize Sticker" modal with live preview, background removal, transparency tuning, and die-cut border. |
| [`src/components/editor/AssetPreviewModal.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/AssetPreviewModal.tsx) | `AssetPreviewModal` | High-resolution sticker asset inspector dialog displaying resolution, transparency checkerboard, and "Place on Canvas". |
| [`src/components/editor/BackgroundPanel.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/BackgroundPanel.tsx) | `BackgroundPanel` | Comprehensive Canvas Background customizer: solid studio swatches, custom hex color picker, 8 curated gradients + angle builder, image background upload/direct paste with opacity & blur sliders, paper texture/grid overlays, and transparent mode. |
| [`src/components/editor/MobileBottomBar.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/MobileBottomBar.tsx) | `MobileBottomBar` | Touch-optimized floating bottom navigation dock for mobile devices (`< md`) with large hit targets (min 44px) for Device Upload, Stickers Drawer, Canvas Background, Adjust/Opacity, Layers, and Export. |
| [`src/components/editor/Toast.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/editor/Toast.tsx) | `Toast` | Minimal quiet notification popup (e.g. *"Exported ✓"*, *"Made your sticker!"*). |
| [`src/components/landing/Hero.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/components/landing/Hero.tsx) | `Hero` | Landing page hero: editorial typography, *"Start making"* CTA, and an interactive draggable mini sticker playground. |

---

### App Router Pages & Styling (`src/app/`)

| File | Role |
|---|---|
| [`src/app/layout.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/app/layout.tsx) | Root layout loading Google Fonts (Inter) and global metadata. |
| [`src/app/page.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/app/page.tsx) | Home page (`/`) rendering `Hero`. |
| [`src/app/editor/page.tsx`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/app/editor/page.tsx) | Editor page (`/editor`) dynamically loading `EditorLayout` with `{ ssr: false }` (required because PixiJS uses browser WebGL). |
| [`src/app/globals.css`](file:///c:/Users/Rutuj Dhawale/Desktop/StickerCanvas/src/app/globals.css) | Tailored color system variables (`--bg`, `--ink`, `--secondary`, `--border`, `--canvas`, `--tomato`, `--blue`), paper background patterns, logo mark styles, and checkerboard utilities. |

---

## 3. Data Flow & Communication Rules

```
User drags a sticker on canvas
       │
       ▼
TransformManager.handlePointerMove()
       │
       ├─► Live visual update (sprite.position / sprite.rotation directly in PixiJS)
       │
       ▼ (on PointerUp)
useEditorStore.getState().updateObject(...) & pushHistory()
       │
       ├─► Zustand document state is updated
       ├─► Undo stack receives snapshot
       └─► InspectorPanel re-renders with new coordinates
```

### Critical Rules for Future Changes:
1. **Never bypass Zustand for persistent state**: Object positions, dimensions, rotations, opacities, and z-indices live in `editorStore`.
2. **Never push history on every mousemove**: History snapshots (`pushHistory()`) should only be created when an interaction finishes (on `pointerup`, input blur, or explicit menu clicks).
3. **Keep Original Asset Intact**: Do not overwrite the original uploaded image file with downsampled or transformed versions. Transformations (`scale`, `rotation`, `flip`) are applied to the scene object, not the source asset.
4. **Dynamic Import for PixiJS Pages**: Any page or component that mounts `EditorEngine` or `PixiApp` must be rendered client-side (`"use client"` with `{ ssr: false }`) because Node.js has no `window` or `WebGLRenderingContext`.
5. **Aesthetics & Editorial Restraint**: Follow the Design North Star: *"Messy creativity, clean interface"*. Avoid generic SaaS cards, excessive borders, purple AI sparkles, or heavy floating shadows.
