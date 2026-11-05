/**
 * The legal entity that owns and operates the platform (B0-OC-17).
 *
 * ONE place for the company's identity. The marketing footer, the contact
 * page, the Organization JSON-LD, the Terms of Service and the Privacy Policy
 * all read from here, so registering the company (or renaming it) is a
 * change to this file only.
 *
 * Keep this separate from the product brand ("Atlas" in `brand.name` of the
 * marketing copy and the i18n resources): the brand is what customers see on
 * the product and may change; this is who they contract with.
 *
 * Status (5 Nov 2026): the name is reserved with GAFI (non-confusion
 * certificate 10258284) and incorporation is in progress. The commercial
 * register and tax registration numbers are not issued yet, so they are
 * zero placeholders (owner decision) until the documents arrive. A field set
 * to `null` is not printed anywhere.
 */
export interface LocalizedText {
  readonly en: string;
  readonly ar: string;
}

export interface CompanyIdentity {
  /** The registered company name, as on the commercial register. */
  readonly legalName: LocalizedText;
  /** Country of registration. */
  readonly country: LocalizedText;
  /** Commercial register number (السجل التجاري). */
  readonly commercialRegisterNumber: string;
  /** Tax registration number (البطاقة الضريبية). */
  readonly taxRegistrationNumber: string;
  /** Registered office address; `null` until it is confirmed. */
  readonly registeredAddress: LocalizedText | null;
}

export const COMPANY: CompanyIdentity = {
  legalName: { en: 'CoreMind', ar: 'كور مايند للتكنولوجيا' },
  country: { en: 'Egypt', ar: 'مصر' },
  commercialRegisterNumber: '000000',
  taxRegistrationNumber: '000-000-000',
  registeredAddress: null,
};

/** True while a registration number is still the zero placeholder. */
export function isPlaceholderNumber(value: string): boolean {
  return /^[0\s-]*$/.test(value);
}
