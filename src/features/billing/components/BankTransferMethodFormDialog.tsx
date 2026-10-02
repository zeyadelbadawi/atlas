/**
 * Bank-transfer method form — Platform Owner (2 Oct 2026).
 *
 * One dialog for both "Add bank account" (`method` absent) and "Edit"
 * (`method` given). Every field starts from what the Platform Owner already
 * saved, or empty — never a sample or placeholder bank detail, because a
 * plausible-looking default is exactly the value that ends up in front of a
 * paying Organization by mistake.
 *
 * Client validation mirrors the backend DTO (`bankTransferMethodSchema`);
 * the server stays the authority, and its field violations are mapped back
 * onto the form with `useServerValidation`.
 *
 * The account holder and both instruction texts have an optional Arabic
 * version (`ManualMethodTextsFields`), shown to customers using Atlas in
 * Arabic; English stays required and is the fallback.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { toErrorsNamespaceKey } from '@utils';
import { isApiError } from '@api';
import type {
  BankTransferInstructionsPayload,
  PlatformPaymentMethod,
} from '@types';
import {
  useCreateBankTransferMethod,
  useUpdatePlatformPaymentMethod,
} from '../hooks';
import {
  bankTransferMethodSchema,
  type BankTransferMethodFormData,
} from '../schemas/billing.schemas';
import {
  ManualMethodTextsFields,
  PlaceholderDetailsNotice,
  toTextsFormValues,
  toTextsPayload,
  useManualMethodServerValidation,
} from './ManualMethodFormFields';

export interface BankTransferMethodFormDialogProps {
  readonly open: boolean;
  /** The method being edited; absent when adding a new bank account. */
  readonly method?: PlatformPaymentMethod;
  readonly onOpenChange: (open: boolean) => void;
}

const EMPTY_VALUES: BankTransferMethodFormData = {
  displayName: '',
  description: '',
  instructions: {
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    ...toTextsFormValues(undefined),
  },
};

/** The form's starting values: the saved method's own, or empty. */
function toFormValues(
  method: PlatformPaymentMethod | undefined
): BankTransferMethodFormData {
  const saved =
    method?.manualInstructions?.type === 'manual_bank_transfer'
      ? method.manualInstructions
      : undefined;
  if (!method) return EMPTY_VALUES;
  return {
    displayName: method.displayName,
    description: method.description ?? '',
    instructions: {
      bankName: saved?.bankName ?? '',
      // A placeholder's account number is not a real one: start it blank.
      accountNumber: saved?.placeholder ? '' : (saved?.accountNumber ?? ''),
      iban: saved?.iban ?? '',
      swiftCode: saved?.swiftCode ?? '',
      ...toTextsFormValues(saved),
    },
  };
}

/** The request's `instructions`: optional codes omitted when blank. */
function toInstructionsPayload(
  values: BankTransferMethodFormData['instructions']
): BankTransferInstructionsPayload {
  return {
    bankName: values.bankName,
    accountNumber: values.accountNumber,
    ...(values.iban ? { iban: values.iban } : {}),
    ...(values.swiftCode ? { swiftCode: values.swiftCode } : {}),
    ...toTextsPayload(values),
  };
}

type TextFieldName =
  | 'displayName'
  | 'instructions.bankName'
  | 'instructions.accountNumber'
  | 'instructions.iban'
  | 'instructions.swiftCode';

type LongTextFieldName = 'description';

