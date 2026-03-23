import { cacheLife } from "next/cache";
import { createWriteStream } from "node:fs";
import { access, mkdir, rename, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import yauzl from "yauzl";

import type { FundHolding } from "../types";
import { isNonStandard } from "./yahooSymbols";

const SHOULD_BYPASS_NEXT_CACHE = process.env.NODE_ENV === "test";
const SEC_ARCHIVE_INDEX_URL =
  "https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets";
const SEC_TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers_mf.json";
const SEC_USER_AGENT =
  process.env.SEC_EDGAR_USER_AGENT?.trim() || "portfolio-allocation/1.0 (SEC N-PORT holdings)";
const ARCHIVE_CACHE_SUBDIR = "portfolio-allocation-sec-nport";
const HOLDINGS_ENTRY = "FUND_REPORTED_HOLDING.tsv";
const IDENTIFIERS_ENTRY = "IDENTIFIERS.tsv";
const SUBMISSION_ENTRY = "SUBMISSION.tsv";
const REGISTRANT_ENTRY = "REGISTRANT.tsv";
const FUND_INFO_ENTRY = "FUND_REPORTED_INFO.tsv";
const HOLDINGS_REVALIDATE_SECONDS = 24 * 60 * 60;
const LOOKUP_REVALIDATE_SECONDS = 24 * 60 * 60;
const MIN_HOLDING_PERCENT = 0.000001;

const TOKEN_REPLACEMENTS: Record<string, string> = {
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
  FDS: "FUNDS",
};

const TOKEN_STOPWORDS = new Set([
  "ADMIRAL",
  "CLASS",
  "ETF",
  "ETFS",
  "FUND",
  "FUNDS",
  "INDEX",
  "INVESTOR",
  "INVESTORS",
  "PORTFOLIO",
  "SHARES",
  "TRUST",
  "UNITS",
  "VANGUARD",
]);

interface SecArchiveInfo {
  archiveId: string;
  archiveUrl: string;
}

interface SecTickerLookupRow {
  cik: string;
  seriesId: string;
  classId: string;
  symbol: string;
}

interface SecFundMetadata {
  accessionNumber: string;
  cik: string;
  filingDate: string;
  reportDate: string;
  registrantName: string;
  seriesId: string;
  seriesName: string;
  normalizedText: string;
  tokens: string[];
}

interface SecMetadataIndex {
  archive: SecArchiveInfo;
  bySeriesId: Record<string, SecFundMetadata>;
  candidates: SecFundMetadata[];
}

interface SecRequestedFund {
  symbol: string;
  description?: string | null;
}

interface ResolvedSecFund {
  accessionNumber: string;
  seriesId: string;
  seriesName: string;
}

interface SecHoldingRow {
  assetCategory: string;
  accessionNumber: string;
  holdingId: string;
  issuerCusip: string;
  issuerName: string;
  issuerTitle: string;
  percentage: string;
}

type TsvRow = Record<string, string>;

function buildSecHeaders(): HeadersInit {
  return {
    "User-Agent": SEC_USER_AGENT,
    Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
  };
}

function normalizeFundText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => TOKEN_REPLACEMENTS[token] || token)
    .join(" ");
}

function tokenizeFundText(value: string): string[] {
  return normalizeFundText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !TOKEN_STOPWORDS.has(token));
}

function cleanSecValue(value: string | undefined): string {
  const trimmed = (value || "").trim();
  if (!trimmed || /^n\/a$/i.test(trimmed)) return "";
  return trimmed;
}

function parseSecNumber(value: string | undefined): number | null {
  const normalized = cleanSecValue(value).replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSecHoldingPercent(value: string | undefined): number | null {
  const parsed = parseSecNumber(value);
  if (parsed === null) return null;
  return parsed / 100;
}

function parseSecDate(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareFundMetadataRecency(a: SecFundMetadata, b: SecFundMetadata): number {
  const reportDiff = parseSecDate(a.reportDate) - parseSecDate(b.reportDate);
  if (reportDiff !== 0) return reportDiff;

  const filingDiff = parseSecDate(a.filingDate) - parseSecDate(b.filingDate);
  if (filingDiff !== 0) return filingDiff;

  return a.accessionNumber.localeCompare(b.accessionNumber);
}

function buildFundScore(queryTokens: string[], queryNormalized: string, fund: SecFundMetadata) {
  if (queryTokens.length === 0) return { score: 0, coverage: 0 };

  const candidateTokens = new Set(fund.tokens);
  let matches = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) matches += 1;
  }

  if (matches === 0) return { score: 0, coverage: 0 };

  let score = matches * 10;
  if (fund.normalizedText.includes(queryNormalized)) score += 20;

  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    const bigram = `${queryTokens[index]} ${queryTokens[index + 1]}`;
    if (fund.normalizedText.includes(bigram)) score += 4;
  }

  return {
    score,
    coverage: matches / queryTokens.length,
  };
}

