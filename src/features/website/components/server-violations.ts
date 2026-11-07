/**
 * B2 (UX audit, V10) — a server length violation reads as a sentence.
 *
 * The API's content schemas report `{ field: 'question.en', messageKey:
 * 'validation:maxLength' }` without the limit, so the message rendered as
 * "En must be {{count}} characters or fewer". The form knows its own
 * limits: the number is filled in from them, and a field whose limit the
 * form doesn't know gets a message that needs no number. The field's
 * translated label comes from `useServerValidation`'s `labels`, applied after this.
 */
import { useMemo } from 'react';
import type { ApiError } from '@api';
import { MAX_LENGTH_MESSAGE_KEY } from '../schemas/section-content-issues';

/** "{{field}} is too long. Shorten it and try again." — no number needed. */
export const TOO_LONG_MESSAGE_KEY = 'website:form.tooLong';

export function useViolationLimits(
  error: ApiError | null,
  limits: Readonly<Record<string, number>>
): ApiError | null {
  const key = JSON.stringify(limits);
  return useMemo(() => {
    if (!error?.violations?.length) return error;
    const known = JSON.parse(key) as Record<string, number>;
    const violations = error.violations.map((violation) => {
      if (violation.messageKey !== MAX_LENGTH_MESSAGE_KEY) return violation;
      if (violation.values?.count !== undefined) return violation;
      const limit = known[violation.field];
      return limit === undefined
        ? { ...violation, messageKey: TOO_LONG_MESSAGE_KEY }
        : { ...violation, values: { ...violation.values, count: limit } };
    });
    // Same error (prototype, kind, key); only the violations completed.
    return Object.assign(
      Object.create(Object.getPrototypeOf(error) as object) as ApiError,
      error,
      { violations }
    );
  }, [error, key]);
}
