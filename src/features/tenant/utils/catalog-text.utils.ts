/**
 * B5 (UX audit) — catalog names the backend sends in English only.
 *
 * Add-ons (`add_ons.name/description`) and Atlas's own payment methods
 * (`payment_methods.display_name/description`) have no Arabic columns, so
 * an Arabic page showed "Extra Academy" and "Bank Transfer". Plans have
 * `nameLocalized`; these don't. Until the backend stores Arabic text, the
 * client translates the SEEDED rows by their stable key — and only while
 * the backend's English text is still the seeded one. A Platform Owner who
 * renamed a row sees their own words on every page, in every language:
 * our translation never overrides a text it wasn't written for.
 */
import type { i18n as I18nInstance, TFunction } from 'i18next';

type CatalogField = 'name' | 'description';

/**
 * The SEEDED English texts (atlas-backend `prisma/seed.ts`). They live in
 * code, not in the English catalogue, because an Arabic page doesn't load
 * every English namespace: the comparison must not depend on it.
 */
const SEEDED_TEXT: Readonly<
  Record<string, Partial<Record<CatalogField, string>>>
> = {
  'tenant:catalogText.addOns.extra-academy': {
    name: 'Extra Academy',
    description: 'Raises your academy limit by 2.',
  },
  'tenant:catalogText.addOns.live-sessions': {
    name: 'Live Sessions',
    description:
      'Run live classes inside your courses with Zoom, with attendance tracking and optional recording.',
  },
  'payments:catalogText.methods.atlas_bank_transfer': {
    name: 'Bank Transfer',
    description:
      'Pay by direct bank transfer — reviewed manually within 1-2 business days.',
  },
  'payments:catalogText.methods.atlas_wallet_transfer': {
    name: 'Mobile Wallet',
    description:
      'Pay by mobile wallet transfer — reviewed manually within 1-2 business days.',
  },
  'payments:catalogText.methods.wallet_vodafone_cash': {
    name: 'Vodafone Cash',
  },
  'payments:catalogText.methods.wallet_orange_cash': { name: 'Orange Cash' },
  'payments:catalogText.methods.wallet_etisalat_cash': {
    name: 'Etisalat Cash',
  },
  'payments:catalogText.methods.instapay': { name: 'InstaPay' },
};

/** Pure form: `english` is the catalogue's English text for the key, if any. */
export function pickCatalogText(
  backendText: string,
  english: string | undefined,
  localized: string | undefined
): string {
  if (!english || !localized) return backendText;
  return english.trim() === backendText.trim() ? localized : backendText;
}

function catalogText(
  t: TFunction,
  i18n: I18nInstance,
  base: string,
  key: string,
  field: CatalogField,
  backendText: string | undefined
): string | undefined {
  if (backendText === undefined || backendText === '') return backendText;
  const rowKey = `${base}.${key}`;
  const english = SEEDED_TEXT[rowKey]?.[field];
  const catalogKey = `${rowKey}.${field}`;
  if (!english || !i18n.exists(catalogKey)) return backendText;
  return pickCatalogText(backendText, english, t(catalogKey));
}

/** An add-on's name or description in the page's language (see header). */
export function localizedAddOnText(
  t: TFunction,
  i18n: I18nInstance,
  addOnKey: string,
  field: CatalogField,
  backendText: string | undefined
): string | undefined {
  return catalogText(
    t,
    i18n,
    'tenant:catalogText.addOns',
    addOnKey,
    field,
    backendText
  );
}

/** An Atlas payment method's name or description in the page's language. */
export function localizedPaymentMethodText(
  t: TFunction,
  i18n: I18nInstance,
  methodKey: string,
  field: CatalogField,
  backendText: string | undefined
): string | undefined {
  return catalogText(
    t,
    i18n,
    'payments:catalogText.methods',
    methodKey,
    field,
    backendText
  );
}
