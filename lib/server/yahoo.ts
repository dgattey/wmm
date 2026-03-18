import type { QuoteData, FundHolding } from "../types";

import { unstable_cache } from "next/cache";
import YahooFinance from "yahoo-finance2";
import { fetchDirectFundHoldings } from "./holdings";

// Singleton instance
let yahooFinanceInstance: InstanceType<typeof YahooFinance> | null = null;
function getYahooFinance(): InstanceType<typeof YahooFinance> {
  if (!yahooFinanceInstance) {
    yahooFinanceInstance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  }
  return yahooFinanceInstance;
}

const QUOTE_REVALIDATE_SECONDS = 4;
const HOLDINGS_REVALIDATE_SECONDS = 60 * 60;
const SHOULD_BYPASS_NEXT_CACHE = process.env.NODE_ENV === "test";
const LOOKTHROUGH_DEPTH = 1;
const MIN_HOLDING_PERCENT = 0.000001;

// === Symbol mapping ===

/** Map Fidelity symbols to Yahoo Finance symbols */
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  "BRK-B": "BRK-B", // Already correct after CSV parser normalization
};

/** Generic abbreviation expansions for retirement-plan fund names */
const FUND_DESCRIPTION_TERM_MAP: Record<string, string> = {
  IDX: "INDEX",
  LPATH: "LIFEPATH",
  RET: "RETIREMENT",
  INTL: "INTERNATIONAL",
  STK: "STOCK",
  MKT: "MARKET",
  EQ: "EQUITY",
  BD: "BOND",
  INC: "INCOME",
  GR: "GROWTH",
  VAL: "VALUE",
};

/** Known symbols that won't be found on Yahoo Finance */
const SKIP_SYMBOLS = new Set(["FZFXX", "FDRXX", "SPAXX"]);

/** Symbols with non-standard format (e.g. 401K fund identifiers) */
const YAHOO_SYMBOL_PATTERN = /^[A-Z0-9-]+(?:\.[A-Z]+)?$/i;

function isNonStandardSymbol(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || !YAHOO_SYMBOL_PATTERN.test(normalized)) return true;

  const [baseSymbol, exchangeSuffix] = normalized.split(".", 2);
  if (exchangeSuffix) return false;

  return /^\d/.test(baseSymbol) || normalized.length > 8;
}

export function shouldSkipYahooSymbol(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized || normalized.length > 15) return true;
  if (!YAHOO_SYMBOL_PATTERN.test(normalized)) return true;

  return isNonStandardSymbol(normalized);
}

function toYahooSymbol(symbol: string): string {
  return YAHOO_SYMBOL_MAP[symbol] || symbol;
}

function normalizeFundDescription(description: string): string {
  const normalized = description
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  return normalized
    .split(/\s+/)
    .map((token) => FUND_DESCRIPTION_TERM_MAP[token] || token)
    .join(" ");
}

function buildFundSearchQueries(description: string): string[] {
  const normalized = normalizeFundDescription(description);
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/);
  const fullQuery = tokens
    .filter((token) => token.length > 1)
    .join(" ");
  const contentQuery = tokens
    .filter(
      (token) =>
        /^\d{4}$/.test(token) ||
        token.length > 3 ||
        token === "ETF" ||
        token === "FUND"
    )
    .join(" ");

  return [...new Set([fullQuery, contentQuery].filter(Boolean))];
}

function isProxyCandidateQuote(quote: {
  quoteType?: string;
  symbol?: string;
  longname?: string;
  shortname?: string;
}): boolean {
  if (!quote.symbol) return false;
  if (!["MUTUALFUND", "ETF"].includes(quote.quoteType || "")) return false;
  return !SKIP_SYMBOLS.has(quote.symbol);
}

