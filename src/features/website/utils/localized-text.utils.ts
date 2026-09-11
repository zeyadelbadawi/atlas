/**
 * Resolves a `LocalizedText` field for display — the one shared helper
 * every section renderer, the public header/footer/nav, and SEO metadata
 * use, generalizing the fallback pattern `FaqSection.tsx`/
 * `TestimonialsSection.tsx` already proved (`entry.question[language] ||
 * entry.question.en`) before Phase 6 widened `LocalizedText` beyond the
 * CMS content library.
 *
 * English is the one required-complete language (see `LocalizedText`'s
 * own doc comment) — Arabic degrading to it when blank means an
 * incomplete translation never produces an empty or broken-looking page,
 * matching the Bilingual Academy Websites specification exactly.
 *
 * Also accepts a bare legacy string so any code that reads section JSON
 * before it has round-tripped through the Zod schema's own
 * `coerceLegacyLocalized` preprocessing still resolves correctly — never a
 * `undefined.en` crash on Academy content saved before this phase.
 */
import type { LocalizedText } from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';

/**
 * The empty `LocalizedText`, for defaults and cleared fields.
 *
 * Exists because `{ en: '', ar: '' }` was being retyped in five places
 * while several DEFAULTS used a bare `''` instead — which type-checked
 * nowhere and quietly produced legacy-shaped data for every newly added
 * section, so a brand-new section's title did not bind to the bilingual
 * editor until it had round-tripped through the schema's coercion.
 */
export const EMPTY_LOCALIZED_TEXT: LocalizedText = { en: '', ar: '' };

export function resolveLocalizedText(
  value: LocalizedText | string | undefined,
  locale: PublicWebsiteLocale
): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en;
}

/** Whether a `LocalizedText` field's Arabic side has real content — the one predicate the CMS completeness indicator (`LocalizationCompletenessBadge`) is built on. Deliberately blank-string-aware, not just presence-of-key: a page saved before this phase, or an Owner who cleared the field, both correctly read as "incomplete," never as "complete because the key exists." */
export function isLocalizedTextComplete(
  value: LocalizedText | string | undefined
): boolean {
  if (value === undefined || typeof value === 'string') return false;
  return value.ar.trim().length > 0;
}
