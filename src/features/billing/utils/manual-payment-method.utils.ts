/**
 * Manual payment method helpers — shared by the Platform Owner's
 * configuration, the checkout's method list and the payment page, so the
 * three never disagree about a provider's name or which language's text
 * a customer is shown.
 */
import type {
  ManualInstructionTexts,
  ManualPaymentInstructions,
  WalletProvider,
  WalletTransferInstructions,
} from '@types';
import { WALLET_PROVIDERS } from '@types';
import {
  INSTAPAY_BRAND,
  WALLET_PROVIDER_BRANDS,
  type ManualPaymentBrand,
} from '../constants/manual-payment-brands';

/** Whether the UI language is Arabic (`ar`, `ar-EG`, …). */
export function isArabicLanguage(language: string | undefined): boolean {
  return !!language && language.startsWith('ar');
}

/** Narrows a stored provider value — older development rows may hold free text. */
export function isKnownWalletProvider(value: string): value is WalletProvider {
  return (WALLET_PROVIDERS as readonly string[]).includes(value);
}

/** The brand behind a provider key, when Atlas names it. */
export function walletProviderBrand(
  walletProvider: string
): ManualPaymentBrand | undefined {
  return isKnownWalletProvider(walletProvider) && walletProvider !== 'other'
    ? WALLET_PROVIDER_BRANDS[walletProvider]
    : undefined;
}

/** A brand's name in the UI language. */
export function brandName(brand: ManualPaymentBrand, language: string): string {
  return isArabicLanguage(language) ? brand.nameAr : brand.nameEn;
}

/**
 * The wallet's provider name as customers know it: the brand's name for a
 * named provider, `walletProviderName` for `other`, and the stored text
 * itself for an older free-text row.
 */
export function walletProviderDisplayName(
  instructions: Pick<
    WalletTransferInstructions,
    'walletProvider' | 'walletProviderName'
  >,
  language: string
): string | undefined {
  const brand = walletProviderBrand(instructions.walletProvider);
  if (brand) return brandName(brand, language);
  if (instructions.walletProviderName) return instructions.walletProviderName;
  return instructions.walletProvider === 'other'
    ? undefined
    : instructions.walletProvider || undefined;
}

/** The provider name a wallet/InstaPay method is shown with; `undefined` for bank transfer. */
export function manualProviderDisplayName(
  instructions: ManualPaymentInstructions | undefined,
  language: string
): string | undefined {
  if (instructions?.type === 'manual_wallet_transfer') {
    return walletProviderDisplayName(instructions, language);
  }
  if (instructions?.type === 'manual_instapay') {
    return brandName(INSTAPAY_BRAND, language);
  }
  return undefined;
}

/** The official asset for a wallet/InstaPay brand chip, once one is verified. */
export function manualProviderLogo(
  instructions: ManualPaymentInstructions | undefined
): string | undefined {
  if (instructions?.type === 'manual_wallet_transfer') {
    return walletProviderBrand(instructions.walletProvider)?.logoSrc;
  }
  if (instructions?.type === 'manual_instapay') return INSTAPAY_BRAND.logoSrc;
  return undefined;
}

/** Where the money goes: the account number, the wallet number or the InstaPay address. */
export function manualDestination(
  instructions: ManualPaymentInstructions
): string {
  switch (instructions.type) {
    case 'manual_bank_transfer':
      return instructions.accountNumber;
    case 'manual_wallet_transfer':
      return instructions.walletNumber;
    case 'manual_instapay':
      return instructions.instapayAddress;
  }
}

export type LocalizedTextField =
  'accountName' | 'instructions' | 'referenceInstructions';

export interface LocalizedText {
  readonly text: string;
  /** True when the Arabic version is the one shown — render it `dir="rtl"`. */
  readonly arabic: boolean;
}

/**
 * The customer-facing text in the UI language: the Arabic version when the
 * UI is Arabic and one was entered, the (required) English one otherwise.
 */
export function localizedManualText(
  instructions: ManualInstructionTexts,
  field: LocalizedTextField,
  language: string
): LocalizedText {
  const arabicKey = `${field}Ar` as const;
  const arabic = instructions[arabicKey]?.trim();
  if (isArabicLanguage(language) && arabic) {
    return { text: arabic, arabic: true };
  }
  return { text: instructions[field], arabic: false };
}
