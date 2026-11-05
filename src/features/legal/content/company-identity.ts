/**
 * How the Terms and the Privacy Policy name the company that operates Atlas.
 * Built from `COMPANY` (src/config/company.config.ts) so registering or
 * renaming the company never means editing legal prose by hand.
 */
import { COMPANY } from '@/config/company.config';

type Lang = 'en' | 'ar';

/**
 * "CoreMind (كور مايند للتكنولوجيا), a company registered in Egypt
 * (commercial register no. …, tax registration no. …)" — plus the registered
 * office once it is set.
 */
export function companyIdentity(lang: Lang): string {
  const { legalName, country, commercialRegisterNumber, taxRegistrationNumber, registeredAddress } = COMPANY;
  if (lang === 'ar') {
    const office = registeredAddress ? `، ومقرها ${registeredAddress.ar}` : '';
    return `شركة ${legalName.ar} (${legalName.en})، وهي شركة مسجّلة في ${country.ar} (سجل تجاري رقم ${commercialRegisterNumber}، ورقم التسجيل الضريبي ${taxRegistrationNumber})${office}`;
  }
  const office = registeredAddress ? `, with its registered office at ${registeredAddress.en}` : '';
  return `${legalName.en} (${legalName.ar}), a company registered in ${country.en} (commercial register no. ${commercialRegisterNumber}, tax registration no. ${taxRegistrationNumber})${office}`;
}

/** The company's short name in the document's language. */
export function companyName(lang: Lang): string {
  return lang === 'ar' ? `شركة ${COMPANY.legalName.ar}` : COMPANY.legalName.en;
}
