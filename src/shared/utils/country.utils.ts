/**
 * Turns an ISO 3166-1 alpha-2 country code into a human-readable,
 * localized country name.
 *
 * WHY `Intl.DisplayNames` AND NOT A LOOKUP TABLE. The browser already
 * ships every country name in every locale it supports, maintained and
 * updated by the platform. A hand-written table would be ~250 entries per
 * language to keep in sync, would go stale, and would be one more place
 * for Arabic to silently fall back to English.
 *
 * "EG" becomes "Egypt" in English and "مصر" in Arabic, with no
 * translation file involved.
 *
 * Returns `undefined` for an absent or unrecognised code, so callers show
 * an explicit "unavailable" state rather than a raw two-letter code or a
 * fabricated place name.
 */
export function formatCountryName(
  countryCode: string | undefined,
  language: string
): string | undefined {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) return undefined;

  try {
    const displayNames = new Intl.DisplayNames([language], { type: 'region' });
    const name = displayNames.of(countryCode.toUpperCase());
    // `of` returns the input unchanged when it does not recognise the
    // region; showing "EG" as if it were a place name would be worse than
    // showing nothing.
    return name && name.toUpperCase() !== countryCode.toUpperCase()
      ? name
      : undefined;
  } catch {
    // `Intl.DisplayNames` is unavailable or the locale is malformed.
    return undefined;
  }
}
