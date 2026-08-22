/**
 * Date formatting.
 *
 * Built on date-fns with the locale supplied by the caller, so every date in
 * Atlas reads correctly in Arabic and English without component-level branching.
 * Functions are pure and never read global state.
 */
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { LanguageCode } from '@types';

/** date-fns locale objects, keyed by Atlas language code. */
const DATE_LOCALES: Record<LanguageCode, Locale> = {
  en: enUS,
  ar,
};

/** Named date presentations used across the platform. */
export const DATE_FORMATS = {
  /** 12 Mar 2026 */
  short: 'd MMM yyyy',
  /** 12 March 2026 */
  long: 'd MMMM yyyy',
  /** 12 Mar 2026, 14:30 */
  dateTime: 'd MMM yyyy, HH:mm',
  /** 14:30 */
  time: 'HH:mm',
  /** March 2026 */
  monthYear: 'MMMM yyyy',
} as const;

export type DateFormatToken = keyof typeof DATE_FORMATS;

/** A date supplied as an ISO-8601 string, a timestamp, or a Date. */
export type DateInput = string | number | Date;

/** Returns the date-fns locale for an Atlas language. */
export function dateLocale(language: LanguageCode): Locale {
  return DATE_LOCALES[language];
}

/** Converts any supported input into a Date, or null when unparseable. */
export function toDate(value: DateInput): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'number') {
    const fromTimestamp = new Date(value);
    return isValid(fromTimestamp) ? fromTimestamp : null;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Formats a date using a named Atlas format.
 *
 * @returns The formatted date, or an empty string when the input is invalid.
 */
export function formatDate(
  value: DateInput,
  language: LanguageCode,
  formatToken: DateFormatToken = 'short'
): string {
  const date = toDate(value);
  if (!date) return '';
  return format(date, DATE_FORMATS[formatToken], {
    locale: dateLocale(language),
  });
}

/**
 * Formats a date as a relative distance from now, e.g. "3 days ago".
 *
 * @returns The relative description, or an empty string when input is invalid.
 */
export function formatRelativeTime(
  value: DateInput,
  language: LanguageCode
): string {
  const date = toDate(value);
  if (!date) return '';
  return formatDistanceToNowStrict(date, {
    locale: dateLocale(language),
    addSuffix: true,
  });
}