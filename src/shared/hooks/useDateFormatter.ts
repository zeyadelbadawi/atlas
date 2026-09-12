/**
 * Formats a date in the language the user actually chose.
 *
 * WHAT WAS WRONG. Two dozen places rendered dates with a bare
 * `toLocaleDateString()`. With no locale argument that
 * uses the BROWSER's locale, not Atlas's — so an Arabic user on an en-US
 * machine saw `9/12/2026`, the same user on a de-DE machine would see
 * `12.9.2026`, and Atlas never chose either. Spotted in production in the
 * media details dialog, where a browser-locale date sat directly beneath a
 * correctly localized size (`٣٨١ بايت`), which is what made the
 * inconsistency visible at all.
 *
 * `date.utils.ts` already had the right function — `formatDate(value,
 * language, token)`, built on date-fns with a real Arabic locale. It just
 * needs the active language, and threading that through twenty-odd call
 * sites by hand is how call sites get missed. This binds it once.
 *
 * ON NUMERALS. date-fns renders Arabic months with Latin digits
 * (`12 سبتمبر 2026`), while `number.utils.ts` formats numbers through
 * `Intl` with `ar-EG`, which produces Arabic-Indic digits (`١٢٣`). That
 * divergence is a real one and it is NOT decided here: which numeral
 * system an Arabic product uses is a regional and brand choice (Egypt and
 * the Gulf differ), it affects every screen, and a QA pass is the wrong
 * place to settle it unilaterally. What this fixes is the unambiguous
 * part — that the date followed the browser rather than the user.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@utils';
import type { DateFormatToken, DateInput } from '@utils';
import type { LanguageCode } from '@types';

export interface DateFormatters {
  /** A date alone: `12 Mar 2026` / `12 مارس 2026`. */
  readonly date: (value: DateInput, token?: DateFormatToken) => string;
  /** A date with its time, for anything where the hour matters. */
  readonly dateTime: (value: DateInput) => string;
}

export function useDateFormatter(): DateFormatters {
  const { i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const date = useCallback(
    (value: DateInput, token: DateFormatToken = 'short') =>
      formatDate(value, language, token),
    [language]
  );

  const dateTime = useCallback(
    (value: DateInput) => formatDate(value, language, 'dateTime'),
    [language]
  );

  return { date, dateTime };
}
