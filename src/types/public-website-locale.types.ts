/**
 * Public Website Locale (Phase 6 — Bilingual Academy Websites).
 *
 * The type lives here (`@types`, no feature imports) so both
 * `features/website/constants/locale.constants.ts` (the runtime values —
 * arrays, defaults, direction/prefix maps) and `types/website-seo.types.ts`
 * (which must not import from `features/`) share one definition. See
 * `locale.constants.ts`'s own doc comment for why this is deliberately
 * separate from `LanguageCode`/`SUPPORTED_LANGUAGE_CODES`
 * (`localization.types.ts`) — that governs the Atlas DASHBOARD's own
 * chrome language, a different axis from which language a public website
 * VISITOR is looking at.
 */
export type PublicWebsiteLocale = 'en' | 'ar';
