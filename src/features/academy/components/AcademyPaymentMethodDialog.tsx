/**
 * Set up or edit ONE of the academy's own payment methods (Academy Manual
 * Payments) — the bank account, InstaPay address or mobile wallet the
 * academy's learners pay to, with the instructions they are shown.
 *
 * Every field starts from what the owner saved, or empty — never a sample
 * value, because a plausible-looking default is exactly what ends up in
 * front of a paying learner by mistake. Client validation mirrors the
 * backend DTO; the server stays the authority and its field violations are
 * mapped back onto the form.
 *
 * Saving a NEW method also turns it on (that is why the owner opened it);
 * saving an existing one keeps its current on/off state.
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
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@app/providers';
import { useDirtyGuard } from '@features/unsaved-changes';
import { FormErrorSummary, SaveFailedAlert } from '@forms';
import { ApiError } from '@api';
import {
  BankTransferDetailsFields,
  InstapayDetailsFields,
  WalletDetailsFields,
  academyBankTransferMethodSchema,
  academyInstapayMethodSchema,
  academyWalletMethodSchema,
  toBankTransferDetailsFormValues,
  toBankTransferDetailsPayload,
  toInstapayDetailsFormValues,
  toInstapayDetailsPayload,
  toWalletDetailsFormValues,
  toWalletDetailsPayload,
  useManualMethodServerValidation,
  type BankTransferDetailsFormData,
  type InstapayDetailsFormData,
  type WalletDetailsFormData,
} from '@features/billing';
import type {
  AcademyPaymentMethod,
  AcademyPaymentMethodType,
  SaveAcademyPaymentMethodPayload,
} from '@types';
import { useSaveAcademyPaymentMethod } from '../hooks';

type DetailsFormData =
  BankTransferDetailsFormData | InstapayDetailsFormData | WalletDetailsFormData;

interface FormValues {
  readonly instructions: DetailsFormData;
}

const SCHEMAS = {
  manual_bank_transfer: academyBankTransferMethodSchema,
  manual_instapay: academyInstapayMethodSchema,
  manual_wallet_transfer: academyWalletMethodSchema,
} as const;

function toFormValues(
  type: AcademyPaymentMethodType,
  saved: AcademyPaymentMethod | undefined
): FormValues {
  const instructions = saved?.instructions;
  switch (type) {
    case 'manual_bank_transfer':
      return { instructions: toBankTransferDetailsFormValues(instructions) };
    case 'manual_instapay':
      return { instructions: toInstapayDetailsFormValues(instructions) };
    case 'manual_wallet_transfer':
      return { instructions: toWalletDetailsFormValues(instructions) };
  }
}

function toPayload(
  type: AcademyPaymentMethodType,
  values: FormValues,
  enabled: boolean
): SaveAcademyPaymentMethodPayload {
  switch (type) {
    case 'manual_bank_transfer':
      return {
        type,
        enabled,
        instructions: toBankTransferDetailsPayload(
          values.instructions as BankTransferDetailsFormData
        ),
      };
    case 'manual_instapay':
      return {
        type,
        enabled,
        instructions: toInstapayDetailsPayload(
          values.instructions as InstapayDetailsFormData
        ),
      };
    case 'manual_wallet_transfer':
      return {
        type,
        enabled,
        instructions: toWalletDetailsPayload(
          values.instructions as WalletDetailsFormData
        ),
      };
  }
}

/** Field → label key, for the error summary (paths under `instructions`). */
function methodFieldLabels(
  type: AcademyPaymentMethodType
): Readonly<Record<string, string>> {
  const section =
    type === 'manual_bank_transfer'
      ? 'bankTransferMethods'
      : type === 'manual_instapay'
        ? 'instapayMethods'
        : 'walletMethods';
  const entries: Record<string, string> = {
    bankName: 'payments:bankTransferMethods.fields.bankName',
    branchName: 'payments:academyMethods.fields.branchName',
    accountNumber: 'payments:bankTransferMethods.fields.accountNumber',
    iban: 'payments:bankTransferMethods.fields.iban',
    swiftCode: 'payments:bankTransferMethods.fields.swiftCode',
    instapayAddress: 'payments:instapayMethods.fields.instapayAddress',
    walletProviderName: 'payments:walletMethods.fields.walletProviderName',
    walletProvider: 'payments:walletMethods.fields.walletProvider',
    walletNumber: 'payments:walletMethods.fields.walletNumber',
    accountName: `payments:${section}.fields.accountName`,
    accountNameAr: 'payments:manualMethods.fields.accountNameAr',
    instructions: `payments:${section}.fields.instructions`,
    instructionsAr: 'payments:manualMethods.fields.instructionsAr',
    referenceInstructions: `payments:${section}.fields.referenceInstructions`,
    referenceInstructionsAr:
      'payments:manualMethods.fields.referenceInstructionsAr',
  };
  return Object.fromEntries(
    Object.entries(entries).map(([field, key]) => [`instructions.${field}`, key])
  );
}

