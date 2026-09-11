/**
 * Atlas Terms of Service — public page at `/terms`.
 */
import { useTranslation } from 'react-i18next';
import { LegalDocumentView } from '../components/LegalDocumentView';
import { TERMS_EN } from '../content/terms.en';
import { TERMS_AR } from '../content/terms.ar';

export default function TermsPage(): JSX.Element {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  return (
    <LegalDocumentView
      document={language === 'ar' ? TERMS_AR : TERMS_EN}
      language={language}
    />
  );
}
