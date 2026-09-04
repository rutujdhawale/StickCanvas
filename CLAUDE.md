# StickerCanvas — AI Quick Context & Developer Cheat Sheet

> **One-Sentence Summary**: A high-performance, 100% client-side tactile sticker studio built with Next.js 16 (App Router), React 19, PixiJS v8 (WebGL), and in-browser ML background removal (`briaai/RMBG-1.4`).

---

## ⚡ Quick Start & Common Commands

```bash
# Start development server
npm run dev

# Type check (strict TypeScript — must always pass with 0 errors)
npx tsc --noEmit

# Production build
npm run build
```

---

## 🧭 Core Architecture in 30 Seconds

```
DOM (React 19)             State (Zustand)           Engine (PixiJS v8 WebGL)
┌────────────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│ TopBar             │     │ editorStore      │     │ PixiApp               │
│ AssetsPanel        │<--->│  - objects[]     │<--->│  - ViewportContainer  │
│ InspectorPanel     │     │  - assets[]      │     │  - SceneManager       │
│ CanvasViewport     │     │  - selection[]   │     │  - TransformManager   │
│ MobileBottomBar    │     │  - history[]     │     │  - SelectionManager   │
│ Modals & Toasts    │     │ uiStore          │     │  - ViewportManager    │
└────────────────────┘     └──────────────────┘     └───────────────────────┘
```

1. **Strict Separation of Concerns**: React manages the surrounding UI shells, menus, panels, and modals. PixiJS v8 directly manages and renders the 2D scene graph inside a WebGL canvas (`app.canvas`).
2. **Never Render Stickers as DOM Elements**: All stickers are PixiJS `Sprite` instances inside `SceneManager`.
3. **100% Client-Side**: No backend servers, databases, or cloud GPUs. Everything runs in the user's browser.

---

## 📂 Key Files & Where Code Lives

| Feature Area | Primary Files | Notes |
|---|---|---|
| **AI Background Removal (Turbo)** | `src/lib/bg-remove.ts` | Uses `briaai/RMBG-1.4` via `@huggingface/transformers` (WebGPU fp16/fp32 hardware acceleration, ~200ms). Instant transparent PNG bypass (<5ms), GPU canvas `destination-in` compositing (<2ms), and smart auto-trimming. Falls back to WASM (q8) and client-side flood fill. |
| **Canvas Engine Coordinator** | `src/engine/EditorEngine.ts` | Central facade. Binds PixiApp, SceneManager, TransformManager, SelectionManager, ViewportManager. Handles mouse & touch input normalization. |
| **Drag / Resize / Rotate Math** | `src/engine/TransformManager.ts` | Coordinate conversion (`screenToWorld`), 1:1 delta dragging, vector projection corner resizing, and `atan2` angle rotation. |
| **Selection & Handles** | `src/engine/SelectionManager.ts` | Draws bounding boxes, corner handles, and rotate stem. Includes 28px+ invisible touch hit areas for mobile fingertips. |
| **Pan & Zoom** | `src/engine/ViewportManager.ts` | Cursor-centered wheel zoom, Space+drag pan, 2-finger touch pinch zoom & pan. |
| **Batch Photo Processing** | `src/components/editor/EditorLayout.tsx` | Sequential FIFO queue for multi-photo imports, non-blocking floating status capsule (`⚡ Turbo AI`), live stage progress (`[1/3]`), staggered placement. |
| **Mobile Navigation Dock** | `src/components/editor/MobileBottomBar.tsx` | Touch-optimized floating dock with Camera (`capture="environment"`), Gallery (`multiple`), Adjust, Background, Export. |
| **Die-Cut Border & Shadow** | `src/lib/sticker-border.ts` | Multi-angle radial canvas dilation generating vinyl white borders and physical drop shadows. |
| **Print Sheets & 4K Export** | `src/lib/export-artwork.ts` | 300 DPI print layouts (A4, US Letter, 4x6, 6x6) with cut-guides, `window.print()`, and clipboard image copying. |
| **State Persistence** | `src/lib/storage.ts` | Debounced IndexedDB (`stickercanvas_db`) storage with frame-0 synchronous cache. |

---

## 📱 Mobile Touch System

- **Single-finger drag**: When touching a sticker or handle, `touchmove` events call `e.preventDefault()` so mobile browsers don't scroll or pull-to-refresh while manipulating stickers.
- **`touch-none`**: Canvas container has `touch-action: none` to disable default browser pan/zoom gestures.
- **Two-finger gestures**: Two touches trigger pinch zoom and two-finger pan smoothly in `ViewportManager`.
- **Large Touch Targets**: Corner and rotation handles have 28px+ hit boxes (`fill({ color: 0x000000, alpha: 0.001 })`) so fingers hit them accurately.

---

## 🤖 AI Background Removal Mechanics (Turbo Edition)

```
User Pastes / Drops Image / Selects Photos
                    │
                    ▼
     [Pre-Check: Transparent Image?]
     ├─ YES (>5% alpha edge): Instant Cutout (<5ms)
     └─ NO:
         │
         ▼
    Preloaded briaai/RMBG-1.4 Neural Engine
    ├─ WebGPU Hardware Acceleration (fp16/fp32, ~200ms)
    └─ Fallback: WASM (SIMD, q8) / Flood Fill
         │
         ▼
    GPU Canvas Compositing (`destination-in`, <2ms)
         │
         ▼
    Smart Auto-Trim to Subject Bounding Box (Snug Handles)
         │
         ▼
    Non-Blocking Notification Pill (Canvas stays interactive)
         │
         ▼
    Placed on Cutting Mat with Stagger Offset
```

---

## 🛡️ Coding Rules for AI Assistants

1. **Center-based Sticker Coordinates**: All sticker `(x, y)` coordinates in `StickerObject` represent the **center** of the sticker, NOT the top-left corner.
2. **Coordinate Conversions**: Never compare screen `clientX/clientY` directly with world coordinates without using `engine.screenToCanvas(clientX, clientY)`.
3. **PixiJS v8 Conventions**: Use `await app.init()`, `app.canvas`, and `app.destroy({ removeView: true })`. Do NOT downgrade to PixiJS v7 syntax.
4. **Preserve Tactile Aesthetics**: Keep warm studio paper colors (`#FAF9F5`, `#F7F6F2`), subtle borders (`#D9D8D2`), dark ink (`#171717`), and tomato accent (`#FF5A36`).
5. **Always Verify**: Run `npx tsc --noEmit` and `npm run build` after changes.
