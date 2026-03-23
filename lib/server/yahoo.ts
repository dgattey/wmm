import type { QuoteData, FundHolding } from "../types";
import { MONEY_MARKET_SYMBOLS } from "../fidelitySymbolLink";

import { cacheLife } from "next/cache";
import { fetchSecNPortHoldingsBatch } from "./secNport";
import { getYahooFinance } from "./yahooClient";
import { withYahooRetry, mapWithConcurrency } from "./yahooRetry";
import {
  shouldSkipYahooSymbol,
  isNonStandard,
  toYahooSymbol,
  resolveHoldingsLookupSymbols,
} from "./yahooSymbols";

export { shouldSkipYahooSymbol } from "./yahooSymbols";

const QUOTE_REVALIDATE_SECONDS = 4;
const HOLDINGS_REVALIDATE_SECONDS = 60 * 60;
const SHOULD_BYPASS_NEXT_CACHE = process.env.NODE_ENV === "test";
const LOOKTHROUGH_DEPTH = 1;
const MIN_HOLDING_PERCENT = 0.000001;
const HOLDINGS_CONCURRENCY = 4;
const QUOTE_BATCH_SIZE = 100;

const SKIP_SYMBOLS = MONEY_MARKET_SYMBOLS;

// === Fallback caches (last-good values survive transient failures) ===

const lastGoodQuotes = new Map<string, QuoteData>();
const lastGoodHoldings = new Map<string, FundHolding[]>();

function cloneQuote(quote: QuoteData): QuoteData {
  return { ...quote };
}

function cloneHoldings(holdings: FundHolding[]): FundHolding[] {
  return holdings.map((h) => ({ ...h }));
}

function getLastGoodQuote(symbol: string): QuoteData | undefined {
  const cached = lastGoodQuotes.get(symbol);
  return cached ? cloneQuote(cached) : undefined;
}

function getLastGoodQuotes(symbols: string[]): Record<string, QuoteData> {
  const fallback: Record<string, QuoteData> = {};
  for (const symbol of symbols) {
    const cached = getLastGoodQuote(symbol);
    if (cached) fallback[symbol] = cached;
  }
  return fallback;
}

function rememberQuote(quote: QuoteData): void {
  lastGoodQuotes.set(quote.symbol, cloneQuote(quote));
}

function getLastGoodHoldings(symbol: string): FundHolding[] | null {
  const cached = lastGoodHoldings.get(symbol);
  return cached ? cloneHoldings(cached) : null;
}

function rememberHoldings(symbol: string, holdings: FundHolding[]): void {
  lastGoodHoldings.set(symbol, cloneHoldings(holdings));
}

// === Value extraction helpers ===

function numOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

// === Quote fetching ===

