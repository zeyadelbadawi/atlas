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
import { isApiError } from '@api';
import { toErrorsNamespaceKey } from '@utils';
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
  const { t, i18n } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const save = useSaveAcademyPaymentMethod(academyId);
  const open = type !== null;
  const activeType: AcademyPaymentMethodType = type ?? 'manual_bank_transfer';

  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMAS[activeType]),
    defaultValues: toFormValues(activeType, method),
  });
  useManualMethodServerValidation(form, save.error, 'instructions');

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
      onOpenChange(false);
    } catch (error) {
      const key = isApiError(error)
        ? toErrorsNamespaceKey(error.messageKey)
        : undefined;
      notifyError(
        'payments:academyMethods.saveError',
        key && i18n.exists(key) ? key : undefined
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={save.isPending}
                onClick={() => onOpenChange(false)}
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
