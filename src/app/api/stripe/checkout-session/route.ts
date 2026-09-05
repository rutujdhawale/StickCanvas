import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { priceId, mode, tier, sheetMetadata } = await req.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const secretKey = process.env.STRIPE_SECRET_KEY;

    // Developer Test Mode Simulation when live Stripe keys are not yet configured
    if (!secretKey || secretKey.startsWith("sk_test_placeholder") || secretKey === "sk_test_...") {
      console.log("[Stripe Dev Simulator] Simulating checkout session for tier:", tier);
      return NextResponse.json({
        url: `${appUrl}/editor?payment=success&session_id=mock_session_${Date.now()}&tier=${tier || "single_sheet"}`,
        sessionId: `mock_session_${Date.now()}`,
        simulated: true,
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode || "payment",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${appUrl}/editor?payment=success&session_id={CHECKOUT_SESSION_ID}&tier=${tier || "single_sheet"}`,
      cancel_url: `${appUrl}/editor?payment=cancelled`,
      metadata: {
        tier: tier || "single_sheet",
        paperFormat: sheetMetadata?.paperFormat || "a4",
        orientation: sheetMetadata?.orientation || "landscape",
        stickerCount: String(sheetMetadata?.stickerCount || 0),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id, simulated: false });
  } catch (err: any) {
    console.error("[Stripe] Checkout creation error:", err);
    return NextResponse.json({ error: err.message || "Checkout creation failed" }, { status: 500 });
  }
}
