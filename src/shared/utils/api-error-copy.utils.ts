/**
 * Turning an `ApiError` into a sentence the learner can act on.
 *
 * The backend names the specific thing that went wrong with a dotted key
 * (`errors.quiz.attemptExpired`); the frontend's error copy lives in the
 * `errors` namespace, addressed as `errors:quiz.attemptExpired`. This is
 * the one place that bridge is made, so a screen can say "Time ran out.
 * Your answers were submitted automatically." instead of "Unexpected
 * error" whenever the application actually knows what happened
 * (P64 Phase 3 design review, rule 6).
 *
 * Falls back to the per-kind description (`errors:notFound.description`
 * and so on) when the specific key has no copy, and to the generic
 * sentence for anything that is not an `ApiError` at all.
 */
import type { TFunction, i18n as I18nInstance } from 'i18next';
import { isApiError } from '@api';

const ERROR_NAMESPACE = 'errors';

/** `errors.quiz.attemptExpired` → `errors:quiz.attemptExpired`; a key that already carries a namespace is returned as is. */
export function toTranslationKey(messageKey: string): string {
  if (messageKey.includes(':')) return messageKey;
  const [head, ...rest] = messageKey.split('.');
  if (head === ERROR_NAMESPACE && rest.length > 0) {
    return `${ERROR_NAMESPACE}:${rest.join('.')}`;
  }
  return messageKey;
}

export interface ApiErrorCopyOptions {
  /** Interpolation values for the specific key. */
  readonly values?: Record<string, string | number>;
  /** Used when neither the specific key nor the kind has copy. */
  readonly fallbackKey?: string;
}

export function apiErrorMessage(
  t: TFunction,
  i18n: Pick<I18nInstance, 'exists'>,
  error: unknown,
  options: ApiErrorCopyOptions = {}
): string {
  const fallbackKey =
    options.fallbackKey ?? `${ERROR_NAMESPACE}:generic.description`;
  if (!isApiError(error)) return t(fallbackKey);

  const specific = toTranslationKey(error.messageKey);
  if (i18n.exists(specific)) {
    // Some keys name a GROUP (`errors.notFound` is `{ title, description }`),
    // and `t` on a group returns an object that renders as garbled text.
    // Prefer the group's sentence; never hand back a non-string.
    const described = `${specific}.description`;
    if (i18n.exists(described)) return t(described, options.values ?? {});
    const copy: unknown = t(specific, {
      ...(options.values ?? {}),
      returnObjects: true,
    });
    if (typeof copy === 'string') return copy;
  }

  const byKind = `${ERROR_NAMESPACE}:${error.kind}.description`;
  if (i18n.exists(byKind)) return t(byKind);

  return t(fallbackKey);
}

/** True when the error carries this exact backend message key. */
export function hasMessageKey(error: unknown, messageKey: string): boolean {
  return isApiError(error) && error.messageKey === messageKey;
}
