/**
 * B1 (UX audit) — how a form explains a failed save.
 *
 * One message per failure, never two:
 *   - a violation the form can show beside its field is shown THERE only;
 *   - anything else is one inline alert with the real reason, and the
 *     mutation is marked `inlineErrors` so no toast repeats it.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { resolveValidationMessage } from './form.utils';
import { useErrorText } from '@hooks';
import { errorMessageKey } from '@services';
import type { ApiError } from '@api';

/** `profile:errors.firstNameRequired`, `validation:maxLength|{"count":100}`. */
const TRANSLATION_KEY = /^[A-Za-z]+:[\w.-]+(\|.*)?$/;

/**
 * The text of a field's error. Schema messages are keys (possibly packed
 * with their numbers); a server message may arrive already translated —
 * `useServerValidation` and the W4 name clash resolve theirs — and is shown
 * as-is. `label` fills `{{field}}`.
 */
export function fieldErrorText(
  t: TFunction,
  message: string | undefined,
  label: string
): string | undefined {
  if (!message) return undefined;
  if (!TRANSLATION_KEY.test(message)) return message;
  return resolveValidationMessage(message, t, { field: label });
}

/**
 * `useServerValidation` fills `{{field}}` with the API's field name
 * ("Name", in English, on the Arabic page too). The form knows the label,
 * so it rides on the violation's own `values`, which win.
 */
export function useLabelledViolations(
  error: ApiError | null,
  labelKeys: Readonly<Record<string, string>>
): ApiError | null {
  const { t } = useTranslation();
  const keys = JSON.stringify(labelKeys);
  return useMemo(() => {
    if (!error?.violations?.length) return error;
    const labels = JSON.parse(keys) as Record<string, string>;
    const violations = error.violations.map((violation) => {
      const labelKey = labels[violation.field];
      return labelKey
        ? {
            ...violation,
            values: { ...violation.values, field: t(labelKey) },
          }
        : violation;
    });
    // Same error (prototype, kind, key), only the violations relabelled.
    return Object.assign(
      Object.create(Object.getPrototypeOf(error) as object) as ApiError,
      error,
      { violations }
    );
  }, [error, keys, t]);
}

/** Whether a violation of this failure lands on one of the form's fields. */
export function hasViolationOn(
  error: ApiError | null,
  fields: Readonly<Record<string, string>>
): boolean {
  return Boolean(
    error?.violations?.some((violation) => violation.field in fields)
  );
}

/**
 * After a server refusal, focus moves to the first field it names (the
 * client-side check already does this on submit), so the person lands on
 * what needs fixing. `aliases` maps an API field onto the form's.
 */
export function useFocusFirstViolation<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null,
  fields: Readonly<Record<string, string>>,
  aliases: Readonly<Record<string, string>> = {}
): void {
  const { setFocus } = form;
  const keys = JSON.stringify([fields, aliases]);
  useEffect(() => {
    const [known, aliased] = JSON.parse(keys) as [
      Record<string, string>,
      Record<string, string>,
    ];
    const first = error?.violations?.find(
      (violation) => violation.field in known
    );
    if (!first) return;
    setFocus((aliased[first.field] ?? first.field) as Path<TValues>);
  }, [error, keys, setFocus]);
}

/**
 * The real reason a save failed, in words: the backend's own message when
 * the catalogue has it, else the failure kind's description — never an
 * empty box, a raw key or "Unexpected error" for a server error.
 */
export function useFailureReason(): (error: ApiError) => string {
  const { t } = useTranslation();
  const errorText = useErrorText();
  return useCallback(
    (error: ApiError) => {
      const first = error.violations?.[0];
      if (error.kind === 'validation' && first) {
        return errorText(first.messageKey, 'errors:validation.failed', {
          field: t('validation:thisField'),
          ...(first.values ?? {}),
        });
      }
      return errorText(error.messageKey, errorMessageKey(error.kind));
    },
    [errorText, t]
  );
}
