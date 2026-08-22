/**
 * useServerValidation hook.
 *
 * Maps backend validation errors to form field errors. Use this when a mutation
 * fails with validation violations.
 */
import { useEffect } from 'react';
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form';
import type { FieldViolation } from '@types';
import type { ApiError } from '@api';

export function useServerValidation<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null
): void {
  useEffect(() => {
    if (!error || error.kind !== 'validation' || !error.violations) {
      return;
    }

    // Map each violation to its field.
    error.violations.forEach((violation: FieldViolation) => {
      form.setError(violation.field as Path<TValues>, {
        type: 'server',
        message: violation.messageKey,
      });
    });
  }, [error, form]);
}