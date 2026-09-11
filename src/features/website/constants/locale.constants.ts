/**
 * Public Website Locale (Phase 6 — Bilingual Academy Websites).
 *
 * Deliberately independent of `SUPPORTED_LANGUAGE_CODES`
 * (`localization.types.ts`) even though both currently list the same two
 * codes: that constant governs Atlas's OWN dashboard chrome
 * (`AtlasLocalizationProvider`), set once per admin user and persisted to
 * their `localStorage`. A public website visitor is never signed in, never
 * touches the dashboard, and picks their language from the URL they're
 * on — a completely different axis that happens to support the same two
 * languages today. Keeping them as two separate constants (rather than
 * one shared list) means adding a third PUBLIC website language later
 * never has to first ask "does this also affect the dashboard chrome?",
 * and vice versa — see the Bilingual Academy Websites specification, "the
 * architecture must support additional languages later without a
 * fundamentally different data model."
 *
 * The `PublicWebsiteLocale` TYPE itself lives in `@types`
 * (`public-website-locale.types.ts`) so `types/website-seo.types.ts` (which
 * must not import from `features/`) can reference it too — this file owns
 * every runtime VALUE derived from it.
 */
import type { PublicWebsiteLocale } from '@types';

export type { PublicWebsiteLocale };

export const PUBLIC_WEBSITE_LOCALES: readonly PublicWebsiteLocale[] = [
  'en',
  'ar',
];

export const DEFAULT_PUBLIC_WEBSITE_LOCALE: PublicWebsiteLocale = 'en';

export const PUBLIC_WEBSITE_LOCALE_DIRECTION: Record<
  PublicWebsiteLocale,
  'ltr' | 'rtl'
> = {
  en: 'ltr',
  ar: 'rtl',
};

export const PUBLIC_WEBSITE_LOCALE_LABELS: Record<PublicWebsiteLocale, string> =
  {
    en: 'English',
    ar: 'العربية',
  };

/** The URL path segment a non-default locale is prefixed with (`/ar/about`) — the default locale (`en`) is never prefixed (`/about`), matching Revision 1's own routing decision: a clean, unprefixed default keeps every existing/shared link working unchanged. */
export const PUBLIC_WEBSITE_LOCALE_PATH_PREFIX: Record<
  PublicWebsiteLocale,
  string
> = {
  en: '',
  ar: '/ar',
};

export function isPublicWebsiteLocale(
  value: string
): value is PublicWebsiteLocale {
  return (PUBLIC_WEBSITE_LOCALES as readonly string[]).includes(value);
}
