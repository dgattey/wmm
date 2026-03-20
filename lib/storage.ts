import { pickRandomPortfolioTintIndex } from "./portfolioTints";
import type {
  FidelityPosition,
  PortfolioData,
  StoredPortfolioSummary,
} from "./types";
import type { PortfolioMetaRow, PortfolioPayloadRow } from "./portfolioIdb";
import {
  deletePortfolioDatabaseForTests,
  idbApplyPortfolioSplitDelta,
  idbClearAllPortfolios,
  idbGetAllPortfolioMeta,
  idbGetAllPortfolioPayload,
  idbGetPortfolioMeta,
  idbGetPortfolioPayload,
  idbMutatePortfolioMeta,
  idbMutatePortfolioRows,
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

function toMetaRow(p: StoredPortfolioRecord): PortfolioMetaRow {
  return {
    id: p.id,
    name: p.name,
    sourceFileName: p.sourceFileName,
    uploadedAt: p.uploadedAt,
    lastViewedAt: p.lastViewedAt,
    positionCount: p.positions.length,
    totalValue: p.totalValue,
    tintIndex: p.tintIndex,
  };
}

function toPayloadRow(p: StoredPortfolioRecord): PortfolioPayloadRow {
  return {
    id: p.id,
    positions: p.positions,
    portfolioData: p.portfolioData,
  };
}

function mergePortfolioRow(
  meta: PortfolioMetaRow,
  payload: PortfolioPayloadRow
): StoredPortfolioRecord {
  const positionCount = payload.positions.length;
  return {
    id: meta.id,
    name: meta.name,
    sourceFileName: meta.sourceFileName,
    uploadedAt: meta.uploadedAt,
    lastViewedAt: meta.lastViewedAt,
    positionCount,
    totalValue: meta.totalValue,
    tintIndex: meta.tintIndex,
    positions: payload.positions,
    portfolioData: payload.portfolioData,
  };
}

async function loadStoreFromIdb(): Promise<PortfolioStore> {
  if (typeof window === "undefined") {
    return createEmptyStore();
  }
  const [metas, payloads] = await Promise.all([
    idbGetAllPortfolioMeta(),
    idbGetAllPortfolioPayload(),
  ]);
  const payloadById = new Map(payloads.map((p) => [p.id, p]));
  const portfolios: StoredPortfolioRecord[] = [];
  for (const m of metas) {
    const p = payloadById.get(m.id);
    if (!p) {
      continue;
    }
    portfolios.push(mergePortfolioRow(m, p));
  }
  return pruneStore({
    version: STORE_VERSION,
    portfolios,
  });
}

function snapshotMetaById(portfolios: StoredPortfolioRecord[]): Map<string, string> {
  return new Map(portfolios.map((p) => [p.id, JSON.stringify(toMetaRow(p))]));
}

function snapshotPayloadById(portfolios: StoredPortfolioRecord[]): Map<string, string> {
  return new Map(portfolios.map((p) => [p.id, JSON.stringify(toPayloadRow(p))]));
}

/** Persists deletes plus meta/payload rows that changed vs `before`. */
async function persistStoreDelta(
  before: PortfolioStore,
  next: PortfolioStore
): Promise<PortfolioStore> {
  if (typeof window === "undefined") {
    return next;
  }

  const prevMeta = snapshotMetaById(before.portfolios);
  const prevPayload = snapshotPayloadById(before.portfolios);
  const nextIds = new Set(next.portfolios.map((p) => p.id));

  const deleteIds: string[] = [];
  for (const id of prevMeta.keys()) {
    if (!nextIds.has(id)) {
      deleteIds.push(id);
    }
  }

  const metasToPut: PortfolioMetaRow[] = [];
  const payloadsToPut: PortfolioPayloadRow[] = [];
  for (const p of next.portfolios) {
    const m = toMetaRow(p);
    const pl = toPayloadRow(p);
    if (prevMeta.get(p.id) !== JSON.stringify(m)) {
      metasToPut.push(m);
    }
    if (prevPayload.get(p.id) !== JSON.stringify(pl)) {
      payloadsToPut.push(pl);
    }
  }

  await idbApplyPortfolioSplitDelta(deleteIds, metasToPut, payloadsToPut);
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
    tintIndex: pickRandomPortfolioTintIndex(),
    positions,
    portfolioData: null,
  };

  const beforeStore = await loadStoreFromIdb();
  const merged: PortfolioStore = {
    version: STORE_VERSION,
    portfolios: [
      portfolio,
      ...beforeStore.portfolios.filter(({ id }) => id !== portfolio.id),
    ],
  };
  const nextStore = pruneStore(merged);
  const persisted = await persistStoreDelta(beforeStore, nextStore);
  return toSummary(findPortfolioById(persisted, portfolio.id) ?? portfolio);
}

