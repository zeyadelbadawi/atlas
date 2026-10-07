/**
 * Theme pack loader — which theme packs this page has, and loading the
 * others on demand.
 *
 * A theme with its own presentation (Theme 1, Atelier) is its own chunk
 * and its own stylesheet, so an Academy's public site downloads only the
 * theme it uses. Themes 3–6 use the base pack, which is always available.
 * A chunked pack counts as loaded once its code AND its stylesheet have
 * arrived, so a theme never renders unstyled.
 *
 * Who loads what, before rendering, so nothing suspends or flashes:
 *   - the server renderer loads every pack once per process
 *     (`loadAllThemePacks`) and records which themes a page rendered;
 *   - `main.tsx` loads those themes before hydrating that page, and on a
 *     page the server did not render, starts the Academy's theme as soon
 *     as its hostname lookup answers;
 *   - everything else renders through `ThemePackGate`, which loads the
 *     theme and shows its fallback meanwhile (dashboard previews).
 *
 * Light by design: `main.tsx` imports it. Section renderers stay behind
 * `theme-pack.registry.ts`.
 */
import { WEBSITE_THEME_KEYS, type WebsiteThemeKey } from '@types';
import { createBasePack } from './base-pack';
import { ensureThemeStylesheets } from './theme-stylesheets';
import { registerThemeAssetManifest } from '../theme-assets/theme-asset.registry';
import type { ThemePack } from './theme-pack.types';

/** A system page a theme may draw itself (`ThemePages`). */
export type ThemeSystemPage = 'NotFound' | 'ComingSoon';

interface ChunkedThemePack {
  readonly load: () => Promise<ThemePack>;
  /**
   * The system pages the pack draws itself. Known before the pack loads:
   * routing decides on them (`hasThemeNotFound`, `hasThemeComingSoon`).
   * `theme-pack.loader.test.ts` checks they match the loaded pack.
   */
  readonly systemPages: readonly ThemeSystemPage[];
}

const CHUNKED_PACKS: Readonly<
  Partial<Record<WebsiteThemeKey, ChunkedThemePack>>
> = {
  'modern-education': {
    load: () =>
      import('../modern-education/modern-education.pack').then(
        (module) => module.MODERN_EDUCATION_PACK
      ),
    systemPages: ['NotFound', 'ComingSoon'],
  },
  atelier: {
    load: () =>
      import('../atelier/atelier.pack').then((module) => module.ATELIER_PACK),
    systemPages: ['NotFound', 'ComingSoon'],
  },
  manara: {
    load: () =>
      import('../manara/manara.pack').then((module) => module.MANARA_PACK),
    systemPages: ['NotFound', 'ComingSoon'],
  },
  riwaq: {
    load: () =>
      import('../riwaq/riwaq.pack').then((module) => module.RIWAQ_PACK),
    systemPages: ['NotFound', 'ComingSoon'],
  },
};

/** The theme an unknown or legacy key renders as (same fallback as `getWebsiteTheme`). */
const FALLBACK_THEME_KEY: WebsiteThemeKey = 'modern-education';

/** Whether this build knows the theme key. */
export function isKnownThemeKey(key: unknown): key is WebsiteThemeKey {
  return (WEBSITE_THEME_KEYS as readonly unknown[]).includes(key);
}

/** The pack a theme key renders with: itself, or Modern Education for an unknown/legacy key. */
export function resolveThemePackKey(key: string | undefined): WebsiteThemeKey {
  return isKnownThemeKey(key) ? key : FALLBACK_THEME_KEY;
}

// Base-pack themes are available from the start.
const loaded = new Map<WebsiteThemeKey, ThemePack>(
  WEBSITE_THEME_KEYS.filter((key) => !CHUNKED_PACKS[key]).map((key) => [
    key,
    createBasePack(key),
  ])
);
const pending = new Map<WebsiteThemeKey, Promise<ThemePack>>();
const failures = new Map<WebsiteThemeKey, unknown>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: called whenever a pack loads or fails. */
export function subscribeToThemePacks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The theme's pack if it is ready to render (always, for a base-pack theme). */
export function getLoadedThemePack(
  key: string | undefined
): ThemePack | undefined {
  return loaded.get(resolveThemePackKey(key));
}

/** Why the theme's pack failed to load, if it did. */
export function themePackLoadError(key: string | undefined): unknown {
  return failures.get(resolveThemePackKey(key));
}

/**
 * Makes a pack available synchronously. The loader's own completion step;
 * also used by the test setup, which registers every pack up front.
 */
export function registerThemePack(pack: ThemePack): void {
  if (pack.assets) registerThemeAssetManifest(pack.assets);
  loaded.set(pack.key, pack);
  failures.delete(pack.key);
  notify();
}

/** Loads the theme's pack (code and stylesheet), once; resolves with it. */
export function loadThemePack(key: string | undefined): Promise<ThemePack> {
  const resolved = resolveThemePackKey(key);
  const ready = getLoadedThemePack(resolved);
  if (ready) return Promise.resolve(ready);
  const inFlight = pending.get(resolved);
  if (inFlight) return inFlight;

  const chunked = CHUNKED_PACKS[resolved] as ChunkedThemePack;
  const request = Promise.all([
    chunked.load(),
    ensureThemeStylesheets(resolved),
  ]).then(
    ([pack]) => {
      pending.delete(resolved);
      registerThemePack(pack);
      return pack;
    },
    (error: unknown) => {
      pending.delete(resolved);
      failures.set(resolved, error);
      notify();
      throw error;
    }
  );
  pending.set(resolved, request);
  return request;
}

/** Every pack this build has — the server renderer's, once per process. */
export function loadAllThemePacks(): Promise<void> {
  return Promise.all(WEBSITE_THEME_KEYS.map(loadThemePack)).then(
    () => undefined
  );
}

/** Whether the theme draws this system page itself — answered without loading it. */
export function themeDrawsSystemPage(
  key: string | undefined,
  page: ThemeSystemPage
): boolean {
  return (
    CHUNKED_PACKS[resolveThemePackKey(key)]?.systemPages.includes(page) ?? false
  );
}
