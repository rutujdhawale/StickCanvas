// Centralized Pricing & Product Configuration for StickerCanvas
// Integrates with Dodo Payments while preserving identical pricing tiers

export type PricingTierId = "single_sheet" | "sheet_pack" | "pro_creator";

export interface PricingTier {
  id: PricingTierId;
  name: string;
  badge?: string;
  usdPrice: number;
  credits: number;
  type: "payment" | "subscription";
  interval?: "month";
  description: string;
  features: string[];
  dodoProductId: string;
  popular?: boolean;
}

export const PRICING_TIERS: Record<PricingTierId, PricingTier> = {
  single_sheet: {
    id: "single_sheet",
    name: "Single Sheet",
    usdPrice: 1.99,
    credits: 1,
    type: "payment",
    description: "Export one ultra-high-resolution 300 DPI physical print sheet.",
    features: [
      "1 physical sheet export (300 DPI)",
      "Vinyl die-cut calibrated contours",
      "PDF + PNG print-ready files",
      "No account required (Guest checkout)",
    ],
    dodoProductId:
      process.env.NEXT_PUBLIC_DODO_PRODUCT_SINGLE_SHEET || "p_single_sheet_199",
  },
  sheet_pack: {
    id: "sheet_pack",
    name: "5-Sheet Pack",
    badge: "Most Popular",
    popular: true,
    usdPrice: 4.99,
    credits: 5,
    type: "payment",
    description: "Best value for creating sticker packs, gift sheets, and events.",
    features: [
      "5 print sheet export credits ($1.00/sheet)",
      "Credits never expire",
      "High-density SVG cut-paths",
      "All paper sizes (A4, US Letter, A5, Square)",
    ],
    dodoProductId:
      process.env.NEXT_PUBLIC_DODO_PRODUCT_SHEET_PACK || "p_sheet_pack_499",
  },
  pro_creator: {
    id: "pro_creator",
    name: "Pro Creator",
    badge: "Unlimited",
    usdPrice: 7.99,
    credits: Infinity,
    type: "subscription",
    interval: "month",
    description: "For illustrators, Etsy sellers, small shops, and power sticker makers.",
    features: [
      "Unlimited 300 DPI physical print exports",
      "Commercial print usage license",
      "Priority background-removal processing",
      "Cancel or pause anytime with 1-click",
    ],
    dodoProductId:
      process.env.NEXT_PUBLIC_DODO_PRODUCT_PRO_MONTHLY || "p_pro_monthly_799",
  },
};

export function getPricingTier(id: PricingTierId): PricingTier {
  return PRICING_TIERS[id];
}

export function getAllPricingTiers(): PricingTier[] {
  return Object.values(PRICING_TIERS);
}
