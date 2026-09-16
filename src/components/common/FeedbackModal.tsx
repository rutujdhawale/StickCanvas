"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Bug, Lightbulb, MessageSquare, Send, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

type FeedbackType = "bug" | "feature" | "feedback";

export const FeedbackModal: React.FC = () => {
  const { feedbackModalOpen, closeFeedbackModal, showToast } = useUIStore();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (feedbackModalOpen) {
      setMessage("");
      setIsSuccess(false);
      setIsSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [feedbackModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && feedbackModalOpen) {
        closeFeedbackModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedbackModalOpen, closeFeedbackModal]);

  if (!feedbackModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 3) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim(),
          pageUrl: typeof window !== "undefined" ? window.location.pathname : "/editor",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send feedback");
      }

      setIsSuccess(true);
      showToast("Thank you! Feedback received ✓");
      setTimeout(() => {
        closeFeedbackModal();
      }, 2200);
    } catch {
      showToast("Could not send feedback. Please try again or open a GitHub issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={closeFeedbackModal}
    >
      <div
        className="bg-white rounded-2xl border border-[#D9D8D2] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 select-none text-[#171717]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D9D8D2] bg-[#F7F6F2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="logo-mark">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#171717] tracking-tight">
                Send Feedback & Report Bugs
              </h3>
              <p className="text-[11px] text-[#6F6F6A]">
                Help us make StickerCanvas better. Every message is reviewed directly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeFeedbackModal}
            className="p-1.5 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="font-bold text-base text-[#171717]">Feedback Received!</h4>
            <p className="text-xs text-[#6F6F6A] max-w-sm leading-relaxed">
              Thank you for sharing your thoughts. Your report has been dispatched directly to the development team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Category Selector Pills */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-2">
                What would you like to share?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType("bug")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${type === "bug"
                      ? "border-[#FF4D4F] bg-[#FFF1F0] text-[#CF1322] font-semibold shadow-2xs"
                      : "border-[#D9D8D2] bg-white text-[#6F6F6A] hover:bg-[#FAF9F5] hover:text-[#171717]"
                    }`}
                >
                  <Bug size={14} />
                  <span>Report Bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType("feature")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${type === "feature"
                      ? "border-[#722ED1] bg-[#F9F0FF] text-[#531DAB] font-semibold shadow-2xs"
                      : "border-[#D9D8D2] bg-white text-[#6F6F6A] hover:bg-[#FAF9F5] hover:text-[#171717]"
                    }`}
                >
                  <Lightbulb size={14} />
                  <span>Feature Idea</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType("feedback")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${type === "feedback"
                      ? "border-[#FF5A36] bg-[#FF5A36]/10 text-[#FF5A36] font-semibold shadow-2xs"
                      : "border-[#D9D8D2] bg-white text-[#6F6F6A] hover:bg-[#FAF9F5] hover:text-[#171717]"
                    }`}
                >
                  <MessageSquare size={14} />
                  <span>General Note</span>
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                {type === "bug"
                  ? "Describe what happened & what you expected"
                  : type === "feature"
                    ? "What feature or tool would you like to see?"
                    : "Tell us what you think"}
              </label>
              <textarea
                ref={textareaRef}
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Example: When I uploaded an image on iOS Safari, the cut border didn't render until I zoomed in..."
                    : type === "feature"
                      ? "Example: I'd love a circular die-cut preset or holographic metallic shine effects..."
                      : "Thoughts, critique, compliments, or creative workflows..."
                }
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all resize-none"
              />
            </div>

            {/* Optional Email Input */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Your Email <span className="text-[11px] font-normal text-[#6F6F6A]">(Optional — for updates or fixes)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#ECEBE6]">

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                <button
                  type="button"
                  onClick={closeFeedbackModal}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-medium text-[#6F6F6A] hover:bg-[#ECEBE6] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 3}
                  className="px-4 py-2 text-xs font-semibold bg-[#FF5A36] hover:bg-[#e84e2c] text-white rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send feedback</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
