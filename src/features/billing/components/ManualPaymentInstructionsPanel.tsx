/**
 * The manual-payment instructions a customer pays with — Bank Transfer,
 * E-Wallet or InstaPay — rendered from the payment's own snapshot.
 *
 * - Destination per type: bank details; the wallet's provider, number and
 *   account holder; the InstaPay address and account holder. Each
 *   destination value has a copy button.
 * - Language: the Arabic texts (`accountNameAr`, `instructionsAr`,
 *   `referenceInstructionsAr`) when the UI is Arabic and they exist —
 *   rendered `dir="rtl"` — and the English ones otherwise.
 *
 * The receipt upload is NOT here: it belongs to the page and works the
 * same for every manual type.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ManualPaymentInstructions } from '@types';
import { localizedManualText } from '../utils/manual-payment-method.utils';
import { CopyValueButton } from './CopyValueButton';
import { ManualPaymentBrandChip } from './ManualPaymentBrandChip';
import { WARNING_ALERT_CLASS } from './ManualMethodFormFields';

interface InstructionRowProps {
  readonly label: string;
  readonly value: string;
  /** Technical values (numbers, IBAN, addresses) stay LTR and monospace. */
  readonly technical?: boolean;
  /** Offer a copy button for this value. */
  readonly copyable?: boolean;
  readonly arabic?: boolean;
  readonly testId?: string;
}

function InstructionRow({
  label,
  value,
  technical,
  copyable,
  arabic,
  testId,
}: InstructionRowProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span
          className={
            technical
              ? 'break-all font-mono text-foreground'
              : 'font-medium text-foreground'
          }
          dir={technical ? 'ltr' : arabic ? 'rtl' : 'auto'}
          lang={arabic ? 'ar' : undefined}
          data-testid={testId}
        >
          {value}
        </span>
        {copyable ? (
          <CopyValueButton
            value={value}
            label={t('payments:payment.copyValue', { label })}
          />
        ) : null}
      </dd>
    </div>
  );
}

/** The prominent "do not send money" banner for a placeholder snapshot. */
export function PlaceholderPaymentBanner(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Alert
      className={`${WARNING_ALERT_CLASS} border-2`}
      data-testid="payment-placeholder-banner"
    >
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>{t('payments:payment.placeholderTitle')}</AlertTitle>
      <AlertDescription>
        {t('payments:payment.placeholderDescription')}
      </AlertDescription>
    </Alert>
  );
}

export interface ManualPaymentInstructionsPanelProps {
  readonly instructions: ManualPaymentInstructions;
}

export function ManualPaymentInstructionsPanel({
  instructions,
}: ManualPaymentInstructionsPanelProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const holder = localizedManualText(
    instructions,
    'accountName',
    i18n.language
  );
  const body = localizedManualText(
    instructions,
    'instructions',
    i18n.language
  );
  const reference = localizedManualText(
    instructions,
    'referenceInstructions',
    i18n.language
  );

  const holderRow = (
    <InstructionRow
      label={t(
        instructions.type === 'manual_bank_transfer'
          ? 'payments:payment.accountName'
          : 'payments:payment.accountHolder'
      )}
      value={holder.text}
      arabic={holder.arabic}
      testId="payment-instructions-account-name"
    />
  );

  return (
    <div className="space-y-4" data-testid="payment-instructions">
      {instructions.type === 'manual_bank_transfer' ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <InstructionRow
            label={t('payments:payment.bankName')}
            value={instructions.bankName}
          />
          {holderRow}
          <InstructionRow
            label={t('payments:payment.accountNumber')}
            value={instructions.accountNumber}
            technical
            copyable
          />
          {instructions.iban ? (
            <InstructionRow
              label={t('payments:payment.iban')}
              value={instructions.iban}
              technical
              copyable
            />
          ) : null}
          {instructions.swiftCode ? (
            <InstructionRow
              label={t('payments:payment.swiftCode')}
              value={instructions.swiftCode}
              technical
              copyable
              testId="payment-instructions-swift"
            />
          ) : null}
        </dl>
      ) : instructions.type === 'manual_wallet_transfer' ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {t('payments:payment.walletProvider')}
            </dt>
            <dd className="mt-0.5">
              <ManualPaymentBrandChip
                instructions={instructions}
                testId="payment-instructions-provider"
              />
            </dd>
          </div>
          <InstructionRow
            label={t('payments:payment.walletNumber')}
            value={instructions.walletNumber}
            technical
            copyable
            testId="payment-instructions-wallet-number"
          />
          {holderRow}
        </dl>
      ) : (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {t('payments:common.methodType.label')}
            </dt>
            <dd className="mt-0.5">
              <ManualPaymentBrandChip
                instructions={instructions}
                testId="payment-instructions-provider"
              />
            </dd>
          </div>
          <InstructionRow
            label={t('payments:payment.instapayAddress')}
            value={instructions.instapayAddress}
            technical
            copyable
            testId="payment-instructions-instapay-address"
          />
          {holderRow}
        </dl>
      )}

      <div className="space-y-1 text-sm">
        <p
          className="whitespace-pre-line text-foreground"
          dir={body.arabic ? 'rtl' : 'auto'}
          lang={body.arabic ? 'ar' : undefined}
          data-testid="payment-instructions-text"
        >
          {body.text}
        </p>
        <p
          className="whitespace-pre-line text-muted-foreground"
          dir={reference.arabic ? 'rtl' : 'auto'}
          lang={reference.arabic ? 'ar' : undefined}
          data-testid="payment-instructions-reference"
        >
          {reference.text}
        </p>
      </div>
    </div>
  );
}