export function BankTransferMethodFormDialog({
  open,
  method,
  onOpenChange,
}: BankTransferMethodFormDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const isEdit = method !== undefined;

  const createMethod = useCreateBankTransferMethod();
  const updateMethod = useUpdatePlatformPaymentMethod();
  const activeMutation = isEdit ? updateMethod : createMethod;

  const form = useForm<BankTransferMethodFormData>({
    resolver: zodResolver(bankTransferMethodSchema),
    defaultValues: toFormValues(method),
  });

  useManualMethodServerValidation(form, activeMutation.error, 'instructions');

  // Re-seed on every open, so one method's details never carry into
  // another's editor (or into a new bank account).
  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(method));
  }, [open, method, reset]);

  const errorDescription = (error: unknown): string | undefined => {
    if (!isApiError(error)) return undefined;
    const key = toErrorsNamespaceKey(error.messageKey);
    return i18n.exists(key) ? t(key) : undefined;
  };

  const onSubmit = async (values: BankTransferMethodFormData) => {
    const instructions = toInstructionsPayload(values.instructions);
    try {
      if (method) {
        await updateMethod.mutateAsync({
          methodId: method.id,
          payload: {
            displayName: values.displayName,
            // Sent even when empty: clearing the description is an edit.
            description: values.description,
            instructions,
          },
        });
        toast({ title: t('payments:bankTransferMethods.updateSuccess') });
      } else {
        await createMethod.mutateAsync({
          displayName: values.displayName,
          ...(values.description ? { description: values.description } : {}),
          instructions,
        });
        toast({ title: t('payments:bankTransferMethods.createSuccess') });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t(
          method
            ? 'payments:bankTransferMethods.updateError'
            : 'payments:bankTransferMethods.createError'
        ),
        description: errorDescription(error),
        variant: 'destructive',
      });
    }
  };

  const renderTextField = (
    name: TextFieldName,
    labelKey: string,
    options?: { ltr?: boolean; helpKey?: string; testId?: string }
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Input
              {...field}
              dir={options?.ltr ? 'ltr' : 'auto'}
              autoComplete="off"
              data-testid={options?.testId}
            />
          </FormControl>
          {options?.helpKey ? (
            <FormDescription>{t(options.helpKey)}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderLongTextField = (
    name: LongTextFieldName,
    labelKey: string,
    options?: { helpKey?: string; testId?: string; rows?: number }
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t(labelKey)}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              dir="auto"
              rows={options?.rows ?? 3}
              data-testid={options?.testId}
            />
          </FormControl>
          {options?.helpKey ? (
            <FormDescription>{t(options.helpKey)}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? 'payments:bankTransferMethods.editTitle'
                : 'payments:bankTransferMethods.createTitle'
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              isEdit
                ? 'payments:bankTransferMethods.editDescription'
                : 'payments:bankTransferMethods.createDescription'
            )}
          </DialogDescription>
        </DialogHeader>

        {method?.manualInstructions?.placeholder ? (
          <PlaceholderDetailsNotice testId="bank-method-placeholder-notice" />
        ) : null}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            data-testid="bank-method-form"
          >
            {renderTextField(
              'displayName',
              'payments:bankTransferMethods.fields.displayName',
              {
                helpKey: 'payments:bankTransferMethods.fields.displayNameHelp',
                testId: 'bank-method-display-name',
              }
            )}
            {renderLongTextField(
              'description',
              'payments:bankTransferMethods.fields.description',
              { rows: 2, testId: 'bank-method-description' }
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {renderTextField(
                'instructions.bankName',
                'payments:bankTransferMethods.fields.bankName',
                { testId: 'bank-method-bank-name' }
              )}
              {renderTextField(
                'instructions.accountNumber',
                'payments:bankTransferMethods.fields.accountNumber',
                { ltr: true, testId: 'bank-method-account-number' }
              )}
              {renderTextField(
                'instructions.iban',
                'payments:bankTransferMethods.fields.iban',
                {
                  ltr: true,
                  helpKey: 'payments:bankTransferMethods.fields.optional',
                  testId: 'bank-method-iban',
                }
              )}
              {renderTextField(
                'instructions.swiftCode',
                'payments:bankTransferMethods.fields.swiftCode',
                {
                  ltr: true,
                  helpKey: 'payments:bankTransferMethods.fields.optional',
                  testId: 'bank-method-swift',
                }
              )}
            </div>
            <ManualMethodTextsFields
              control={form.control}
              section="bankTransferMethods"
              testIdPrefix="bank-method"
            />

            {!isEdit ? (
              <p className="text-xs text-muted-foreground">
                {t('payments:bankTransferMethods.createdDisabledNote')}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={activeMutation.isPending}
                onClick={() => onOpenChange(false)}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="bank-method-save"
                disabled={activeMutation.isPending}
              >
                {activeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('common:actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
