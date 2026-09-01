/**
 * useServerValidation hook.
 *
 * Maps backend validation errors to form field errors. Use this when a mutation
 * fails with validation violations.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form';
import type { FieldViolation } from '@types';
import type { ApiError } from '@api';
import { humanizeFieldName } from '@utils';

export function useServerValidation<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null
): void {
  const { t } = useTranslation();

  useEffect(() => {
    if (!error || error.kind !== 'validation' || !error.violations) {
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
      form.setError(violation.field as Path<TValues>, {
        type: 'server',
        message,
      });
    });
  }, [error, form, t]);
}