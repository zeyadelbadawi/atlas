/**
 * Safe web-storage access.
 *
 * Storage can throw: Safari private mode, disabled cookies, or a full quota all
 * raise. Every operation is guarded so a storage failure can never break the
 * application. Only non-sensitive preference data may be stored here.
 */
import {
  isPreferenceStorageAllowed,
  isPreferenceStorageKey,
} from './cookie-consent.utils';

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

/**
 * Serialises and writes a value. Returns whether the write succeeded.
 *
 * CONSENT IS ENFORCED HERE, and deliberately not at the call sites. Every
 * preference write in the application — theme, language, sidebar state,
 * user preferences, feature flags, and `useLocalStorage` generally —
 * funnels through this function, so gating it once means a preference
 * added later is covered automatically instead of depending on whoever
 * writes it remembering to ask. Gating the five current call sites
 * individually would have left exactly that gap.
 *
 * Strictly-necessary keys are unaffected: `isPreferenceStorageKey` only
 * matches the optional category, so authentication and workspace
 * selection continue to work for a user who declined. Refusing those
 * would sign people out, which is not a choice anyone offered them.
 *
 * A refused write returns `false` — the same contract as a quota failure,
 * which every caller already handles.
 */
export function writeStoredValue<TValue>(key: string, value: TValue): boolean {
  if (isPreferenceStorageKey(key) && !isPreferenceStorageAllowed()) {
    return false;
  }
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
