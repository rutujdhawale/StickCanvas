# StickerCanvas — Print Sheet Paywall & Stripe Integration Roadmap

This specification details the architecture, UX design, API contracts, and implementation plan for introducing a commercial paywall for **300 DPI Print Sticker Sheets**, powered by **Stripe**.

---

## 1. Executive Summary & Business Model

### Value Proposition
While digital web exports (1×, 2× PNG/JPEG/WebP) remain 100% free, **300 DPI Print-Ready Sticker Sheets** require specialized physical print layout generation (A4, US Letter, 4×6 photo, Square), physical margin safety buffers, 300 DPI subpixel rasterization, and vector scissor cut lines. This is a high-value utility for:
- Crafters printing on vinyl sticker paper with inkjet/laser printers.
- Small businesses and merchandise creators producing real stickers.
- Scrapbookers, planners, and journal artists.

### Freemium Tier Breakdown

| Feature | Free Tier | Pro / Pay-per-Sheet |
|---|---|---|
| **Canvas Editor** | Unlimited | Unlimited |
| **Client-Side Turbo AI Background Removal** | Unlimited | Unlimited |
| **Digital Exports (PNG / JPEG / WebP)** | Free (1×, 2×) | Free (1×, 2×, 4× Ultra-HD) |
| **Print Sticker Sheet Preview** | Watermarked Preview | Clean High-Res 300 DPI |
| **300 DPI Paper Layouts (A4, Letter, 4×6, Square)** | Locked with Paywall | Fully Unlocked |
| **Scissor Cut Lines & Alignment Marks** | Locked with Paywall | Included |
| **Direct Browser Print Trigger** | Locked with Paywall | Included |
| **Commercial Use License** | Personal Use | Commercial Production Allowed |

### Pricing Options
1. **Pay-as-you-go (Single Sheet)**: **$1.99** one-time purchase per 300 DPI sheet export.
2. **Pack Bundle**: **$4.99** for 5 sheet downloads.
3. **Pro Subscription**: **$7.99/month** or **$59/year** for unlimited 300 DPI print exports, priority processing, and 4× ultra-HD digital exports.

---

## 2. Architecture & System Design

```
+-------------------------------------------------------------+
|                      Client (Next.js 16)                    |
|                                                             |
|   +-------------------+          +----------------------+   |
|   |  ExportModal.tsx  |          | PrintPaywallModal.tsx|   |
|   | (Print Sheet Tab) | -------->| (Pricing & Benefits) |   |
|   +-------------------+          +----------------------+   |
|            |                                |               |
|            | (Watermarked preview)          | (Initiate)    |
|            v                                v               |
+-------------------------------------------------------------+
             |                                |
             | HTTP POST                      | HTTP POST
             |                                v
+-------------------------------------------------------------+
|                       Next.js Server                        |
|                                                             |
|   +-----------------------------------------------------+   |
|   | POST /api/stripe/checkout-session                   |   |
|   | -> Creates Stripe Checkout / Embedded Session       |   |
|   +-----------------------------------------------------+   |
|                              |                              |
|                              v                              |
|   +-----------------------------------------------------+   |
|   | Stripe Hosted Checkout / Stripe Elements            |   |
|   | (User enters card, Apple Pay, Google Pay)           |   |
|   +-----------------------------------------------------+   |
|                              |                              |
|                              v                              |
|   +-----------------------------------------------------+   |
|   | POST /api/stripe/webhook                            |   |
|   | -> Verifies signature & issues signed print ticket  |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

---

## 3. Environment Configuration

The following environment variables will be configured in `.env.local`:

```bash
# Stripe Public & Secret Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_SINGLE_SHEET=price_1P...     # $1.99 one-time
STRIPE_PRICE_SHEET_PACK_5=price_1P...     # $4.99 one-time
STRIPE_PRICE_PRO_MONTHLY=price_1P...      # $7.99/mo recurring
STRIPE_PRICE_PRO_ANNUAL=price_1P...       # $59.00/yr recurring

# App Domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. API Endpoints Specification

### A. Create Checkout Session: `POST /api/stripe/checkout-session`

**Request Body:**
```json
{
  "priceId": "price_1P...",
  "mode": "payment", // "payment" for one-time or "subscription" for monthly
  "sheetMetadata": {
    "paperFormat": "a4",
    "orientation": "landscape",
    "stickerCount": 8
  }
}
```

