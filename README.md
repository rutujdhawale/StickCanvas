# StickerCanvas

> **Put stuff together. Make something good.**  
> A high-performance, tactile web canvas for creating sticker collages, removing photo backgrounds, applying die-cut vinyl borders, and printing high-resolution physical sticker sheets.

Live site: [https://stickercanvas.runs-on.dev](https://stickercanvas.runs-on.dev)

---

## ✨ Features

- ⚡ **60–120 FPS GPU Engine**: Powered by PixiJS v8 2D scene graph on WebGL canvas. Manipulate 100+ objects with fluid response.
- 🤖 **Turbo AI Background Removal (RMBG-1.4)**: Real ML subject segmentation running directly in the browser via `@huggingface/transformers`. WebGPU hardware acceleration (`fp16`/`fp32`, ~200ms) with WASM (`q8`) fallback, instant transparent PNG bypass (<5ms), GPU canvas `destination-in` compositing (<2ms), and smart auto-trimming.
- 📱 **Full Mobile & Touch Support**: 1-finger sticker dragging, 2-finger pinch zoom, pan gestures, enlarged mobile touch targets, and responsive bottom bar with native camera and gallery pickers.
- 📦 **Multi-Photo Batch Upload**: Drop or select multiple images simultaneously; automatically queues and converts each into an individually bordered sticker with staggered placement.
- 🏷️ **Die-Cut Vinyl Contour & 3D Shadow**: Authentic physical sticker outlines with customizable border thickness (`2px`–`18px`), vinyl color presets, and physical depth shadows.
- 🎨 **Canvas Background Studio**: Solid curated paper swatches, custom hex picker, 8 smooth gradients with angle control, custom photo backgrounds with blur/opacity, dot/grid pattern overlays, and transparent checkerboard mode.
- 📋 **Direct Clipboard Integration**: Press `Ctrl+V` anywhere to paste photos, screenshots, or copied stickers directly onto the canvas, plus mobile async clipboard paste.
- 💾 **Zero Work Loss (IndexedDB Persistence)**: Auto-saves layouts and custom high-res assets to browser IndexedDB with debounced writes and synchronous frame-0 cache for instant, lag-free reload.
- 🖨️ **Print Sticker Sheet (300 DPI)**:
  - Ready for home & commercial printers: **A4**, **US Letter**, **4×6 Photo Card**, and **6×6 Square Sheet**.
  - **Scissor Cut-Guides**: Optional dashed lines around each sticker for easy cutting with scissors or craft blade.
  - **Direct Browser Print**: Native print dialog integration (`window.print()`) with `@page` sizing.
- 🖼️ **4K High-Res Export**: Lossless exports in transparent PNG, JPEG, or WebP at 1×, 2×, and 4× scale multipliers, plus direct **Copy to Clipboard**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + V` / `Cmd + V` | Paste image from clipboard directly to canvas |
| `Ctrl + C` / `Cmd + C` | Copy selected sticker |
| `Ctrl + D` | Duplicate selected sticker |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo action |
| `Delete` / `Backspace` | Delete selected sticker |
| `Arrow Keys` | Nudge position by 1px (`Shift + Arrow` for 10px) |
| `Escape` | Deselect all objects |
| `Right Click` | Open contextual tactile actions menu |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org) with Turbopack
- **UI Library**: React 19
- **Graphics Engine**: [PixiJS v8](https://pixijs.com) (HTML5 WebGL 2D Scene Graph)
- **AI Background Removal**: [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) with `briaai/RMBG-1.4` (ONNX Q8 with WebGPU / WASM)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) with custom tactile design tokens
- **Icons**: [Lucide React](https://lucide.dev)
- **Storage**: Browser IndexedDB with local memory fallback

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or bun

### Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/rutujdhawale/StickCanvas.git
cd StickCanvas

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🌐 Deployment & Architecture

StickerCanvas is engineered as a **100% Client-Side Web Application**:
- All graphics rendering, image filtering, background removal, and exports execute on the client's GPU/CPU.
- No backend servers, databases, or cloud GPUs are required.
- Easily hosted on **Vercel** or **Cloudflare Pages** on their free tier, easily handling 100,000+ visitors with 0 server load.

### Custom Domain via `runs-on.dev`
Point a CNAME record from `runs-on.dev/manage`:
```json
{
  "records": {
    "CNAME": "cname.vercel-dns.com"
  }
}
```

---

## 🗺️ Future Roadmap & Monetization

- **Stripe Print Sheet Paywall**: Architecture & integration roadmap for monetizing high-resolution 300 DPI physical print sheets using Stripe Checkout. See [`PRINT_PAYWALL_STRIPE_ROADMAP.md`](file:///c:/Users/Rutuj%20Dhawale/Desktop/StickerCanvas/PRINT_PAYWALL_STRIPE_ROADMAP.md) for full specifications.

---

## 📄 License

Copyright (c) 2026 Rutuj Dhawale. All rights reserved.

