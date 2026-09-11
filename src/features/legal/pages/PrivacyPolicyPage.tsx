/**
 * Atlas Privacy Policy — public page at `/privacy-policy`.
 *
 * Picks the document by the interface language, so switching language
 * switches the policy itself rather than leaving English legal text under
 * an Arabic interface.
 */
import { useTranslation } from 'react-i18next';
import { LegalDocumentView } from '../components/LegalDocumentView';
import { PRIVACY_POLICY_EN } from '../content/privacy-policy.en';
import { PRIVACY_POLICY_AR } from '../content/privacy-policy.ar';

export default function PrivacyPolicyPage(): JSX.Element {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  return (
    <LegalDocumentView
      document={language === 'ar' ? PRIVACY_POLICY_AR : PRIVACY_POLICY_EN}
      language={language}
    />
  );
}
