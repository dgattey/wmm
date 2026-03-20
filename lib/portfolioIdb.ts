import { openDB, type IDBPDatabase } from "idb";

/** Legacy monolithic blob (migrated once into IndexedDB). */
export const LEGACY_PORTFOLIO_LOCALSTORAGE_KEY = "portfolio_store";

const DB_NAME = "wmm-portfolios";
const DB_VERSION = 1;
const STORE = "portfolios" as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getPortfolioDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB not available"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
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

export async function idbGetAllPortfolios(): Promise<unknown[]> {
  const db = await getPortfolioDB();
  return db.getAll(STORE);
}

export async function idbPutPortfolio(record: unknown): Promise<void> {
  const db = await getPortfolioDB();
  await db.put(STORE, record);
}

export async function idbReplaceAllPortfolios(records: unknown[]): Promise<void> {
  const db = await getPortfolioDB();
  const tx = db.transaction(STORE, "readwrite");
  await tx.store.clear();
  for (const r of records) {
    tx.store.put(r);
  }
  await tx.done;
}

export async function idbCountPortfolios(): Promise<number> {
  const db = await getPortfolioDB();
  return db.count(STORE);
}

export async function idbClearAllPortfolios(): Promise<void> {
  const db = await getPortfolioDB();
  await db.clear(STORE);
}
