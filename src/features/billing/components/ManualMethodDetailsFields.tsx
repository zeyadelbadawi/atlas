/**
 * The details of ONE manual method — bank transfer, InstaPay or mobile
 * wallet — as form fields, without a dialog, a display name or a save
 * button around them (Academy Manual Payments: the academy's settings page
 * and the academy setup form place these themselves).
 *
 * Field paths are `<pathPrefix>.<field>` (default `instructions`, like the
 * request body), so a server violation such as `instructions.iban` lands on
 * the right input through `useServerValidation`. Technical values (account
 * numbers, IBAN, wallet numbers, addresses) are `dir="ltr"`; the Arabic
 * texts are `dir="rtl"`; everything else follows the content (`auto`).
 */
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { WALLET_PROVIDERS } from '@types';
import { WALLET_PROVIDER_BRANDS } from '../constants/manual-payment-brands';
import { brandName } from '../utils/manual-payment-method.utils';
import {
  ManualMethodTextsFields,
  MethodTextField,
} from './ManualMethodFormFields';

interface DetailsFieldsProps<T extends FieldValues> {
  readonly control: Control<T>;
  /** e.g. `academy-bank` → `academy-bank-account-number`. */
  readonly testIdPrefix: string;
  readonly pathPrefix?: string;
}

export function BankTransferDetailsFields<T extends FieldValues>({
  control,
  testIdPrefix,
  pathPrefix = 'instructions',
}: DetailsFieldsProps<T>): JSX.Element {
  const path = (name: string) => `${pathPrefix}.${name}` as FieldPath<T>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MethodTextField
          control={control}
          name={path('bankName')}
          labelKey="payments:bankTransferMethods.fields.bankName"
          testId={`${testIdPrefix}-bank-name`}
        />
        <MethodTextField
          control={control}
          name={path('branchName')}
          labelKey="payments:academyMethods.fields.branchName"
          helpKey="payments:bankTransferMethods.fields.optional"
          testId={`${testIdPrefix}-branch-name`}
        />
        <MethodTextField
          control={control}
          name={path('accountNumber')}
          labelKey="payments:bankTransferMethods.fields.accountNumber"
          dir="ltr"
          testId={`${testIdPrefix}-account-number`}
        />
        <MethodTextField
          control={control}
          name={path('iban')}
          labelKey="payments:bankTransferMethods.fields.iban"
          helpKey="payments:bankTransferMethods.fields.optional"
          dir="ltr"
          testId={`${testIdPrefix}-iban`}
        />
        <MethodTextField
          control={control}
          name={path('swiftCode')}
          labelKey="payments:bankTransferMethods.fields.swiftCode"
          helpKey="payments:bankTransferMethods.fields.optional"
          dir="ltr"
          testId={`${testIdPrefix}-swift`}
        />
      </div>
      <ManualMethodTextsFields
        control={control}
        section="bankTransferMethods"
        testIdPrefix={testIdPrefix}
        pathPrefix={pathPrefix}
      />
    </div>
  );
}

export function InstapayDetailsFields<T extends FieldValues>({
  control,
  testIdPrefix,
  pathPrefix = 'instructions',
}: DetailsFieldsProps<T>): JSX.Element {
  return (
    <div className="space-y-4">
      <MethodTextField
        control={control}
        name={`${pathPrefix}.instapayAddress` as FieldPath<T>}
        labelKey="payments:instapayMethods.fields.instapayAddress"
        helpKey="payments:instapayMethods.fields.instapayAddressHelp"
        dir="ltr"
        inputMode="email"
        testId={`${testIdPrefix}-address`}
      />
      <ManualMethodTextsFields
        control={control}
        section="instapayMethods"
        testIdPrefix={testIdPrefix}
        pathPrefix={pathPrefix}
      />
    </div>
  );
}

export function WalletDetailsFields<T extends FieldValues>({
  control,
  testIdPrefix,
  pathPrefix = 'instructions',
}: DetailsFieldsProps<T>): JSX.Element {
  const { t, i18n } = useTranslation();
  const providerPath = `${pathPrefix}.walletProvider` as FieldPath<T>;
  const provider = useWatch({ control, name: providerPath }) as
    string | undefined;
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name={providerPath}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('payments:walletMethods.fields.walletProvider')}
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={(field.value as string | undefined) ?? ''}
                onValueChange={field.onChange}
                className="grid gap-2 sm:grid-cols-3"
                data-testid={`${testIdPrefix}-provider`}
              >
                {WALLET_PROVIDERS.map((value) => (
                  <div
                    key={value}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <RadioGroupItem
                      value={value}
                      id={`${testIdPrefix}-provider-${value}`}
                      data-testid={`${testIdPrefix}-provider-${value}`}
                    />
                    <Label
                      htmlFor={`${testIdPrefix}-provider-${value}`}
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
            control={control}
            name={`${pathPrefix}.walletProviderName` as FieldPath<T>}
            labelKey="payments:walletMethods.fields.walletProviderName"
            helpKey="payments:walletMethods.fields.walletProviderNameHelp"
            testId={`${testIdPrefix}-provider-name`}
          />
        ) : null}
        <MethodTextField
          control={control}
          name={`${pathPrefix}.walletNumber` as FieldPath<T>}
          labelKey="payments:walletMethods.fields.walletNumber"
          helpKey="payments:walletMethods.fields.walletNumberHelp"
          dir="ltr"
          inputMode="tel"
          testId={`${testIdPrefix}-number`}
        />
      </div>
      <ManualMethodTextsFields
        control={control}
        section="walletMethods"
        testIdPrefix={testIdPrefix}
        pathPrefix={pathPrefix}
      />
    </div>
  );
}
