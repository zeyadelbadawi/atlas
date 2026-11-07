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
import { useCallback, useMemo } from 'react';
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
import { SaveFailedAlert, useServerValidation } from '@forms';
import { useDirtyGuard } from '@features/unsaved-changes';
import { ApiError, isApiError } from '@api';
import type { ManualInstructionTexts, PlatformPaymentMethod } from '@types';

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
  /** Marks an intentionally left-to-right value (with `dir="ltr"`). */
  readonly 'data-ltr-content'?: boolean;
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
  'data-ltr-content': ltrContent,
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
              data-ltr-content={ltrContent}
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
  maxLength,
  'data-ltr-content': ltrContent,
}: Omit<MethodFieldProps<T>, 'inputMode'> & {
  readonly rows?: number;
  /** B4 (UX audit) V14 — shows "120 / 2000 characters" so the limit is known before it is hit. */
  readonly maxLength?: number;
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
              data-ltr-content={ltrContent}
              lang={lang}
              rows={rows}
              data-testid={testId}
            />
          </FormControl>
          {helpKey ? <FormDescription>{t(helpKey)}</FormDescription> : null}
          {maxLength ? (
            <p
              className={
                ((field.value as string | undefined) ?? '').trim().length >
                maxLength
                  ? 'text-xs font-medium tabular-nums text-destructive'
                  : 'text-xs tabular-nums text-muted-foreground'
              }
              data-testid={testId ? `${testId}-count` : undefined}
            >
              {t('common:form.characterCount', {
                count: ((field.value as string | undefined) ?? '').trim()
                  .length,
                max: maxLength,
              })}
            </p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** `ManualMethodTextsDto`: instructions 2000, reference instructions 1000. */
export const MANUAL_METHOD_INSTRUCTIONS_MAX = 2000;
export const MANUAL_METHOD_REFERENCE_MAX = 1000;

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
  /**
   * B0-CPY-21 — who reads these instructions: an organization paying its
   * Atlas subscription (default) or a learner paying an academy for a
   * course. Only the help texts change.
   */
  readonly audience?: ManualMethodAudience;
}

/** Who pays with the method being edited. */
export type ManualMethodAudience = 'organization' | 'learner';

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
  audience = 'organization',
}: ManualMethodTextsFieldsProps<T>): JSX.Element {
  const path = (name: string) => `${pathPrefix}.${name}` as FieldPath<T>;
  const suffix = audience === 'learner' ? 'Learner' : '';
  const arabicHelp = `payments:manualMethods.fields.arabicHelp${suffix}`;
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
          helpKey={`payments:${section}.fields.instructionsHelp${suffix}`}
          maxLength={MANUAL_METHOD_INSTRUCTIONS_MAX}
          testId={`${testIdPrefix}-instructions`}
        />
        <MethodLongTextField
          control={control}
          name={path('instructionsAr')}
          labelKey="payments:manualMethods.fields.instructionsAr"
          helpKey={arabicHelp}
          dir="rtl"
          lang="ar"
          maxLength={MANUAL_METHOD_INSTRUCTIONS_MAX}
          testId={`${testIdPrefix}-instructions-ar`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodLongTextField
          control={control}
          name={path('referenceInstructions')}
          labelKey={`payments:${section}.fields.referenceInstructions`}
          helpKey={`payments:${section}.fields.referenceInstructionsHelp${suffix}`}
          rows={2}
          maxLength={MANUAL_METHOD_REFERENCE_MAX}
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
          maxLength={MANUAL_METHOD_REFERENCE_MAX}
          testId={`${testIdPrefix}-reference-instructions-ar`}
        />
      </div>
    </>
  );
}

/**
 * B5/B8 (UX audit) — the method's name and short description as customers
 * see them at checkout: English (required name, optional description)
 * beside an optional Arabic version of each (`displayNameAr`,
 * `descriptionAr`), shown instead of the English text on Arabic pages.
 */
