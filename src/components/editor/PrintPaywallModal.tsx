"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
  HelpCircle,
  Globe,
  AlertCircle,
} from "lucide-react";
import { PrintSheetOptions } from "@/lib/export-artwork";
import { savePrintEntitlement } from "@/lib/print-entitlements";
import { PRICING_TIERS, PricingTierId } from "@/config/pricing";
import {
  formatLocalizedPrice,
  SUPPORTED_CURRENCIES,
  detectUserCurrency,
  savePreferredCurrency,
} from "@/lib/currency";
import { useAuthStore } from "@/store/authStore";

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
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const [selectedTier, setSelectedTier] = useState<PricingTierId>("single_sheet");
  const [currency, setCurrency] = useState<string>("USD");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePaymentId, setRestorePaymentId] = useState("");
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrency(detectUserCurrency());
      setErrorMsg(null);
      setPaymentFailed(false);
      setShowRestoreInput(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    savePreferredCurrency(newCurr);
  };

  const handleCheckout = async (tier: PricingTierId) => {
    setIsLoading(true);
    setErrorMsg(null);
    setPaymentFailed(false);

    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          customerEmail: user?.email,
          customerName: user?.name,
          sheetMetadata: {
            paperFormat: printOptions?.paperFormat || "a4",
            orientation: printOptions?.orientation || "landscape",
            stickerCount: 0,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create Dodo Payments checkout");
      }

      // If simulated dev mode or instant redirect
      if (data.simulated) {
        savePrintEntitlement({
          type: tier,
          credits: tier === "sheet_pack" ? 5 : tier === "pro_creator" ? 999 : 1,
          unlockedAt: Date.now(),
          token: data.paymentId,
        });
        setIsLoading(false);
        onSuccessUnlocked?.();
        onClose();
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: unknown) {
      console.error("[Dodo Checkout Error]", err);
      const msg = err instanceof Error ? err.message : "Could not connect to payment gateway.";
      setErrorMsg(msg);
      setPaymentFailed(true);
      setIsLoading(false);
    }
  };

  const handleRestore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pid = restorePaymentId.trim();
    if (!pid) {
      setErrorMsg("Please enter your Payment ID or email address.");
      return;
    }

    setIsRestoring(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/dodo/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: pid, email: pid.includes("@") ? pid : undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.hasAccess) {
        throw new Error(data.error || "No active purchase found.");
      }

      savePrintEntitlement({
        type: data.type || "single_sheet",
        credits: data.credits || 1,
        unlockedAt: Date.now(),
        token: pid,
      });

      setIsRestoring(false);
      onSuccessUnlocked?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not restore purchase.";
      setErrorMsg(msg);
      setIsRestoring(false);
    }
  };

  const tierSingle = formatLocalizedPrice(PRICING_TIERS.single_sheet.usdPrice, currency);
  const tierPack = formatLocalizedPrice(PRICING_TIERS.sheet_pack.usdPrice, currency);
  const tierPro = formatLocalizedPrice(PRICING_TIERS.pro_creator.usdPrice, currency);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white border border-[#D9D8D2] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D9D8D2] bg-[#FAF9F5] flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles size={12} />
              <span>Studio Print Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#171717]">
              Print Studio-Quality Sticker Sheets
            </h2>
            <p className="text-xs text-[#6F6F6A] leading-relaxed">
              Export high-density 300 DPI layouts calibrated for physical vinyl sticker paper.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature Highlights & Currency Selector */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#ECEBE6]">
            <div className="flex items-center gap-2 text-[#6F6F6A]">
              <Check size={14} className="text-[#10B981]" />
              <span>300 DPI rasterization & SVG cut lines</span>
            </div>
            {/* Currency switcher */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#6F6F6A]">
              <Globe size={13} />
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="bg-[#FAF9F5] border border-[#D9D8D2] rounded-lg px-2 py-0.5 text-xs text-[#171717] focus:outline-none focus:border-[#FF5A36]"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Sync / Guest Checkout Banner */}
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between px-3 py-2 bg-[#FAF9F5] border border-[#D9D8D2] rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#FF5A36] text-white flex items-center justify-center text-[10px] font-bold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="font-medium text-[#171717] truncate max-w-[220px]">
                  Signed in as {user.email}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                Credits linked to account
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-[#FAF9F5] border border-[#D9D8D2] rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-[#6F6F6A]">
                <span className="font-medium text-[#171717]">Guest checkout</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="text-[#FF5A36] font-semibold hover:underline"
                >
                  Sign in or Google
                </button>
                <span className="hidden sm:inline">to sync print credits across devices</span>
              </div>
              <span className="text-[10px] text-[#6F6F6A]">Optional</span>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Tier 1: Single Sheet */}
            <div
              onClick={() => setSelectedTier("single_sheet")}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === "single_sheet"
                  ? "border-[#171717] bg-[#FAF9F5] shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div>
                <div className="text-[10px] font-bold text-[#6F6F6A] uppercase tracking-wider">
                  Single Sheet
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-[#171717]">{tierSingle.formatted}</span>
                  <span className="text-[10px] text-[#6F6F6A]">one-time</span>
                </div>
                {tierSingle.note && (
                  <div className="text-[9px] text-[#6F6F6A] mt-0.5 font-medium">{tierSingle.note}</div>
                )}
                <p className="mt-1.5 text-[11px] text-[#6F6F6A] leading-snug">
                  Instant unlock for this sheet. Guest checkout.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-semibold text-[#171717]">
                1 clean 300 DPI export
              </div>
            </div>

            {/* Tier 2: 5-Sheet Pack */}
            <div
              onClick={() => setSelectedTier("sheet_pack")}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedTier === "sheet_pack"
                  ? "border-[#171717] bg-[#FAF9F5] shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                Save 50%
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#6F6F6A] uppercase tracking-wider">
                  5-Sheet Pack
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-[#171717]">{tierPack.formatted}</span>
                  <span className="text-[10px] text-[#6F6F6A]">one-time</span>
                </div>
                {tierPack.note && (
                  <div className="text-[9px] text-[#6F6F6A] mt-0.5 font-medium">{tierPack.note}</div>
                )}
                <p className="mt-1.5 text-[11px] text-[#6F6F6A] leading-snug">
                  5 sheets. Credits never expire.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-semibold text-[#171717]">
                5 print credits ($1.00/ea)
              </div>
            </div>

            {/* Tier 3: Pro Subscription */}
            <div
              onClick={() => setSelectedTier("pro_creator")}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedTier === "pro_creator"
                  ? "border-[#FF5A36] bg-[#FF5A36]/5 shadow-xs"
                  : "border-[#D9D8D2] hover:border-[#6F6F6A] bg-white"
              }`}
            >
              <div>
                <div className="text-[10px] font-bold text-[#FF5A36] uppercase tracking-wider">
                  Pro Creator
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-[#171717]">{tierPro.formatted}</span>
                  <span className="text-[10px] text-[#6F6F6A]">/month</span>
                </div>
                {tierPro.note && (
                  <div className="text-[9px] text-[#6F6F6A] mt-0.5 font-medium">{tierPro.note}</div>
                )}
                <p className="mt-1.5 text-[11px] text-[#6F6F6A] leading-snug">
                  Unlimited 300 DPI exports & commercial license.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#D9D8D2]/60 text-[10px] font-semibold text-[#FF5A36]">
                Unlimited sheets
              </div>
            </div>
          </div>

          {/* Payment Failure Recovery State */}
          {paymentFailed && (
            <div className="p-3 bg-[#FFF1F0] border border-[#FFCCC7] rounded-xl space-y-2 text-xs">
              <div className="flex items-start gap-2 text-[#CF1322]">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment wasn't completed.</p>
                  <p className="text-[11px] text-[#A8071A]">Your sticker sheet is still saved.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleCheckout(selectedTier)}
                  className="px-3 py-1.5 bg-[#FF4D4F] text-white font-medium rounded-lg hover:bg-[#F5222D] transition-colors"
                >
                  Try again
                </button>
                <a
                  href="mailto:support@stickercanvas.art?subject=Payment%20Issue%20-%20Dodo%20Payments&body=Context:%20Dodo%20Payments%20Checkout%0ATier:%20"
                  className="px-3 py-1.5 bg-white border border-[#FFCCC7] text-[#171717] font-medium rounded-lg hover:bg-[#FAF9F5] transition-colors"
                >
                  Contact support
                </a>
              </div>
            </div>
          )}

          {errorMsg && !paymentFailed && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Restore Purchase Drawer */}
          <div className="pt-1 border-t border-[#ECEBE6]">
            {!showRestoreInput ? (
              <button
                type="button"
                onClick={() => setShowRestoreInput(true)}
                className="text-xs text-[#6F6F6A] hover:text-[#171717] flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Already purchased? Restore purchase</span>
              </button>
            ) : (
              <form onSubmit={handleRestore} className="space-y-2 bg-[#FAF9F5] p-3 rounded-xl border border-[#D9D8D2]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">Restore previous purchase</span>
                  <button
                    type="button"
                    onClick={() => setShowRestoreInput(false)}
                    className="text-[#6F6F6A] hover:text-[#171717] text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={restorePaymentId}
                    onChange={(e) => setRestorePaymentId(e.target.value)}
                    placeholder="Enter Payment ID or email"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#D9D8D2] rounded-lg text-[#171717] focus:outline-none focus:border-[#FF5A36]"
                  />
                  <button
                    type="submit"
                    disabled={isRestoring || !restorePaymentId.trim()}
                    className="px-3 py-1.5 bg-[#171717] text-white text-xs font-semibold rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-50"
                  >
                    {isRestoring ? "Checking…" : "Restore"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer & Action Button */}
        <div className="p-4 sm:p-5 border-t border-[#D9D8D2] bg-[#FAF9F5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#6F6F6A]">
            <ShieldCheck size={15} className="text-[#10B981]" />
            <span>Encrypted via Dodo Payments • Cards • Apple Pay • Google Pay</span>
          </div>

          <button
            onClick={() => handleCheckout(selectedTier)}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#FF5A36] hover:bg-[#e84e2c] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                    ? `Unlock Single Sheet (${tierSingle.formatted})`
                    : selectedTier === "sheet_pack"
                    ? `Get 5-Sheet Pack (${tierPack.formatted})`
                    : `Subscribe to Pro (${tierPro.formatted}/mo)`}
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
