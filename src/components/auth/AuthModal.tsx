"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Lock, Mail, User as UserIcon, ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { StickerLogoMark } from "@/components/common/StickerLogoMark";

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalView,
    isLoading,
    login,
    loginWithGoogle,
    signup,
    requestPasswordReset,
    resetPassword,
    closeAuthModal,
    setAuthModalView,
    resetToken,
    resetEmail,
  } = useAuthStore();
  const { showToast } = useUIStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authModalOpen) {
      setError(null);
      setPassword("");
      setNewPassword("");
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [authModalOpen, authModalView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && authModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    const res = await loginWithGoogle();
    if (res.success) {
      showToast("Signed in with Google ✓");
    } else if (res.error) {
      setError(res.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalView === "login") {
      const res = await login(email, password);
      if (res.success) {
        showToast("Signed in successfully ✓");
      } else {
        setError(res.error || "Failed to sign in");
      }
    } else if (authModalView === "signup") {
      const res = await signup(name, email, password);
      if (res.success) {
        showToast("Account created successfully ✓");
      } else {
        setError(res.error || "Failed to create account");
      }
    } else if (authModalView === "forgot") {
      const res = await requestPasswordReset(email);
      if (res.success) {
        showToast("Reset link sent! Set your new password below.");
      } else {
        setError(res.error || "Failed to request reset");
      }
    } else if (authModalView === "reset") {
      const res = await resetPassword(resetToken || "direct", newPassword);
      if (res.success) {
        showToast("Password updated successfully ✓");
      } else {
        setError(res.error || "Failed to reset password");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={closeAuthModal}
    >
      <div
        className="bg-white rounded-2xl border border-[#D9D8D2] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 select-none text-[#171717]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#D9D8D2] bg-[#F7F6F2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StickerLogoMark size={22} />
            <div>
              <h3 className="font-bold text-sm text-[#171717] tracking-tight">
                {authModalView === "login"
                  ? "Sign in to StickerCanvas"
                  : authModalView === "signup"
                  ? "Create Creator Account"
                  : authModalView === "forgot"
                  ? "Reset Your Password"
                  : "Set New Password"}
              </h3>
              <p className="text-[11px] text-[#6F6F6A]">
                {authModalView === "login"
                  ? "Access your saved sheets & print credits"
                  : authModalView === "signup"
                  ? "Save your stickers & print credits across devices"
                  : authModalView === "forgot"
                  ? "Enter your email for reset instructions"
                  : `Updating account for ${resetEmail || "you"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-[#6F6F6A] hover:text-[#171717] hover:bg-[#ECEBE6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#FFF1F0] border border-[#FFCCC7] text-[#CF1322] rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <span>{error}</span>
            </div>
          )}

          {/* Social Auth: Google Option (on login & signup views) */}
          {(authModalView === "login" || authModalView === "signup") && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF9F5] text-[#171717] border border-[#D9D8D2] rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-[0.98] disabled:opacity-50"
              >
                <GoogleIcon size={16} />
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-[#ECEBE6] w-full" />
                <span className="bg-white px-3 text-[11px] text-[#6F6F6A] uppercase tracking-wider relative font-medium">
                  or with email
                </span>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalView === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6A]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all"
                  />
                </div>
              </div>
            )}

            {authModalView !== "reset" && (
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6A]" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@example.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all"
                  />
                </div>
              </div>
            )}

            {(authModalView === "login" || authModalView === "signup") && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#171717]">
                    Password
                  </label>
                  {authModalView === "login" && (
                    <button
                      type="button"
                      onClick={() => setAuthModalView("forgot")}
                      className="text-[11px] text-[#FF5A36] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6A]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all"
                  />
                </div>
              </div>
            )}

            {authModalView === "reset" && (
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6F6A]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D9D8D2] rounded-xl text-[#171717] placeholder:text-[#9E9E98] focus:outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-[#FF5A36] hover:bg-[#e84e2c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Please wait…</span>
                </>
              ) : authModalView === "login" ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={13} />
                </>
              ) : authModalView === "signup" ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={13} />
                </>
              ) : authModalView === "forgot" ? (
                <span>Send Reset Link</span>
              ) : (
                <span>Save New Password</span>
              )}
            </button>
          </form>

          {/* Toggle between views */}
          <div className="pt-2 text-center text-xs text-[#6F6F6A] border-t border-[#ECEBE6]">
            {authModalView === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthModalView("signup")}
                  className="text-[#FF5A36] font-semibold hover:underline"
                >
                  Create one
                </button>
              </p>
            ) : authModalView === "signup" ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthModalView("login")}
                  className="text-[#FF5A36] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalView("login")}
                className="text-[#171717] font-semibold hover:underline"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
