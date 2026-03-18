import type { FundHolding } from "@/lib/types";

const SEC_BASE_URL = "https://www.sec.gov";
const SERIES_CLASS_PAGE_URL =
  "https://www.sec.gov/data-research/sec-markets-data/investment-company-series-class-information";
const SERIES_CLASS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const HOLDINGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPORT_AGE_DAYS = 180;
const MIN_HOLDING_PERCENT = 0.000001;
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
const SEC_STOPWORDS = new Set([
  "CLASS",
  "SHARES",
  "SHARE",
  "INVESTOR",
  "INSTITUTIONAL",
  "FUND",
  "PORTFOLIO",
  "TRUST",
]);

interface SecFundMapping {
  cik: string;
  organizationType: string;
  seriesId: string;
  seriesName: string;
  classId: string;
  className: string;
  classTicker?: string;
  normalizedSeriesName: string;
  normalizedClassName: string;
}

interface SecCachedHoldings {
  source: "sec-nport";
  symbol: string;
  seriesId: string;
  asOfDate: string;
  filingUrl: string;
  lastRefreshedAt: string;
  holdings: FundHolding[];
}

interface TimedSeriesClassMappings {
  loadedAt: number;
  mappings: SecFundMapping[];
}

type FetchTextImplementation = (url: string) => Promise<string>;

const holdingsMemoryCache = new Map<string, SecCachedHoldings>();

let seriesClassMappingsPromise: Promise<SecFundMapping[]> | null = null;
let fetchTextImpl: FetchTextImplementation = defaultFetchText;
let nowImpl = () => Date.now();
let seriesClassMappingsOverride: SecFundMapping[] | null = null;
let timedSeriesClassMappings: TimedSeriesClassMappings | null = null;

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.SEC_USER_AGENT ??
        "portfolio-allocation/0.1 (sec-holdings-cache)",
      Accept: "text/html,application/json,application/xml,text/xml,text/plain,*/*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SEC request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

function normalizeLookupText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => FUND_DESCRIPTION_TERM_MAP[token] || token)
    .join(" ");
}

