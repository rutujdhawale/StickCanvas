# StickerCanvas — Print Sheet Paywall & Stripe Integration Roadmap

This document serves as the comprehensive architectural specification, UX design blueprint, security model, and implementation guide for introducing a commercial paywall for **300 DPI Print Sticker Sheets**, powered by **Stripe**.

---

## 1. Executive Summary & Business Model

### The Value Proposition
While digital web exports (1×, 2× PNG/JPEG/WebP) remain **100% free with no login required**, **300 DPI Physical Print Sheets** represent a high-value commercial utility for physical crafters, planner enthusiasts, scrapbookers, Etsy creators, and merchandise makers.

Generating production-ready print sheets requires:
1. **Subpixel 300 DPI Rasterization**: Rendering up to 3508×2480px (A4) or 3300×2550px (US Letter) at ultra-sharp DPI without blur or downsampling artifacts.
2. **Physical Layout Templates**: Exact margin and bleed safety bounds for international standards (A4, US Letter, 4×6 photo card, 8×8 square).
3. **Scissor & Machine Cut Guidelines**: Optional micro-dashed scissor cut boundaries and contour cut marks compatible with craft cutting plotters (Cricut Design Space, Silhouette Studio).
4. **Direct Browser Print Handshake**: CSS `@media print` optimization ensuring 100% scaling with printer hardware margins.

---

### Freemium Tier Comparison

| Feature | Free Tier | Pro / Pay-per-Sheet |
|---|---|---|
| **Canvas Editor & Preset Assets** | Unlimited | Unlimited |
| **Turbo AI Background Removal** | Unlimited | Unlimited |
| **Digital Exports (PNG / JPEG / WebP)** | Free (1×, 2×) | Free (1×, 2×, 4× Ultra-HD) |
| **Print Sheet Layouts (A4, Letter, 4×6, Square)** | Interactive Preview | Full 300 DPI High-Res Export |
| **Print Sheet Watermark** | Subtle Diagonal Watermark | Clean (Zero Watermark) |
| **Scissor Cut & Silhouette Cut Paths** | Watermarked Preview | High-Res PNG + SVG Cut File |
| **Direct Browser Print Output** | Locked with Paywall | 1-Click System Print Trigger |
| **Commercial Merch License** | Personal Use Only | Commercial & Production Rights |

---

### Pricing Strategy & Unit Economics

```
+-------------------------------------------------------------------------+
|                              PRICING TIERS                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ Option 1: Single Sheet ]   [ Option 2: 5-Sheet Pack ]   [ Pro Pass ] |
|            $1.99                        $4.99               $7.99/mo    |
|       (One-time pass)              ($1.00 / sheet)        ($59.00/year) |
|                                                                         |
|  • Instant 300 DPI unlock     • 5 Print Sheet credits     • Unlimited   |
|  • Zero login required        • Valid for 12 months       • 4× Ultra-HD |
|  • Signed 30-day magic link   • Cross-device sync         • Cricut SVG  |
+-------------------------------------------------------------------------+
```

1. **Single Sheet ($1.99 one-time)**: Designed for zero-friction impulsive purchase by hobbyists who just want to print their current sheet right now.
2. **5-Sheet Pack ($4.99 one-time)**: High-converting bulk tier for crafters printing sticker batches.
3. **Pro Subscription ($7.99/month or $59/year)**: For power creators, small shop owners, and Etsy sellers needing continuous, unmetered production.

---

## 2. Zero-Friction Frictionless Authentication: "Guest Checkout"

One of StickerCanvas's core competitive advantages is **zero login friction**. Forcing users to create an account, verify an email, and set a password before buying a $1.99 sheet causes 60%+ checkout drop-off.

### The Cryptographic Ticket Architecture

```
User clicks "Download 300 DPI Sheet"
              │
              ▼
   Stripe Checkout (Hosted)
(Customer enters email & payment)
              │
              ▼ Payment Succeeded
   POST /api/stripe/webhook
              │
              ▼
Generate Signed HMAC Ticket:
{
  sessionId: "cs_live_...",
  email: "crafter@example.com",
  type: "single_sheet" | "pack" | "subscription",
  credits: 1,
  expiresAt: 1726000000
} + SHA256 Signature
              │
              ▼
Redirect to /editor?payment=success&ticket=<JWT>
              │
              ▼
Client validates ticket & saves to IndexedDB:
Watermark removed -> 300 DPI sheet downloads immediately!
```

