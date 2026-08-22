/**
 * Money formatting.
 *
 * The ONLY place `Money.amountMinorUnits` is converted to a display string.
 * No page divides by 100 itself. Assumes the standard 2-decimal-exponent
 * convention (`Intl.NumberFormat` handles this correctly per currency —
 * e.g. it renders JPY, which has no minor unit, without decimals once the
 * value is pre-divided); if a future currency needs a different minor-unit
 * exponent than 2, this is the single seam to extend, not a per-page fix.
 */
import type { Money } from '@types';

const MINOR_UNIT_DIVISOR = 100;

/** Formats a `Money` value for display using the given locale. */
export function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountMinorUnits / MINOR_UNIT_DIVISOR);
}