function buildDescriptionTokens(description: string): string[] {
  return [...new Set(
    normalizeLookupText(description)
      .split(/\s+/)
      .filter(Boolean)
      .filter(
        (token) =>
          /^\d{4}$/.test(token) ||
          token.length > 4 ||
          ["ETF", "INDEX", "LIFEPATH"].includes(token)
      )
      .filter((token) => !SEC_STOPWORDS.has(token))
  )];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.replace(/^\uFEFF/, "").trim());
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTagValue(block: string, tagName: string): string | null {
  const match = block.match(
    new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );
  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function isReportDateStale(asOfDate: string): boolean {
  const timestamp = Date.parse(asOfDate);
  if (Number.isNaN(timestamp)) return true;

  const ageMs = nowImpl() - timestamp;
  return ageMs > MAX_REPORT_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function aggregateNormalizedHoldings(holdings: FundHolding[]): FundHolding[] {
  const holdingsBySymbol = new Map<string, FundHolding>();

  for (const holding of holdings) {
    if (!holding.symbol || holding.holdingPercent <= MIN_HOLDING_PERCENT) {
      continue;
    }

    const existing = holdingsBySymbol.get(holding.symbol);
    if (existing) {
      existing.holdingPercent += holding.holdingPercent;
      if (!existing.holdingName && holding.holdingName) {
        existing.holdingName = holding.holdingName;
      }
      continue;
    }

    holdingsBySymbol.set(holding.symbol, { ...holding });
  }

  return [...holdingsBySymbol.values()].sort(
    (left, right) => right.holdingPercent - left.holdingPercent
  );
}

async function loadSeriesClassMappings(): Promise<SecFundMapping[]> {
  if (seriesClassMappingsOverride) {
    return seriesClassMappingsOverride;
  }

  if (
    timedSeriesClassMappings &&
    nowImpl() - timedSeriesClassMappings.loadedAt < SERIES_CLASS_CACHE_TTL_MS
  ) {
    return timedSeriesClassMappings.mappings;
  }

  if (seriesClassMappingsPromise) {
    return seriesClassMappingsPromise;
  }

  seriesClassMappingsPromise = (async () => {
    const landingPage = await fetchTextImpl(SERIES_CLASS_PAGE_URL);
    const csvMatch = landingPage.match(
      /href="([^"]*investment[-_]company[-_]series[-_]class[^"]+\.csv)"/i
    );
    if (!csvMatch) {
      throw new Error("Could not locate SEC series/class CSV download");
    }

    const csvUrl = new URL(csvMatch[1], SEC_BASE_URL).toString();
    const csvText = await fetchTextImpl(csvUrl);

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const mappings = lines
      .slice(1)
      .map((line) => parseCsvLine(line))
      .filter((values) => values.length >= 9)
      .filter((values) => values[3] === "30")
      .map((values) => {
        const seriesName = values[5];
        const className = values[7];
        const classTicker = values[8]?.toUpperCase() || undefined;

        return {
          cik: values[1].padStart(10, "0"),
          organizationType: values[3],
          seriesId: values[4],
          seriesName,
          classId: values[6],
          className,
          classTicker,
          normalizedSeriesName: normalizeLookupText(seriesName),
          normalizedClassName: normalizeLookupText(className),
        };
      });

    timedSeriesClassMappings = {
      loadedAt: nowImpl(),
      mappings,
    };

    return mappings;
  })();

  try {
    return await seriesClassMappingsPromise;
  } finally {
    seriesClassMappingsPromise = null;
  }
}

async function findFundMapping(
  symbol: string,
  description?: string
): Promise<SecFundMapping | null> {
  const mappings = await loadSeriesClassMappings();
  const normalizedSymbol = symbol.trim().toUpperCase();

  const directMatch = mappings.find(
    (mapping) => mapping.classTicker === normalizedSymbol
  );
  if (directMatch) {
    return directMatch;
  }

  if (!description) {
    return null;
  }

  const tokens = buildDescriptionTokens(description);
  if (tokens.length < 2) {
    return null;
  }

  const candidates = mappings
    .map((mapping) => {
      const haystack = `${mapping.normalizedSeriesName} ${mapping.normalizedClassName}`;
      const matchedTokens = tokens.filter((token) => haystack.includes(token));
      return {
        mapping,
        matchedTokens,
      };
    })
    .filter(({ matchedTokens }) => matchedTokens.length === tokens.length)
    .sort((left, right) => {
      const leftScore =
        left.matchedTokens.join(" ").length + left.mapping.normalizedSeriesName.length;
      const rightScore =
        right.matchedTokens.join(" ").length + right.mapping.normalizedSeriesName.length;
      return rightScore - leftScore;
    });

  if (candidates.length === 1) {
    return candidates[0].mapping;
  }

  if (candidates.length > 1) {
    const [best, secondBest] = candidates;
    const bestSeries = best.mapping.normalizedSeriesName;
    const secondSeries = secondBest.mapping.normalizedSeriesName;
    if (bestSeries !== secondSeries) {
      return null;
    }

    const preferredClass = candidates.find(
      ({ mapping }) =>
        mapping.normalizedClassName.includes("K") ||
        mapping.normalizedClassName.includes("INSTITUTIONAL")
    );
    return preferredClass?.mapping ?? best.mapping;
  }

  return null;
}

async function fetchLatestFilingUrl(seriesId: string): Promise<string | null> {
  const atomFeedUrl = `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(
    seriesId
  )}&type=NPORT-P&owner=exclude&count=10&output=atom`;
  const atomFeed = await fetchTextImpl(atomFeedUrl);
  const filingHrefMatch = atomFeed.match(/<filing-href>([^<]+)<\/filing-href>/i);
  if (!filingHrefMatch) {
    return null;
  }

  const filingHref = decodeXmlEntities(filingHrefMatch[1]);
  const filingDirectoryUrl = filingHref.replace(/[^/]+$/, "");
  const filingIndexText = await fetchTextImpl(`${filingDirectoryUrl}index.json`);
  const filingIndex = JSON.parse(filingIndexText) as {
    directory?: { item?: Array<{ name?: string }> };
  };

  const filingItems = filingIndex.directory?.item ?? [];
  const primaryDocument =
    filingItems.find((item) => item.name === "primary_doc.xml")?.name ||
    filingItems.find((item) => item.name?.toLowerCase().endsWith(".xml"))?.name;

  if (!primaryDocument) {
    return null;
  }

  return `${filingDirectoryUrl}${primaryDocument}`;
}

function normalizeHoldingsFromFiling(xmlText: string): {
  asOfDate: string;
  holdings: FundHolding[];
} | null {
  const asOfDate = extractTagValue(xmlText, "repPdDate");
  if (!asOfDate) {
    return null;
  }

  const normalizedHoldings: FundHolding[] = [];
  const holdingBlocks = xmlText.match(/<invstOrSec>[\s\S]*?<\/invstOrSec>/gi) ?? [];

  for (const holdingBlock of holdingBlocks) {
    const holdingPercentText = extractTagValue(holdingBlock, "pctVal");
    const cusip = extractTagValue(holdingBlock, "cusip");
    const holdingName =
      extractTagValue(holdingBlock, "title") ||
      extractTagValue(holdingBlock, "name");

    if (!holdingPercentText || !cusip || !holdingName) {
      continue;
    }

    const holdingPercent = Number.parseFloat(holdingPercentText) / 100;
    if (!Number.isFinite(holdingPercent) || holdingPercent <= MIN_HOLDING_PERCENT) {
      continue;
    }

    normalizedHoldings.push({
      symbol: cusip,
      holdingName,
      holdingPercent,
    });
  }

  return {
    asOfDate,
    holdings: aggregateNormalizedHoldings(normalizedHoldings),
  };
}

async function readCachedHoldings(seriesId: string): Promise<SecCachedHoldings | null> {
  return holdingsMemoryCache.get(seriesId) ?? null;
}

async function writeCachedHoldings(entry: SecCachedHoldings): Promise<void> {
  holdingsMemoryCache.set(entry.seriesId, entry);
}

function shouldRefreshCachedHoldings(entry: SecCachedHoldings): boolean {
  const refreshedAt = Date.parse(entry.lastRefreshedAt);
  if (Number.isNaN(refreshedAt)) {
    return true;
  }

  return nowImpl() - refreshedAt > HOLDINGS_CACHE_TTL_MS;
}

export async function fetchSecNportHoldings(
  symbol: string,
  description?: string
): Promise<FundHolding[] | null> {
  const mapping = await findFundMapping(symbol, description);
  if (!mapping) {
    return null;
  }

  const cachedEntry = await readCachedHoldings(mapping.seriesId);
  if (
    cachedEntry &&
    !shouldRefreshCachedHoldings(cachedEntry) &&
    !isReportDateStale(cachedEntry.asOfDate)
  ) {
    return cachedEntry.holdings;
  }

  try {
    const filingUrl = await fetchLatestFilingUrl(mapping.seriesId);
    if (!filingUrl) {
      return cachedEntry && !isReportDateStale(cachedEntry.asOfDate)
        ? cachedEntry.holdings
        : null;
    }

    const filingXml = await fetchTextImpl(filingUrl);
    const normalized = normalizeHoldingsFromFiling(filingXml);
    if (!normalized || isReportDateStale(normalized.asOfDate)) {
      return cachedEntry && !isReportDateStale(cachedEntry.asOfDate)
        ? cachedEntry.holdings
        : null;
    }

    const cacheEntry: SecCachedHoldings = {
      source: "sec-nport",
      symbol: symbol.trim().toUpperCase(),
      seriesId: mapping.seriesId,
      asOfDate: normalized.asOfDate,
      filingUrl,
      lastRefreshedAt: new Date(nowImpl()).toISOString(),
      holdings: normalized.holdings,
    };
    await writeCachedHoldings(cacheEntry);
    return cacheEntry.holdings;
  } catch {
    if (cachedEntry && !isReportDateStale(cachedEntry.asOfDate)) {
      return cachedEntry.holdings;
    }

    return null;
  }
}

export const __testing = {
  normalizeHoldingsFromFiling,
  parseCsvLine,
  async setFetchTextImplementation(implementation: FetchTextImplementation) {
    fetchTextImpl = implementation;
  },
  async setSeriesClassMappings(mappings: SecFundMapping[] | null) {
    seriesClassMappingsOverride = mappings;
  },
  setNowImplementation(implementation: (() => number) | null) {
    nowImpl = implementation ?? (() => Date.now());
  },
  reset() {
    holdingsMemoryCache.clear();
    seriesClassMappingsPromise = null;
    seriesClassMappingsOverride = null;
    timedSeriesClassMappings = null;
    fetchTextImpl = defaultFetchText;
    nowImpl = () => Date.now();
  },
};
