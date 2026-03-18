/**
 * Fidelity quote URL and symbol linkability.
 * Only link symbols that Fidelity's quote page supports.
 *
 * Works: Stocks (AAPL), ETFs (VTI, SPY), mutual funds (FXAIX, VTSAX),
 *        exchange-qualified (6501.T, 0700.HK).
 * Does not work: Cash/money market (FZFXX, FDRXX, SPAXX),
 *               401k internal IDs (900000001), malformed symbols.
 */

const FIDELITY_QUOTE_BASE =
  "https://digital.fidelity.com/prgw/digital/research/quote";

/** Symbols Fidelity does not have standard quote pages for (cash, sweep, etc.) */
const FIDELITY_SKIP_SYMBOLS = new Set(["FZFXX", "FDRXX", "SPAXX"]);

/** Standard ticker: letters/numbers/hyphen, optional .EXCHANGE suffix */
const FIDELITY_SYMBOL_PATTERN = /^[A-Z0-9-]+(?:\.[A-Z]+)?$/i;

function isNonStandardSymbol(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || !FIDELITY_SYMBOL_PATTERN.test(normalized)) return true;

  const [baseSymbol] = normalized.split(".", 2);
  // 401k internal IDs are numeric and don't work on Fidelity quote
  if (/^\d/.test(baseSymbol)) return true;
  if (normalized.length > 10) return true;

  return false;
}

/**
 * Returns true if the symbol is linkable to Fidelity's quote page.
 * Only link symbols known to work (stocks, ETFs, mutual funds).
 */
export function isFidelityLinkable(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || normalized.length > 15) return false;
  if (FIDELITY_SKIP_SYMBOLS.has(normalized)) return false;
  if (!FIDELITY_SYMBOL_PATTERN.test(normalized)) return false;
  return !isNonStandardSymbol(normalized);
}

/** Build Fidelity quote URL for a symbol. Call only when isFidelityLinkable is true. */
export function getFidelityQuoteUrl(symbol: string): string {
  const encoded = encodeURIComponent(symbol.trim().toUpperCase());
  return `${FIDELITY_QUOTE_BASE}?symbol=${encoded}`;
}