/**
 * Only the violations this form can show beside a field (`instructions.*`);
 * one on anything else (`enabled`, `type`) is not dropped — the whole
 * failure is then the inline alert instead.
 */
function fieldViolationsOnly(error: ApiError | null): ApiError | null {
  if (!error?.violations) return error;
  const onFields = error.violations.filter((violation) =>
    violation.field.startsWith('instructions.')
  );
  return onFields.length === error.violations.length
    ? error
    : new ApiError({
        kind: error.kind,
        messageKey: error.messageKey,
        code: error.code,
        status: error.status,
        details: error.details,
        requestId: error.requestId,
        retryable: error.retryable,
        violations: onFields,
      });
}

export interface AcademyPaymentMethodDialogProps {
  readonly academyId: string;
  readonly type: AcademyPaymentMethodType | null;
  /** The saved method, when editing. */
  readonly method?: AcademyPaymentMethod;
  readonly onOpenChange: (open: boolean) => void;
}

export function AcademyPaymentMethodDialog({
  academyId,
  type,
  method,
  onOpenChange,
}: AcademyPaymentMethodDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess } = useToast();
  const save = useSaveAcademyPaymentMethod(academyId);
  const open = type !== null;
  const activeType: AcademyPaymentMethodType = type ?? 'manual_bank_transfer';

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMAS[activeType]),
    defaultValues: toFormValues(activeType, method),
  });
  // B4 (UX audit) V14 — field violations on their fields (and in the
  // summary); a refusal no field can show — another field, a 500, a lost
  // connection — is ONE alert inside the dialog, never a toast under it.
  const fieldError = fieldViolationsOnly(save.error);
  useManualMethodServerValidation(form, fieldError, 'instructions');
  const failure =
    save.error &&
    !(
      save.error.kind === 'validation' &&
      (fieldError?.violations?.length ?? 0) > 0 &&
      fieldError?.violations?.length === save.error.violations?.length
    )
      ? save.error
      : null;
  // V13 — closing with typed details (Escape, outside click, Cancel) asks first.
  const dirtyGuard = useDirtyGuard(open && form.formState.isDirty);
  const handleOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true);
    void dirtyGuard.requestClose(() => onOpenChange(false));
  };

  // Re-seed on every open, so one method's details never carry into another.
  const { reset } = form;
  useEffect(() => {
    if (open) {
      save.reset();
      reset(toFormValues(activeType, method));
    }
    // `save` is stable per academy; resetting it on open clears a previous error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeType, method, reset]);

  const methodName = t(`payments:common.methodType.${activeType}`);

  const onSubmit = async (values: FormValues) => {
    try {
      await save.mutateAsync(
        toPayload(activeType, values, method ? method.enabled : true)
      );
      notifySuccess('payments:academyMethods.savedToast', undefined, {
        method: methodName,
      });
      // Saved: nothing unsaved is left, so close without asking.
      reset(values);
      onOpenChange(false);
    } catch {
      // Shown by the form (fields, summary) or the inline alert below.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              method
                ? 'payments:academyMethods.editTitle'
                : 'payments:academyMethods.setUpTitle',
              { method: methodName }
            )}
          </DialogTitle>
          <DialogDescription>
            {t('payments:academyMethods.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            data-testid="academy-method-form"
          >
            <FormErrorSummary
              form={form}
              fieldLabels={methodFieldLabels(activeType)}
            />
            {activeType === 'manual_bank_transfer' ? (
              <BankTransferDetailsFields
                control={form.control}
                testIdPrefix="academy-bank"
              />
            ) : activeType === 'manual_instapay' ? (
              <InstapayDetailsFields
                control={form.control}
                testIdPrefix="academy-instapay"
              />
            ) : (
              <WalletDetailsFields
                control={form.control}
                testIdPrefix="academy-wallet"
              />
            )}

            {failure ? (
              <SaveFailedAlert
                error={failure}
                titleKey="payments:academyMethods.saveError"
              />
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={save.isPending}
                onClick={() => handleOpenChange(false)}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                className="min-h-11 sm:min-h-9"
                disabled={save.isPending}
                data-testid="academy-method-save"
              >
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t(
                  method
                    ? 'common:actions.save'
                    : 'payments:academyMethods.saveAndEnable'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
