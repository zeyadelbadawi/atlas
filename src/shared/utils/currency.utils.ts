/**
 * B0-LRN-05 / B0-COM-05 — the currencies an academy or a course price can
 * be set in (the server enforces the same list). EGP only for now.
 */
export const SUPPORTED_CURRENCIES: readonly string[] = ['EGP'];

/** The currency shown when a price carries none. */
export const DEFAULT_DISPLAY_CURRENCY = 'EGP';

/**
 * The choices for a currency picker: the supported list, plus the value
 * already saved when it predates the rule — so a legacy academy or course
 * still shows (and can keep) what it has, without being offered others.
 */
export function currencyOptions(current?: string | null): readonly string[] {
  return current && !SUPPORTED_CURRENCIES.includes(current)
    ? [...SUPPORTED_CURRENCIES, current]
    : SUPPORTED_CURRENCIES;
}
