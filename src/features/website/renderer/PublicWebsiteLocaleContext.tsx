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
  /** Applied to the direction-owning wrapper, for callers that need it to participate in a layout. */
  readonly className?: string;
}

/**
 * Every consumer only ever needs `locale`; `direction` is derived here once
 * so no consumer re-derives (or mis-derives) it from `locale` independently.
 *
 * THE PROVIDER ALSO OWNS `dir`/`lang`, and that is the point.
 *
 * It previously provided the locale as pure context and left the actual
 * text direction to whichever shell happened to wrap it. `WebsiteChrome`
 * set `dir` on its own wrapper, so the full-page preview was correct — but
 * the SECTION live preview inside the editor modal mounts this provider
 * WITHOUT `WebsiteChrome`, so it inherited the dashboard's `ltr`. The
 * visible result was a genuinely confusing half-state: selecting العربية
 * swapped every string to Arabic while the layout stayed left-to-right.
 *
 * Direction is not a property of a shell, it is a property of a locale.
 * Owning it here means every surface that renders public-website content —
 * the real public runtime, the page preview, the section preview, the theme
 * gallery, the academy sign-in pages — gets correct direction by
 * construction, and a shell added later cannot forget to set it.
 *
 * The wrapper is an ordinary element with no styling of its own, so it adds
 * no layout box behaviour; callers that need a styled root still provide
 * their own inside.
 */
export function PublicWebsiteLocaleProvider({
  locale,
  children,
  className,
}: PublicWebsiteLocaleProviderProps): JSX.Element {
  const value = useMemo<PublicWebsiteLocaleValue>(
    () => ({ locale, direction: PUBLIC_WEBSITE_LOCALE_DIRECTION[locale] }),
    [locale]
  );
  return (
    <PublicWebsiteLocaleContext.Provider value={value}>
      <div dir={value.direction} lang={locale} className={className}>
        {children}
      </div>
    </PublicWebsiteLocaleContext.Provider>
  );
}

export function usePublicWebsiteLocale(): PublicWebsiteLocaleValue {
  return useContext(PublicWebsiteLocaleContext);
}
