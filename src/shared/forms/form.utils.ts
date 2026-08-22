/**
 * Form helpers.
 *
 * Bridges backend validation failures into React Hook Form, so a server-side
 * rejection lands on the field that caused it instead of surfacing as an opaque
 * page-level error.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@services';
import type { NormalizedApiError } from '@types';

/**
 * Applies backend field violations to a form.
 *
 * @returns True when at least one violation was mapped to a field, letting the
 * caller decide whether a page-level message is still required.
 */
export function applyServerViolations<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>
): boolean {
  if (!isApiError(error)) return false;

  const violations = (error as NormalizedApiError).violations;
  if (!violations || violations.length === 0) return false;

  for (const violation of violations) {
    setError(violation.field as Path<TValues>, {
      type: 'server',
      message: violation.messageKey,
    });
  }

  return true;
}

/**
 * Resolves a validation message.
 *
 * Messages are stored as translation keys. A value that is not a key is passed
 * through unchanged so third-party messages never render as a raw key.
 */
export function resolveValidationMessage(
  message: string | undefined,
  translate: (key: string, values?: Record<string, string | number>) => string,
  values?: Record<string, string | number>
): string | undefined {
  if (!message) return undefined;
  return message.includes(':') ? translate(message, values ?? {}) : message;
}