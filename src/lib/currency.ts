// Currency Localization & Detection for StickerCanvas
// Detects user locale, formats currency, and provides approximate local currency equivalents.

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateToUsd: number; // 1 USD = rate
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", rateToUsd: 1.0, decimalPlaces: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", rateToUsd: 83.5, decimalPlaces: 0 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", rateToUsd: 0.92, decimalPlaces: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rateToUsd: 0.79, decimalPlaces: 2 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", rateToUsd: 1.36, decimalPlaces: 2 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", rateToUsd: 1.52, decimalPlaces: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", rateToUsd: 154.0, decimalPlaces: 0 },
};

const LOCAL_STORAGE_CURRENCY_KEY = "stickercanvas_preferred_currency";

/**
 * Detect user's local currency based on browser language and timezone.
 */
export function detectUserCurrency(): string {
  if (typeof window === "undefined") return "USD";

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
    if (saved && SUPPORTED_CURRENCIES[saved]) {
      return saved;
    }

    const nav = window.navigator;
    const lang = (nav.language || (nav.languages && nav.languages[0]) || "").toLowerCase();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    if (lang.includes("in") || timeZone.includes("Calcutta") || timeZone.includes("Kolkata") || timeZone.includes("India")) {
      return "INR";
    }
    if (lang.includes("gb") || timeZone.includes("London")) {
      return "GBP";
    }
    if (
      lang.includes("de") ||
      lang.includes("fr") ||
      lang.includes("es") ||
      lang.includes("it") ||
      lang.includes("nl") ||
      timeZone.includes("Europe")
    ) {
      return "EUR";
    }
    if (lang.includes("ca") || timeZone.includes("Canada")) {
      return "CAD";
    }
    if (lang.includes("au") || timeZone.includes("Australia")) {
      return "AUD";
    }
    if (lang.includes("ja") || timeZone.includes("Tokyo")) {
      return "JPY";
    }
  } catch {
    // fallback
  }

  return "USD";
}

export function savePreferredCurrency(currencyCode: string): void {
  if (typeof window === "undefined") return;
  try {
    if (SUPPORTED_CURRENCIES[currencyCode]) {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, currencyCode);
    }
  } catch {
    // ignore
  }
}

export interface FormattedPrice {
  currency: string;
  symbol: string;
  formatted: string;
  isLocalEquivalent: boolean;
  usdEquivalent: string;
  note?: string;
}

/**
 * Format a USD base price into the target currency.
 */
export function formatLocalizedPrice(usdPrice: number, targetCurrency?: string): FormattedPrice {
  const code = targetCurrency && SUPPORTED_CURRENCIES[targetCurrency] ? targetCurrency : detectUserCurrency();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD;

  const usdFormatted = `$${usdPrice.toFixed(2)}`;

  if (code === "USD") {
    return {
      currency: "USD",
      symbol: "$",
      formatted: usdFormatted,
      isLocalEquivalent: false,
      usdEquivalent: usdFormatted,
    };
  }

  const converted = usdPrice * config.rateToUsd;
  let formattedAmount: string;

  if (config.decimalPlaces === 0) {
    // Round to nearest 5 or 9 for clean psychological pricing
    const rounded = Math.round(converted);
    formattedAmount = `${config.symbol}${rounded.toLocaleString()}`;
  } else {
    formattedAmount = `${config.symbol}${converted.toFixed(config.decimalPlaces)}`;
  }

  return {
    currency: code,
    symbol: config.symbol,
    formatted: formattedAmount,
    isLocalEquivalent: true,
    usdEquivalent: usdFormatted,
    note: `Approx. ${formattedAmount} (${usdFormatted} USD)`,
  };
}