function chooseSyntheticHoldingSymbol(row: SecHoldingRow): string {
  if (row.assetCategory === "EC" || row.assetCategory === "EP") {
    return (
      cleanSecValue(row.issuerTitle) ||
      cleanSecValue(row.issuerName) ||
      cleanSecValue(row.issuerCusip) ||
      row.holdingId
    );
  }

  return (
    cleanSecValue(row.issuerCusip) ||
    cleanSecValue(row.issuerTitle) ||
    cleanSecValue(row.issuerName) ||
    row.holdingId
  );
}

function chooseHoldingName(row: SecHoldingRow, ticker: string): string {
  return (
    cleanSecValue(row.issuerTitle) ||
    cleanSecValue(row.issuerName) ||
    ticker ||
    row.holdingId
  );
}

function aggregateHoldings(holdings: FundHolding[]): FundHolding[] {
  const bySymbol = new Map<string, FundHolding>();

  for (const holding of holdings) {
    if (holding.holdingPercent <= MIN_HOLDING_PERCENT) continue;

    const existing = bySymbol.get(holding.symbol);
    if (existing) {
      existing.holdingPercent += holding.holdingPercent;
      if (!existing.holdingName && holding.holdingName) {
        existing.holdingName = holding.holdingName;
      }
      continue;
    }

    bySymbol.set(holding.symbol, { ...holding });
  }

  return [...bySymbol.values()].sort((a, b) => b.holdingPercent - a.holdingPercent);
}

