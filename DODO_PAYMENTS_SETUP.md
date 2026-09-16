# Dodo Payments Setup & Integration Guide for StickerCanvas

This guide provides step-by-step instructions for connecting and configuring **Dodo Payments** for StickerCanvas, from initial sandbox testing to production launch.

---

## Overview

StickerCanvas uses Dodo Payments to monetize high-resolution **300 DPI physical print sheet exports**, offering:
- **Single Sheet ($1.99)** — 1 print credit (one-time payment)
- **5-Sheet Pack ($4.99)** — 5 print credits (one-time payment, 50% discount)
- **Pro Creator ($7.99/mo)** — Unlimited 300 DPI exports (recurring subscription)

All digital exports (PNG, JPEG, WebP) remain **100% free with zero login**.

---

## 1. Quick Start: Local Dev Simulator (Zero Setup Required)

StickerCanvas includes a built-in **Developer Simulator**.

If `DODO_PAYMENTS_API_KEY` is not set or begins with `dodo_api_test_...`:
1. Clicking **Unlock & Print** automatically simulates a successful Dodo checkout.
2. The user is redirected back with mock entitlement tokens.
3. The 300 DPI sheet watermark is instantly removed and print sheets unlock.

This allows you to develop and test the complete purchase flow locally without creating a Dodo account.

---

## 2. Setting Up Your Dodo Payments Account

