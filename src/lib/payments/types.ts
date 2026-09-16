// Unified Payment Abstraction Interfaces
// Decouples payment gateway implementation from application consumers

import { PricingTierId } from "@/config/pricing";

export interface CreateCheckoutParams {
  tier: PricingTierId;
  customerEmail?: string;
  customerName?: string;
  sheetMetadata?: {
    paperFormat: string;
    orientation: string;
    stickerCount: number;
  };
  returnUrl?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  paymentId: string;
  simulated: boolean;
  tier: PricingTierId;
}

export interface VerifyPaymentParams {
  paymentId: string;
  tier?: PricingTierId;
}

export interface RestorePurchaseParams {
  email?: string;
  paymentId?: string;
  tier?: PricingTierId;
}

export interface EntitlementResult {
  hasAccess: boolean;
  type: PricingTierId | "dev_pass" | "none";
  credits: number;
  unlockedAt?: number;
  expiresAt?: number;
  token?: string;
}

export interface IPaymentProvider {
  name: string;
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<EntitlementResult>;
  restorePurchase(params: RestorePurchaseParams): Promise<EntitlementResult>;
}