function buildMetadataIndex(
  submissions: Map<string, { filingDate: string; reportDate: string }>,
  registrants: Map<string, { cik: string; registrantName: string }>,
  fundRows: TsvRow[]
): SecMetadataIndex {
  const bySeriesId = new Map<string, SecFundMetadata>();

  for (const row of fundRows) {
    const accessionNumber = cleanSecValue(row.ACCESSION_NUMBER);
    const seriesId = cleanSecValue(row.SERIES_ID);
    const seriesName = cleanSecValue(row.SERIES_NAME);
    if (!accessionNumber || !seriesId || !seriesName) continue;

    const submission = submissions.get(accessionNumber);
    const registrant = registrants.get(accessionNumber);
    if (!submission || !registrant) continue;

    const combinedText = `${seriesName} ${registrant.registrantName}`.trim();
    const candidate: SecFundMetadata = {
      accessionNumber,
      cik: registrant.cik,
      filingDate: submission.filingDate,
      reportDate: submission.reportDate,
      registrantName: registrant.registrantName,
      seriesId,
      seriesName,
      normalizedText: normalizeFundText(combinedText),
      tokens: tokenizeFundText(combinedText),
    };

    const existing = bySeriesId.get(seriesId);
    if (!existing || compareFundMetadataRecency(candidate, existing) > 0) {
      bySeriesId.set(seriesId, candidate);
    }
  }

  const serializedBySeriesId: Record<string, SecFundMetadata> = {};
  for (const [seriesId, metadata] of bySeriesId) {
    serializedBySeriesId[seriesId] = metadata;
  }

  return {
    archive: { archiveId: "", archiveUrl: "" },
    bySeriesId: serializedBySeriesId,
    candidates: Object.values(serializedBySeriesId),
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: buildSecHeaders(),
  });

  if (!response.ok) {
    throw new Error(`SEC request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: buildSecHeaders(),
  });

  if (!response.ok) {
    throw new Error(`SEC request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

function parseArchiveInfo(indexPage: string): SecArchiveInfo {
  const archiveMatches = [...indexPage.matchAll(/href="([^"]+\/(\d{4}q[1-4]_nport\.zip))"/gi)];
  if (archiveMatches.length === 0) {
    throw new Error("Could not locate an SEC N-PORT archive download");
  }

  archiveMatches.sort((left, right) => right[2].localeCompare(left[2]));
  const latest = archiveMatches[0];
  if (!latest) {
    throw new Error("Could not determine the latest SEC N-PORT archive");
  }

  const archiveUrl = latest[1].startsWith("http")
    ? latest[1]
    : `https://www.sec.gov${latest[1]}`;

  return {
    archiveId: latest[2].replace(/_nport\.zip$/i, ""),
    archiveUrl,
  };
}

async function fetchLatestArchiveInfoUncached(): Promise<SecArchiveInfo> {
  return parseArchiveInfo(await fetchText(SEC_ARCHIVE_INDEX_URL));
}

async function fetchLatestArchiveInfoCached(): Promise<SecArchiveInfo> {
  "use cache";
  cacheLife({
    stale: 60 * 60,
    revalidate: LOOKUP_REVALIDATE_SECONDS,
    expire: 7 * 24 * 60 * 60,
  });
  return fetchLatestArchiveInfoUncached();
}

async function fetchLatestArchiveInfo(): Promise<SecArchiveInfo> {
  return SHOULD_BYPASS_NEXT_CACHE
    ? fetchLatestArchiveInfoUncached()
    : fetchLatestArchiveInfoCached();
}

async function loadTickerLookupUncached(): Promise<Record<string, SecTickerLookupRow>> {
  const raw = await fetchJson<{
    fields: string[];
    data: Array<Array<string | number>>;
  }>(SEC_TICKER_MAP_URL);

  const symbolLookup: Record<string, SecTickerLookupRow> = {};
  const fieldIndex = Object.fromEntries(raw.fields.map((field, index) => [field, index]));

  for (const row of raw.data) {
    const symbol = String(row[fieldIndex.symbol] || "").trim().toUpperCase();
    const seriesId = String(row[fieldIndex.seriesId] || "").trim();
    if (!symbol || !seriesId) continue;

    symbolLookup[symbol] = {
      cik: String(row[fieldIndex.cik] || "").trim().padStart(10, "0"),
      seriesId,
      classId: String(row[fieldIndex.classId] || "").trim(),
      symbol,
    };
  }

  return symbolLookup;
}

async function loadTickerLookupCached(): Promise<Record<string, SecTickerLookupRow>> {
  "use cache";
  cacheLife({
    stale: 24 * 60 * 60,
    revalidate: 7 * 24 * 60 * 60,
    expire: 30 * 24 * 60 * 60,
  });
  return loadTickerLookupUncached();
}

async function loadTickerLookup(): Promise<Record<string, SecTickerLookupRow>> {
  return SHOULD_BYPASS_NEXT_CACHE ? loadTickerLookupUncached() : loadTickerLookupCached();
}

async function ensureArchiveDirectory(): Promise<string> {
  const directory = path.join(os.tmpdir(), ARCHIVE_CACHE_SUBDIR);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadArchiveToDisk(archive: SecArchiveInfo): Promise<string> {
  const directory = await ensureArchiveDirectory();
  const archivePath = path.join(directory, `${archive.archiveId}_nport.zip`);
  if (await fileExists(archivePath)) return archivePath;

  const tempPath = `${archivePath}.part`;
  const response = await fetch(archive.archiveUrl, {
    headers: buildSecHeaders(),
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `SEC archive download failed (${response.status}) for ${archive.archiveUrl}`
    );
  }

  try {
    await pipeline(
      Readable.fromWeb(response.body as unknown as WebReadableStream),
      createWriteStream(tempPath)
    );
    await rename(tempPath, archivePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }

  return archivePath;
}

async function openZipEntryStream(archivePath: string, entryName: string) {
  return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true, autoClose: false }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error(`Failed to open ${archivePath}`));
        return;
      }

      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        reject(error);
      };

      zipFile.on("error", fail);
      zipFile.on("entry", (entry) => {
        if (entry.fileName !== entryName) {
          setImmediate(() => zipFile.readEntry());
          return;
        }

        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            fail(streamError ?? new Error(`Failed to read ${entryName}`));
            return;
          }

          settled = true;
          stream.once("close", () => zipFile.close());
          resolve(stream);
        });
      });
      zipFile.on("end", () => {
        if (!settled) {
          fail(new Error(`Missing ${entryName} in ${archivePath}`));
        }
      });

      setImmediate(() => zipFile.readEntry());
    });
  });
}

async function readTsvFromZip(
  archivePath: string,
  entryName: string,
  onRow: (row: TsvRow) => Promise<void> | void
): Promise<void> {
  const stream = await openZipEntryStream(archivePath, entryName);
  const lines = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;

  for await (const line of lines) {
    if (!headers) {
      headers = line.split("\t");
      continue;
    }

    const values = line.split("\t");
    const row: TsvRow = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index] as string] = values[index] ?? "";
    }

    await onRow(row);
  }
}

