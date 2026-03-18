import type { QuoteData, FundHolding } from "../types";

import { cacheLife } from "next/cache";
import YahooFinance from "yahoo-finance2";

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
const HOLDINGS_CONCURRENCY = 4;
const YAHOO_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 250;

const lastGoodQuotes = new Map<string, QuoteData>();
const lastGoodHoldings = new Map<string, FundHolding[]>();

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNumericErrorCode(error: unknown): number | null {
  const candidates = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any)?.code,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any)?.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any)?.statusCode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any)?.response?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function isRetryableYahooError(error: unknown): boolean {
  if (getNumericErrorCode(error) === 429) {
    return true;
  }

  return error instanceof Error && /too many requests/i.test(error.message);
}

async function withYahooRetry<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableYahooError(error) || attempt >= YAHOO_RETRY_ATTEMPTS - 1) {
        throw error;
      }

      const delayMs = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `${label} hit Yahoo rate limits, retrying in ${delayMs}ms`,
        error
      );
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

function cloneQuoteData(quote: QuoteData): QuoteData {
  return { ...quote };
}

function cloneHoldings(holdings: FundHolding[]): FundHolding[] {
  return holdings.map((holding) => ({ ...holding }));
}

function getLastGoodQuote(symbol: string): QuoteData | undefined {
  const cached = lastGoodQuotes.get(symbol);
  return cached ? cloneQuoteData(cached) : undefined;
}

function getLastGoodQuotes(symbols: string[]): Record<string, QuoteData> {
  const fallback: Record<string, QuoteData> = {};

  for (const symbol of symbols) {
    const cached = getLastGoodQuote(symbol);
    if (cached) {
      fallback[symbol] = cached;
    }
  }

  return fallback;
}

function rememberQuote(quote: QuoteData): void {
  lastGoodQuotes.set(quote.symbol, cloneQuoteData(quote));
}

function getLastGoodHoldings(symbol: string): FundHolding[] | null {
  const cached = lastGoodHoldings.get(symbol);
  return cached ? cloneHoldings(cached) : null;
}

function rememberHoldings(symbol: string, holdings: FundHolding[]): void {
  lastGoodHoldings.set(symbol, cloneHoldings(holdings));
}

function getNumberOrFallback(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getTextOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(items[index] as T),
        };
      } catch (error) {
        results[index] = {
          status: "rejected",
          reason: error,
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}

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
      const searchResult: any = await withYahooRetry(
        `Yahoo symbol search for "${query}"`,
        () => yahooFinance.search(query)
      );
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
  const fallbackQuotes = getLastGoodQuotes(symbols);
  const result: Record<string, QuoteData> = { ...fallbackQuotes };
  if (symbols.length === 0) return result;

  try {
    const yahooFinance = getYahooFinance();
    const yahooSymbols = symbols.map(toYahooSymbol);

    const quotes = await withYahooRetry("Yahoo quote fetch", () =>
      yahooFinance.quote(yahooSymbols, {}, { validateResult: false })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];

    for (const q of quotesArray) {
      if (!q || !q.symbol) continue;

      // Map Yahoo symbol back to our symbol
      const ourSymbol =
        symbols.find(
          (s) => toYahooSymbol(s) === q.symbol
        ) || q.symbol;
      const previousQuote = fallbackQuotes[ourSymbol];

      const quoteData: QuoteData = {
        symbol: ourSymbol,
        regularMarketPrice: getNumberOrFallback(
          q.regularMarketPrice,
          previousQuote?.regularMarketPrice ?? 0
        ),
        regularMarketChange: getNumberOrFallback(
          q.regularMarketChange,
          previousQuote?.regularMarketChange ?? 0
        ),
        regularMarketChangePercent: getNumberOrFallback(
          q.regularMarketChangePercent,
          previousQuote?.regularMarketChangePercent ?? 0
        ),
        fiftyTwoWeekHigh: getNumberOrFallback(
          q.fiftyTwoWeekHigh,
          previousQuote?.fiftyTwoWeekHigh ?? 0
        ),
        fiftyTwoWeekLow: getNumberOrFallback(
          q.fiftyTwoWeekLow,
          previousQuote?.fiftyTwoWeekLow ?? 0
        ),
        shortName: getTextOrFallback(q.shortName, previousQuote?.shortName ?? ""),
        longName: getTextOrFallback(
          q.longName,
          getTextOrFallback(
            previousQuote?.longName,
            getTextOrFallback(q.shortName, previousQuote?.shortName ?? "")
          )
        ),
      };

      result[ourSymbol] = quoteData;
      rememberQuote(quoteData);
    }
  } catch (error) {
    console.error("Error fetching quotes:", error);
  }

  return result;
}

async function fetchQuotesCached(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  "use cache";
  cacheLife({
    stale: 0,
    revalidate: QUOTE_REVALIDATE_SECONDS,
    expire: 60,
  });

  return fetchQuotesUncached(symbols);
}

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
  const summary: any = await withYahooRetry(
    `Yahoo holdings fetch for ${symbol}`,
    () =>
      yahooFinance.quoteSummary(symbol, {
        modules: ["topHoldings"],
      })
  );

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
 * Yahoo topHoldings is the direct holdings source for funds and ETFs.
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
      const holdings = await fetchYahooDirectHoldingsForSymbol(candidateSymbol);

      if (holdings.length > 0) {
        return holdings;
      }
    } catch (candidateError) {
      const msg =
        candidateError instanceof Error ? candidateError.message : String(candidateError);
      const isExpectedForStock =
        /no fundamentals data found/i.test(msg) || /quote not found/i.test(msg);
      if (!isExpectedForStock) {
        console.error(
          `Error fetching holdings for proxy ${candidateSymbol} of ${symbol}:`,
          candidateError
        );
      }
    }
  }

  return [];
}

async function fetchDirectHoldingsForSymbolCached(
  symbol: string,
  description: string | null
): Promise<FundHolding[]> {
  "use cache";
  cacheLife({
    stale: 5 * 60,
    revalidate: HOLDINGS_REVALIDATE_SECONDS,
    expire: 2 * 24 * 60 * 60,
  });

  return fetchDirectHoldingsForSymbolUncached(symbol, description ?? undefined);
}

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
    return getLastGoodHoldings(symbol) ?? [];
  }

  const reportedPercent = sumHoldingPercents(directHoldings);
  const residualHolding = buildResidualHolding(
    symbol,
    description,
    Math.max(0, 1 - reportedPercent)
  );

  if (depth >= LOOKTHROUGH_DEPTH) {
    const holdings = aggregateHoldings(
      residualHolding ? [...directHoldings, residualHolding] : directHoldings
    );
    rememberHoldings(symbol, holdings);
    return holdings;
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

  const holdings = aggregateHoldings(expandedHoldings);
  rememberHoldings(symbol, holdings);
  return holdings;
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

  const results = await mapWithConcurrency(
    normalizedFunds,
    HOLDINGS_CONCURRENCY,
    async ({ symbol, description }) => ({
      symbol,
      holdings: await fetchHoldingsForSymbol(symbol, description),
    })
  );

  const holdingsMap: Record<string, FundHolding[]> = {};
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      holdingsMap[result.value.symbol] = result.value.holdings;
      continue;
    }

    const symbol = normalizedFunds[index]?.symbol;
    if (!symbol) {
      continue;
    }

    const fallbackHoldings = getLastGoodHoldings(symbol);
    if (fallbackHoldings) {
      holdingsMap[symbol] = fallbackHoldings;
      continue;
    }

    console.error(`Error fetching holdings for ${symbol}:`, result.reason);
  }

  return holdingsMap;
}
