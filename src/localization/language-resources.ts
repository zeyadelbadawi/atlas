/**
 * Per-language translation loading (Theme 1 plan §U.D, P-2).
 *
 * Every visitor used to download every namespace in BOTH languages
 * (~218 KB gzip, over half of the public route's JavaScript) before the
 * first paint. Each language is now its own chunk (`resources/bundle-*`):
 *
 *   - `preloadLanguages` loads the languages the first render needs before
 *     the app mounts (`main.tsx`), so text is never shown untranslated;
 *   - `ensureLanguageLoaded` loads another language into a live i18n
 *     instance before switching to it (the language menu, `/ar/` public
 *     pages).
 *
 * `createI18nInstance` reads whatever is registered here synchronously.
 * Tests register both languages up front (`src/test/setup-i18n.ts`).
 * English is not loaded as a fallback for Arabic: the parity test keeps
 * both languages' keys identical, so a fallback lookup never happens.
 */
import type { i18n as I18nInstance } from 'i18next';
import type { LanguageCode } from '@types';

/** One language's resources, keyed by namespace. */
type NamespaceBundle = Record<string, Record<string, unknown>>;

const LOADERS: Record<
  LanguageCode,
  () => Promise<{ default: NamespaceBundle }>
> = {
  en: () => import('./resources/bundle-en'),
  ar: () => import('./resources/bundle-ar'),
};

const registered = new Map<LanguageCode, NamespaceBundle>();
const pending = new Map<LanguageCode, Promise<NamespaceBundle>>();

/** Makes a language's bundle available synchronously (preload, tests). */
export function registerLanguageResources(
  language: LanguageCode,
  bundle: NamespaceBundle
): void {
  registered.set(language, bundle);
}

/** The bundles registered so far, keyed by language. */
export function registeredLanguageResources(): Partial<
  Record<LanguageCode, NamespaceBundle>
> {
  return Object.fromEntries(registered) as Partial<
    Record<LanguageCode, NamespaceBundle>
  >;
}

/** Loads (once) and registers one language's bundle. */
export function loadLanguageResources(
  language: LanguageCode
): Promise<NamespaceBundle> {
  const ready = registered.get(language);
  if (ready) return Promise.resolve(ready);
  let loading = pending.get(language);
  if (!loading) {
    loading = LOADERS[language]()
      .then((module) => {
        registerLanguageResources(language, module.default);
        return module.default;
      })
      .finally(() => pending.delete(language));
    pending.set(language, loading);
  }
  return loading;
}

/** Loads every language in `languages` before the first render. */
export async function preloadLanguages(
  languages: readonly LanguageCode[]
): Promise<void> {
  await Promise.all([...new Set(languages)].map(loadLanguageResources));
}

/** Loads `language` into `i18n` (if it isn't there yet) so switching to it shows real text. */
export async function ensureLanguageLoaded(
  i18n: I18nInstance,
  language: LanguageCode
): Promise<void> {
  const bundle = await loadLanguageResources(language);
  for (const [namespace, resources] of Object.entries(bundle)) {
    if (!i18n.hasResourceBundle(language, namespace)) {
      i18n.addResourceBundle(language, namespace, resources, true, true);
    }
  }
}