async function loadMetadataIndexUncached(): Promise<SecMetadataIndex> {
  const archive = await fetchLatestArchiveInfo();
  const archivePath = await downloadArchiveToDisk(archive);

  const submissions = new Map<string, { filingDate: string; reportDate: string }>();
  await readTsvFromZip(archivePath, SUBMISSION_ENTRY, (row) => {
    const accessionNumber = cleanSecValue(row.ACCESSION_NUMBER);
    if (!accessionNumber) return;

    submissions.set(accessionNumber, {
      filingDate: cleanSecValue(row.FILING_DATE),
      reportDate: cleanSecValue(row.REPORT_DATE),
    });
  });

  const registrants = new Map<string, { cik: string; registrantName: string }>();
  await readTsvFromZip(archivePath, REGISTRANT_ENTRY, (row) => {
    const accessionNumber = cleanSecValue(row.ACCESSION_NUMBER);
    if (!accessionNumber) return;

    registrants.set(accessionNumber, {
      cik: cleanSecValue(row.CIK).padStart(10, "0"),
      registrantName: cleanSecValue(row.REGISTRANT_NAME),
    });
  });

  const fundRows: TsvRow[] = [];
  await readTsvFromZip(archivePath, FUND_INFO_ENTRY, (row) => {
    fundRows.push(row);
  });

  const index = buildMetadataIndex(submissions, registrants, fundRows);
  return {
    archive,
    bySeriesId: index.bySeriesId,
    candidates: index.candidates,
  };
}

async function loadMetadataIndexCached(): Promise<SecMetadataIndex> {
  "use cache";
  cacheLife({
    stale: 24 * 60 * 60,
    revalidate: LOOKUP_REVALIDATE_SECONDS,
    expire: 30 * 24 * 60 * 60,
  });
  return loadMetadataIndexUncached();
}

async function loadMetadataIndex(): Promise<SecMetadataIndex> {
  return SHOULD_BYPASS_NEXT_CACHE ? loadMetadataIndexUncached() : loadMetadataIndexCached();
}

