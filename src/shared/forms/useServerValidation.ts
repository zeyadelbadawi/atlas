/**
 * useServerValidation hook.
 *
 * Maps backend validation errors to form field errors. Use this when a mutation
 * fails with validation violations.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form';
import type { FieldViolation } from '@types';
import type { ApiError } from '@api';
import { humanizeFieldName } from '@utils';

/**
 * "This phone number is already in use" (409) carries a `phoneNumber`
 * violation like a 400 does, so it is shown on the field, never as a
 * generic conflict card. It never says whose number it is.
 */
export const PHONE_TAKEN_ERROR_KEY = 'errors.auth.phoneTaken';

/** A failure whose violations belong on form fields: a 400, or the phone-taken 409. */
export function isFieldViolationError(error: ApiError | null): boolean {
  if (!error) return false;
  return error.kind === 'validation' || error.messageKey === PHONE_TAKEN_ERROR_KEY;
}

/**
 * `fieldAliases` maps an API field name onto the form field that edits it,
 * for a form that holds the value in another shape (a quiz's time limit is
 * `timeLimitSeconds` on the wire and `timeLimitMinutes` in the form). An
 * unmapped name is used as-is.
 */
export function useServerValidation<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null,
  fieldAliases?: Readonly<Record<string, Path<TValues>>>
): void {
  const { t } = useTranslation();
  // Read through a ref: callers may pass an inline object, and a changed
  // object must not re-apply the same server errors on every render.
  const aliases = useRef(fieldAliases);
  aliases.current = fieldAliases;

  useEffect(() => {
    if (!error || !error.violations || !isFieldViolationError(error)) {
      return;
    }

    // Resolved to its final, interpolated text here (not left as a bare
    // key) because a violation's `values` (e.g. `{ count: 2 }`) has
    // nowhere else to travel to — React Hook Form's error object only
    // carries a plain `message` string, and the backend has no way to
    // know the frontend's translated field label, so a humanized version
    // of the raw field name fills the `{{field}}` placeholder every
    // `validation:*` message uses.
    error.violations.forEach((violation: FieldViolation) => {
      const message = t(violation.messageKey, {
        field: humanizeFieldName(violation.field),
        ...violation.values,
      });
      const field =
        aliases.current?.[violation.field] ??
        (violation.field as Path<TValues>);
      form.setError(field, {
        type: 'server',
        message,
      });
    });
  }, [error, form, t]);
}
