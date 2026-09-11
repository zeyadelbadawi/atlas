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