async function fetchQuotesUncached(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const fallbackQuotes = getLastGoodQuotes(symbols);
  const result: Record<string, QuoteData> = { ...fallbackQuotes };
  if (symbols.length === 0) return result;

  try {
    const yahooFinance = getYahooFinance();
    const symbolBatches = [];
    for (let index = 0; index < symbols.length; index += QUOTE_BATCH_SIZE) {
      symbolBatches.push(symbols.slice(index, index + QUOTE_BATCH_SIZE));
    }

    for (const batch of symbolBatches) {
      const yahooSymbols = batch.map(toYahooSymbol);
      const quotes = await withYahooRetry("Yahoo quote fetch", () =>
        yahooFinance.quote(yahooSymbols, {}, { validateResult: false })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];

      for (const q of quotesArray) {
        if (!q?.symbol) continue;

        const ourSymbol = batch.find((s) => toYahooSymbol(s) === q.symbol) || q.symbol;
        const prev = fallbackQuotes[ourSymbol];

        const quoteData: QuoteData = {
          symbol: ourSymbol,
          regularMarketPrice: numOr(q.regularMarketPrice, prev?.regularMarketPrice ?? 0),
          regularMarketChange: numOr(q.regularMarketChange, prev?.regularMarketChange ?? 0),
          regularMarketChangePercent: numOr(
            q.regularMarketChangePercent,
            prev?.regularMarketChangePercent ?? 0
          ),
          fiftyTwoWeekHigh: numOr(q.fiftyTwoWeekHigh, prev?.fiftyTwoWeekHigh ?? 0),
          fiftyTwoWeekLow: numOr(q.fiftyTwoWeekLow, prev?.fiftyTwoWeekLow ?? 0),
          shortName: textOr(q.shortName, prev?.shortName ?? ""),
          longName: textOr(
            q.longName,
            textOr(prev?.longName, textOr(q.shortName, prev?.shortName ?? ""))
          ),
        };

        result[ourSymbol] = quoteData;
        rememberQuote(quoteData);
      }
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
  cacheLife({ stale: 0, revalidate: QUOTE_REVALIDATE_SECONDS, expire: 60 });
  return fetchQuotesUncached(symbols);
}

export async function fetchQuotes(
  symbols: string[]
): Promise<Record<string, QuoteData>> {
  const normalizedSymbols = [...new Set(symbols)]
    .filter((sym) => !SKIP_SYMBOLS.has(sym) && !shouldSkipYahooSymbol(sym))
    .sort();

  if (normalizedSymbols.length === 0) return {};

  return SHOULD_BYPASS_NEXT_CACHE
    ? fetchQuotesUncached(normalizedSymbols)
    : fetchQuotesCached(normalizedSymbols);
}

// === Holdings fetching ===

async function fetchYahooDirectHoldings(symbol: string): Promise<FundHolding[]> {
  const yahooFinance = getYahooFinance();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any = await withYahooRetry(
    `Yahoo holdings fetch for ${symbol}`,
    () => yahooFinance.quoteSummary(symbol, { modules: ["topHoldings"] })
  );

  const holdings: FundHolding[] = [];
  const topHoldings = summary?.topHoldings?.holdings;

  if (Array.isArray(topHoldings)) {
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

async function fetchYahooResolvedHoldingsUncached(
  symbol: string,
  description?: string
): Promise<FundHolding[]> {
  if (SKIP_SYMBOLS.has(symbol)) return [];

  const lookupCandidates = [toYahooSymbol(symbol)];
  if (isNonStandard(symbol)) {
    if (!description) return [];
    const resolved = await resolveHoldingsLookupSymbols(description);
    if (resolved.length === 0) return [];
    lookupCandidates.splice(0, lookupCandidates.length, ...resolved);
  }

  for (const candidate of lookupCandidates) {
    if (SKIP_SYMBOLS.has(candidate) || isNonStandard(candidate)) continue;

    try {
      const holdings = await fetchYahooDirectHoldings(candidate);
      if (holdings.length > 0) return holdings;
    } catch (candidateError) {
      const msg = candidateError instanceof Error ? candidateError.message : String(candidateError);
      const isExpected = /no fundamentals data found|quote not found/i.test(msg);
      if (!isExpected) {
        console.error(`Error fetching holdings for proxy ${candidate} of ${symbol}:`, candidateError);
      }
    }
  }

  return [];
}

interface DirectHoldingsResult {
  holdings: FundHolding[];
  isComplete: boolean;
}

async function fetchDirectHoldingsUncached(
  symbol: string,
  description?: string,
  shouldFetchSec = true
): Promise<DirectHoldingsResult> {
  if (SKIP_SYMBOLS.has(symbol)) return { holdings: [], isComplete: true };

  if (shouldFetchSec) {
    try {
      const secHoldings = await fetchSecNPortHoldingsBatch([{ symbol, description }]);
      const direct = secHoldings[symbol];
      if (direct && direct.length > 0) {
        return { holdings: direct, isComplete: true };
      }
    } catch (error) {
      console.error(`Error fetching SEC N-PORT holdings for ${symbol}:`, error);
    }
  }

  return {
    holdings: await fetchYahooResolvedHoldingsUncached(symbol, description),
    isComplete: false,
  };
}

async function fetchDirectHoldingsCached(
  symbol: string,
  description: string | null,
  shouldFetchSec: boolean
): Promise<DirectHoldingsResult> {
  "use cache";
  cacheLife({
    stale: 5 * 60,
    revalidate: HOLDINGS_REVALIDATE_SECONDS,
    expire: 2 * 24 * 60 * 60,
  });
  return fetchDirectHoldingsUncached(symbol, description ?? undefined, shouldFetchSec);
}

async function fetchDirectHoldings(
  symbol: string,
  description?: string,
  prefetchedSecHoldings?: Record<string, FundHolding[]>,
  secBatchCoveredSymbols?: ReadonlySet<string>
): Promise<DirectHoldingsResult> {
  const prefetched = prefetchedSecHoldings?.[symbol];
  if (prefetched && prefetched.length > 0) {
    return { holdings: prefetched, isComplete: true };
  }

  const shouldFetchSec = !secBatchCoveredSymbols?.has(symbol);
  return SHOULD_BYPASS_NEXT_CACHE
    ? fetchDirectHoldingsUncached(symbol, description, shouldFetchSec)
    : fetchDirectHoldingsCached(symbol, description ?? null, shouldFetchSec);
}

// === Holdings aggregation & look-through ===

function sumHoldingPercents(holdings: FundHolding[]): number {
  return holdings.reduce((sum, h) => sum + h.holdingPercent, 0);
}

function aggregateHoldings(holdings: FundHolding[]): FundHolding[] {
  const map = new Map<string, FundHolding>();

  for (const h of holdings) {
    if (h.holdingPercent <= MIN_HOLDING_PERCENT) continue;
    const existing = map.get(h.symbol);
    if (existing) {
      existing.holdingPercent += h.holdingPercent;
      if (!existing.holdingName && h.holdingName) existing.holdingName = h.holdingName;
    } else {
      map.set(h.symbol, { ...h });
    }
  }

  return [...map.values()].sort((a, b) => b.holdingPercent - a.holdingPercent);
}

function buildResidualHolding(
  symbol: string,
  description: string | undefined,
  holdingPercent: number
): FundHolding | null {
  if (holdingPercent <= MIN_HOLDING_PERCENT) return null;
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
  visited = new Set<string>(),
  prefetchedSecHoldings?: Record<string, FundHolding[]>,
  secBatchCoveredSymbols?: ReadonlySet<string>
): Promise<FundHolding[]> {
  const direct = await fetchDirectHoldings(
    symbol,
    description,
    prefetchedSecHoldings,
    secBatchCoveredSymbols
  );
  if (direct.holdings.length === 0) return getLastGoodHoldings(symbol) ?? [];

  const reportedPercent = sumHoldingPercents(direct.holdings);
  const residual = direct.isComplete
    ? null
    : buildResidualHolding(symbol, description, Math.max(0, 1 - reportedPercent));

  if (direct.isComplete || depth >= LOOKTHROUGH_DEPTH) {
    const holdings = aggregateHoldings(residual ? [...direct.holdings, residual] : direct.holdings);
    rememberHoldings(symbol, holdings);
    return holdings;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(symbol);

  const expanded: FundHolding[] = [];
  for (const h of direct.holdings) {
    if (nextVisited.has(h.symbol)) {
      expanded.push(h);
      continue;
    }

    const nested = await fetchHoldingsForSymbol(
      h.symbol,
      h.holdingName,
      depth + 1,
      nextVisited,
      prefetchedSecHoldings,
      secBatchCoveredSymbols
    );
    if (nested.length === 0) {
      expanded.push(h);
      continue;
    }

    for (const nh of nested) {
      expanded.push({
        symbol: nh.symbol,
        holdingName: nh.holdingName,
        holdingPercent: h.holdingPercent * nh.holdingPercent,
      });
    }
  }

  if (residual) expanded.push(residual);

  const holdings = aggregateHoldings(expanded);
  rememberHoldings(symbol, holdings);
  return holdings;
}

export async function fetchAllHoldings(
  funds: Array<string | { symbol: string; description?: string }>
): Promise<Record<string, FundHolding[]>> {
  const normalized = funds.map((f) =>
    typeof f === "string"
      ? { symbol: f, description: undefined }
      : { symbol: f.symbol, description: f.description }
  );

  let prefetchedSecHoldings: Record<string, FundHolding[]> = {};
  let secBatchCoveredSymbols: ReadonlySet<string> | undefined;
  try {
    prefetchedSecHoldings = await fetchSecNPortHoldingsBatch(normalized);
    secBatchCoveredSymbols = new Set(normalized.map(({ symbol }) => symbol));
  } catch (error) {
    console.error("Error prefetching SEC N-PORT holdings batch:", error);
  }

  const results = await mapWithConcurrency(
    normalized,
    HOLDINGS_CONCURRENCY,
    async ({ symbol, description }) => ({
      symbol,
      holdings: await fetchHoldingsForSymbol(
        symbol,
        description,
        0,
        new Set<string>(),
        prefetchedSecHoldings,
        secBatchCoveredSymbols
      ),
    })
  );

  const holdingsMap: Record<string, FundHolding[]> = {};
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      holdingsMap[result.value.symbol] = result.value.holdings;
      continue;
    }

    const symbol = normalized[index]?.symbol;
    if (!symbol) continue;

    const fallback = getLastGoodHoldings(symbol);
    if (fallback) {
      holdingsMap[symbol] = fallback;
      continue;
    }

    console.error(`Error fetching holdings for ${symbol}:`, result.reason);
  }

  return holdingsMap;
}
