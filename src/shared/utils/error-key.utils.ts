/**
 * B1 (UX audit) — which catalogue key an error message can safely render.
 *
 * The backend's generic keys (`errors.rateLimited`, `errors.notFound`, …)
 * name OBJECTS in the `errors` catalogue (`{ title, description }`), not
 * strings. `i18n.exists()` is true for an object, so `t()` was called on it
 * and the customer read "key 'rateLimited (en)' returned an object instead
 * of string." These helpers only ever hand a STRING key to `t()`.
 */

/** Minimal i18next surface, so the helpers stay framework-free and testable. */
export interface TranslationLookup {
  exists?: (key: string) => boolean;
  t: (key: string, options?: Record<string, unknown>) => unknown;
}

/** True when the key resolves to a translated string (not an object, not missing). */
export function isTranslatedString(
  i18n: TranslationLookup | undefined,
  key: string
): boolean {
  if (!i18n || typeof i18n.exists !== 'function' || !i18n.exists(key))
    return false;
  return typeof i18n.t(key, { returnObjects: true }) === 'string';
}

/**
 * The displayable form of a catalogue key: the key itself when it is a
 * string, its `.description` when it names a `{ title, description }`
 * object, otherwise `null`.
 */
export function displayableErrorKey(
  key: string,
  isString: (key: string) => boolean
): string | null {
  if (isString(key)) return key;
  const description = `${key}.description`;
  return isString(description) ? description : null;
}
