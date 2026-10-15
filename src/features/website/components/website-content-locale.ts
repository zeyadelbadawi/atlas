/**
 * B0-WEB-02 — which language a site's bilingual fields must fill: its
 * default language (`WebsiteConfiguration.defaultLocale`, absent = `en`).
 * `LocalizedTextField` shows that language first, required, and the other
 * as the optional translation. Provided by the Website pages that edit
 * content; anywhere else it is `en`, exactly as the field always was.
 */
import { createContext, useContext } from 'react';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';

const WebsiteContentLocaleContext = createContext<PublicWebsiteLocale>(
  DEFAULT_PUBLIC_WEBSITE_LOCALE
);

export const WebsiteContentLocaleProvider =
  WebsiteContentLocaleContext.Provider;

export function useWebsiteContentLocale(): PublicWebsiteLocale {
  return useContext(WebsiteContentLocaleContext);
}
