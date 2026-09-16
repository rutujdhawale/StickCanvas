// Client-side Print Sheet Entitlements & Session Token Manager
// Enables zero-friction guest purchases without mandatory login.

const ENTITLEMENT_KEY = "stickercanvas_print_entitlements";

export interface PrintEntitlement {
  type: "single_sheet" | "sheet_pack" | "pack" | "pro_creator" | "subscription" | "dev_pass";
  credits: number;
  unlockedAt: number;
  expiresAt?: number;
  token?: string;
}

export function getPrintEntitlements(): PrintEntitlement | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENTITLEMENT_KEY);
    if (!raw) return null;
    const data: PrintEntitlement = JSON.parse(raw);

    // Check expiration
    if (data.expiresAt && Date.now() > data.expiresAt) {
      localStorage.removeItem(ENTITLEMENT_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function savePrintEntitlement(entitlement: PrintEntitlement): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(entitlement));
  } catch (err) {
    console.error("Failed to persist print entitlement:", err);
  }
}

export function hasActivePrintAccess(): boolean {
  const ent = getPrintEntitlements();
  if (!ent) return false;
  if (ent.type === "subscription" || ent.type === "pro_creator" || ent.type === "dev_pass") return true;
  return ent.credits > 0;
}

export function consumePrintCredit(): boolean {
  const ent = getPrintEntitlements();
  if (!ent) return false;

  if (ent.type === "subscription" || ent.type === "pro_creator" || ent.type === "dev_pass") {
    return true;
  }

  if (ent.credits > 0) {
    ent.credits -= 1;
    savePrintEntitlement(ent);
    return true;
  }

  return false;
}
