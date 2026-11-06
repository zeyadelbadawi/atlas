/**
 * B3 (UX audit) — how the course screens explain a failure, built on the
 * shared `@forms` helpers (B1). One message per failure:
 *   - a violation a form can show beside a field lands THERE, labelled in
 *     the page's language (V12 — never the API's English field name);
 *   - a taken web address (409) lands on the slug field (V13);
 *   - anything else is ONE inline `SaveFailedAlert` (forms) or ONE toast
 *     (row actions) with the real reason (V05/V06).
 */
import { useCallback, useEffect } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  hasViolationOn,
  useFailureReason,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import { useErrorText } from '@hooks';
import { toast } from '@/hooks/use-toast';
import { isApiError, type ApiError } from '@api';
import { normalizeUnknownError } from '@services';

/** `errors.course.slugTaken` — another course in this academy uses the address. */
export const COURSE_SLUG_TAKEN_KEY = 'errors.course.slugTaken';

/** The API's course fields → the label keys the forms show (V12). */
export const COURSE_FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'course:create.titleLabel',
  slug: 'course:create.slugLabel',
  shortDescription: 'course:create.shortDescriptionLabel',
  description: 'course:create.descriptionLabel',
  thumbnail: 'course:create.thumbnailLabel',
  visibility: 'course:create.visibilityLabel',
  level: 'course:edit.levelLabel',
  language: 'course:edit.languageLabel',
  outcomes: 'course:edit.outcomesLabel',
  requirements: 'course:edit.requirementsLabel',
  pricing: 'course:create.pricingTypeLabel',
  'pricing.type': 'course:create.pricingTypeLabel',
  'pricing.amount': 'course:create.priceLabel',
  'pricing.currency': 'course:create.currencyLabel',
  pricingType: 'course:create.pricingTypeLabel',
  pricingAmount: 'course:create.priceLabel',
  pricingCurrency: 'course:create.currencyLabel',
};

/** The API's nested pricing paths → the flat form fields (V07). */
export const COURSE_FIELD_ALIASES = {
  pricing: 'pricingType',
  'pricing.type': 'pricingType',
  'pricing.amount': 'pricingAmount',
  'pricing.currency': 'pricingCurrency',
} as const;

/** Whether this failure is the taken-slug conflict. */
export function isSlugTakenError(error: unknown): boolean {
  return isApiError(error) && error.messageKey === COURSE_SLUG_TAKEN_KEY;
}

/**
 * V13 — a taken web address is shown on the slug field (focused), not
 * only in a toast. Returns whether the error was placed there.
 */
export function useSlugTakenError<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null | undefined,
  slugField: Path<TValues> = 'slug' as Path<TValues>
): boolean {
  const errorText = useErrorText();
  const taken = isSlugTakenError(error);
  const { setError, setFocus } = form;
  useEffect(() => {
    if (!taken) return;
    setError(slugField, {
      type: 'server',
      message: errorText(COURSE_SLUG_TAKEN_KEY, 'errors:conflict.description'),
    });
    setFocus(slugField);
  }, [taken, error, errorText, setError, setFocus, slugField]);
  return taken;
}

/**
 * The fields of a form an API violation can land on: the label map's
 * keys, filtered to those the form renders (plus their API aliases).
 */
export function violationFields(
  formFields: readonly string[],
  aliases: Readonly<Record<string, string>> = COURSE_FIELD_ALIASES
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const field of formFields) fields[field] = field;
  for (const [apiField, formField] of Object.entries(aliases)) {
    if (formFields.includes(formField)) fields[apiField] = formField;
  }
  return fields;
}

/**
 * One toast for a failed row action (delete, publish, reorder…): a title
 * saying what did not happen and the real reason — never "Something went
 * wrong" over the reason, never a second toast (the hooks are inline).
 */
export function useActionFailureToast(): (
  titleKey: string,
  error: unknown,
  /** A sentence that follows the reason, e.g. "The previous order has been restored." */
  afterKey?: string
) => void {
  const { t } = useTranslation();
  const reason = useFailureReason();
  return useCallback(
    (titleKey: string, error: unknown, afterKey?: string) => {
      const apiError = normalizeUnknownError(error);
      if (apiError.kind === 'cancelled') return;
      toast({
        title: t(titleKey),
        description: afterKey
          ? `${reason(apiError)} ${t(afterKey)}`
          : reason(apiError),
        variant: 'destructive',
      });
    },
    [reason, t]
  );
}

/**
 * A dialog form's server feedback (V05/V12/V18): violations land on the
 * dialog's fields with translated labels and the first one takes focus;
 * the returned failure is the one inline alert for anything else. A
 * failure from an earlier opening is not shown again (the form's submit
 * count resets when the dialog reopens).
 */
export function useDialogServerFeedback<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiError | null | undefined,
  labels: Readonly<Record<string, string>>
): ApiError | null {
  const fields: Record<string, string> = {};
  for (const key of Object.keys(labels)) fields[key] = key;
  const labelled = useLabelledViolations(error ?? null, labels);
  useServerValidation(form, labelled);
  useFocusFirstViolation(form, labelled, fields);
  if (!error || form.formState.submitCount === 0) return null;
  return hasViolationOn(error, fields) ? null : error;
}
