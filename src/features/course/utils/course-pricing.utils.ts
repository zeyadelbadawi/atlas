/**
 * Course pricing display helpers.
 *
 * Formatting only — no payment logic. A course's price is shown as data, the
 * same way any other course attribute is.
 */
import type { TFunction } from 'i18next';
import type { CoursePricing } from '@types';

/** Renders a course's pricing as display text, e.g. "Free" or "$49.00". */
export function formatCoursePricing(
  pricing: CoursePricing,
  t: TFunction
): string {
  if (pricing.type === 'free' || !pricing.amount) {
    return t('course:pricing.free');
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: pricing.currency ?? 'USD',
    }).format(pricing.amount);
  } catch {
    return `${pricing.amount} ${pricing.currency ?? 'USD'}`;
  }
}
