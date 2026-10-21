/**
 * The languages the first render needs, decided before the app mounts so
 * `main.tsx` can load exactly those translation bundles (P-2).
 */
import { APP_CONFIG } from '@config';
import { STORAGE_KEYS } from '@constants';
import { isSupportedLanguage } from '@localization';
import type { LanguageCode } from '@types';
import { readStoredValue, writeStoredValue } from '@utils';

/**
 * DL-63 — a `?lang=` the marketing site puts on its links into the
 * dashboard (a visitor on the Arabic pages opens the dashboard in Arabic;
 * the dashboard is another origin, so the preference does not carry over).
 * Only the two supported codes; anything else is ignored.
 */
function readLanguageFromUrl(): LanguageCode | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('lang');
    return value && isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/** Reads the language from the URL (`?lang=`, then remembered), else the persisted one, the browser's, the default. */
export function readInitialLanguage(): LanguageCode {
  const fromUrl = readLanguageFromUrl();
  if (fromUrl) {
    writeStoredValue(STORAGE_KEYS.language, fromUrl);
    return fromUrl;
  }

  const stored = readStoredValue<unknown>(
    STORAGE_KEYS.language,
    APP_CONFIG.defaultLanguage
  );

  if (typeof stored === 'string' && isSupportedLanguage(stored)) {
    return stored;
  }

  const browserLanguage =
    typeof navigator === 'undefined'
      ? ''
      : (navigator.language?.split('-')[0] ?? '');
  return isSupportedLanguage(browserLanguage)
    ? browserLanguage
    : APP_CONFIG.defaultLanguage;
}

/**
 * The provider's language, plus Arabic when the URL is a public website's
 * `/ar/...` page (its language comes from the URL, not the preference).
 */
export function languagesForFirstRender(pathname: string): LanguageCode[] {
  const languages: LanguageCode[] = [readInitialLanguage()];
  if (pathname === '/ar' || pathname.startsWith('/ar/')) languages.push('ar');
  return languages;
}
