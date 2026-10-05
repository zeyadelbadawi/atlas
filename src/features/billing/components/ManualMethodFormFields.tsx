/**
 * Form building blocks shared by the three manual-method dialogs (bank
 * transfer, e-wallet, InstaPay), so a field looks, validates and reads
 * the same in each.
 *
 * Every customer-facing text has a required English version and an
 * optional Arabic one (`…Ar`); Arabic inputs are `dir="rtl"` / `lang="ar"`
 * regardless of the console's own language, and sit beside their English
 * counterpart on wide screens (a logical grid, so it mirrors in RTL).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Control,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useServerValidation } from '@forms';
import { ApiError, isApiError } from '@api';
import type { ManualInstructionTexts } from '@types';

type Direction = 'ltr' | 'rtl' | 'auto';

/** Warning-toned alert classes — the design system's warning tokens on the shared `Alert`. */
export const WARNING_ALERT_CLASS =
  'border-warning/50 bg-warning-surface text-foreground [&>svg]:text-warning';

/**
 * Shown in an Edit dialog for a seeded placeholder method: its details are
 * not real, and saving the form replaces them (the server then clears the
 * placeholder flag). The destination field starts blank for that reason.
 */
export function PlaceholderDetailsNotice({
  testId,
}: {
  readonly testId?: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <Alert className={WARNING_ALERT_CLASS} data-testid={testId}>
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>{t('payments:manualMethods.placeholderBadge')}</AlertTitle>
      <AlertDescription>
        {t('payments:manualMethods.placeholderEditNotice')}
      </AlertDescription>
    </Alert>
  );
}

interface MethodFieldProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly name: FieldPath<T>;
  readonly labelKey: string;
  readonly helpKey?: string;
  readonly testId?: string;
  readonly dir?: Direction;
  /** Arabic inputs carry `lang="ar"` as well as `dir="rtl"`. */
  readonly lang?: string;
  readonly inputMode?: 'text' | 'tel' | 'email';
}

