/**
 * Manual payment provider brands — the ONE place their names live.
 *
 * Egyptian mobile wallets (`manual_wallet_transfer`) and InstaPay
 * (`manual_instapay`) are shown with a clean, text-only brand treatment:
 * the provider's name in a neutral chip (`ManualPaymentBrandChip`). No logo
 * is fabricated, downloaded or approximated with an unrelated icon.
 *
 * Official assets are pending verification: once a provider's official
 * logo and its usage terms are confirmed, add it as `logoSrc` here (a
 * bundled asset path) and every surface that shows the chip picks it up —
 * nothing else needs to change.
 */
import type { WalletProvider } from '@types';

export interface ManualPaymentBrand {
  /** The provider's name as customers know it, in English. */
  readonly nameEn: string;
  /** The provider's name as customers know it, in Arabic. */
  readonly nameAr: string;
  /** Official logo — pending verification; deliberately unset today. */
  readonly logoSrc?: string;
}

/** The named wallet providers. `other` has no brand: its name is `walletProviderName`. */
export const WALLET_PROVIDER_BRANDS: Readonly<
  Record<Exclude<WalletProvider, 'other'>, ManualPaymentBrand>
> = {
  vodafone_cash: { nameEn: 'Vodafone Cash', nameAr: 'فودافون كاش' },
  orange_cash: { nameEn: 'Orange Cash', nameAr: 'أورنج كاش' },
  etisalat_cash: { nameEn: 'Etisalat Cash', nameAr: 'اتصالات كاش' },
  we_pay: { nameEn: 'WE Pay', nameAr: 'وي باي' },
};

export const INSTAPAY_BRAND: ManualPaymentBrand = {
  nameEn: 'InstaPay',
  nameAr: 'إنستاباي',
};
