"use client";

import React, { useState } from "react";
import { X, Check, Sparkles, Printer, ShieldCheck, Scissors, ArrowRight, Loader2 } from "lucide-react";
import { PrintSheetOptions } from "@/lib/export-artwork";
import { savePrintEntitlement } from "@/lib/print-entitlements";

interface PrintPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  printOptions?: PrintSheetOptions;
  onSuccessUnlocked?: () => void;
}

export const PrintPaywallModal: React.FC<PrintPaywallModalProps> = ({
  isOpen,
  onClose,
  printOptions,
  onSuccessUnlocked,
}) => {
  const [selectedTier, setSelectedTier] = useState<"single_sheet" | "pack" | "subscription">("single_sheet");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (tier: "single_sheet" | "pack" | "subscription") => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const priceMap: Record<string, string> = {
        single_sheet: process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE_SHEET || "price_single_sheet_199",
        pack: process.env.NEXT_PUBLIC_STRIPE_PRICE_SHEET_PACK_5 || "price_sheet_pack_499",
        subscription: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly_799",
      };

      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: priceMap[tier],
          tier,
          mode: tier === "subscription" ? "subscription" : "payment",
          sheetMetadata: {
            paperFormat: printOptions?.paperFormat || "a4",
            orientation: printOptions?.orientation || "landscape",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // If simulated dev mode or redirect URL
      if (data.simulated) {
        // Grant entitlement directly in dev test mode
        savePrintEntitlement({
          type: tier,
          credits: tier === "pack" ? 5 : 1,
          unlockedAt: Date.now(),
        });
        setIsLoading(false);
        onSuccessUnlocked?.();
        onClose();
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setErrorMsg(err.message || "Could not connect to payment gateway. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#D9D8D2] bg-[#FAF9F5] flex items-start justify-between relative">
          <div className="space-y-1.5 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles size={12} />
              <span>Studio Print Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#171717]">
              Print Studio-Quality Sticker Sheets
            </h2>
            <p className="text-xs sm:text-sm text-[#6F6F6A] leading-relaxed">
              Export high-density 300 DPI layouts calibrated for physical vinyl sticker paper and craft cutters.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#171717]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#69A875]/20 text-[#69A875] flex items-center justify-center flex-shrink-0">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="font-medium">True 300 DPI rasterization (ultra-sharp)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#69A875]/20 text-[#69A875] flex items-center justify-center flex-shrink-0">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="font-medium">A4, US Letter, 4×6, and Square paper</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#69A875]/20 text-[#69A875] flex items-center justify-center flex-shrink-0">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="font-medium">Scissor & Cricut cut guidelines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#69A875]/20 text-[#69A875] flex items-center justify-center flex-shrink-0">
                <Check size={10} strokeWidth={3} />
              </div>
              <span className="font-medium">Commercial rights for physical shops</span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Tier 1: Single Sheet */}
            <div
              onClick={() => setSelectedTier("single_sheet")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === "single_sheet"
                  ? "border-[#171717] bg-[#FAF9F5] shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div>
                <div className="text-[11px] font-semibold text-[#6F6F6A] uppercase tracking-wider">
                  Single Sheet
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#171717]">$1.99</span>
                  <span className="text-[11px] text-[#6F6F6A]">one-time</span>
                </div>
                <p className="mt-2 text-[11px] text-[#6F6F6A] leading-relaxed">
                  Instant unlock for this sheet. Zero login required.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-medium text-[#171717]">
                1 clean 300 DPI export
              </div>
            </div>

            {/* Tier 2: 5-Sheet Pack */}
            <div
              onClick={() => setSelectedTier("pack")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedTier === "pack"
                  ? "border-[#171717] bg-[#FAF9F5] shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                Save 50%
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#6F6F6A] uppercase tracking-wider">
                  5-Sheet Pack
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#171717]">$4.99</span>
                  <span className="text-[11px] text-[#6F6F6A]">one-time</span>
                </div>
                <p className="mt-2 text-[11px] text-[#6F6F6A] leading-relaxed">
                  5 sheets at $1.00 each. Valid for any projects anytime.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-medium text-[#171717]">
                5 print sheet credits
              </div>
            </div>

            {/* Tier 3: Pro Subscription */}
            <div
              onClick={() => setSelectedTier("subscription")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === "subscription"
                  ? "border-[#FF5A36] bg-[#FF5A36]/5 shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div>
                <div className="text-[11px] font-semibold text-[#FF5A36] uppercase tracking-wider">
                  Pro Creator
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#171717]">$7.99</span>
                  <span className="text-[11px] text-[#6F6F6A]">/month</span>
                </div>
                <p className="mt-2 text-[11px] text-[#6F6F6A] leading-relaxed">
                  Unlimited 300 DPI exports & 4× digital exports.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-medium text-[#FF5A36]">
                Unlimited sheets & pro tools
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer & Action Button */}
        <div className="p-5 border-t border-[#D9D8D2] bg-[#FAF9F5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#6F6F6A]">
            <ShieldCheck size={15} className="text-[#69A875]" />
            <span>256-Bit Encrypted via Stripe • Apple Pay • Google Pay • Cards</span>
          </div>

          <button
            onClick={() => handleCheckout(selectedTier)}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Connecting to Checkout…</span>
              </>
            ) : (
              <>
                <span>
                  {selectedTier === "single_sheet"
                    ? "Unlock Single Sheet ($1.99)"
                    : selectedTier === "pack"
                    ? "Get 5-Sheet Pack ($4.99)"
                    : "Subscribe to Pro ($7.99/mo)"}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
