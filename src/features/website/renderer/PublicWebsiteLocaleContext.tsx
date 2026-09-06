/**
 * Public Website Locale Context.
 *
 * The ONE source of truth every section renderer, `WebsiteHeader`,
 * `WebsiteFooter`, and `AtlasPlatformAttribution` reads to decide which
 * side of a `LocalizedText` value to show — deliberately NOT
 * `useTranslation().i18n.language` (`react-i18next`'s global instance),
 * which is `AtlasLocalizationProvider`'s dashboard-chrome language and has
 * nothing to do with which locale of a PUBLIC website a given visitor is
 * looking at (see `locale.constants.ts`'s own doc comment). A real public
 * visitor never mounts the dashboard's i18n provider at all.
 *
 * `WebsiteRenderer` is the one place this Provider is mounted — every
 * consumer of "One Renderer, Every Surface" (the real public runtime, the
 * in-dashboard Page Editor preview, the Theme gallery) gets locale
 * awareness for free, correctly scoped to whichever locale that surface
 * is actually demonstrating, without prop-drilling `locale` through every
 * intermediate component.
 */
import { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';

export interface PublicWebsiteLocaleValue {
  readonly locale: PublicWebsiteLocale;
  readonly direction: 'ltr' | 'rtl';
}

const PublicWebsiteLocaleContext = createContext<PublicWebsiteLocaleValue>({
  locale: DEFAULT_PUBLIC_WEBSITE_LOCALE,
  direction: PUBLIC_WEBSITE_LOCALE_DIRECTION[DEFAULT_PUBLIC_WEBSITE_LOCALE],
});

export interface PublicWebsiteLocaleProviderProps {
  readonly locale: PublicWebsiteLocale;
  readonly children: React.ReactNode;
}

/** Every consumer only ever needs `locale`; `direction` is derived here once so no consumer re-derives (or mis-derives) it from `locale` independently. */
export function PublicWebsiteLocaleProvider({
  locale,
  children,
}: PublicWebsiteLocaleProviderProps): JSX.Element {
  const value = useMemo<PublicWebsiteLocaleValue>(
    () => ({ locale, direction: PUBLIC_WEBSITE_LOCALE_DIRECTION[locale] }),
    [locale]
  );
  return (
    <PublicWebsiteLocaleContext.Provider value={value}>
      {children}
    </PublicWebsiteLocaleContext.Provider>
  );
}

export function usePublicWebsiteLocale(): PublicWebsiteLocaleValue {
  return useContext(PublicWebsiteLocaleContext);
}