async function resolveHoldingsLookupSymbols(description: string): Promise<string[]> {
  const queries = buildFundSearchQueries(description);
  if (queries.length === 0) return [];

  const yahooFinance = getYahooFinance();
  const candidates = new Set<string>();
  for (const query of queries) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchResult: any = await yahooFinance.search(query);
      const quotes = Array.isArray(searchResult?.quotes) ? searchResult.quotes : [];
      for (const candidate of quotes) {
        if (isProxyCandidateQuote(candidate)) {
          candidates.add(candidate.symbol);
        }
      }
    } catch (error) {
      console.error(`Error searching proxy symbol for "${description}":`, error);
    }
  }

  return [...candidates];
}

// === Quote fetching ===

/**
 * Fetch quotes for multiple symbols in batch.
 * Returns a map of symbol → QuoteData.
 */
async function fetchQuotesUncached(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const result: Record<string, QuoteData> = {};
  if (symbols.length === 0) return result;

  try {
    const yahooFinance = getYahooFinance();
    const yahooSymbols = symbols.map(toYahooSymbol);

    const quotes = await yahooFinance.quote(yahooSymbols, {}, { validateResult: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];

    for (const q of quotesArray) {
      if (!q || !q.symbol) continue;

      // Map Yahoo symbol back to our symbol
      const ourSymbol =
        symbols.find(
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
    }
  } catch (error) {
    console.error("Error fetching quotes:", error);
  }

  return result;
}

const fetchQuotesCached = unstable_cache(
  fetchQuotesUncached,
  ["yahoo-quotes-batch-v1"],
  {
    revalidate: QUOTE_REVALIDATE_SECONDS,
    tags: ["yahoo-quotes"],
  }
);

export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const normalizedSymbols = [...new Set(symbols)]
    .filter((sym) => !SKIP_SYMBOLS.has(sym) && !shouldSkipYahooSymbol(sym))
    .sort();

  if (normalizedSymbols.length === 0) {
    return {};
  }

  if (SHOULD_BYPASS_NEXT_CACHE) {
    return fetchQuotesUncached(normalizedSymbols);
  }

  return fetchQuotesCached(normalizedSymbols);
}

// === Holdings fetching ===

async function fetchYahooDirectHoldingsForSymbol(
  symbol: string
): Promise<FundHolding[]> {
  const yahooFinance = getYahooFinance();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any = await yahooFinance.quoteSummary(symbol, {
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

  return holdings;
}

/**
 * Fetch the direct holdings reported for a single fund/ETF symbol.
 * SEC N-PORT is preferred when supported; Yahoo topHoldings is the fallback.
 */
async function fetchDirectHoldingsForSymbolUncached(
  symbol: string,
  description?: string
): Promise<FundHolding[]> {
  if (SKIP_SYMBOLS.has(symbol)) {
    return [];
  }

  const lookupCandidates = [toYahooSymbol(symbol)];
  if (isNonStandardSymbol(symbol)) {
    if (!description) return [];
    const resolvedSymbols = await resolveHoldingsLookupSymbols(description);
    if (resolvedSymbols.length === 0) {
      return [];
    }
    lookupCandidates.splice(0, lookupCandidates.length, ...resolvedSymbols);
  }

  for (const candidateSymbol of lookupCandidates) {
    if (
      SKIP_SYMBOLS.has(candidateSymbol) ||
      isNonStandardSymbol(candidateSymbol)
    ) {
      continue;
    }

    try {
      const holdings = await fetchDirectFundHoldings({
        symbol: candidateSymbol,
        description,
        fetchYahooHoldings: fetchYahooDirectHoldingsForSymbol,
      });

      if (holdings.length > 0) {
        return holdings;
      }
    } catch (candidateError) {
      console.error(
        `Error fetching holdings for proxy ${candidateSymbol} of ${symbol}:`,
        candidateError
      );
    }
  }

  return [];
}

const fetchDirectHoldingsForSymbolCached = unstable_cache(
  async (symbol: string, description: string | null) =>
    fetchDirectHoldingsForSymbolUncached(symbol, description ?? undefined),
  ["hybrid-direct-holdings-v1"],
  {
    revalidate: HOLDINGS_REVALIDATE_SECONDS,
    tags: ["hybrid-direct-holdings"],
  }
);

async function fetchDirectHoldingsForSymbol(
  symbol: string,
  description?: string
): Promise<FundHolding[]> {
  if (SHOULD_BYPASS_NEXT_CACHE) {
    return fetchDirectHoldingsForSymbolUncached(symbol, description);
  }

  return fetchDirectHoldingsForSymbolCached(symbol, description ?? null);
}

function sumHoldingPercents(holdings: FundHolding[]): number {
  return holdings.reduce((sum, holding) => sum + holding.holdingPercent, 0);
}

function aggregateHoldings(holdings: FundHolding[]): FundHolding[] {
  const holdingMap = new Map<
    string,
    { symbol: string; holdingName: string; holdingPercent: number }
  >();

  for (const holding of holdings) {
    if (holding.holdingPercent <= MIN_HOLDING_PERCENT) continue;

    const existing = holdingMap.get(holding.symbol);
    if (existing) {
      existing.holdingPercent += holding.holdingPercent;
      if (!existing.holdingName && holding.holdingName) {
        existing.holdingName = holding.holdingName;
      }
    } else {
      holdingMap.set(holding.symbol, { ...holding });
    }
  }

  return [...holdingMap.values()].sort(
    (a, b) => b.holdingPercent - a.holdingPercent
  );
}

function buildResidualHolding(
  symbol: string,
  description: string | undefined,
  holdingPercent: number
): FundHolding | null {
  if (holdingPercent <= MIN_HOLDING_PERCENT) {
    return null;
  }

  return {
    symbol,
    holdingName: `Rest of ${description || symbol}`,
    holdingPercent,
  };
}

async function fetchHoldingsForSymbol(
  symbol: string,
  description?: string,
  depth = 0,
  visited = new Set<string>()
): Promise<FundHolding[]> {
  const directHoldings = await fetchDirectHoldingsForSymbol(symbol, description);
  if (directHoldings.length === 0) {
    return [];
  }

  const reportedPercent = sumHoldingPercents(directHoldings);
  const residualHolding = buildResidualHolding(
    symbol,
    description,
    Math.max(0, 1 - reportedPercent)
  );

  if (depth >= LOOKTHROUGH_DEPTH) {
    return aggregateHoldings(
      residualHolding ? [...directHoldings, residualHolding] : directHoldings
    );
  }

  const nextVisited = new Set(visited);
  nextVisited.add(symbol);

  const expandedHoldings: FundHolding[] = [];
  for (const holding of directHoldings) {
    if (nextVisited.has(holding.symbol)) {
      expandedHoldings.push(holding);
      continue;
    }

    const nestedHoldings = await fetchHoldingsForSymbol(
      holding.symbol,
      holding.holdingName,
      depth + 1,
      nextVisited
    );

    if (nestedHoldings.length === 0) {
      expandedHoldings.push(holding);
      continue;
    }

    for (const nestedHolding of nestedHoldings) {
      expandedHoldings.push({
        symbol: nestedHolding.symbol,
        holdingName: nestedHolding.holdingName,
        holdingPercent: holding.holdingPercent * nestedHolding.holdingPercent,
      });
    }
  }

  if (residualHolding) {
    expandedHoldings.push(residualHolding);
  }

  return aggregateHoldings(expandedHoldings);
}

/**
 * Fetch holdings for multiple fund symbols in parallel.
 */
export async function fetchAllHoldings(
  funds: Array<string | { symbol: string; description?: string }>
): Promise<Record<string, FundHolding[]>> {
  const normalizedFunds = funds.map((fund) =>
    typeof fund === "string"
      ? { symbol: fund, description: undefined }
      : { symbol: fund.symbol, description: fund.description }
  );

  const results = await Promise.allSettled(
    normalizedFunds.map(async ({ symbol, description }) => ({
      symbol,
      holdings: await fetchHoldingsForSymbol(symbol, description),
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