### Step 1: Sign Up
1. Go to [dodopayments.com](https://dodopayments.com) and register for an account.
2. In your dashboard, switch to **Test Mode** (toggle in the top navigation/sidebar) to experiment without real money.

### Step 2: Generate an API Key
1. In the Dodo Payments dashboard, navigate to **Developers → API Keys**.
2. Click **Create API Key**.
3. Name it `StickerCanvas Dev` or `StickerCanvas Production`.
4. Copy the API key (starts with `dodo_api_...` or similar).
   > Keep this key secret! It belongs only in `.env.local` or your hosting provider's server environment variables.

---

## 3. Creating Products in Dodo Payments Dashboard

You need to create 3 products in your Dodo Payments dashboard matching StickerCanvas's pricing tiers:

### Product 1: Single Sheet
- **Name**: `StickerCanvas — Single Print Sheet`
- **Type**: One-time Payment
- **Price**: `$1.99 USD`
- **Description**: 1 physical 300 DPI sticker sheet export
- Save and copy the **Product ID** (e.g., `p_prod_12345678`).

### Product 2: 5-Sheet Pack
- **Name**: `StickerCanvas — 5-Sheet Pack`
- **Type**: One-time Payment
- **Price**: `$4.99 USD`
- **Description**: 5 physical 300 DPI sticker sheet export credits
- Save and copy the **Product ID** (e.g., `p_prod_23456789`).

### Product 3: Pro Creator Monthly
- **Name**: `StickerCanvas — Pro Creator Subscription`
- **Type**: Recurring Subscription
- **Billing Interval**: Monthly
- **Price**: `$7.99 USD / month`
- **Description**: Unlimited 300 DPI exports, cutting guides, and commercial rights
- Save and copy the **Product ID** (e.g., `p_prod_34567890`).

---

## 4. Configuring Environment Variables

Create or update your `.env.local` file with the values from your dashboard:

```bash
# -------------------------------------------------------------
# Base Application URL
# -------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -------------------------------------------------------------
# Dodo Payments Environment: "test_mode" or "live_mode"
# -------------------------------------------------------------
DODO_PAYMENTS_ENVIRONMENT=test_mode

# -------------------------------------------------------------
# Dodo Payments API Key (Server-Only — NEVER expose with NEXT_PUBLIC_)
# -------------------------------------------------------------
DODO_PAYMENTS_API_KEY=dodo_api_your_actual_test_key_here

# -------------------------------------------------------------
# Dodo Webhook Secret (from Developers -> Webhooks)
# -------------------------------------------------------------
DODO_PAYMENTS_WEBHOOK_KEY=whsec_your_webhook_secret_here

# -------------------------------------------------------------
# Dodo Product IDs (Created in Step 3)
# -------------------------------------------------------------
NEXT_PUBLIC_DODO_PRODUCT_SINGLE_SHEET=p_prod_12345678
NEXT_PUBLIC_DODO_PRODUCT_SHEET_PACK=p_prod_23456789
NEXT_PUBLIC_DODO_PRODUCT_PRO_MONTHLY=p_prod_34567890
```

---

## 5. Webhook Setup & Real-time Verification

Webhooks allow Dodo Payments to inform your app in real-time when a payment succeeds or a subscription changes status.

### Endpoint URL:
`https://your-domain.com/api/dodo/webhook`

### Supported Events:
The StickerCanvas webhook handler automatically processes:
- `payment.succeeded` / `payment.successful` — Marks print credits as purchased
- `subscription.active` / `subscription.created` — Activates unlimited Pro exports
- `subscription.cancelled` / `subscription.expired` — Reverts user to guest status

### Local Testing with Webhooks:
To test webhooks locally:
1. Use [ngrok](https://ngrok.com) or [Cloudflare Tunnels](https://developers.cloudflare.com/pages/platform/preview-deployments/):
   ```bash
   ngrok http 3000
   ```
2. In Dodo Payments dashboard under **Developers → Webhooks**, add endpoint:
   `https://your-subdomain.ngrok.io/api/dodo/webhook`
3. Copy the **Webhook Secret** and paste it as `DODO_PAYMENTS_WEBHOOK_KEY` in `.env.local`.

---

## 6. How the Payment Flow Works in StickerCanvas

```text
User designs stickers on canvas
              │
              ▼
Clicks "Export" -> "Print Sheet (300 DPI)"
              │
              ▼
[PrintPaywallModal] appears with localized pricing (USD, EUR, INR, GBP, etc.)
              │
              ▼
User selects tier & clicks "Unlock Sheet"
              │
              ▼
POST /api/dodo/checkout
   ├─ If in Dev Mode: returns mock redirect (instant simulation)
   └─ If Live/Test Key configured: calls Dodo Payments API (/payments)
              │
              ▼
User redirected to Dodo Hosted Checkout (Card, Apple Pay, Google Pay, UPI, etc.)
              │
              ▼
Payment Completed
              │
              ├─► Dodo sends webhook to /api/dodo/webhook
              │
              ▼
Redirects back to /editor?payment=success&payment_id=...&tier=...
              │
              ▼
Editor verifies payment with /api/dodo/restore
              │
              ▼
Entitlements unlocked in localStorage -> Watermark removed -> High-res 300 DPI downloaded!
```

---

## 7. Going Live (Production Checklist)

When you are ready to accept real customer payments:

1. **Activate Live Mode in Dodo**:
   - Complete your business onboarding in the Dodo Payments dashboard.
   - Switch the toggle in the dashboard to **Live Mode**.
2. **Recreate Products in Live Mode**:
   - Products created in Test Mode do not automatically transfer to Live Mode.
   - Re-create Single Sheet ($1.99), 5-Sheet Pack ($4.99), and Pro Monthly ($7.99) in Live Mode.
   - Copy their new live Product IDs.
3. **Generate Live API Key**:
   - Go to Developers → API Keys in Live Mode.
   - Generate your Live Secret Key.
4. **Update Production Environment Variables (e.g., in Vercel)**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://stickercanvas.com
   DODO_PAYMENTS_ENVIRONMENT=live_mode
   DODO_PAYMENTS_API_KEY=dodo_live_...
   DODO_PAYMENTS_WEBHOOK_KEY=whsec_live_...
   NEXT_PUBLIC_DODO_PRODUCT_SINGLE_SHEET=p_live_...
   NEXT_PUBLIC_DODO_PRODUCT_SHEET_PACK=p_live_...
   NEXT_PUBLIC_DODO_PRODUCT_PRO_MONTHLY=p_live_...
   ```
5. **Set Production Webhook**:
   - Add `https://stickercanvas.com/api/dodo/webhook` in Live Mode Webhooks.
6. **Deploy**:
   - Trigger a new deployment on Vercel or your hosting platform.

---

## 8. Troubleshooting & FAQ

### Q: Does StickerCanvas require customer accounts?
**No.** StickerCanvas is 100% guest-friendly. When a user buys a sheet or credit pack, their entitlement is linked to their local device tokens and can be restored using their payment email or payment ID.

### Q: What currencies does StickerCanvas support?
StickerCanvas features built-in localized currency conversion for **USD ($), EUR (€), GBP (£), INR (₹), CAD (CA$), AUD (A$), and JPY (¥)**. Dodo Payments handles checkout currency conversion and global payment methods automatically.

### Q: What if a customer closes their tab during payment?
If the user returns to `/editor`, they can click **"Restore purchase"** in the paywall modal. Entering their payment ID or checking recent transactions calls `POST /api/dodo/restore` to unlock their credits.
