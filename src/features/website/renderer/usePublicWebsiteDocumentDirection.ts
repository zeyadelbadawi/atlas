/**
 * Applies `<html lang>`/`<html dir>` AND switches the active i18next
 * language for a public-website surface — the one piece of locale
 * plumbing every top-level public route needs (`PublicWebsitePage` via
 * `useDocumentSeo`, which calls this internally;
 * `PublicWebsiteSignInPage`/`PublicWebsiteSignUpPage`, which have no other
 * document-head management and call this directly).
 *
 * There is exactly ONE i18next instance in this app
 * (`createI18nInstance`) — the dashboard's own `AtlasLocalizationProvider`
 * sets its active language from the signed-in admin's preference, and
 * every translation namespace this instance loads (`website`,
 * `publicWebsite`, `navigation`, ...) already ships a real Arabic
 * resource file, because the DASHBOARD's own Website/CMS UI is already
 * bilingual. A real public visitor is never signed in and never touches
 * that preference, so without this hook every public-facing string
 * rendered through `t(...)` (button labels, empty states, form labels)
 * would silently follow whatever the LAST SIGNED-IN ADMIN happened to
 * leave the shared browser's i18next instance set to — completely
 * unrelated to the `/ar/...` URL a real visitor is looking at. This hook
 * makes the same global instance temporarily follow the public URL's own
 * locale instead, for exactly as long as a public page is mounted, and
 * restores whatever language was active before on unmount — so leaving a
 * public Academy website back into an authenticated dashboard session (a
 * real navigation path for staff previewing their own site) never leaves
 * the admin's own dashboard chrome silently switched to the wrong
 * language.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';

export function usePublicWebsiteDocumentDirection(
  locale: PublicWebsiteLocale
): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    const previousLang = document.documentElement.lang;
    const previousDir = document.documentElement.dir;
    const previousI18nLanguage = i18n.language;

    document.documentElement.lang = locale;
    document.documentElement.dir = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
    void i18n.changeLanguage(locale);

    return () => {
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDir;
      void i18n.changeLanguage(previousI18nLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
}