function findResolvedFund(
  requestedFund: SecRequestedFund,
  metadataIndex: SecMetadataIndex,
  tickerLookup: Record<string, SecTickerLookupRow>
): ResolvedSecFund | null {
  const symbol = requestedFund.symbol.trim().toUpperCase();
  const directMatch = tickerLookup[symbol];
  if (directMatch) {
    const metadata = metadataIndex.bySeriesId[directMatch.seriesId];
    if (metadata) {
      return {
        accessionNumber: metadata.accessionNumber,
        seriesId: metadata.seriesId,
        seriesName: metadata.seriesName,
      };
    }
  }

  if (!requestedFund.description || !isNonStandard(symbol)) return null;

  const queryTokens = tokenizeFundText(requestedFund.description);
  if (queryTokens.length < 2) return null;

  const queryNormalized = normalizeFundText(requestedFund.description);
  const scored = metadataIndex.candidates
    .map((candidate) => ({
      candidate,
      ...buildFundScore(queryTokens, queryNormalized, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best || best.coverage < 0.75 || best.score < 30) {
    return null;
  }

  const second = scored[1];
  if (second && best.score - second.score < 10) {
    return null;
  }

  return {
    accessionNumber: best.candidate.accessionNumber,
    seriesId: best.candidate.seriesId,
    seriesName: best.candidate.seriesName,
  };
}

async function extractHoldingsForAccessions(
  archivePath: string,
  accessionNumbers: string[]
): Promise<Record<string, FundHolding[]>> {
  const targetAccessions = new Set(accessionNumbers);
  const rawHoldingsByAccession = new Map<string, SecHoldingRow[]>();
  const targetHoldingIds = new Set<string>();

  await readTsvFromZip(archivePath, HOLDINGS_ENTRY, (row) => {
    const accessionNumber = cleanSecValue(row.ACCESSION_NUMBER);
    if (!targetAccessions.has(accessionNumber)) return;

    const rawHolding: SecHoldingRow = {
      assetCategory: cleanSecValue(row.ASSET_CAT),
      accessionNumber,
      holdingId: cleanSecValue(row.HOLDING_ID),
      issuerCusip: cleanSecValue(row.ISSUER_CUSIP),
      issuerName: cleanSecValue(row.ISSUER_NAME),
      issuerTitle: cleanSecValue(row.ISSUER_TITLE),
      percentage: cleanSecValue(row.PERCENTAGE),
    };

    if (!rawHolding.holdingId) return;

    targetHoldingIds.add(rawHolding.holdingId);
    const bucket = rawHoldingsByAccession.get(accessionNumber) ?? [];
    bucket.push(rawHolding);
    rawHoldingsByAccession.set(accessionNumber, bucket);
  });

  const tickersByHoldingId = new Map<string, string>();
  if (targetHoldingIds.size > 0) {
    await readTsvFromZip(archivePath, IDENTIFIERS_ENTRY, (row) => {
      const holdingId = cleanSecValue(row.HOLDING_ID);
      if (!targetHoldingIds.has(holdingId) || tickersByHoldingId.has(holdingId)) return;

      const ticker = cleanSecValue(row.IDENTIFIER_TICKER).toUpperCase();
      if (!ticker) return;
      tickersByHoldingId.set(holdingId, ticker);
    });
  }

  const holdingsByAccession: Record<string, FundHolding[]> = {};
  for (const accessionNumber of accessionNumbers) {
    const holdings = rawHoldingsByAccession.get(accessionNumber) ?? [];
    const parsedHoldings: FundHolding[] = [];

    for (const row of holdings) {
      const holdingPercent = parseSecHoldingPercent(row.percentage);
      if (holdingPercent === null || holdingPercent <= MIN_HOLDING_PERCENT) continue;

      const ticker = tickersByHoldingId.get(row.holdingId) || "";
      const symbol = ticker || chooseSyntheticHoldingSymbol(row);
      if (!symbol) continue;

      parsedHoldings.push({
        symbol,
        holdingName: chooseHoldingName(row, ticker || symbol),
        holdingPercent,
      });
    }

    holdingsByAccession[accessionNumber] = aggregateHoldings(parsedHoldings);
  }

  return holdingsByAccession;
}

async function fetchSecNPortHoldingsBatchUncached(
  funds: Array<{ symbol: string; description: string | null }>
): Promise<Record<string, FundHolding[]>> {
  if (funds.length === 0) return {};

  const [metadataIndex, tickerLookup] = await Promise.all([
    loadMetadataIndex(),
    loadTickerLookup(),
  ]);

  const resolvedBySymbol: Record<string, ResolvedSecFund> = {};
  for (const fund of funds) {
    const resolved = findResolvedFund(fund, metadataIndex, tickerLookup);
    if (resolved) {
      resolvedBySymbol[fund.symbol] = resolved;
    }
  }

  const accessionNumbers = [...new Set(Object.values(resolvedBySymbol).map((fund) => fund.accessionNumber))];
  if (accessionNumbers.length === 0) return {};

  const archivePath = await downloadArchiveToDisk(metadataIndex.archive);
  const holdingsByAccession = await extractHoldingsForAccessions(archivePath, accessionNumbers);

  const results: Record<string, FundHolding[]> = {};
  for (const fund of funds) {
    const resolved = resolvedBySymbol[fund.symbol];
    if (!resolved) continue;

    const matchedHoldings = holdingsByAccession[resolved.accessionNumber];
    if (!matchedHoldings || matchedHoldings.length === 0) continue;

    results[fund.symbol] = matchedHoldings.map((holding) => ({ ...holding }));
  }

  return results;
}

async function fetchSecNPortHoldingsBatchCached(
  funds: Array<{ symbol: string; description: string | null }>
): Promise<Record<string, FundHolding[]>> {
  "use cache";
  cacheLife({
    stale: 12 * 60 * 60,
    revalidate: HOLDINGS_REVALIDATE_SECONDS,
    expire: 14 * 24 * 60 * 60,
  });
  return fetchSecNPortHoldingsBatchUncached(funds);
}

export async function fetchSecNPortHoldingsBatch(
  funds: SecRequestedFund[]
): Promise<Record<string, FundHolding[]>> {
  const normalized = [...funds]
    .map((fund) => ({
      symbol: fund.symbol.trim().toUpperCase(),
      description: fund.description?.trim() || null,
    }))
    .filter((fund) => fund.symbol.length > 0)
    .sort((left, right) =>
      left.symbol === right.symbol
        ? (left.description || "").localeCompare(right.description || "")
        : left.symbol.localeCompare(right.symbol)
    );

  if (normalized.length === 0) return {};

  return SHOULD_BYPASS_NEXT_CACHE
    ? fetchSecNPortHoldingsBatchUncached(normalized)
    : fetchSecNPortHoldingsBatchCached(normalized);
}

export const __private__ = {
  normalizeFundText,
  tokenizeFundText,
  buildFundScore,
  chooseSyntheticHoldingSymbol,
  chooseHoldingName,
  aggregateHoldings,
  buildMetadataIndex,
  findResolvedFund,
  parseSecHoldingPercent,
};
