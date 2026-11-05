/**
 * B1 (UX audit) — what an auth form says when a request fails.
 *
 * Every auth step used to hard-code ONE message for every failure: the
 * sign-in said "Invalid email or password" for a 500, the authenticator step
 * said "That code didn't work" for a network drop, the reset form said
 * "Unexpected error". Each told the customer something false.
 *
 * The rule now: the backend's own key when the catalogue holds it
 * (`useErrorText`), otherwise the copy for the KIND of failure (server,
 * network, rate limit…), and a step-specific sentence only for the one
 * failure it is true for (e.g. a 401 on sign-in IS wrong credentials).
 */
import { useCallback } from 'react';
import type { FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useErrorText } from '@hooks';
import { errorMessageKey } from '@services';
import type { ApiError } from '@api';
import type { ApiErrorKind } from '@types';

/** Step-specific copy for some kinds, e.g. `{ unauthorized: 'auth:signIn.errors.invalidCredentials' }`. */
export type KindFallbacks = Partial<Record<ApiErrorKind, string>>;

/** The fallback for a failure the catalogue has no specific words for. */
export function authFailureFallbackKey(
  error: Pick<ApiError, 'kind'>,
  overrides?: KindFallbacks
): string {
  return overrides?.[error.kind] ?? errorMessageKey(error.kind);
}

/** `(error) => text`: the real reason, or the per-kind fallback. Never empty, never a raw key. */
export function useAuthFailureText(
  overrides?: KindFallbacks
): (error: Pick<ApiError, 'kind' | 'messageKey'>) => string {
  const errorText = useErrorText();
  // Read on every call: callers pass an inline object.
  return useCallback(
    (error) =>
      errorText(error.messageKey, authFailureFallbackKey(error, overrides)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [errorText, JSON.stringify(overrides ?? {})]
  );
}

/** A namespaced translation key (`ns:a.b`) — finished text always has a space or punctuation a key cannot. */
const TRANSLATION_KEY = /^[\w-]+:[\w.-]+$/;

/**
 * Field messages come in two shapes: a rule's translation KEY
 * (`auth:register.errors.nameTooShort`, or one a server hook placed) or a
 * server violation that `useServerValidation` already translated. Calling
 * `t()` on finished text renders an EMPTY string in production
 * (`parseMissingKeyHandler`), so only a key is translated; finished text is
 * shown as it is.
 */
export function useFieldErrorText(): (
  error: Pick<FieldError, 'message'> | undefined,
  fallbackKey: string,
  values?: Record<string, string | number>
) => string | null {
  const { t } = useTranslation();
  return useCallback(
    (error, fallbackKey, values) => {
      if (!error) return null;
      const message = typeof error.message === 'string' ? error.message : '';
      if (!message) return t(fallbackKey, values ?? {});
      return TRANSLATION_KEY.test(message) ? t(message, values ?? {}) : message;
    },
    [t]
  );
}

/**
 * Whether every field violation of a failure belongs to one of `fields`, i.e.
 * the form can show all of it beside its inputs and needs no banner too.
 */
export function violationsAllOn(
  error: Pick<ApiError, 'violations'> | null,
  fields: readonly string[]
): boolean {
  const violations = error?.violations;
  return (
    !!violations &&
    violations.length > 0 &&
    violations.every((violation) => fields.includes(violation.field))
  );
}
