import type {
  FidelityPosition,
  PortfolioData,
  StoredPortfolioSummary,
} from "./types";

const PORTFOLIO_STORE_KEY = "portfolio_store";
const MAX_STORED_PORTFOLIOS = 8;
const MAX_CACHED_DATA_PORTFOLIOS = 3;
const STORE_VERSION = 2;

interface StoredPortfolioRecord extends StoredPortfolioSummary {
  positions: FidelityPosition[];
  portfolioData: PortfolioData | null;
}

interface PortfolioStore {
  version: number;
  portfolios: StoredPortfolioRecord[];
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

export function saveUploadedPortfolio({
  sourceFileName,
  positions,
}: SaveUploadedPortfolioInput): StoredPortfolioSummary {
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

  const store = readStore();
  const persisted = persistStore({
    ...store,
    portfolios: [portfolio, ...store.portfolios],
  });

  return toSummary(findPortfolioById(persisted, portfolio.id) ?? portfolio);
}

export function listStoredPortfolios(): StoredPortfolioSummary[] {
  return sortPortfolios(readStore().portfolios).map(toSummary);
}

export function getMostRecentPortfolioId(): string | null {
  return listStoredPortfolios()[0]?.id ?? null;
}

export function loadStoredPortfolio(
  portfolioId: string
): StoredPortfolioPayload | null {
  const portfolio = findPortfolioById(readStore(), portfolioId);

  if (!portfolio) {
    return null;
  }

  return {
    summary: toSummary(portfolio),
    positions: portfolio.positions,
    portfolioData: portfolio.portfolioData,
  };
}

export function saveStoredPortfolioData(
  portfolioId: string,
  portfolioData: PortfolioData
): void {
  const store = readStore();
  const portfolio = findPortfolioById(store, portfolioId);

  if (!portfolio) {
    return;
  }

  portfolio.portfolioData = portfolioData;
  portfolio.totalValue = portfolioData.summary.totalValue;
  portfolio.lastViewedAt = new Date().toISOString();
  persistStore(store);
}

export function touchStoredPortfolio(portfolioId: string): void {
  const store = readStore();
  const portfolio = findPortfolioById(store, portfolioId);

  if (!portfolio) {
    return;
  }

  portfolio.lastViewedAt = new Date().toISOString();
  persistStore(store);
}

export function updateStoredPortfolioName(
  portfolioId: string,
  name: string
): void {
  const store = readStore();
  const portfolio = findPortfolioById(store, portfolioId);

  if (!portfolio) {
    return;
  }

  portfolio.name = name.trim() || createPortfolioName(portfolio.sourceFileName);
  persistStore(store);
}

export function removeStoredPortfolio(portfolioId: string): string | null {
  const store = readStore();
  const persisted = persistStore({
    ...store,
    portfolios: store.portfolios.filter(({ id }) => id !== portfolioId),
  });

  return sortPortfolios(persisted.portfolios)[0]?.id ?? null;
}

export function clearStoredPortfolios(): void {
  try {
    localStorage.removeItem(PORTFOLIO_STORE_KEY);
  } catch {
    console.error("Failed to clear portfolio store from localStorage");
  }
}

function readStore(): PortfolioStore {
  if (typeof window === "undefined") {
    return createEmptyStore();
  }

  try {
    const raw = localStorage.getItem(PORTFOLIO_STORE_KEY);
    if (!raw) {
      return createEmptyStore();
    }

    const normalized = normalizeStore(JSON.parse(raw));
    if (normalized) {
      const { portfolios, changed } = migrateLegacyPortfolioIds(normalized.portfolios);
      if (changed) {
        return persistStore({ ...normalized, portfolios });
      }
      return normalized;
    }
  } catch {
    console.error("Failed to read portfolio store from localStorage");
  }

  return createEmptyStore();
}

function normalizeStore(value: unknown): PortfolioStore | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const store = value as Partial<PortfolioStore>;
  if (!Array.isArray(store.portfolios)) {
    return null;
  }

  return pruneStore({
    version: typeof store.version === "number" ? store.version : STORE_VERSION,
    portfolios: store.portfolios
      .map((portfolio) => normalizePortfolio(portfolio))
      .filter((portfolio): portfolio is StoredPortfolioRecord => portfolio !== null),
  });
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

function persistStore(store: PortfolioStore): PortfolioStore {
  const nextStore = pruneStore(store);

  if (typeof window === "undefined") {
    return nextStore;
  }

  let attempt = nextStore;

  while (true) {
    try {
      localStorage.setItem(PORTFOLIO_STORE_KEY, JSON.stringify(attempt));
      return attempt;
    } catch {
      const downgraded = downgradeStoreForQuota(attempt);
      if (!downgraded) {
        console.error("Failed to persist portfolio store to localStorage");
        return attempt;
      }
      attempt = downgraded;
    }
  }
}

function downgradeStoreForQuota(store: PortfolioStore): PortfolioStore | null {
  const portfolios = sortPortfolios(store.portfolios);
  const oldestCachedPortfolio = [...portfolios]
    .reverse()
    .find(({ portfolioData }) => portfolioData !== null);

  if (oldestCachedPortfolio) {
    return pruneStore({
      ...store,
      portfolios: portfolios.map((portfolio) =>
        portfolio.id === oldestCachedPortfolio.id
          ? { ...portfolio, portfolioData: null }
          : portfolio
      ),
    });
  }

  if (portfolios.length <= 1) {
    return null;
  }

  return pruneStore({
    ...store,
    portfolios: portfolios.slice(0, -1),
  });
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

/** Previous id shape: `portfolio-{timestamp}-{random}` — rewritten on read. */
function isLegacyPortfolioId(id: string): boolean {
  return /^portfolio-\d+-/.test(id);
}

function migrateLegacyPortfolioIds(
  portfolios: StoredPortfolioRecord[]
): { portfolios: StoredPortfolioRecord[]; changed: boolean } {
  let changed = false;
  const next = portfolios.map((portfolio) => {
    if (!isLegacyPortfolioId(portfolio.id)) {
      return portfolio;
    }
    changed = true;
    return { ...portfolio, id: createPortfolioId() };
  });

  return { portfolios: next, changed };
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
