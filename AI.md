# AI.md — Context & Engineering Guide for AI Agents

> **For Future AI Models & Coding Assistants**: This document outlines the mental model, system architecture, core constraints, and design philosophies of **StickerCanvas**. Read this thoroughly before making modifications.

---

## 1. Product Philosophy & Design Aesthetic

StickerCanvas is **not** a generic graphic design tool or AI-slop template. It is designed as a **tactile physical studio workstation** for making vinyl sticker collages, cutting out stickers, and printing real sticker sheets.

* **Colors**: Warm studio papers (`#FAF9F5`, `#F7F6F2`), subtle physical borders (`#D9D8D2`, `#E5E4DE`), and signature dark ink (`#171717`) with tomato orange accent (`#FF5A36`).
* **Tactile Interactions**: Corner handles, physical drop shadows, vinyl border dilations, scissor cut-guides, and 60–120 FPS direct response.
* **Humane Tone**: Clear, modest, honest copy. No marketing buzzwords or generic empty promises.

---

## 2. Core Architectural Constraint: 100% Client-Side

**CRITICAL RULE**: StickerCanvas does **not** use a backend server, database, or cloud GPU for canvas operations.
* All image filtering, pixel flood-fill (background removal), SVG dilation (borders), WebGL rendering, and multi-scale exports execute **directly inside the user's browser**.
* All project data is stored locally in the visitor's device via **browser IndexedDB** (`src/lib/storage.ts`).
* Hosting is pure static edge delivery via Next.js on Vercel / Cloudflare Pages.

---

## 3. System Architecture & Directory Map

```
src/
├── app/
│   ├── api/subscribe/route.ts # Serverless email & Discord subscriber webhook
│   ├── editor/page.tsx        # /editor route mounting EditorLayout
│   ├── globals.css            # Tactile tokens, CSS variables, logo-mark
│   ├── icon.svg               # Scalable vector brand favicon (3-card cascading mark)
│   ├── layout.tsx             # Root HTML layout with Google Fonts (Inter, Caveat)
│   └── page.tsx               # Landing page with interactive sticker playground
├── components/
│   ├── editor/
│   │   ├── AssetPreviewModal.tsx  # Modal inspecting uploaded assets
│   │   ├── AssetsPanel.tsx        # Preset stickers & custom uploaded assets drawer
│   │   ├── BackgroundPanel.tsx    # Studio canvas background customizer (solid/grad/image/pattern)
│   │   ├── CanvasViewport.tsx     # Canvas container bridging React & PixiJS engine
│   │   ├── ContextMenu.tsx        # Right-click quick action menu
│   │   ├── EditorLayout.tsx       # Main workbench wrapper
│   │   ├── ExportModal.tsx        # Dual-mode modal: Digital 4K Export + 300 DPI Print Sheet
│   │   ├── InspectorPanel.tsx     # Transform, die-cut border controls & layer stack
│   │   ├── MobileBottomBar.tsx    # Responsive mobile drawer navigation
│   │   ├── StickerMakerModal.tsx  # Background eraser & photo-to-sticker tool
│   │   ├── Toast.tsx              # Tactile toast notifications
│   │   ├── TopBar.tsx             # Project name, undo/redo, New Canvas, export
│   │   └── ZoomControls.tsx       # Floating zoom in/out/reset/fit controls
│   └── landing/
│       └── Hero.tsx               # Landing hero with interactive draggable sticker playground
├── engine/
│   ├── EditorEngine.ts        # Primary facade coordinating subsystems
│   ├── PixiApp.ts             # PixiJS v8 WebGL Application & GPU background renderer
│   ├── SceneManager.ts        # Sprite pool, texture cache (spriteTextureKeyMap), fast transforms
│   ├── TransformManager.ts    # Dragging, rotation & true diagonal projection resizing
│   └── ViewportManager.ts     # Zooming, panning, coordinate translation (screenToCanvas)
├── lib/
│   ├── bg-remove.ts           # Flood-fill background removal with edge smoothing
│   ├── emoji-stickers.ts      # Preset curated sticker assets
│   ├── export-artwork.ts      # 4K digital exports + 300 DPI print sheets + direct window.print()
│   ├── keyboard.ts            # Global hotkey listeners (Ctrl+V, Ctrl+Z, Delete, Arrows)
│   ├── sticker-border.ts      # Radial multi-pass vinyl border contour & drop shadow generator
│   ├── storage.ts             # IndexedDB persistence + getFastCachedDocument for frame-0 reload
│   └── utils.ts               # Tailwind merge helpers
├── store/
│   ├── editorStore.ts         # Zustand store for document, assets, selection, history stack
│   └── uiStore.ts             # Zustand store for modal open states and toasts
└── types/
    └── editor.ts              # Core TypeScript interfaces (StickerObject, Asset, etc.)
```

