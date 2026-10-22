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
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { ensureLanguageLoaded } from '@localization';
import { useIsWebsitePreview } from './WebsitePreviewContext';
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
  const translator = usePreviewTranslator(locale);
  const content = (
    <PublicWebsiteLocaleContext.Provider value={value}>
      <div dir={value.direction} lang={locale} className={className}>
        {children}
      </div>
    </PublicWebsiteLocaleContext.Provider>
  );
  return translator ? (
    <I18nextProvider i18n={translator}>{content}</I18nextProvider>
  ) : (
    content
  );
}

/**
 * THE WEBSITE'S OWN WORDS IN THE PREVIEWED LANGUAGE. Content follows
 * `locale`, but the renderer's interface strings (`t()`: buttons, filters,
 * empty states, footer labels) come from i18next, which in the dashboard is
 * the ADMIN's language — so an English dashboard previewing the Arabic site
 * showed Arabic content with English buttons. On the public site the two
 * always agree (`usePublicWebsiteDocumentDirection` switches i18next to the
 * URL's language), so this applies only inside the dashboard's device
 * preview: a translator fixed to `locale`, sharing the app's loaded
 * translations, without touching the dashboard's own language.
 */
function usePreviewTranslator(
  locale: PublicWebsiteLocale
): I18nInstance | null {
  const isPreview = useIsWebsitePreview();
  const { i18n } = useTranslation();
  const differs =
    isPreview && (i18n.resolvedLanguage ?? i18n.language) !== locale;
  const translator = useMemo(
    () => (differs ? i18n.cloneInstance({ lng: locale }) : null),
    [differs, i18n, locale]
  );
  // The other language may not be loaded yet in this dashboard session;
  // its strings appear as soon as it is (the instances share one store).
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (!translator) return undefined;
    let active = true;
    void ensureLanguageLoaded(i18n, locale).then(() => {
      if (active) setLoaded((n) => n + 1);
    });
    return () => {
      active = false;
    };
  }, [translator, i18n, locale]);
  return translator;
}

export function usePublicWebsiteLocale(): PublicWebsiteLocaleValue {
  return useContext(PublicWebsiteLocaleContext);
}

/**
 * B0-WEB-02 — the site's DEFAULT locale (the language served at `/`), next
 * to the locale a page is in. Every public URL is built from both: the
 * default locale is unprefixed, any other under `/<locale>`. Provided once
 * by `PublicWebsiteRouter` from the published configuration; everywhere else
 * (the dashboard's previews, the theme gallery, tests) it is `en`, which is
 * the fixed routing every site had before.
 */
const PublicWebsiteDefaultLocaleContext = createContext<PublicWebsiteLocale>(
  DEFAULT_PUBLIC_WEBSITE_LOCALE
);

export const PublicWebsiteDefaultLocaleProvider =
  PublicWebsiteDefaultLocaleContext.Provider;

export function usePublicWebsiteDefaultLocale(): PublicWebsiteLocale {
  return useContext(PublicWebsiteDefaultLocaleContext);
}
