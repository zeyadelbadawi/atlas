/**
 * Local-first dashboard — the one place that touches IndexedDB.
 *
 * WHY A SMALL OWN WRAPPER, NOT A LIBRARY. Atlas needs three tiny keyed
 * stores (cached query results, the durable outbox, a little metadata),
 * never queries or migrations across them. A hundred lines of IndexedDB
 * with one rule — fail closed, never throw into the app — is easier to
 * audit than a dependency, and keeps the bundle unchanged.
 *
 * FAILURE IS NORMAL. IndexedDB can be missing (very old browsers, some
 * embedded webviews), blocked (private windows, enterprise policy), full
 * (quota), cleared by the user, or evicted by the browser under storage
 * pressure. Every operation here therefore resolves to "nothing stored"
 * instead of rejecting, and the app keeps working online exactly as before
 * — offline support simply degrades. `status()` reports which state applies
 * so the UI can say "Offline copies are unavailable in this browser".
 */

export type OfflineStoreName = 'queries' | 'outbox' | 'meta';

export type OfflineStoreStatus = 'available' | 'unavailable' | 'full';

export interface OfflineStore {
  get<T>(store: OfflineStoreName, key: string): Promise<T | undefined>;
  getAll<T>(store: OfflineStoreName): Promise<T[]>;
  put<T>(store: OfflineStoreName, key: string, value: T): Promise<boolean>;
  delete(store: OfflineStoreName, key: string): Promise<void>;
  clear(store: OfflineStoreName): Promise<void>;
  status(): OfflineStoreStatus;
}

const DB_NAME = 'atlas-offline';
/** Bump with a new `upgrade` step if the stores ever change shape. */
const DB_VERSION = 1;
const STORES: readonly OfflineStoreName[] = ['queries', 'outbox', 'meta'];

function isQuotaError(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbOfflineStore implements OfflineStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private state: OfflineStoreStatus = 'available';

  status(): OfflineStoreStatus {
    return this.state;
  }

  private open(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === 'undefined') {
        this.state = 'unavailable';
        resolve(null);
        return;
      }
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        this.state = 'unavailable';
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab upgrading the schema: step aside rather than block it.
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        this.state = 'unavailable';
        resolve(null);
      };
      request.onblocked = () => {
        this.state = 'unavailable';
        resolve(null);
      };
    });
    return this.dbPromise;
  }

  private async run<T>(
    store: OfflineStoreName,
    mode: IDBTransactionMode,
    work: (objectStore: IDBObjectStore) => IDBRequest<T>
  ): Promise<T | undefined> {
    const db = await this.open();
    if (!db) return undefined;
    try {
      const tx = db.transaction(store, mode);
      const result = await promisify(work(tx.objectStore(store)));
      if (mode === 'readwrite') {
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      }
      return result;
    } catch (error) {
      if (isQuotaError(error)) this.state = 'full';
      return undefined;
    }
  }

  async get<T>(store: OfflineStoreName, key: string): Promise<T | undefined> {
    return (await this.run(store, 'readonly', (s) => s.get(key))) as
      T | undefined;
  }

  async getAll<T>(store: OfflineStoreName): Promise<T[]> {
    return (
      ((await this.run(store, 'readonly', (s) => s.getAll())) as
        T[] | undefined) ?? []
    );
  }

  async put<T>(
    store: OfflineStoreName,
    key: string,
    value: T
  ): Promise<boolean> {
    const before = this.state;
    const result = await this.run(store, 'readwrite', (s) => s.put(value, key));
    if (result === undefined) return false;
    // A write succeeded again: storage was freed (or never really full).
    if (before === 'full') this.state = 'available';
    return true;
  }

  async delete(store: OfflineStoreName, key: string): Promise<void> {
    await this.run(store, 'readwrite', (s) => s.delete(key));
  }

  async clear(store: OfflineStoreName): Promise<void> {
    await this.run(store, 'readwrite', (s) => s.clear());
  }
}

/** Same contract, in memory — for tests and for environments without IndexedDB. */
export class MemoryOfflineStore implements OfflineStore {
  private readonly data = new Map<OfflineStoreName, Map<string, unknown>>(
    STORES.map((name) => [name, new Map()])
  );

  status(): OfflineStoreStatus {
    return 'available';
  }

  async get<T>(store: OfflineStoreName, key: string): Promise<T | undefined> {
    return structuredCloneSafe(this.data.get(store)!.get(key)) as T | undefined;
  }

  async getAll<T>(store: OfflineStoreName): Promise<T[]> {
    return [...this.data.get(store)!.values()].map((v) =>
      structuredCloneSafe(v)
    ) as T[];
  }

  async put<T>(
    store: OfflineStoreName,
    key: string,
    value: T
  ): Promise<boolean> {
    this.data.get(store)!.set(key, structuredCloneSafe(value));
    return true;
  }

  async delete(store: OfflineStoreName, key: string): Promise<void> {
    this.data.get(store)!.delete(key);
  }

  async clear(store: OfflineStoreName): Promise<void> {
    this.data.get(store)!.clear();
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (value === undefined) return value;
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

let activeStore: OfflineStore | null = null;

/** The process-wide store (IndexedDB in the browser). */
export function offlineStore(): OfflineStore {
  if (!activeStore) activeStore = new IndexedDbOfflineStore();
  return activeStore;
}

/** Tests replace the store; `null` restores the default. */
export function setOfflineStoreForTesting(store: OfflineStore | null): void {
  activeStore = store;
}
