import type { QuoteData, FundHolding } from "../types";

import YahooFinance from "yahoo-finance2";

// Singleton instance
let yahooFinanceInstance: InstanceType<typeof YahooFinance> | null = null;
function getYahooFinance(): InstanceType<typeof YahooFinance> {
  if (!yahooFinanceInstance) {
    yahooFinanceInstance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  }
  return yahooFinanceInstance;
}

// === In-memory caching ===

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const quoteCache = new Map<string, CacheEntry<QuoteData>>();
const holdingsCache = new Map<string, CacheEntry<FundHolding[]>>();

const QUOTE_TTL = 4_000; // 4 seconds
const HOLDINGS_TTL = 3_600_000; // 1 hour

function isCacheValid<T>(entry: CacheEntry<T> | undefined, ttl: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

// === Symbol mapping ===

/** Map Fidelity symbols to Yahoo Finance symbols */
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  "BRK-B": "BRK-B", // Already correct after CSV parser normalization
};

/**
 * Some 401k/CIT symbols are internal plan identifiers, not public market tickers.
 * For holdings lookups only, map them to a public share class with equivalent
 * portfolio construction so we can decompose the target-date fund.
 */
const HOLDINGS_PROXY_SYMBOL_MAP: Record<string, string> = {
  // Fidelity 401k symbol for BlackRock LifePath Index 2055 target-date fund
  "09261F572": "LIVIX",
};

/** Known symbols that won't be found on Yahoo Finance */
const SKIP_SYMBOLS = new Set(["FZFXX", "FDRXX", "SPAXX"]);

/** Symbols with non-standard format (e.g. 401K fund identifiers) */
function isNonStandardSymbol(symbol: string): boolean {
  return /^\d/.test(symbol) || symbol.length > 8;
}

function toYahooSymbol(symbol: string): string {
  return YAHOO_SYMBOL_MAP[symbol] || symbol;
}

function toHoldingsLookupSymbol(symbol: string): string {
  return HOLDINGS_PROXY_SYMBOL_MAP[symbol] || toYahooSymbol(symbol);
}

// === Quote fetching ===

/**
 * Fetch quotes for multiple symbols in batch.
 * Returns a map of symbol → QuoteData.
 * Uses caching to avoid redundant requests.
 */
export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const result: Record<string, QuoteData> = {};
  const toFetch: string[] = [];

  // Check cache first
  for (const sym of symbols) {
    if (SKIP_SYMBOLS.has(sym) || isNonStandardSymbol(sym)) continue;
    const cached = quoteCache.get(sym);
    if (isCacheValid(cached, QUOTE_TTL)) {
      result[sym] = cached!.data;
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    const yahooFinance = getYahooFinance();
    const yahooSymbols = toFetch.map(toYahooSymbol);

    const quotes = await yahooFinance.quote(yahooSymbols, {}, { validateResult: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];

    for (const q of quotesArray) {
      if (!q || !q.symbol) continue;

      // Map Yahoo symbol back to our symbol
      const ourSymbol =
        toFetch.find(
          (s) => toYahooSymbol(s) === q.symbol
        ) || q.symbol;

      const quoteData: QuoteData = {
        symbol: ourSymbol,
        regularMarketPrice: q.regularMarketPrice ?? 0,
        regularMarketChange: q.regularMarketChange ?? 0,
        regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        shortName: q.shortName ?? "",
        longName: q.longName ?? q.shortName ?? "",
      };

      result[ourSymbol] = quoteData;
      quoteCache.set(ourSymbol, {
        data: quoteData,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error("Error fetching quotes:", error);
    // Return whatever we have from cache
  }

  return result;
}

// === Holdings fetching ===

/**
 * Fetch top holdings for a single fund/ETF symbol.
 */
async function fetchHoldingsForSymbol(
  symbol: string
): Promise<FundHolding[]> {
  // Check cache
  const cached = holdingsCache.get(symbol);
  if (isCacheValid(cached, HOLDINGS_TTL)) {
    return cached!.data;
  }

  const lookupSymbol = toHoldingsLookupSymbol(symbol);

  if (SKIP_SYMBOLS.has(lookupSymbol) || isNonStandardSymbol(lookupSymbol)) {
    return [];
  }

  try {
    const yahooFinance = getYahooFinance();
    const yahooSym = lookupSymbol;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary: any = await yahooFinance.quoteSummary(yahooSym, {
      modules: ["topHoldings"],
    });

    const holdings: FundHolding[] = [];
    const topHoldings = summary?.topHoldings?.holdings;

    if (topHoldings && Array.isArray(topHoldings)) {
      for (const h of topHoldings) {
        if (h.symbol && h.holdingPercent !== undefined) {
          holdings.push({
            symbol: h.symbol,
            holdingName: h.holdingName || h.symbol,
            holdingPercent: h.holdingPercent,
          });
        }
      }
    }

    // Cache even empty results (means this symbol has no holdings data)
    holdingsCache.set(symbol, { data: holdings, timestamp: Date.now() });
    return holdings;
  } catch (error) {
    console.error(`Error fetching holdings for ${symbol}:`, error);
    // Cache empty result to avoid retrying immediately
    holdingsCache.set(symbol, { data: [], timestamp: Date.now() });
    return [];
  }
}

/**
 * Fetch holdings for multiple fund symbols in parallel.
 */
export async function fetchAllHoldings(
  fundSymbols: string[]
): Promise<Record<string, FundHolding[]>> {
  const results = await Promise.allSettled(
    fundSymbols.map(async (sym) => ({
      symbol: sym,
      holdings: await fetchHoldingsForSymbol(sym),
    }))
  );

  const holdingsMap: Record<string, FundHolding[]> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      holdingsMap[result.value.symbol] = result.value.holdings;
    }
  }

  return holdingsMap;
}