---

## 4. Key Subsystem Mechanics

### A. 60–120 FPS Transform Loop (`SceneManager.ts` & `TransformManager.ts`)
* **Bypassed Async Texture Checks**: `SceneManager` maintains a `spriteTextureKeyMap: Map<string, string>`. During mouse/touch dragging, rotating, or scaling, it skips texture generation and updates `sprite.position`, `sprite.rotation`, and `sprite.scale` **synchronously in 0ms**.
* **True Diagonal Projection**: Corner resizing uses vector dot-product projection:
  $$\text{scale} = \frac{\vec{v} \cdot \vec{d}}{\|\vec{d}\|^2}$$
  This prevents single-axis inversion or collapse when dragging handles at arbitrary angles (`0°`–`360°`).

### B. Persistence & Zero-Lag Reload (`storage.ts` & `editorStore.ts`)
* High-res pasted images and canvas state are stored in **IndexedDB** (`stickercanvas_db`) to avoid the 5MB `localStorage` browser limit.
* Writes are **debounced by 500ms** to prevent disk operations during active 60 FPS dragging.
* On page load, `getFastCachedDocument()` synchronously supplies the document layout at **frame 0**, preventing blank flashes or double-render lag.

### C. 300 DPI Print Sheet Engine (`export-artwork.ts`)
* Standard print formats:
  - **A4**: $2480 \times 3508\text{ px}$ ($210 \times 297\text{ mm}$)
  - **US Letter**: $2550 \times 3300\text{ px}$ ($8.5 \times 11\text{ in}$)
  - **4×6 Photo**: $1200 \times 1800\text{ px}$ ($101 \times 152\text{ mm}$)
  - **6×6 Square**: $1800 \times 1800\text{ px}$ ($152 \times 152\text{ mm}$)
* Safe margins: 5% printable area padding.
* Optional **Scissor Cut-Guides**: Subtle dashed lines (`#B3B2AC`, `lineDash: [8, 8]`) around each sticker.
* Direct printer integration: `printStickerSheet` generates a clean HTML document with `@page` sizing and automatically triggers `window.print()`.

### D. AI Background Removal Engine (`bg-remove.ts`)
* Uses **`briaai/RMBG-1.4`** via `@huggingface/transformers` for state-of-the-art salient subject segmentation directly in-browser.
* **Quantized Q8 ONNX weights**: Compact ~44MB download, cached automatically in browser CacheStorage.
* **Hardware Acceleration**: Auto-detects WebGPU when supported (<500ms inference), seamlessly falling back to multi-threaded WebAssembly (WASM).
* **Singleton Preloading**: `preloadModel()` is invoked non-blockingly on initial editor mount to warm up the model before the user's first paste/upload.
* **Alpha Modulation**: Rather than binary cutouts, smooth continuous alpha masks are multiplied with source pixels for anti-aliased sticker edges without halo artifacts.
* **Resilient Fallback**: If offline or if ONNX execution fails, automatically falls back to perimeter color-clustering flood fill.

### E. Mobile Touch Architecture & Batch Upload Queue (`EditorEngine.ts`, `EditorLayout.tsx`)
* **Touch Event Normalization**: PixiJS `FederatedPointerEvent` properties (`e.clientX`, `e.clientY`, `e.pointerType`) are normalized with native `TouchEvent` touches. Touch buttons are treated as primary inputs.
* **1-Finger Drag & Transform**: When `transformManager.isBusy()`, `touchmove` events call `e.preventDefault()` to lock browser scrolling and provide 1:1 tactile dragging.
* **Generous Mobile Touch Targets**: Handle graphics in `SelectionManager` include invisible 28px+ touch hit areas so fingertips can easily grab corners and rotate handles on smartphones.
* **Sequential Batch Queue**: Multiple dropped or selected photos are placed in a FIFO queue and processed sequentially. Prevents WASM/WebGPU memory contention, displays progress indicators (`[1/3] Analyzing subject…`), and applies staggered canvas placement.

---

## 5. Development Guidelines for Future AI Models

1. **Do Not Introduce Server Dependencies**: All canvas operations, ML segmentation, and exports must remain 100% client-side in the browser.
2. **Maintain Strict TypeScript**: Always run `npx tsc --noEmit` after making changes. Zero type errors allowed.
3. **Coordinate Systems**: Always convert screen pixel coordinates to canvas world coordinates using `engine.screenToCanvas(clientX, clientY)`. Never assume client coordinates equal world coordinates (zoom and pan will break).
4. **Preserve Touch Compatibility**: Always ensure `touch-action: none` is maintained on canvas containers, and test both desktop mouse and mobile touch interaction paths.
5. **Preserve Next.js App Router Conventions**: Route handlers go in `src/app/api/.../route.ts`, client components require `"use client"`.

