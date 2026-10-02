/**
 * E-wallet method form — Platform Owner (2 Oct 2026).
 *
 * One dialog for "Add e-wallet" (`method` absent) and "Edit" (`method`
 * given), mirroring `BankTransferMethodFormDialog`. Egyptian mobile
 * wallets: Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, or another
 * provider by name (`other` → `walletProviderName`, required).
 *
 * Nothing is pre-filled with a sample: a new wallet starts blank, provider
 * included. Editing a seeded placeholder starts its wallet number blank —
 * `PLACEHOLDER-NOT-A-WALLET` is not a number — and saving replaces the
 * placeholder (the server clears the flag).
 *
 * Client validation mirrors `WalletTransferInstructionsDto`
 * (`walletMethodSchema`); the server stays the authority and normalizes
 * the number to `01XXXXXXXXX`. An edit sends `walletInstructions` — never
 * `instructions`, which the server reserves for bank transfer.
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { toErrorsNamespaceKey } from '@utils';
import { isApiError } from '@api';
import { WALLET_PROVIDERS } from '@types';
import type {
  PlatformPaymentMethod,
  WalletInstructionsPayload,
  WalletProvider,
} from '@types';
import { useCreateWalletMethod, useUpdatePlatformPaymentMethod } from '../hooks';
import {
  walletMethodSchema,
  type WalletMethodFormData,
} from '../schemas/billing.schemas';
import { WALLET_PROVIDER_BRANDS } from '../constants/manual-payment-brands';
import {
  brandName,
  isKnownWalletProvider,
} from '../utils/manual-payment-method.utils';
import {
  ManualMethodTextsFields,
  MethodLongTextField,
  MethodTextField,
  PlaceholderDetailsNotice,
  toTextsFormValues,
  toTextsPayload,
  useManualMethodServerValidation,
} from './ManualMethodFormFields';

export interface WalletMethodFormDialogProps {
  readonly open: boolean;
  /** The method being edited; absent when adding a new wallet. */
  readonly method?: PlatformPaymentMethod;
  readonly onOpenChange: (open: boolean) => void;
}

/** The form's starting values: the saved method's own, or blank. */
function toFormValues(
  method: PlatformPaymentMethod | undefined
): WalletMethodFormData {
  const saved =
    method?.manualInstructions?.type === 'manual_wallet_transfer'
      ? method.manualInstructions
      : undefined;
  // An older free-text provider becomes `other`, keeping its name.
  const storedProvider = saved?.walletProvider ?? '';
  const known = isKnownWalletProvider(storedProvider);
  const walletProvider: WalletProvider | '' = known
    ? storedProvider
    : storedProvider
      ? 'other'
      : '';
  return {
    displayName: method?.displayName ?? '',
    description: method?.description ?? '',
    instructions: {
      walletProvider,
      walletProviderName:
        saved?.walletProviderName ?? (known ? '' : storedProvider),
      walletNumber: saved?.placeholder ? '' : (saved?.walletNumber ?? ''),
      ...toTextsFormValues(saved),
    },
  };
}

/** The request's details. `walletProviderName` goes only with `other`. */
function toInstructionsPayload(
  values: WalletMethodFormData['instructions']
): WalletInstructionsPayload {
  // Validated non-blank by `walletMethodSchema`.
  const walletProvider = values.walletProvider as WalletProvider;
  return {
    walletProvider,
    ...(walletProvider === 'other'
      ? { walletProviderName: values.walletProviderName }
      : {}),
    walletNumber: values.walletNumber,
    ...toTextsPayload(values),
  };
}

