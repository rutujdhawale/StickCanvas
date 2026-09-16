import { NextRequest, NextResponse } from "next/server";
import { dodoProvider } from "@/lib/payments/dodo-provider";
import { PricingTierId, PRICING_TIERS } from "@/config/pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, sheetMetadata, customerEmail, customerName } = body;

    if (!tier || !PRICING_TIERS[tier as PricingTierId]) {
      return NextResponse.json(
        { error: "Invalid product tier selected" },
        { status: 400 }
      );
    }

    const session = await dodoProvider.createCheckout({
      tier: tier as PricingTierId,
      customerEmail,
      customerName,
      sheetMetadata,
    });

    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("[Dodo Checkout API Error]", err);
    const errMsg = err instanceof Error ? err.message : "Checkout creation failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
