<div align="center">

# StickerCanvas

**Put stuff together. Make something good.**

An ultra-tactile creative playground and production-grade sticker sheet studio. Combine photos, digital art, screenshots, and emoji into die-cut vinyl stickers with on-device AI background removal, compose layouts at 60–120 FPS on a WebGL scene graph, and export physical 300 DPI print sheets calibrated for home printers and craft cutters.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19.0.0-61dafb?style=flat-square&logo=react)](https://react.dev)
[![PixiJS v8](https://img.shields.io/badge/PixiJS-v8-e72264?style=flat-square&logo=pixijs)](https://pixijs.com)
[![WebGPU / WASM](https://img.shields.io/badge/AI-WebGPU%20%2F%20WASM-orange?style=flat-square)](https://huggingface.co/docs/transformers.js)
[![Dodo Payments](https://img.shields.io/badge/Payments-Dodo%20Payments-orange?style=flat-square)](https://dodopayments.com)
[![Print Ready](https://img.shields.io/badge/Output-300%20DPI%20Physical-emerald?style=flat-square)](#-studio-300-dpi-print-sheet-exporter)
[![Zero Login](https://img.shields.io/badge/Privacy-Zero%20Login%20%2F%20Client--Side-purple?style=flat-square)](#-100-client-side-privacy--zero-friction)

[**Launch StickerCanvas**](https://stick-canvas.vercel.app) • [**Background Remover**](https://stick-canvas.vercel.app/remove-background) • [**Architecture Guide**](ARCHITECTURE.md) • [**Dodo Setup Guide**](DODO_PAYMENTS_SETUP.md)

</div>

---

## 💡 Why StickerCanvas?

Creating physical sticker sheets traditionally requires a tedious multi-app pipeline: lassoing backgrounds in Photoshop, exporting PNGs, importing into Illustrator or Canva, tracing vector cut lines, manually arranging margins, and calculating DPI scaling for printers.

**StickerCanvas solves this in a single, zero-friction browser session:**
1. **Drop or paste any image** (`Ctrl+V`), image URL, or camera snapshot.
2. **Neural AI extracts the main subject** in ~200ms directly on your local GPU/CPU.
3. **Vinyl die-cut borders & physical depth shadows** are generated in real-time.
4. **Arrange on a tactile 60–120 FPS canvas** with multi-touch gestures and snap controls.
5. **Print clean 300 DPI sticker sheets** with scissor cut-guides or Cricut/Silhouette cutting paths.

---

## ✨ Key Features

### ⚡ 60–120 FPS WebGL 2D Scene Graph (PixiJS v8)
- **High-Throughput Rendering**: Powered by a custom PixiJS v8 engine designed for fluid manipulation of 100+ high-resolution sticker layers simultaneously.
- **RAF-Coalesced Transforms**: Mouse, touch, and trackpad pointer moves are synchronized with the display's native refresh rate via `requestAnimationFrame`, eliminating micro-stutters and input lag.
- **Tactile Multi-Touch**: 1-finger sticker dragging, 2-finger pinch zoom, smooth panning, rotation snapping (15° increments via `Shift`), and marquee box selection.

### 🧠 On-Device Neural AI Background Removal (RMBG-1.4)
- **Zero Cloud Latency & Total Privacy**: Powered by `@huggingface/transformers` running `briaai/RMBG-1.4` entirely within the browser. No images are uploaded to any server.
- **WebGPU Acceleration with WASM Fallback**: Leverages WebGPU hardware acceleration with an automatic quantized WASM (`q8`) SIMD fallback for universal device support.
- **Dynamic 640px Inference**: High-resolution inputs are downsampled to an optimal 640px tensor space for fast inference (~200ms with WebGPU), then projected back onto original high-res pixels via GPU bilinear interpolation.
- **Main-Body Saliency Filter**: Connected-component labeling detects and isolates the primary subject, automatically rejecting distant background objects, wall patterns, floor shadows, and edge noise.
- **Instant Transparent PNG Bypass**: Pre-cut transparent PNGs bypass neural inference in `<5ms`.

### 🪄 Standalone Free Background Remover (`/remove-background`)
- **Direct Standalone Tool**: Dedicated clean page for instant background removal without loading the full canvas.
- **Interactive Before / After Comparison Slider**: Drag or toggle between Original, Split View, and Transparent Cutout.
- **One-Click "Make a Sticker"**: Seamless handoff directly into the StickerCanvas Studio with the cutout pre-loaded and selected.
- **No Sign-up / 100% Private**: Full-resolution PNG downloads with zero watermarks.

### 📱 Adaptive UX & Mobile-First Workflow
- **One Adaptive Codebase**: Seamlessly switches between tactile desktop hero and instant mobile-first canvas on phones (<768px).
- **Mobile Action Sheet**: Direct camera capture, device upload, clipboard pasting, and web image URL importing.
- **Safe Image Link Proxy (`/api/proxy-image`)**: Paste any public image URL with SSRF protection, size validation, and CORS bypassing.

### 🏷️ Authentic Die-Cut Vinyl Borders & 3D Lighting
- **Real-Time Dilate Contouring**: Generates uniform physical sticker borders (`2px` to `18px`) with rounded joins and smooth contours.
- **Custom Vinyl Palettes**: Choose from curated physical sticker colors (Classic White, Cream Vinyl, Matte Black, Fluorescent, Pastel) or custom hex values.
- **Realistic Depth Shadows**: Natural drop shadows simulate physical sticker paper layered over cardboard, journal pages, or laptops.

### 🖨️ Studio 300 DPI Print Sheet Exporter
- **Physical Print Precision**: Rasterizes artwork at true **300 DPI** physical print resolution:
  - **A4**: 2480 × 3508 px (210 × 297 mm)
  - **US Letter**: 2550 × 3300 px (8.5 × 11 in)
  - **4×6 Photo Card**: 1200 × 1800 px (4 × 6 in)
  - **6×6 Square Sheet**: 1800 × 1800 px (6 × 6 in)
- **Scissor & Cutter Guidelines**: Optional dashed outlines around stickers provide clean cutting guides for scissors, craft blades, or Cricut/Silhouette optical sensors.
- **Direct Browser Print**: Native integration with `window.print()` and `@page` CSS rules for direct printing to inkjet and laser printers.

### 💳 Dodo Payments Integration & Multi-Currency Paywall
- **Free Digital Exports**: Digital web exports (1×, 2× PNG, JPEG, WebP) remain **100% free with zero login**.
- **Interactive Watermarked Preview**: Unpaid users can preview physical 300 DPI layouts protected by an elegant, diagonal repeating watermark.
- **Guest-Friendly Paywall Modal**:
  - **Single Sheet ($1.99 one-time)**: Instant unlock for the current sheet.
  - **5-Sheet Pack ($4.99 one-time — 50% OFF)**: Flexible credits stored for future projects.
  - **Pro Creator ($7.99/month)**: Unlimited 300 DPI exports, cutting guides, and commercial rights.
- **Multi-Currency Display**: Automatically detects locale and shows localized prices in **USD ($), EUR (€), GBP (£), INR (₹), CAD (CA$), AUD (A$), and JPY (¥)**.
- **Zero-Login Guest Entitlements**: Purchased tokens persist in browser `localStorage`, allowing users to buy and print immediately without account creation friction.
- **Built-in Dev-Mode Simulator**: Automatically simulates the checkout lifecycle when secret keys are omitted, enabling instant local testing.
- **Setup Guide**: See [**DODO_PAYMENTS_SETUP.md**](DODO_PAYMENTS_SETUP.md) for full dashboard instructions.

### 🎨 Canvas Background Studio
- Curated warm paper swatches (Warm Ivory, Kraft Paper, Moleskine, Matte Charcoal).
- 8 smooth linear and radial gradient presets with angle controls.
- Custom photo backgrounds with real-time blur and opacity adjustments.
- Tactile dot-grid and graph paper overlays, plus transparent checkerboard mode.

### 🔒 100% Client-Side Privacy & Zero Friction
- **No Login Barrier**: Open the site and start creating immediately.
- **IndexedDB Auto-Persistence**: Automatically saves canvas state and uploaded assets to local browser storage with debounced writes and synchronous frame-0 cache for instant, lag-free reload.

---

## ⌨️ Keyboard & Gesture Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + V` / `Cmd + V` | Paste image or screenshot directly from clipboard onto canvas |
| `Ctrl + C` / `Cmd + C` | Copy selected sticker |
| `Ctrl + D` | Duplicate selected sticker |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo action |
| `Delete` / `Backspace` | Delete selected sticker |
| `Arrow Keys` | Nudge sticker by 1px (`Shift + Arrow` for 10px) |
| `Shift + Drag Corner` | Resize maintaining aspect ratio |
| `Shift + Rotate Handle` | Snap rotation to 15° increments |
| `Shift + Drag Sticker` | Lock movement to horizontal or vertical axis |
| `Space + Drag` | Pan across the canvas |
| `Mouse Wheel` | Zoom in / Zoom out |
| `Escape` | Deselect all stickers |
| `Right Click` | Open tactile context menu (Order, Duplicate, Border, Delete) |

---

## 🛠️ Architecture & Tech Stack

```
StickerCanvas Pipeline
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Image Input     │ ──> │ RMBG-1.4 Neural ML  │ ──> │ Vinyl Border Engine  │
│  (Drop / Paste)  │     │ WebGPU / WASM (640p)│     │ Alpha Dilate + Shadow│
└──────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                                │
                                                                ▼
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ Physical Print   │ <── │ Export Engine       │ <── │ PixiJS v8 Scene      │
│ 300 DPI / Dodo   │     │ PNG / WebP / Print  │     │ 60–120 FPS WebGL     │
└──────────────────┘     └─────────────────────┘     └──────────────────────┘
```

- **Frontend Framework**: [Next.js 16 (App Router)](https://nextjs.org) with Turbopack & React 19
- **2D Graphics Engine**: [PixiJS v8](https://pixijs.com) (Hardware-accelerated WebGL scene graph)
- **Machine Learning**: [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) running `briaai/RMBG-1.4` ONNX
- **Payment Processing**: [Dodo Payments](https://dodopayments.com) (REST API, webhooks, multi-currency)
- **State Management**: [Zustand v5](https://zustand.docs.pmnd.rs)
- **Storage**: Browser IndexedDB with synchronous in-memory hydration
- **Styling**: Vanilla CSS & Tailwind CSS with warm tactile design tokens (`#FAF9F5`, `#171717`, `#FF5A36`)
- **Icons**: [Lucide React](https://lucide.dev)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm, pnpm, or bun

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/rutujdhawale/StickCanvas.git
cd StickCanvas

# 2. Install dependencies
npm install

# 3. (Optional) Configure environment
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start using StickerCanvas or [http://localhost:3000/remove-background](http://localhost:3000/remove-background) for the standalone background remover.

> **Note on Dodo Payments Testing**: If `DODO_PAYMENTS_API_KEY` is not provided in `.env.local`, StickerCanvas automatically activates **Dev-Mode Simulation**. You can test the complete paywall flow, pricing tiers, entitlement unlocking, and clean 300 DPI exports locally without active Dodo credentials.

---

## ⚙️ Environment Variables

See [`.env.example`](.env.example) and [**DODO_PAYMENTS_SETUP.md**](DODO_PAYMENTS_SETUP.md) for all configuration options:

```bash
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Dodo Payments Configuration
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_API_KEY=dodo_api_test_...
DODO_PAYMENTS_WEBHOOK_KEY=whsec_...

# Dodo Product IDs
NEXT_PUBLIC_DODO_PRODUCT_SINGLE_SHEET=p_single_sheet_199
NEXT_PUBLIC_DODO_PRODUCT_SHEET_PACK=p_sheet_pack_499
NEXT_PUBLIC_DODO_PRODUCT_PRO_MONTHLY=p_pro_monthly_799
```

---

## 📦 Production Build & Deployment

StickerCanvas is designed for zero-maintenance hosting on modern edge platforms like **Vercel** or **Cloudflare Pages**:

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

Because neural inference, rendering, and compositing execute entirely client-side, the server footprint is minimal: serverless API routes handle Stripe checkout sessions and webhook verification.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

Copyright (c) 2026 Rutuj Dhawale.
