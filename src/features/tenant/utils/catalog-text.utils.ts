/**
 * B5 (UX audit) — catalog names in the page's language.
 *
 * Add-ons (`add_ons.name/description`) and Atlas's own payment methods
 * (`payment_methods.display_name/description`) are written in English. In
 * Arabic, in this order:
 *   1. the Arabic text a Platform Owner entered (`nameAr`/`displayNameAr`,
 *      `descriptionAr` — the backend's optional Arabic columns), when there
 *      is one: their own words always win;
 *   2. for the SEEDED rows, the client's translation by their stable key —
 *      only while the backend's English text is still the seeded one, so a
 *      renamed row never gets a translation written for another text;
 *   3. the English text.
 * English pages always show the English text.
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

/** The page is Arabic (`ar`, `ar-EG`, …). */
function isArabic(i18n: I18nInstance): boolean {
  return (i18n.language ?? '').split('-')[0] === 'ar';
}

function catalogText(
  t: TFunction,
  i18n: I18nInstance,
  base: string,
  key: string,
  field: CatalogField,
  backendText: string | undefined,
  arabicText: string | null | undefined
): string | undefined {
  // A Platform Owner's own Arabic text first (step 1 above).
  const arabic = arabicText?.trim();
  if (arabic && isArabic(i18n)) return arabic;
  if (backendText === undefined || backendText === '') return backendText;
  const rowKey = `${base}.${key}`;
  const english = SEEDED_TEXT[rowKey]?.[field];
  const catalogKey = `${rowKey}.${field}`;
  if (!english || !i18n.exists(catalogKey)) return backendText;
  return pickCatalogText(backendText, english, t(catalogKey));
}

/**
 * An add-on's name or description in the page's language (see header).
 * `arabicText` is the add-on's own `nameAr`/`descriptionAr`.
 */
export function localizedAddOnText(
  t: TFunction,
  i18n: I18nInstance,
  addOnKey: string,
  field: CatalogField,
  backendText: string | undefined,
  arabicText?: string | null
): string | undefined {
  return catalogText(
    t,
    i18n,
    'tenant:catalogText.addOns',
    addOnKey,
    field,
    backendText,
    arabicText
  );
}

/**
 * An Atlas payment method's name or description in the page's language.
 * `arabicText` is the method's own `displayNameAr`/`descriptionAr`.
 */
export function localizedPaymentMethodText(
  t: TFunction,
  i18n: I18nInstance,
  methodKey: string,
  field: CatalogField,
  backendText: string | undefined,
  arabicText?: string | null
): string | undefined {
  return catalogText(
    t,
    i18n,
    'payments:catalogText.methods',
    methodKey,
    field,
    backendText,
    arabicText
  );
}
