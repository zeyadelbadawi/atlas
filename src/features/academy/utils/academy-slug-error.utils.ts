/**
 * The Academy Slug refusals the backend answers a save with — taken (by
 * another academy's address, or an old address another academy keeps),
 * reserved for Atlas, malformed, or changed less than 60 days ago (with
 * the date a change becomes possible in `details.nextSlugChangeAt`). They
 * are shown under the slug input instead of a generic "could not save"
 * toast.
 */
import type { TFunction } from 'i18next';
import { isApiError } from '@api';
import { formatDate, toTranslationKey } from '@utils';
import type { LanguageCode } from '@types';

const SLUG_ERROR_KEYS: readonly string[] = [
  'errors.academy.slugTaken',
  'errors.academy.slugReserved',
  'errors.academy.invalidSlug',
  'errors.academy.slugChangeTooSoon',
];

/** The message to show under the slug field, or `null` when the error is about something else. */
export function academySlugErrorMessage(
  error: unknown,
  t: TFunction,
  language: LanguageCode
): string | null {
  if (!isApiError(error) || !SLUG_ERROR_KEYS.includes(error.messageKey)) {
    return null;
  }
  const key = toTranslationKey(error.messageKey);
  const next = error.details?.nextSlugChangeAt;
  return typeof next === 'string'
    ? t(key, { date: formatDate(next, language, 'long') })
    : key;
}
