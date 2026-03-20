import type {
  FidelityPosition,
  PortfolioData,
  StoredPortfolioSummary,
} from "./types";
import {
  deletePortfolioDatabaseForTests,
  idbClearAllPortfolios,
  idbGetAllPortfolios,
  idbGetPortfolio,
  idbPutPortfolio,
  idbReplaceAllPortfolios,
} from "./portfolioIdb";

const MAX_STORED_PORTFOLIOS = 8;
const MAX_CACHED_DATA_PORTFOLIOS = 3;
const STORE_VERSION = 1;

interface StoredPortfolioRecord extends StoredPortfolioSummary {
  positions: FidelityPosition[];
  portfolioData: PortfolioData | null;
}

interface PortfolioStore {
  version: number;
  portfolios: StoredPortfolioRecord[];
}

async function loadStoreFromIdb(): Promise<PortfolioStore> {
  if (typeof window === "undefined") {
    return createEmptyStore();
  }
  const rawRows = await idbGetAllPortfolios();
  const portfolios = rawRows
    .map((row) => normalizePortfolio(row))
    .filter((p): p is StoredPortfolioRecord => p !== null);
  return pruneStore({
    version: STORE_VERSION,
    portfolios,
  });
}

async function persistFullStore(store: PortfolioStore): Promise<PortfolioStore> {
  const next = pruneStore(store);
  if (typeof window === "undefined") {
    return next;
  }
  await idbReplaceAllPortfolios(next.portfolios);
  return next;
}

export interface SaveUploadedPortfolioInput {
  sourceFileName: string;
  positions: FidelityPosition[];
}

export interface StoredPortfolioPayload {
  summary: StoredPortfolioSummary;
  positions: FidelityPosition[];
  portfolioData: PortfolioData | null;
}

export async function saveUploadedPortfolio({
  sourceFileName,
  positions,
}: SaveUploadedPortfolioInput): Promise<StoredPortfolioSummary> {
  if (typeof window === "undefined") {
    throw new Error("saveUploadedPortfolio requires a browser environment");
  }
  const now = new Date().toISOString();
  const portfolio: StoredPortfolioRecord = {
    id: createPortfolioId(),
    name: createPortfolioName(sourceFileName),
    sourceFileName,
    uploadedAt: now,
    lastViewedAt: now,
    positionCount: positions.length,
    positions,
    portfolioData: null,
  };

  const store = await loadStoreFromIdb();
  const merged: PortfolioStore = {
    version: STORE_VERSION,
    portfolios: [
      portfolio,
      ...store.portfolios.filter(({ id }) => id !== portfolio.id),
    ],
  };
  const persisted = await persistFullStore(merged);
  return toSummary(findPortfolioById(persisted, portfolio.id) ?? portfolio);
}

export async function listStoredPortfolios(): Promise<StoredPortfolioSummary[]> {
  if (typeof window === "undefined") {
    return [];
  }
  const store = await loadStoreFromIdb();
  return store.portfolios.map(toSummary);
}

export async function getMostRecentPortfolioId(): Promise<string | null> {
  const list = await listStoredPortfolios();
  return list[0]?.id ?? null;
}

export async function getStoredPortfolioSummary(
  portfolioId: string
): Promise<StoredPortfolioSummary | null> {
  if (typeof window === "undefined" || !portfolioId) {
    return null;
  }
  const raw = await idbGetPortfolio(portfolioId);
  const portfolio = normalizePortfolio(raw);
  return portfolio ? toSummary(portfolio) : null;
}

export async function loadStoredPortfolio(
  portfolioId: string
): Promise<StoredPortfolioPayload | null> {
  if (typeof window === "undefined" || !portfolioId) {
    return null;
  }
  const store = await loadStoreFromIdb();
  const portfolio = findPortfolioById(store, portfolioId);

  if (!portfolio) {
    return null;
  }

  return {
    summary: toSummary(portfolio),
    positions: portfolio.positions,
    portfolioData: portfolio.portfolioData,
  };
}

export async function saveStoredPortfolioData(
  portfolioId: string,
  portfolioData: PortfolioData
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const raw = await idbGetPortfolio(portfolioId);
  const portfolio = normalizePortfolio(raw);

  if (!portfolio) {
    return;
  }

  portfolio.portfolioData = portfolioData;
  portfolio.totalValue = portfolioData.summary.totalValue;
  portfolio.lastViewedAt = new Date().toISOString();
  await idbPutPortfolio(portfolio);
}