- **Re-Download Guarantee**: The Stripe automated email receipt includes a direct link:
  `https://stickercanvas.com/print?ticket=<JWT>` allowing the customer to re-download on any device within 30 days.
- **Pro Subscribers**: Use email magic-link authentication (`/api/auth/magic-link`) when accessing from a new browser.

---

## 3. System Architecture & Component Diagram

```
+--------------------------------------------------------------------+
|                         CLIENT (Next.js 16)                        |
|                                                                    |
|  +---------------------+            +---------------------------+  |
|  |   ExportModal.tsx   |            |   PrintPaywallModal.tsx   |  |
|  |  (Print Sheet Tab)  | ---------> |   (Tier Cards & Perks)    |  |
|  +---------------------+            +---------------------------+  |
|             │                                     │                |
|             │ (Watermarked Canvas Preview)        │ (Purchase)     |
|             ▼                                     ▼                |
+--------------------------------------------------------------------+
              │                                     │
              │                                     │ POST
              ▼                                     ▼
+--------------------------------------------------------------------+
|                     SERVER (Next.js 16 App Router)                 |
|                                                                    |
|  +---------------------------------------------------------------+ |
|  | POST /api/stripe/checkout-session                             | |
|  | Creates Stripe Checkout Session with metadata                 | |
|  +---------------------------------------------------------------+ |
|                                   │                                |
|                                   ▼                                |
|  +---------------------------------------------------------------+ |
|  | Stripe Hosted Checkout (Apple Pay, Google Pay, Cards)          | |
|  +---------------------------------------------------------------+ |
|                                   │                                |
|                                   ▼                                |
|  +---------------------------------------------------------------+ |
|  | POST /api/stripe/webhook                                      | |
|  | Validates signature -> Signs print ticket -> Sends email       | |
|  +---------------------------------------------------------------+ |
|                                   │                                |
|                                   ▼                                |
|  +---------------------------------------------------------------+ |
|  | POST /api/stripe/portal                                       | |
|  | Generates Stripe Customer Portal link for Pro subscription     | |
|  +---------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

---

## 4. Environment Variables Specification

Create or update `.env.local` with the following keys:

```bash
# Stripe API Keys (Retrieve from https://dashboard.stripe.com/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Signing Secret (from `stripe listen` CLI or Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...

# Product & Price IDs
STRIPE_PRICE_SINGLE_SHEET=price_1P...     # $1.99 one-time
STRIPE_PRICE_SHEET_PACK_5=price_1P...     # $4.99 one-time
STRIPE_PRICE_PRO_MONTHLY=price_1P...      # $7.99/mo recurring
STRIPE_PRICE_PRO_ANNUAL=price_1P...       # $59.00/yr recurring

# Cryptographic Ticket Secret for HMAC signing
TICKET_SIGNING_SECRET=your_32_character_random_secret_here

# App Domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. API Endpoint Contracts & Implementation Code

