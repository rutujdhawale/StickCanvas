// Dodo Payments Provider Implementation
// Official REST integration with test-mode dev simulation, guest checkout, and idempotent verification

import {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSessionResult,
  VerifyPaymentParams,
  RestorePurchaseParams,
  EntitlementResult,
} from "./types";
import { getPricingTier } from "@/config/pricing";

export class DodoPaymentsProvider implements IPaymentProvider {
  public readonly name = "DodoPayments";

  private getBaseUrl(): string {
    const env = process.env.DODO_PAYMENTS_ENVIRONMENT;
    return env === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";
  }

  private getApiKey(): string | undefined {
    return process.env.DODO_PAYMENTS_API_KEY;
  }

  private isDevSimulated(): boolean {
    const key = this.getApiKey();
    return (
      !key ||
      key.startsWith("dodo_api_test_...") ||
      key.includes("placeholder") ||
      key === "test"
    );
  }

  public async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const { tier, sheetMetadata, returnUrl } = params;
    const tierConfig = getPricingTier(tier);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Local Developer Simulation Fallback
    if (this.isDevSimulated()) {
      const mockPaymentId = `mock_dodo_${Date.now()}`;
      const successUrl =
        returnUrl ||
        `${appUrl}/editor?payment=success&payment_id=${mockPaymentId}&tier=${tier}`;

      console.log("[Dodo Payments Simulator] Simulating checkout for tier:", tier);
      return {
        checkoutUrl: successUrl,
        paymentId: mockPaymentId,
        simulated: true,
        tier,
      };
    }

    // 2. Official Dodo Payments API Request
    const apiKey = this.getApiKey()!;
    const baseUrl = this.getBaseUrl();

    const successReturnUrl =
      returnUrl ||
      `${appUrl}/editor?payment=success&payment_id={payment_id}&tier=${tier}`;

    // Payload conforming to Dodo Payments checkout specification
    const payload = {
      billing: {
        country: "US",
      },
      customer: {
        email: params.customerEmail || "guest@stickercanvas.art",
        name: params.customerName || "Sticker Creator",
      },
      product_cart: [
        {
          product_id: tierConfig.dodoProductId,
          quantity: 1,
        },
      ],
      payment_link: true,
      return_url: successReturnUrl,
      metadata: {
        tier,
        credits: String(tierConfig.credits),
        paperFormat: sheetMetadata?.paperFormat || "a4",
        orientation: sheetMetadata?.orientation || "landscape",
        stickerCount: String(sheetMetadata?.stickerCount || 0),
      },
    };

    const res = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Dodo Payments API Error]", res.status, errBody);
      throw new Error(`Dodo Payments checkout creation failed: ${errBody}`);
    }

    const data = await res.json();
    const checkoutUrl = data.payment_link || data.checkout_url || data.url;
    const paymentId = data.payment_id || data.id || `dodo_${Date.now()}`;

    return {
      checkoutUrl,
      paymentId,
      simulated: false,
      tier,
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<EntitlementResult> {
    const { paymentId, tier = "single_sheet" } = params;

    // Simulation
    if (paymentId.startsWith("mock_dodo_") || this.isDevSimulated()) {
      const tierConfig = getPricingTier(tier);
      return {
        hasAccess: true,
        type: tier,
        credits: tierConfig.credits,
        unlockedAt: Date.now(),
        token: `token_${paymentId}`,
      };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Dodo Payments API key not configured on server");
    }

    const baseUrl = this.getBaseUrl();
    const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to verify payment with Dodo Payments: ${res.statusText}`);
    }

    const payment = await res.json();
    const status = payment.status;

    const isSuccessful =
      status === "succeeded" || status === "completed" || status === "paid";

    if (!isSuccessful) {
      return {
        hasAccess: false,
        type: "none",
        credits: 0,
      };
    }

    const metaTier = (payment.metadata?.tier as any) || tier || "single_sheet";
    const tierConfig = getPricingTier(metaTier);

    return {
      hasAccess: true,
      type: metaTier,
      credits: tierConfig.credits,
      unlockedAt: Date.now(),
      token: `dodo_verified_${paymentId}`,
    };
  }

  public async restorePurchase(params: RestorePurchaseParams): Promise<EntitlementResult> {
    const { paymentId, tier } = params;

    if (paymentId) {
      return this.verifyPayment({ paymentId, tier });
    }

    // Default return when no specific ID is found
    return {
      hasAccess: false,
      type: "none",
      credits: 0,
    };
  }
}

export const dodoProvider = new DodoPaymentsProvider();
