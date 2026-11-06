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
import {
  displayableErrorKey,
  humanizeFieldName,
  isTranslatedString,
  toErrorsNamespaceKey,
} from '@utils';

/**
 * "This phone number is already in use" (409) carries a `phoneNumber`
 * violation like a 400 does, so it is shown on the field, never as a
 * generic conflict card. It never says whose number it is.
 */
export const PHONE_TAKEN_ERROR_KEY = 'errors.auth.phoneTaken';

/** A failure whose violations belong on form fields: a 400, or the phone-taken 409. */
export function isFieldViolationError(error: ApiError | null): boolean {
  if (!error) return false;
  return (
    error.kind === 'validation' || error.messageKey === PHONE_TAKEN_ERROR_KEY
  );
}

/**
 * `fieldAliases` maps an API field name onto the form field that edits it,
 * for a form that holds the value in another shape (a quiz's time limit is
 * `timeLimitSeconds` on the wire and `timeLimitMinutes` in the form). An
 * unmapped name is used as-is.
 */
/** `{{count}}` left in a resolved message: a value it needs was not provided. */
export function hasUnfilledPlaceholder(text: string): boolean {
  return /\{\{\s*[\w.]+\s*\}\}/.test(text);
}

/**
 * What `{{field}}` reads for a server violation the form didn't label.
 * B2 (UX audit): `question.en` read "En must be…", and an Arabic page got
 * the API's English field name. The language and list-index segments are
 * dropped, and a non-English page says "this field" instead of English.
 */
export function serverFieldLabel(
  field: string,
  language: string | undefined,
  t: (key: string) => string
): string {
  if (!language?.startsWith('en')) return t('validation:thisField');
  const segments = field
    .split('.')
    .filter((segment) => !/^(en|ar|\d+)$/.test(segment));
  return segments.length > 0
    ? humanizeFieldName(segments.join('.'))
    : t('validation:thisField');
}

export function useServerValidation<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null,
  fieldAliases?: Readonly<Record<string, Path<TValues>>>
): void {
  const { t, i18n } = useTranslation();
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
      // B1 (V44) — a key this build doesn't translate falls back to a
      // generic field message instead of reaching the screen raw.
      // B3 (UX audit) — dotted backend keys (`errors.course.slugTaken`)
      // resolve in the `errors` namespace, and an object key renders its
      // description, as `useErrorText` does.
      const messageKey =
        displayableErrorKey(toErrorsNamespaceKey(violation.messageKey), (key) =>
          isTranslatedString(i18n, key)
        ) ?? 'errors:validation.field';
      const resolved = t(messageKey, {
        field: serverFieldLabel(violation.field, i18n.language, t),
        ...violation.values,
      });
      // B2 (UX audit) — a message whose numbers the server didn't send
      // ("must be {{count}} characters or fewer") falls back to the generic
      // field message instead of showing the placeholder.
      const message = hasUnfilledPlaceholder(resolved)
        ? t('errors:validation.field')
        : resolved;
      const field =
        aliases.current?.[violation.field] ??
        (violation.field as Path<TValues>);
      form.setError(field, {
        type: 'server',
        message,
      });
    });
  }, [error, form, t, i18n]);
}