export async function listStoredPortfolios(): Promise<StoredPortfolioSummary[]> {
  if (typeof window === "undefined") {
    return [];
  }
  const metas = await idbGetAllPortfolioMeta();
  return sortMetas(metas).map(toSummaryFromMeta);
}

export async function getMostRecentPortfolioId(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const metas = await idbGetAllPortfolioMeta();
  return sortMetas(metas)[0]?.id ?? null;
}

export async function getStoredPortfolioSummary(
  portfolioId: string
): Promise<StoredPortfolioSummary | null> {
  if (typeof window === "undefined" || !portfolioId) {
    return null;
  }
  const meta = await idbGetPortfolioMeta(portfolioId);
  return meta ? toSummaryFromMeta(meta) : null;
}

export async function loadStoredPortfolio(
  portfolioId: string
): Promise<StoredPortfolioPayload | null> {
  if (typeof window === "undefined" || !portfolioId) {
    return null;
  }
  const metas = sortMetas(await idbGetAllPortfolioMeta());
  const idx = metas.findIndex((m) => m.id === portfolioId);
  if (idx < 0) {
    return null;
  }
  const payload = await idbGetPortfolioPayload(portfolioId);
  if (!payload) {
    return null;
  }
  const meta = metas[idx]!;
  const portfolioData =
    idx < MAX_CACHED_DATA_PORTFOLIOS ? payload.portfolioData : null;
  return {
    summary: toSummaryFromMeta(meta),
    positions: payload.positions,
    portfolioData,
  };
}

export async function saveStoredPortfolioData(
  portfolioId: string,
  portfolioData: PortfolioData
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const now = new Date().toISOString();
  await idbMutatePortfolioRows(portfolioId, ({ meta, payload }) => ({
    meta: {
      ...meta,
      lastViewedAt: now,
      totalValue: portfolioData.summary.totalValue,
    },
    payload: {
      ...payload,
      portfolioData,
    },
  }));
}

export async function touchStoredPortfolio(portfolioId: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const beforeStore = await loadStoreFromIdb();
  if (!findPortfolioById(beforeStore, portfolioId)) {
    return;
  }

  const now = new Date().toISOString();
  const nextStore = pruneStore({
    version: STORE_VERSION,
    portfolios: beforeStore.portfolios.map((p) =>
      p.id === portfolioId ? { ...p, lastViewedAt: now } : p
    ),
  });
  await persistStoreDelta(beforeStore, nextStore);
}

export async function updateStoredPortfolioName(
  portfolioId: string,
  name: string
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = name.trim();
  await idbMutatePortfolioMeta(portfolioId, (meta) => ({
    ...meta,
    name: trimmed || createPortfolioName(meta.sourceFileName),
  }));
}

export async function removeStoredPortfolio(
  portfolioId: string
): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const beforeStore = await loadStoreFromIdb();
  const nextStore = pruneStore({
    ...beforeStore,
    portfolios: beforeStore.portfolios.filter(({ id }) => id !== portfolioId),
  });
  await persistStoreDelta(beforeStore, nextStore);
  return nextStore.portfolios[0]?.id ?? null;
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

function sortMetas(metas: PortfolioMetaRow[]): PortfolioMetaRow[] {
  return [...metas].sort((a, b) => {
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
    tintIndex: portfolio.tintIndex,
  };
}

function toSummaryFromMeta(meta: PortfolioMetaRow): StoredPortfolioSummary {
  return {
    id: meta.id,
    name: meta.name,
    sourceFileName: meta.sourceFileName,
    uploadedAt: meta.uploadedAt,
    lastViewedAt: meta.lastViewedAt,
    positionCount: meta.positionCount,
    totalValue: meta.totalValue,
    tintIndex: meta.tintIndex,
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
