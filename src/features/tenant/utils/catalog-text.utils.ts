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
  const catalogKey = `${base}.${key.replace(/\./g, '_')}.${field}`;
  if (!i18n.exists(catalogKey)) return backendText;
  const english = i18n.getFixedT('en')(catalogKey);
  return pickCatalogText(
    backendText,
    typeof english === 'string' ? english : undefined,
    t(catalogKey)
  );
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