export function WalletMethodFormDialog({
  open,
  method,
  onOpenChange,
}: WalletMethodFormDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const isEdit = method !== undefined;

  const createMethod = useCreateWalletMethod();
  const updateMethod = useUpdatePlatformPaymentMethod();
  const activeMutation = isEdit ? updateMethod : createMethod;

  const form = useForm<WalletMethodFormData>({
    resolver: zodResolver(walletMethodSchema),
    defaultValues: toFormValues(method),
  });

  useManualMethodServerValidation(
    form,
    activeMutation.error,
    isEdit ? 'walletInstructions' : 'instructions'
  );

  // Re-seed on every open, so one wallet's details never carry into another.
  const { reset } = form;
  useEffect(() => {
    if (open) reset(toFormValues(method));
  }, [open, method, reset]);

  const provider = form.watch('instructions.walletProvider');

  const errorDescription = (error: unknown): string | undefined => {
    if (!isApiError(error)) return undefined;
    const key = toErrorsNamespaceKey(error.messageKey);
    return i18n.exists(key) ? t(key) : undefined;
  };

  const onSubmit = async (values: WalletMethodFormData) => {
    const details = toInstructionsPayload(values.instructions);
    try {
      if (method) {
        await updateMethod.mutateAsync({
          methodId: method.id,
          payload: {
            displayName: values.displayName,
            // Sent even when empty: clearing the description is an edit.
            description: values.description,
            walletInstructions: details,
          },
        });
        toast({ title: t('payments:walletMethods.updateSuccess') });
      } else {
        await createMethod.mutateAsync({
          displayName: values.displayName,
          ...(values.description ? { description: values.description } : {}),
          instructions: details,
        });
        toast({ title: t('payments:walletMethods.createSuccess') });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t(
          method
            ? 'payments:walletMethods.updateError'
            : 'payments:walletMethods.createError'
        ),
        description: errorDescription(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? 'payments:walletMethods.editTitle'
                : 'payments:walletMethods.createTitle'
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              isEdit
                ? 'payments:walletMethods.editDescription'
                : 'payments:walletMethods.createDescription'
            )}
          </DialogDescription>
        </DialogHeader>

        {method?.manualInstructions?.placeholder ? (
          <PlaceholderDetailsNotice testId="wallet-method-placeholder-notice" />
        ) : null}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            data-testid="wallet-method-form"
          >
            <MethodTextField
              control={form.control}
              name="displayName"
              labelKey="payments:walletMethods.fields.displayName"
              helpKey="payments:bankTransferMethods.fields.displayNameHelp"
              testId="wallet-method-display-name"
            />
            <MethodLongTextField
              control={form.control}
              name="description"
              labelKey="payments:bankTransferMethods.fields.description"
              rows={2}
              testId="wallet-method-description"
            />

            <FormField
              control={form.control}
              name="instructions.walletProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('payments:walletMethods.fields.walletProvider')}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-2 sm:grid-cols-3"
                      data-testid="wallet-method-provider"
                    >
                      {WALLET_PROVIDERS.map((value) => (
                        <div
                          key={value}
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                        >
                          <RadioGroupItem
                            value={value}
                            id={`wallet-provider-${value}`}
                            data-testid={`wallet-method-provider-${value}`}
                          />
                          <Label
                            htmlFor={`wallet-provider-${value}`}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            {value === 'other'
                              ? t('payments:walletMethods.providerOther')
                              : brandName(
                                  WALLET_PROVIDER_BRANDS[value],
                                  i18n.language
                                )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {provider === 'other' ? (
                <MethodTextField
                  control={form.control}
                  name="instructions.walletProviderName"
                  labelKey="payments:walletMethods.fields.walletProviderName"
                  helpKey="payments:walletMethods.fields.walletProviderNameHelp"
                  testId="wallet-method-provider-name"
                />
              ) : null}
              <MethodTextField
                control={form.control}
                name="instructions.walletNumber"
                labelKey="payments:walletMethods.fields.walletNumber"
                helpKey="payments:walletMethods.fields.walletNumberHelp"
                dir="ltr"
                inputMode="tel"
                testId="wallet-method-number"
              />
            </div>

            <ManualMethodTextsFields
              control={form.control}
              section="walletMethods"
              testIdPrefix="wallet-method"
            />

            {!isEdit ? (
              <p className="text-xs text-muted-foreground">
                {t('payments:walletMethods.createdDisabledNote')}
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
                data-testid="wallet-method-save"
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
