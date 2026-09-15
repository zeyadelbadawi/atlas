/**
 * P54 — reading a plan's display name/description in the active language.
 *
 * ONE HELPER, EVERY DASHBOARD SURFACE. A plan name appears on the Plans
 * page, the trial dialog, the lifecycle panel, the dashboard summary, the
 * subscription page and the "subscription required" banner. Spelling out
 * `resolveLocalizedText(plan.nameLocalized ?? plan.name, locale)` at each
 * one is how five of them would get the fallback right and the sixth
 * would render blank Arabic.
 *
 * THIS IS NOT A SECOND LOCALIZATION SYSTEM. It is a two-line adapter over
 * `resolveLocalizedText` — the helper the website CMS already uses for the
 * identical `{ en, ar }` shape — that knows where a plan keeps its text.
 *
 * WHY `?? plan.name` AND NOT JUST THE LOCALIZED FIELD. `nameLocalized` is
 * absent for any plan row predating P54, and `resolveLocalizedText` accepts
 * a plain string precisely so a legacy value still renders. The result is
 * that an untranslated plan shows English rather than nothing — visibly
 * incomplete, never broken.
 */
import { resolveLocalizedText } from '@features/website';
import type { LanguageCode, Plan } from '@types';

/** A plan's name in the active language, falling back to its English catalog name. */
export function resolvePlanName(plan: Plan, locale: LanguageCode): string {
  return resolveLocalizedText(plan.nameLocalized ?? plan.name, locale);
}

/** A plan's description in the active language. Empty when the plan has none at all. */
export function resolvePlanDescription(plan: Plan, locale: LanguageCode): string {
  return resolveLocalizedText(
    plan.descriptionLocalized ?? plan.description,
    locale
  );
}
