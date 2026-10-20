/**
 * The Academy Slug refusals the backend answers a save with — taken (by
 * another academy's address, or an old address another academy keeps),
 * reserved for Atlas, or malformed. They carry no field, so the settings
 * and profile pages put them under the slug input themselves instead of a
 * generic "could not save" toast.
 */
import { isApiError } from '@api';
import { toTranslationKey } from '@utils';

const SLUG_ERROR_KEYS: readonly string[] = [
  'errors.academy.slugTaken',
  'errors.academy.slugReserved',
  'errors.academy.invalidSlug',
];

/** The translation key to show under the slug field, or `null` when the error is about something else. */
export function academySlugErrorMessage(error: unknown): string | null {
  if (!isApiError(error) || !SLUG_ERROR_KEYS.includes(error.messageKey)) {
    return null;
  }
  return toTranslationKey(error.messageKey);
}