### A. Create Checkout Session: `POST /api/stripe/checkout-session`
File: `src/app/api/stripe/checkout-session/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, mode, sheetMetadata } = await req.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode || "payment",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${appUrl}/editor?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/editor?payment=cancelled`,
      metadata: {
        paperFormat: sheetMetadata?.paperFormat || "a4",
        orientation: sheetMetadata?.orientation || "portrait",
        stickerCount: String(sheetMetadata?.stickerCount || 0),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[Stripe] Checkout creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### B. Stripe Webhook Handler: `POST /api/stripe/webhook`
File: `src/app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

function createSignedTicket(payload: object): string {
  const secret = process.env.TICKET_SIGNING_SECRET || "fallback_secret";
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const isSubscription = session.mode === "subscription";

      // Issue signed ticket
      const ticket = createSignedTicket({
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        type: isSubscription ? "subscription" : "single_sheet",
        expiresAt: Date.now() + (isSubscription ? 30 : 3) * 24 * 60 * 60 * 1000,
      });

      console.log(`[Stripe] Successfully issued print ticket for ${session.id}`);
      // Store ticket in Redis/DB or log for analytics
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

### C. Stripe Customer Portal: `POST /api/stripe/portal`
File: `src/app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/editor`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 6. Client Watermark & Anti-Bypass Security

### Free Preview Watermark Algorithm
In `src/lib/export-artwork.ts`, when rendering the preview of the print sheet for non-purchased sessions, draw a repeating diagonal watermark across the canvas:

```typescript
export function applyPrintPreviewWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.rotate((-25 * Math.PI) / 180);
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "rgba(23, 23, 23, 0.08)";
  ctx.textAlign = "center";

  const stepX = 280;
  const stepY = 120;

  for (let x = -width; x < width * 2; x += stepX) {
    for (let y = -height; y < height * 2; y += stepY) {
      ctx.fillText("STICKERCANVAS PRINT PREVIEW • UNLOCK 300 DPI", x, y);
    }
  }
  ctx.restore();
}
```

- In Free Mode: The client displays the watermarked canvas at 72–150 DPI.
- In Purchased Mode: The watermark function is bypassed, rendering at full 300 DPI ($3508 \times 2480$px for A4).

---

## 7. Paywall UI Component Specification (`PrintPaywallModal.tsx`)

### Design Token Alignment
- **Background**: White `#FFFFFF` with warm ivory accents `#FAF9F5`.
- **Borders**: Hairline `#D9D8D2`.
- **Primary Accent**: Brand terracotta `#FF5A36`.
- **Typography**: Inter / Outfit with clear visual hierarchy.

### Modal Mockup & Elements
```
+---------------------------------------------------------------+
|  ⭐ PRO PRINT STUDIO                                      [×] |
|                                                               |
|  Print Studio-Quality Sticker Sheets                          |
|  High-density 300 DPI rasterization for vinyl sticker paper.  |
|                                                               |
|  [✓] True 300 DPI resolution (ultra-sharp, zero blur)         |
|  [✓] Formats: A4, US Letter, 4×6 photo, 8×8 square            |
|  [✓] Scissor cut lines + Cricut/Silhouette silhouette paths   |
|  [✓] Commercial rights for Etsy and physical sticker shops    |
|                                                               |
|  +--------------------------+   +---------------------------+ |
|  | Single Sheet             |   | Pro Pass (Best Value)     | |
|  | $1.99                    |   | $7.99 / month             | |
|  | Instant 1-time unlock    |   | Unlimited 300 DPI exports | |
|  | [ Unlock Single Sheet ]  |   | [ Start Free Trial / Pro ]| |
|  +--------------------------+   +---------------------------+ |
|                                                               |
|  🔒 256-Bit Encrypted Checkout via Stripe • Apple Pay • Cards |
+---------------------------------------------------------------+
```

---

## 8. Rollout Phases & Implementation Checklist

### Phase 1: Stripe Setup & Keys (1 Day)
- [ ] Register products in Stripe Dashboard (Test Mode):
  - `StickerCanvas Single Sheet` ($1.99 USD)
  - `StickerCanvas 5-Pack` ($4.99 USD)
  - `StickerCanvas Pro Monthly` ($7.99 USD)
- [ ] Add keys to `.env.local`.
- [ ] Install `stripe` package: `npm install stripe @stripe/stripe-js`.

### Phase 2: API Endpoints & Webhook (1 Day)
- [ ] Create `src/app/api/stripe/checkout-session/route.ts`.
- [ ] Create `src/app/api/stripe/webhook/route.ts`.
- [ ] Verify webhook delivery using Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  stripe trigger checkout.session.completed
  ```

### Phase 3: Client Components & Watermark Protection (2 Days)
- [ ] Add `userStore.ts` or persistent session state for unlocked tickets.
- [ ] Implement `applyPrintPreviewWatermark` in `src/lib/export-artwork.ts`.
- [ ] Build `src/components/editor/PrintPaywallModal.tsx`.
- [ ] Connect paywall trigger to `ExportModal.tsx`:
  - Show watermarked preview tab.
  - Clicking "Download 300 DPI Sheet" opens `PrintPaywallModal`.
  - On return from Stripe (`payment=success`), remove watermark and trigger immediate high-res download.

### Phase 4: Production Hardening & Launch (1 Day)
- [ ] Switch to Stripe Live keys.
- [ ] Test end-to-end payment with real card in live mode ($1.99 test refund).
- [ ] Add Privacy Policy, Terms of Service, and Refund Policy links.
- [ ] Monitor conversions via Stripe Dashboard and Vercel Analytics.
