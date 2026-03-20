import { MONEY_MARKET_SYMBOLS } from "../fidelitySymbolLink";
import { withYahooRetry } from "./yahooRetry";
import { getYahooFinance } from "./yahooClient";

/** Map Fidelity symbols to Yahoo Finance symbols */
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  "BRK-B": "BRK-B",
};

/** Abbreviation expansions for retirement-plan fund names */
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

export function shouldSkipSymbol(symbol: string): boolean {
  return MONEY_MARKET_SYMBOLS.has(symbol) || shouldSkipYahooSymbol(symbol);
}

export function isNonStandard(symbol: string): boolean {
  return isNonStandardSymbol(symbol);
}

export function toYahooSymbol(symbol: string): string {
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
  const fullQuery = tokens.filter((t) => t.length > 1).join(" ");
  const contentQuery = tokens
    .filter(
      (t) => /^\d{4}$/.test(t) || t.length > 3 || t === "ETF" || t === "FUND"
    )
    .join(" ");

  return [...new Set([fullQuery, contentQuery].filter(Boolean))];
}

function isProxyCandidateQuote(quote: {
  quoteType?: string;
  symbol?: string;
}): boolean {
  if (!quote.symbol) return false;
  if (!["MUTUALFUND", "ETF"].includes(quote.quoteType || "")) return false;
  return !MONEY_MARKET_SYMBOLS.has(quote.symbol);
}

export async function resolveHoldingsLookupSymbols(description: string): Promise<string[]> {
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