export function MethodTextField<T extends FieldValues>({
  control,
  name,
  labelKey,
  helpKey,
  testId,
  dir = 'auto',
  lang,
  inputMode,
}: MethodFieldProps<T>): JSX.Element {
  const { t } = useTranslation();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={(field.value as string | undefined) ?? ''}
              dir={dir}
              lang={lang}
              inputMode={inputMode}
              autoComplete="off"
              data-testid={testId}
            />
          </FormControl>
          {helpKey ? <FormDescription>{t(helpKey)}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function MethodLongTextField<T extends FieldValues>({
  control,
  name,
  labelKey,
  helpKey,
  testId,
  dir = 'auto',
  lang,
  rows = 3,
}: Omit<MethodFieldProps<T>, 'inputMode'> & {
  readonly rows?: number;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={(field.value as string | undefined) ?? ''}
              dir={dir}
              lang={lang}
              rows={rows}
              data-testid={testId}
            />
          </FormControl>
          {helpKey ? <FormDescription>{t(helpKey)}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** The `payments:` section whose labels/help a dialog uses. */
export type ManualMethodSection =
  'bankTransferMethods' | 'walletMethods' | 'instapayMethods';

interface ManualMethodTextsFieldsProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly section: ManualMethodSection;
  /** e.g. `wallet-method` → `wallet-method-account-name`, `…-account-name-ar`. */
  readonly testIdPrefix: string;
  /** Leave out the account holder when the dialog places it itself. */
  readonly includeAccountName?: boolean;
  /** Where the details live in the form; `instructions` like every request body. */
  readonly pathPrefix?: string;
}

/**
 * Account holder, transfer instructions and reference instructions —
 * English (required) beside Arabic (optional). Field paths are nested
 * under `instructions`, like every manual-method request body.
 */
export function ManualMethodTextsFields<T extends FieldValues>({
  control,
  section,
  testIdPrefix,
  includeAccountName = true,
  pathPrefix = 'instructions',
}: ManualMethodTextsFieldsProps<T>): JSX.Element {
  const path = (name: string) => `${pathPrefix}.${name}` as FieldPath<T>;
  const arabicHelp = 'payments:manualMethods.fields.arabicHelp';
  return (
    <>
      {includeAccountName ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <MethodTextField
            control={control}
            name={path('accountName')}
            labelKey={`payments:${section}.fields.accountName`}
            testId={`${testIdPrefix}-account-name`}
          />
          <MethodTextField
            control={control}
            name={path('accountNameAr')}
            labelKey="payments:manualMethods.fields.accountNameAr"
            helpKey={arabicHelp}
            dir="rtl"
            lang="ar"
            testId={`${testIdPrefix}-account-name-ar`}
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodLongTextField
          control={control}
          name={path('instructions')}
          labelKey={`payments:${section}.fields.instructions`}
          helpKey={`payments:${section}.fields.instructionsHelp`}
          testId={`${testIdPrefix}-instructions`}
        />
        <MethodLongTextField
          control={control}
          name={path('instructionsAr')}
          labelKey="payments:manualMethods.fields.instructionsAr"
          helpKey={arabicHelp}
          dir="rtl"
          lang="ar"
          testId={`${testIdPrefix}-instructions-ar`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodLongTextField
          control={control}
          name={path('referenceInstructions')}
          labelKey={`payments:${section}.fields.referenceInstructions`}
          helpKey={`payments:${section}.fields.referenceInstructionsHelp`}
          rows={2}
          testId={`${testIdPrefix}-reference-instructions`}
        />
        <MethodLongTextField
          control={control}
          name={path('referenceInstructionsAr')}
          labelKey="payments:manualMethods.fields.referenceInstructionsAr"
          helpKey={arabicHelp}
          dir="rtl"
          lang="ar"
          rows={2}
          testId={`${testIdPrefix}-reference-instructions-ar`}
        />
      </div>
    </>
  );
}

/** The form's text values, as every manual-method form holds them. */
export interface ManualMethodTextsFormValues {
  readonly accountName: string;
  readonly accountNameAr: string;
  readonly instructions: string;
  readonly instructionsAr: string;
  readonly referenceInstructions: string;
  readonly referenceInstructionsAr: string;
}

/** A saved method's texts as form values (blank when absent). */
export function toTextsFormValues(
  saved: Partial<ManualInstructionTexts> | undefined
): ManualMethodTextsFormValues {
  return {
    accountName: saved?.accountName ?? '',
    accountNameAr: saved?.accountNameAr ?? '',
    instructions: saved?.instructions ?? '',
    instructionsAr: saved?.instructionsAr ?? '',
    referenceInstructions: saved?.referenceInstructions ?? '',
    referenceInstructionsAr: saved?.referenceInstructionsAr ?? '',
  };
}

/**
 * The texts as sent: English always, each Arabic text only when entered.
 * Details replace the whole saved object, so leaving an Arabic text out
 * clears it — exactly what blanking the field means.
 */
export function toTextsPayload(
  values: ManualMethodTextsFormValues
): Omit<ManualInstructionTexts, 'placeholder'> {
  return {
    accountName: values.accountName,
    ...(values.accountNameAr ? { accountNameAr: values.accountNameAr } : {}),
    instructions: values.instructions,
    ...(values.instructionsAr ? { instructionsAr: values.instructionsAr } : {}),
    referenceInstructions: values.referenceInstructions,
    ...(values.referenceInstructionsAr
      ? { referenceInstructionsAr: values.referenceInstructionsAr }
      : {}),
  };
}

/**
 * `useServerValidation` for a manual-method form. An edit sends a wallet's
 * details as `walletInstructions` (InstaPay: `instapayInstructions`), so
 * the server reports `walletInstructions.walletNumber`; the form holds
 * every kind's details under `instructions`, and this maps the one onto
 * the other so the message lands on the right field.
 */
export function useManualMethodServerValidation<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ApiError | null,
  detailsKey: 'instructions' | 'walletInstructions' | 'instapayInstructions'
): void {
  const mapped = useMemo<ApiError | null>(() => {
    if (!error || !isApiError(error) || !error.violations) return error;
    if (detailsKey === 'instructions') return error;
    const prefix = `${detailsKey}.`;
    return new ApiError({
      kind: error.kind,
      messageKey: error.messageKey,
      code: error.code,
      status: error.status,
      details: error.details,
      requestId: error.requestId,
      retryable: error.retryable,
      violations: error.violations.map((violation) =>
        violation.field.startsWith(prefix)
          ? {
              ...violation,
              field: `instructions.${violation.field.slice(prefix.length)}`,
            }
          : violation
      ),
    });
  }, [error, detailsKey]);
  useServerValidation(form, mapped);
}