**Implementation Example:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
      success_url: `${appUrl}/editor?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/editor?payment=cancelled`,
      metadata: sheetMetadata,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### B. Stripe Webhook Handler: `POST /api/stripe/webhook`

**Key Events:**
- `checkout.session.completed`: Marks the purchase verified and issues an encrypted/signed export ticket or unlocks pro status for the user session.
- `customer.subscription.deleted`: Revokes pro entitlements.
- `invoice.payment_failed`: Notifies user of failed subscription renewal.

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // 1. Grant entitlement (e.g. record in database or issue signed JWT print ticket)
      // 2. If single-use print sheet, credit balance + 1
      break;
    }
    case "customer.subscription.deleted": {
      // Revert subscription status
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 5. Client UX & Paywall UI Components

### 1. Watermarked Preview in Free Mode
In `src/lib/export-artwork.ts`:
- When rendering `exportPrintSheet(printOptions, { watermarked: true })`:
- Superimposes a subtle diagonal repeating watermark across the preview:
  `"STICKERCANVAS PRINT PREVIEW • UNLOCK 300 DPI AT CHECKOUT"`
- Ensures users can visualize their layout, spacing, and cut guides before paying, building high purchase intent.

### 2. The Paywall Modal (`PrintPaywallModal.tsx`)
Triggered when the user clicks **"Download 300 DPI Sheet"** or **"Print Directly"** in `ExportModal.tsx`:
- **Badge**: `⭐ Pro Feature`
- **Hero Title**: `Print Studio-Quality Sticker Sheets`
- **Feature Checklist**:
  - `✓ True 300 DPI high-density rasterization (no pixelation or blur)`
  - `✓ Custom paper sizes: A4, US Letter, 4×6 photo, 8×8 square`
  - `✓ Scissor cut guidelines for fast manual cut-out`
  - `✓ Compatible with Cricut & Silhouette cutting machines`
  - `✓ Commercial production rights for craft shops & merch`
- **Pricing Cards**:
  - **Card 1 (Single Sheet)**: `$1.99` — One-time instant unlock for this sheet.
  - **Card 2 (Pro Pass - Recommended)**: `$7.99/mo` — Unlimited 300 DPI sheets, 4× digital exports, zero limits.
- **Action**: Clicking redirects directly to Stripe Checkout via `stripe.redirectToCheckout()` or embedded Stripe Elements.

### 3. Post-Payment Unlock Flow
- On return to `/editor?payment=success&session_id=...`:
  - `Toast` notifies: `"Payment successful! 300 DPI Print Sheet Unlocked 🎉"`.
  - Re-opens `ExportModal` with `tab: "print"`.
  - Watermark is removed.
  - User can download pristine 300 DPI PNG / PDF immediately.

---

## 6. Implementation Checklist & Phases

### Phase 1: Stripe Account & Package Installation
- [ ] Install Stripe server SDK: `npm install stripe`
- [ ] Install Stripe client SDK: `npm install @stripe/stripe-js`
- [ ] Create Products and Prices in the Stripe Dashboard (Test Mode):
  - Product: `StickerCanvas Single Print Sheet` ($1.99 one-time)
  - Product: `StickerCanvas Pro Monthly` ($7.99/mo recurring)

### Phase 2: Server API Implementation
- [ ] Implement `src/app/api/stripe/checkout-session/route.ts`
- [ ] Implement `src/app/api/stripe/webhook/route.ts`
- [ ] Test webhook locally using Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### Phase 3: Client Components & State
- [ ] Add `isProUser` and `printCredits` to `src/store/userStore.ts` or local session store.
- [ ] Create `src/components/editor/PrintPaywallModal.tsx`.
- [ ] Update `src/components/editor/ExportModal.tsx`:
  - Add locked pill to "Print Sticker Sheet" actions if unpurchased.
  - Intercept "Download 300 DPI Sheet" and "Direct Print" to open `PrintPaywallModal`.
  - Add watermark generator to `exportPrintSheet` for free preview state.

### Phase 4: Production Readiness
- [ ] Configure Stripe Live keys.
- [ ] Set up Customer Portal endpoint (`/api/stripe/portal`) for subscription management.
- [ ] Add Privacy Policy & Terms of Service links in checkout session footer.
