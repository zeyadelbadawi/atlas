/**
 * Per-language translation loading (Theme 1 plan §U.D P-2;
 * Reports/LCP_ROOT_CAUSE.md fix D).
 *
 * Each language ships as two chunks:
 *   - core (`resources/bundle-<lang>-core`): the namespaces an Academy
 *     website's first paint uses;
 *   - rest (`resources/bundle-<lang>-rest`): everything else.
 *
 *   - `preloadLanguages(languages, 'core')` loads the core before a public
 *     website renders; `'full'` (the dashboard) loads both halves first.
 *   - `completeLoadedLanguages()` loads the rest of every language in use;
 *     `main.tsx` starts it right after a public site's first render, and
 *     every lazily loaded public route waits for it
 *     (`withCompleteTranslations`), so no screen renders a namespace that
 *     hasn't arrived.
 *   - `ensureLanguageLoaded` loads a whole language into a live instance
 *     before switching to it (the language menu, `/ar/` public pages).
 *
 * Live i18n instances register here (`attachI18nInstance`), so a half that
 * arrives later is added to all of them; with `bindI18nStore: 'added'`
 * (i18n.ts) mounted components re-render when it does.
 *
 * Tests register both languages whole up front (`src/test/setup-i18n.ts`).
 * English is not loaded as a fallback for Arabic: the parity test keeps
 * both languages' keys identical, so a fallback lookup never happens.
 */
import type { i18n as I18nInstance } from 'i18next';
import type { LanguageCode } from '@types';

/** One language's resources, keyed by namespace. */
type NamespaceBundle = Record<string, Record<string, unknown>>;
type Half = 'core' | 'rest';

const LOADERS: Record<
  LanguageCode,
  Record<Half, () => Promise<{ default: NamespaceBundle }>>
> = {
  en: {
    core: () => import('./resources/bundle-en-core'),
    rest: () => import('./resources/bundle-en-rest'),
  },
  ar: {
    core: () => import('./resources/bundle-ar-core'),
    rest: () => import('./resources/bundle-ar-rest'),
  },
};

const registered = new Map<LanguageCode, NamespaceBundle>();
const loaded = new Map<LanguageCode, Set<Half>>();
const pending = new Map<string, Promise<void>>();
const instances = new Set<I18nInstance>();

function addToInstances(language: LanguageCode, bundle: NamespaceBundle): void {
  for (const instance of instances) {
    for (const [namespace, resources] of Object.entries(bundle)) {
      if (!instance.hasResourceBundle(language, namespace)) {
        instance.addResourceBundle(language, namespace, resources, true, true);
      }
    }
  }
}

function register(
  language: LanguageCode,
  bundle: NamespaceBundle,
  halves: readonly Half[]
): void {
  registered.set(language, { ...registered.get(language), ...bundle });
  const done = loaded.get(language) ?? new Set<Half>();
  for (const half of halves) done.add(half);
  loaded.set(language, done);
  addToInstances(language, bundle);
}

/** Makes a whole language available synchronously (tests, tooling). */
export function registerLanguageResources(
  language: LanguageCode,
  bundle: NamespaceBundle
): void {
  register(language, bundle, ['core', 'rest']);
}

/** The bundles registered so far, keyed by language. */
export function registeredLanguageResources(): Partial<
  Record<LanguageCode, NamespaceBundle>
> {
  return Object.fromEntries(registered) as Partial<
    Record<LanguageCode, NamespaceBundle>
  >;
}

/** A live instance receives every half that loads after it was created. */
export function attachI18nInstance(instance: I18nInstance): void {
  // A server render creates an instance per request; holding them here
  // would keep every one alive (and shared). The server renders with the
  // halves already registered and never loads more mid-render.
  if (typeof window === 'undefined') return;
  instances.add(instance);
}

function loadHalf(language: LanguageCode, half: Half): Promise<void> {
  if (loaded.get(language)?.has(half)) return Promise.resolve();
  const key = `${language}:${half}`;
  let loading = pending.get(key);
  if (!loading) {
    loading = LOADERS[language][half]()
      .then((module) => register(language, module.default, [half]))
      .finally(() => pending.delete(key));
    pending.set(key, loading);
  }
  return loading;
}

/** Loads (once) and registers one whole language. */
export async function loadLanguageResources(
  language: LanguageCode
): Promise<NamespaceBundle> {
  await Promise.all([loadHalf(language, 'core'), loadHalf(language, 'rest')]);
  return registered.get(language) ?? {};
}

/** Loads the languages the first render needs: their core, or all of them. */
export async function preloadLanguages(
  languages: readonly LanguageCode[],
  scope: 'core' | 'full' = 'full'
): Promise<void> {
  await Promise.all(
    [...new Set(languages)].map((language) =>
      scope === 'core'
        ? loadHalf(language, 'core')
        : loadLanguageResources(language)
    )
  );
}

/** Loads the rest of every language that has been started. */
export async function completeLoadedLanguages(): Promise<void> {
  await Promise.all(
    [...loaded.keys()].map((language) => loadLanguageResources(language))
  );
}

/** Wraps a lazy route's loader so it renders only with complete translations. */
export function withCompleteTranslations<T>(
  loader: () => Promise<T>
): () => Promise<T> {
  return () =>
    Promise.all([loader(), completeLoadedLanguages()]).then(
      ([module]) => module
    );
}

/**
 * Loads `language` into `i18n` (if it isn't there yet) so switching to it
 * shows real text. `'core'` is enough for a public website page (its lazy
 * routes wait for the rest themselves); the dashboard loads it whole.
 */
export async function ensureLanguageLoaded(
  i18n: I18nInstance,
  language: LanguageCode,
  scope: 'core' | 'full' = 'full'
): Promise<void> {
  if (scope === 'core') await loadHalf(language, 'core');
  else await loadLanguageResources(language);
  const bundle = registered.get(language) ?? {};
  for (const [namespace, resources] of Object.entries(bundle)) {
    if (!i18n.hasResourceBundle(language, namespace)) {
      i18n.addResourceBundle(language, namespace, resources, true, true);
    }
  }
}
