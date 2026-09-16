import { NextRequest, NextResponse } from "next/server";
import { dodoProvider } from "@/lib/payments/dodo-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { paymentId, email, tier } = await req.json();

    if (!paymentId && !email) {
      return NextResponse.json(
        { error: "Payment ID or email is required to restore purchases" },
        { status: 400 }
      );
    }

    const result = await dodoProvider.restorePurchase({ paymentId, email, tier });

    if (!result.hasAccess) {
      return NextResponse.json(
        { error: "No active purchases found for the provided details." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[Dodo Restore Error]", err);
    const errMsg = err instanceof Error ? err.message : "Restore purchase failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
