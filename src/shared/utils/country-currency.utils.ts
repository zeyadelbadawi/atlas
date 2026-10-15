/**
 * D5-3 — country → default currency, for the academy profile's country
 * and currency pickers. Pure: no React, no i18n.
 *
 * Codes only, in and out: ISO 3166-1 alpha-2 countries (`EG`) and ISO 4217
 * currencies (`EGP`). Display names come from `Intl.DisplayNames` at the
 * call site.
 *
 * `COUNTRY_CURRENCIES` is each country's official currency (a fact, not a
 * product decision) for Egypt and the near-term MENA markets. Which of them
 * may actually be chosen is `SUPPORTED_CURRENCIES` (the server enforces the
 * same list): a country whose currency is not supported gets NO default, so
 * picking it leaves the currency as it is. Today that means only Egypt
 * suggests a currency; opening SAR (etc.) in the allow-list, server and
 * client, is all it takes for Saudi Arabia to suggest it too.
 *
 * Choosing a currency never converts anything; a price is in whatever
 * currency it was saved in.
 *
 * The override rule (what `useCurrencyFollowsCountry` applies):
 * - The currency FOLLOWS the country until the person picks a currency
 *   other than the country's default; from then on a country change keeps
 *   their pick, and a hint offers the new country's default instead.
 * - Picking the default again (or taking the hint) makes it follow again.
 * - A saved academy whose currency differs from its country's default is
 *   loaded as overridden.
 */
import { SUPPORTED_CURRENCIES } from './currency.utils';

export const COUNTRY_CURRENCIES: Readonly<Record<string, string>> = {
  EG: 'EGP',
  SA: 'SAR',
  AE: 'AED',
  KW: 'KWD',
  QA: 'QAR',
  BH: 'BHD',
  OM: 'OMR',
  JO: 'JOD',
  US: 'USD',
};

/** The country's default currency when it is a supported one; otherwise null. */
export function defaultCurrencyForCountry(
  country: string | null | undefined,
  supported: readonly string[] = SUPPORTED_CURRENCIES
): string | null {
  if (!country) return null;
  const currency = COUNTRY_CURRENCIES[country];
  return currency && supported.includes(currency) ? currency : null;
}

/** On load: is a saved currency a deliberate choice away from its country's default? */
export function isSavedCurrencyOverride(
  country: string | null | undefined,
  currency: string | null | undefined,
  supported: readonly string[] = SUPPORTED_CURRENCIES
): boolean {
  const fallback = defaultCurrencyForCountry(country, supported);
  return fallback !== null && !!currency && currency !== fallback;
}

/** On a manual pick: does it override the country? (Picking the default does not.) */
export function isPickedCurrencyOverride(
  country: string | null | undefined,
  picked: string,
  supported: readonly string[] = SUPPORTED_CURRENCIES
): boolean {
  return picked !== defaultCurrencyForCountry(country, supported);
}

/** The currency after the country changes to `nextCountry`. */
export function currencyAfterCountryChange(
  nextCountry: string | null | undefined,
  currency: string,
  overridden: boolean,
  supported: readonly string[] = SUPPORTED_CURRENCIES
): string {
  if (overridden) return currency;
  return defaultCurrencyForCountry(nextCountry, supported) ?? currency;
}

/** The country's default when the current currency differs from it — what the hint offers. */
export function suggestedCurrency(
  country: string | null | undefined,
  currency: string | null | undefined,
  supported: readonly string[] = SUPPORTED_CURRENCIES
): string | null {
  const fallback = defaultCurrencyForCountry(country, supported);
  return fallback !== null && fallback !== currency ? fallback : null;
}
