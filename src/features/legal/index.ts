/**
 * Atlas legal & consent — public entry point.
 *
 * Everything outside this feature imports from here, never from a file
 * inside it: the `no-restricted-imports` rule forbids reaching past a
 * feature's barrel precisely so its internals stay replaceable.
 */
export {
  CookieConsentProvider,
  useCookieConsent,
} from './consent/CookieConsentProvider';
export { CookieConsentBanner } from './components/CookieConsentBanner';
export { CookiePreferencesDialog } from './components/CookiePreferencesDialog';
export { CookiePreferencesButton } from './components/CookiePreferencesButton';
export { LegalDocumentView } from './components/LegalDocumentView';
export { default as PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
export { default as TermsPage } from './pages/TermsPage';
export type {
  LegalBlock,
  LegalDocument,
  LegalSection,
} from './content/legal-content.types';
