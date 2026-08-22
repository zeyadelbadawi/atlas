/**
 * Number, currency and byte formatting.
 *
 * All formatting goes through `Intl`, using the locale of the active language,
 * so Arabic and English both render correct digits, separators and symbols.
 */
import { LANGUAGES } from '@localization';
import type { LanguageCode } from '@types';

/** Number of bytes per unit step. */
const BYTES_PER_UNIT = 1024;

/** Byte unit translation keys, ordered by magnitude. */
const BYTE_UNIT_KEYS = [
  'common:units.bytes',
  'common:units.kilobytes',
  'common:units.megabytes',
  'common:units.gigabytes',
  'common:units.terabytes',
] as const;

function localeFor(language: LanguageCode): string {
  return LANGUAGES[language].locale;
}

/** Formats an integer or decimal number for display. */
export function formatNumber(
  value: number,
  language: LanguageCode,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(localeFor(language), options).format(value);
}

/**
 * Formats a monetary amount.
 *
 * @param currencyCode ISO-4217 code supplied by configuration or data, never
 * hardcoded inside a component.
 */
export function formatCurrency(
  value: number,
  language: LanguageCode,
  currencyCode: string,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Formats a ratio as a percentage.
 *
 * @param ratio Fraction where 1 represents 100%.
 */
export function formatPercentage(
  ratio: number,
  language: LanguageCode,
  fractionDigits = 0
): string {
  if (!Number.isFinite(ratio)) return '';
  return new Intl.NumberFormat(localeFor(language), {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Formats a large number compactly, e.g. 12.4K. */
export function formatCompactNumber(
  value: number,
  language: LanguageCode
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(localeFor(language), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** A byte size split into its numeric value and its unit translation key. */
export interface FormattedBytes {
  readonly value: string;
  readonly unitKey: string;
}

/**
 * Converts a byte count into a value plus a unit translation key, so the unit
 * itself stays localizable rather than being hardcoded in English.
 */
export function formatBytes(
  bytes: number,
  language: LanguageCode
): FormattedBytes {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return { value: '', unitKey: BYTE_UNIT_KEYS[0] };
  }

  const maxUnitIndex = BYTE_UNIT_KEYS.length - 1;
  let unitIndex = 0;
  let size = bytes;

  while (size >= BYTES_PER_UNIT && unitIndex < maxUnitIndex) {
    size /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  return {
    value: formatNumber(size, language, {
      maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    }),
    unitKey: BYTE_UNIT_KEYS[unitIndex],
  };
}

/** Constrains a number to an inclusive range. */
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}