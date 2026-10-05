/**
 * "Payment methods" — the academy setup form's section for how learners will
 * pay THIS academy (Academy Manual Payments): bank transfer, InstaPay and/or
 * a mobile wallet, each with its own details.
 *
 *   - "Set up later" is the default and a real choice: the academy is
 *     created without methods and the owner adds them on the Payment
 *     methods page. Paid courses cannot be bought until one is enabled.
 *   - "Accept payments now" requires at least one method, and every chosen
 *     method must be filled in completely before the form submits.
 *   - The chosen methods travel WITH the provisioning request and are saved
 *     server-side once the academy exists; nothing waits in the browser.
 *
 * The parent asks for the result through `collect()` (via ref) at submit
 * time: it validates the open sub-forms and returns the payload, or `null`
 * when something is missing (the first problem is focused and announced).
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@utils';
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
  type BankTransferDetailsFormData,
  type InstapayDetailsFormData,
  type WalletDetailsFormData,
  MANUAL_METHOD_ICONS,
} from '@features/billing';
import type {
  AcademyPaymentMethodType,
  RequestedPaymentMethodsPayload,
} from '@types';

export interface SetupPaymentMethodsHandle {
  /**
   * The chosen methods, `undefined` for "set up later", or `null` when the
   * section is not complete (the problem is shown and focused).
   */
  collect: () => Promise<RequestedPaymentMethodsPayload | undefined | null>;
}

type Mode = 'later' | 'now';

const METHOD_ORDER: readonly AcademyPaymentMethodType[] = [
  'manual_bank_transfer',
  'manual_instapay',
  'manual_wallet_transfer',
];

export const SetupPaymentMethods = forwardRef<SetupPaymentMethodsHandle>(
  function SetupPaymentMethods(_props, ref): JSX.Element {
    const { t } = useTranslation();
    const [mode, setMode] = useState<Mode>('later');
    const [selected, setSelected] = useState<
      Record<AcademyPaymentMethodType, boolean>
    >({
      manual_bank_transfer: false,
      manual_instapay: false,
      manual_wallet_transfer: false,
    });
    const [noneChosen, setNoneChosen] = useState(false);

    const bankForm = useForm<{ instructions: BankTransferDetailsFormData }>({
      resolver: zodResolver(academyBankTransferMethodSchema),
      defaultValues: {
        instructions: toBankTransferDetailsFormValues(undefined),
      },
    });
    const instapayForm = useForm<{ instructions: InstapayDetailsFormData }>({
      resolver: zodResolver(academyInstapayMethodSchema),
      defaultValues: { instructions: toInstapayDetailsFormValues(undefined) },
    });
    const walletForm = useForm<{ instructions: WalletDetailsFormData }>({
      resolver: zodResolver(academyWalletMethodSchema),
      defaultValues: { instructions: toWalletDetailsFormValues(undefined) },
    });

    const forms: Record<
      AcademyPaymentMethodType,
      UseFormReturn<{ instructions: never }>
    > = {
      manual_bank_transfer: bankForm as unknown as UseFormReturn<{
        instructions: never;
      }>,
      manual_instapay: instapayForm as unknown as UseFormReturn<{
        instructions: never;
      }>,
      manual_wallet_transfer: walletForm as unknown as UseFormReturn<{
        instructions: never;
      }>,
    };

    useImperativeHandle(ref, () => ({
      collect: async () => {
        if (mode === 'later') return undefined;
        const chosen = METHOD_ORDER.filter((type) => selected[type]);
        if (chosen.length === 0) {
          setNoneChosen(true);
          document.getElementById('setup-payment-methods-none')?.focus();
          return null;
        }
        // Validate every chosen method (all errors shown at once), then
        // move focus to the first problem.
        const results = await Promise.all(
          chosen.map((type) => forms[type].trigger())
        );
        const firstInvalid = chosen.find((_, index) => !results[index]);
        if (firstInvalid) {
          await forms[firstInvalid].trigger(undefined, { shouldFocus: true });
          return null;
        }
        return {
          ...(selected.manual_bank_transfer
            ? {
                bankTransfer: toBankTransferDetailsPayload(
                  bankForm.getValues('instructions')
                ),
              }
            : {}),
          ...(selected.manual_instapay
            ? {
                instapay: toInstapayDetailsPayload(
                  instapayForm.getValues('instructions')
                ),
              }
            : {}),
          ...(selected.manual_wallet_transfer
            ? {
                wallet: toWalletDetailsPayload(
                  walletForm.getValues('instructions')
                ),
              }
            : {}),
        };
      },
    }));

    return (
      <fieldset
        className="space-y-3 rounded-lg border border-border p-4"
        data-testid="setup-payment-methods"
      >
        <legend className="px-1 text-sm font-medium text-foreground">
          {t('provisioning:payments.title')}
        </legend>
        <p className="text-sm text-muted-foreground">
          {t('provisioning:payments.description')}
        </p>

        <RadioGroup
          value={mode}
          onValueChange={(value) => {
            setMode(value as Mode);
            setNoneChosen(false);
          }}
          className="grid gap-3 sm:grid-cols-2"
          aria-label={t('provisioning:payments.title')}
        >
          {(['later', 'now'] as const).map((value) => (
            <Label
              key={value}
              htmlFor={`setup-payments-${value}`}
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal',
                mode === value ? 'border-2 border-primary' : 'border-border'
              )}
            >
              <RadioGroupItem
                id={`setup-payments-${value}`}
                value={value}
                className="mt-0.5"
                data-testid={`setup-payments-${value}`}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  {t(`provisioning:payments.mode.${value}.title`)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(`provisioning:payments.mode.${value}.description`)}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        {mode === 'now' ? (
          <div className="space-y-3">
            {noneChosen ? (
              <p
                id="setup-payment-methods-none"
                role="alert"
                tabIndex={-1}
                className="text-sm text-destructive"
              >
                {t('provisioning:payments.chooseOne')}
              </p>
            ) : null}
            {METHOD_ORDER.map((type) => {
              const Icon = MANUAL_METHOD_ICONS[type];
              const on = selected[type];
              const switchId = `setup-method-${type}`;
              return (
                <div
                  key={type}
                  className={cn(
                    'rounded-lg border',
                    on ? 'border-primary/60' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {Icon ? (
                        <Icon
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                      <div className="min-w-0">
                        <label
                          htmlFor={switchId}
                          className="block text-sm font-medium text-foreground"
                        >
                          {t(`payments:common.methodType.${type}`)}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {t(`payments:academyMethods.types.${type}`)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={switchId}
                      checked={on}
                      onCheckedChange={(next) => {
                        setSelected((current) => ({
                          ...current,
                          [type]: next,
                        }));
                        setNoneChosen(false);
                      }}
                      data-testid={`setup-method-${type}-toggle`}
                    />
                  </div>
                  {on ? (
                    <div className="border-t border-border p-3">
                      {type === 'manual_bank_transfer' ? (
                        <Form {...bankForm}>
                          <BankTransferDetailsFields
                            control={bankForm.control}
                            testIdPrefix="setup-bank"
                          />
                        </Form>
                      ) : type === 'manual_instapay' ? (
                        <Form {...instapayForm}>
                          <InstapayDetailsFields
                            control={instapayForm.control}
                            testIdPrefix="setup-instapay"
                          />
                        </Form>
                      ) : (
                        <Form {...walletForm}>
                          <WalletDetailsFields
                            control={walletForm.control}
                            testIdPrefix="setup-wallet"
                          />
                        </Form>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('provisioning:payments.laterHint')}
          </p>
        )}
      </fieldset>
    );
  }
);
