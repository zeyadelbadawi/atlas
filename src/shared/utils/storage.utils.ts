/**
 * Safe web-storage access.
 *
 * Storage can throw: Safari private mode, disabled cookies, or a full quota all
 * raise. Every operation is guarded so a storage failure can never break the
 * application. Only non-sensitive preference data may be stored here.
 */

/** Reads and parses a JSON value. Returns the fallback on any failure. */
export function readStoredValue<TValue>(key: string, fallback: TValue): TValue {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as TValue;
  } catch {
    return fallback;
  }
}

/** Serialises and writes a value. Returns whether the write succeeded. */
export function writeStoredValue<TValue>(key: string, value: TValue): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Removes a stored value. Returns whether the removal succeeded. */
export function removeStoredValue(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Reports whether web storage is usable in the current context. */
export function isStorageAvailable(): boolean {
  try {
    const probeKey = '__atlas_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}