import { openDB, type IDBPDatabase } from "idb";
import type { FidelityPosition, PortfolioData } from "./types";

/** New name: prior `wmm-portfolios` DB is not opened (no migration). */
const DB_NAME = "wmm-portfolio-store";
const DB_VERSION = 1;
const STORE_META = "portfolioMeta" as const;
const STORE_PAYLOAD = "portfolioPayload" as const;

/** Library / ordering / summary fields (small). */
export interface PortfolioMetaRow {
  id: string;
  name: string;
  sourceFileName: string;
  uploadedAt: string;
  lastViewedAt: string;
  positionCount: number;
  totalValue?: number;
}

/** Positions + server dashboard blob (large). */
export interface PortfolioPayloadRow {
  id: string;
  positions: FidelityPosition[];
  portfolioData: PortfolioData | null;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getPortfolioDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB not available"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion === 0) {
          db.createObjectStore(STORE_META, { keyPath: "id" });
          db.createObjectStore(STORE_PAYLOAD, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function resetPortfolioDbConnectionForTests(): void {
  dbPromise = null;
}

export async function deletePortfolioDatabaseForTests(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      /* ignore */
    }
  }
  dbPromise = null;
  if (typeof indexedDB === "undefined") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAllPortfolioMeta(): Promise<PortfolioMetaRow[]> {
  const db = await getPortfolioDB();
  return db.getAll(STORE_META);
}

export async function idbGetAllPortfolioPayload(): Promise<PortfolioPayloadRow[]> {
  const db = await getPortfolioDB();
  return db.getAll(STORE_PAYLOAD);
}

export async function idbGetPortfolioMeta(
  id: string
): Promise<PortfolioMetaRow | undefined> {
  const db = await getPortfolioDB();
  return db.get(STORE_META, id);
}

export async function idbGetPortfolioPayload(
  id: string
): Promise<PortfolioPayloadRow | undefined> {
  const db = await getPortfolioDB();
  return db.get(STORE_PAYLOAD, id);
}

/** One transaction: read meta + payload, write both (or neither if missing). */
export async function idbMutatePortfolioRows(
  id: string,
  update: (rows: {
    meta: PortfolioMetaRow;
    payload: PortfolioPayloadRow;
  }) => { meta: PortfolioMetaRow; payload: PortfolioPayloadRow }
): Promise<boolean> {
  const db = await getPortfolioDB();
  const tx = db.transaction([STORE_META, STORE_PAYLOAD], "readwrite");
  const metaStore = tx.objectStore(STORE_META);
  const payloadStore = tx.objectStore(STORE_PAYLOAD);
  const metaRow = await metaStore.get(id);
  const payloadRow = await payloadStore.get(id);
  if (!metaRow || !payloadRow) {
    await tx.done;
    return false;
  }
  const { meta, payload } = update({ meta: metaRow, payload: payloadRow });
  await metaStore.put(meta);
  await payloadStore.put(payload);
  await tx.done;
  return true;
}

export async function idbMutatePortfolioMeta(
  id: string,
  update: (meta: PortfolioMetaRow) => PortfolioMetaRow
): Promise<boolean> {
  const db = await getPortfolioDB();
  const tx = db.transaction(STORE_META, "readwrite");
  const meta = await tx.store.get(id);
  if (!meta) {
    await tx.done;
    return false;
  }
  await tx.store.put(update(meta));
  await tx.done;
  return true;
}

export async function idbApplyPortfolioSplitDelta(
  deleteIds: string[],
  metasToPut: PortfolioMetaRow[],
  payloadsToPut: PortfolioPayloadRow[]
): Promise<void> {
  if (deleteIds.length === 0 && metasToPut.length === 0 && payloadsToPut.length === 0) {
    return;
  }
  const db = await getPortfolioDB();
  const tx = db.transaction([STORE_META, STORE_PAYLOAD], "readwrite");
  const metaStore = tx.objectStore(STORE_META);
  const payloadStore = tx.objectStore(STORE_PAYLOAD);
  for (const id of deleteIds) {
    await metaStore.delete(id);
    await payloadStore.delete(id);
  }
  for (const m of metasToPut) {
    await metaStore.put(m);
  }
  for (const p of payloadsToPut) {
    await payloadStore.put(p);
  }
  await tx.done;
}

export async function idbClearAllPortfolios(): Promise<void> {
  const db = await getPortfolioDB();
  const tx = db.transaction([STORE_META, STORE_PAYLOAD], "readwrite");
  await tx.objectStore(STORE_META).clear();
  await tx.objectStore(STORE_PAYLOAD).clear();
  await tx.done;
}
