/**
 * Manual method details ↔ form values — Academy Manual Payments (the
 * academy's settings page and setup form). A saved method's details become
 * blank-or-saved form values (never a sample value), and form values become
 * the request's `instructions`: optional fields omitted when blank, Arabic
 * texts only when entered (`toTextsPayload`).
 */
import type {
  BankTransferInstructionsPayload,
  InstapayInstructionsPayload,
  ManualPaymentInstructions,
  WalletInstructionsPayload,
  WalletProvider,
} from '@types';
import type {
  BankTransferDetailsFormData,
  InstapayDetailsFormData,
  WalletDetailsFormData,
} from '../schemas/billing.schemas';
import {
  toTextsFormValues,
  toTextsPayload,
} from '../components/ManualMethodFormFields';
import { isKnownWalletProvider } from './manual-payment-method.utils';

export function toBankTransferDetailsFormValues(
  saved: ManualPaymentInstructions | undefined
): BankTransferDetailsFormData {
  const bank = saved?.type === 'manual_bank_transfer' ? saved : undefined;
  return {
    bankName: bank?.bankName ?? '',
    branchName: bank?.branchName ?? '',
    accountNumber: bank?.accountNumber ?? '',
    iban: bank?.iban ?? '',
    swiftCode: bank?.swiftCode ?? '',
    ...toTextsFormValues(bank),
  };
}

export function toBankTransferDetailsPayload(
  values: BankTransferDetailsFormData
): BankTransferInstructionsPayload {
  return {
    bankName: values.bankName,
    ...(values.branchName ? { branchName: values.branchName } : {}),
    accountNumber: values.accountNumber,
    ...(values.iban ? { iban: values.iban } : {}),
    ...(values.swiftCode ? { swiftCode: values.swiftCode } : {}),
    ...toTextsPayload(values),
  };
}

export function toInstapayDetailsFormValues(
  saved: ManualPaymentInstructions | undefined
): InstapayDetailsFormData {
  const instapay = saved?.type === 'manual_instapay' ? saved : undefined;
  return {
    instapayAddress: instapay?.instapayAddress ?? '',
    ...toTextsFormValues(instapay),
  };
}

export function toInstapayDetailsPayload(
  values: InstapayDetailsFormData
): InstapayInstructionsPayload {
  return {
    instapayAddress: values.instapayAddress,
    ...toTextsPayload(values),
  };
}

export function toWalletDetailsFormValues(
  saved: ManualPaymentInstructions | undefined
): WalletDetailsFormData {
  const wallet = saved?.type === 'manual_wallet_transfer' ? saved : undefined;
  const stored = wallet?.walletProvider ?? '';
  const known = isKnownWalletProvider(stored);
  return {
    // Blank until chosen — never a guessed provider.
    walletProvider: known ? stored : stored ? 'other' : '',
    walletProviderName: wallet?.walletProviderName ?? (known ? '' : stored),
    walletNumber: wallet?.walletNumber ?? '',
    ...toTextsFormValues(wallet),
  };
}

export function toWalletDetailsPayload(
  values: WalletDetailsFormData
): WalletInstructionsPayload {
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
