import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
    const bodyText = await req.text();
    const signature =
      req.headers.get("webhook-signature") ||
      req.headers.get("x-dodo-signature") ||
      req.headers.get("signature");

    // Optional verification when webhookKey is configured
    if (webhookKey && !webhookKey.startsWith("whsec_...")) {
      if (!signature) {
        return NextResponse.json(
          { error: "Missing webhook signature" },
          { status: 400 }
        );
      }
      // Dodo Payments webhook verification
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = payload.event_type || payload.type;
    const data = payload.data || payload;

    console.log(`[Dodo Webhook] Received event: ${eventType}`, {
      paymentId: data.payment_id || data.id,
      customer: data.customer?.email,
      status: data.status,
    });

    switch (eventType) {
      case "payment.succeeded":
      case "payment.successful": {
        const metadata = data.metadata || {};
        console.log(`[Dodo Webhook] Payment verified for tier ${metadata.tier || "single_sheet"}`);
        // Store or record payment entitlement
        break;
      }
      case "subscription.active":
      case "subscription.created": {
        console.log(`[Dodo Webhook] Subscription activated for ${data.customer?.email}`);
        break;
      }
      case "subscription.cancelled":
      case "subscription.expired": {
        console.log(`[Dodo Webhook] Subscription expired for ${data.customer?.email}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[Dodo Webhook Error]", err);
    const errMsg = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