export function MethodNameFields<T extends FieldValues>({
  control,
  section,
  testIdPrefix,
}: {
  readonly control: Control<T>;
  readonly section: ManualMethodSection;
  readonly testIdPrefix: string;
}): JSX.Element {
  const field = (name: string) => name as FieldPath<T>;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodTextField
          control={control}
          name={field('displayName')}
          labelKey={`payments:${section}.fields.displayName`}
          helpKey="payments:bankTransferMethods.fields.displayNameHelp"
          testId={`${testIdPrefix}-display-name`}
        />
        <MethodTextField
          control={control}
          name={field('displayNameAr')}
          labelKey="payments:manualMethods.fields.displayNameAr"
          helpKey="payments:manualMethods.fields.arabicHelp"
          dir="rtl"
          lang="ar"
          testId={`${testIdPrefix}-display-name-ar`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodLongTextField
          control={control}
          name={field('description')}
          labelKey="payments:bankTransferMethods.fields.description"
          rows={2}
          testId={`${testIdPrefix}-description`}
        />
        <MethodLongTextField
          control={control}
          name={field('descriptionAr')}
          labelKey="payments:manualMethods.fields.descriptionAr"
          helpKey="payments:manualMethods.fields.arabicHelp"
          dir="rtl"
          lang="ar"
          rows={2}
          testId={`${testIdPrefix}-description-ar`}
        />
      </div>
    </>
  );
}

/** A saved method's name and description (both languages) as form values. */
export function toNameFormValues(
  method:
    | Pick<
        PlatformPaymentMethod,
        'displayName' | 'description' | 'displayNameAr' | 'descriptionAr'
      >
    | undefined
): {
  displayName: string;
  description: string;
  displayNameAr: string;
  descriptionAr: string;
} {
  return {
    displayName: method?.displayName ?? '',
    description: method?.description ?? '',
    displayNameAr: method?.displayNameAr ?? '',
    descriptionAr: method?.descriptionAr ?? '',
  };
}

/**
 * The name and description as sent. A new method sends only what was
 * entered; an edit sends every field, because an empty one clears it (the
 * English text then shows in Arabic too).
 */
export function toNamePayload(
  values: {
    readonly displayName: string;
    readonly description: string;
    readonly displayNameAr: string;
    readonly descriptionAr: string;
  },
  isEdit: boolean
): {
  displayName: string;
  description?: string;
  displayNameAr?: string;
  descriptionAr?: string;
} {
  if (isEdit) {
    return {
      displayName: values.displayName,
      description: values.description,
      displayNameAr: values.displayNameAr,
      descriptionAr: values.descriptionAr,
    };
  }
  return {
    displayName: values.displayName,
    ...(values.description ? { description: values.description } : {}),
    ...(values.displayNameAr ? { displayNameAr: values.displayNameAr } : {}),
    ...(values.descriptionAr ? { descriptionAr: values.descriptionAr } : {}),
  };
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

/** Every leaf path of the form's values (`instructions.iban`, …). */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return prefix ? [prefix] : [];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

/** The request's details object, as the server names it, per method type. */
const DETAILS_PREFIXES = [
  'instructions.',
  'walletInstructions.',
  'instapayInstructions.',
];

/**
 * B8 (UX audit) V06/V15 — the ONE message a failed save shows. A violation
 * that `useManualMethodServerValidation` put on a field is said there only
 * (no toast repeats it); anything else — a 409, a server error, a lost
 * connection — is one inline alert with the real reason, and the dialog
 * stays open with everything typed.
 */
export function ManualMethodSaveFailure<T extends FieldValues>({
  form,
  error,
  titleKey,
}: {
  readonly form: UseFormReturn<T>;
  readonly error: ApiError | null;
  readonly titleKey: string;
}): JSX.Element | null {
  if (!error || error.kind === 'cancelled') return null;
  const fields = new Set(leafPaths(form.getValues()));
  const onField = (field: string): boolean => {
    if (fields.has(field)) return true;
    const prefix = DETAILS_PREFIXES.find((p) => field.startsWith(p));
    return prefix
      ? fields.has(`instructions.${field.slice(prefix.length)}`)
      : false;
  };
  const violations = error.violations ?? [];
  if (
    error.kind === 'validation' &&
    violations.length > 0 &&
    violations.every((violation) => onField(violation.field))
  )
    return null;
  return <SaveFailedAlert error={error} titleKey={titleKey} />;
}

/**
 * B8 (UX audit) V15 — Escape, the X, an outside click and Cancel ask
 * before discarding typed details (`useDirtyGuard`); a clean form closes
 * at once.
 */
export function useGuardedDialogClose(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void
): (open: boolean) => void {
  const guard = useDirtyGuard(isDirty);
  return useCallback(
    (open: boolean) => {
      if (open) onOpenChange(true);
      else void guard.requestClose(() => onOpenChange(false));
    },
    [guard, onOpenChange]
  );
}
