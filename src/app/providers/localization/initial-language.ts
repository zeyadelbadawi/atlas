/**
 * The languages the first render needs, decided before the app mounts so
 * `main.tsx` can load exactly those translation bundles (P-2).
 */
import { APP_CONFIG } from '@config';
import { STORAGE_KEYS } from '@constants';
import { isSupportedLanguage } from '@localization';
import type { LanguageCode } from '@types';
import { readStoredValue } from '@utils';

/** Reads the persisted language, falling back to the browser then the default. */
export function readInitialLanguage(): LanguageCode {
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