export async function touchStoredPortfolio(portfolioId: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const store = await loadStoreFromIdb();
  const portfolio = findPortfolioById(store, portfolioId);

  if (!portfolio) {
    return;
  }

  portfolio.lastViewedAt = new Date().toISOString();
  const next = pruneStore({
    version: STORE_VERSION,
    portfolios: store.portfolios.map((p) =>
      p.id === portfolioId ? portfolio : p
    ),
  });
  await persistFullStore(next);
}

export async function updateStoredPortfolioName(
  portfolioId: string,
  name: string
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const raw = await idbGetPortfolio(portfolioId);
  const portfolio = normalizePortfolio(raw);

  if (!portfolio) {
    return;
  }

  portfolio.name = name.trim() || createPortfolioName(portfolio.sourceFileName);
  await idbPutPortfolio(portfolio);
}

export async function removeStoredPortfolio(
  portfolioId: string
): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const store = await loadStoreFromIdb();
  const next = await persistFullStore({
    ...store,
    portfolios: store.portfolios.filter(({ id }) => id !== portfolioId),
  });
  return next.portfolios[0]?.id ?? null;
}

export async function clearStoredPortfolios(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  await idbClearAllPortfolios();
}

/** Vitest: wipe IDB (+ localStorage for isolation). */
export async function resetPortfolioPersistenceForTests(): Promise<void> {
  await deletePortfolioDatabaseForTests();
  localStorage.clear();
}

function normalizePortfolio(value: unknown): StoredPortfolioRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const portfolio = value as Partial<StoredPortfolioRecord>;
  if (
    typeof portfolio.id !== "string" ||
    typeof portfolio.name !== "string" ||
    typeof portfolio.sourceFileName !== "string" ||
    typeof portfolio.uploadedAt !== "string" ||
    typeof portfolio.lastViewedAt !== "string" ||
    !Array.isArray(portfolio.positions)
  ) {
    return null;
  }

  return {
    id: portfolio.id,
    name: portfolio.name,
    sourceFileName: portfolio.sourceFileName,
    uploadedAt: portfolio.uploadedAt,
    lastViewedAt: portfolio.lastViewedAt,
    positionCount:
      typeof portfolio.positionCount === "number"
        ? portfolio.positionCount
        : portfolio.positions.length,
    totalValue:
      typeof portfolio.totalValue === "number" ? portfolio.totalValue : undefined,
    positions: portfolio.positions,
    portfolioData:
      portfolio.portfolioData && typeof portfolio.portfolioData === "object"
        ? (portfolio.portfolioData as PortfolioData)
        : null,
  };
}

function pruneStore(store: PortfolioStore): PortfolioStore {
  return {
    version: STORE_VERSION,
    portfolios: sortPortfolios(store.portfolios)
      .slice(0, MAX_STORED_PORTFOLIOS)
      .map((portfolio, index) => ({
        ...portfolio,
        positionCount: portfolio.positions.length,
        portfolioData:
          index < MAX_CACHED_DATA_PORTFOLIOS ? portfolio.portfolioData : null,
      })),
  };
}

function sortPortfolios(portfolios: StoredPortfolioRecord[]): StoredPortfolioRecord[] {
  return [...portfolios].sort((a, b) => {
    const viewedDelta =
      new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime();
    if (viewedDelta !== 0) {
      return viewedDelta;
    }

    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });
}

function findPortfolioById(
  store: PortfolioStore,
  portfolioId: string
): StoredPortfolioRecord | null {
  return store.portfolios.find(({ id }) => id === portfolioId) ?? null;
}

function toSummary(portfolio: StoredPortfolioRecord): StoredPortfolioSummary {
  return {
    id: portfolio.id,
    name: portfolio.name,
    sourceFileName: portfolio.sourceFileName,
    uploadedAt: portfolio.uploadedAt,
    lastViewedAt: portfolio.lastViewedAt,
    positionCount: portfolio.positions.length,
    totalValue: portfolio.totalValue,
  };
}

function createPortfolioName(sourceFileName: string): string {
  const trimmed = sourceFileName.trim();
  if (!trimmed) {
    return "Imported portfolio";
  }

  return trimmed.replace(/\.csv$/i, "");
}

function createPortfolioId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    let id = "";
    for (let i = 0; i < bytes.length; i++) {
      id += alphabet[bytes[i]! % alphabet.length]!;
    }
    return id;
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStore(): PortfolioStore {
  return {
    version: STORE_VERSION,
    portfolios: [],
  };
}
