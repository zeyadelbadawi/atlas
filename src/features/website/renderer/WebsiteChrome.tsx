/**
 * Website Chrome (Phase 1, Extended Scope, dependency C).
 *
 * The Theme + Header + Footer shell `WebsiteRenderer` already builds,
 * extracted so a non-CMS public-runtime surface (Sign In, Sign Up — never
 * stored as a `WebsitePage` row, never editable through the Page
 * Composer) can render inside the exact same Academy-branded shell
 * instead of a second, invented one. `WebsiteRenderer` itself is
 * rewritten to use this component for its own Theme/Header/Footer
 * wiring, so there is still exactly one place that composition lives —
 * see this feature's own "One Renderer, Every Surface" doc comment,
 * which this split preserves rather than contradicts: the header/footer/
 * theme wiring is the part every surface must share; which BODY renders
 * in between (CMS sections, the Course Details template, or an auth
 * form) is the one axis that's allowed to differ.
 */
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { AtlasPlatformAttribution } from '@components/branding';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { WebsiteHeader, type WebsiteHeaderAuthState } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import { PublicWebsiteLocaleProvider } from './PublicWebsiteLocaleContext';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type {
  WebsiteBrandConfig,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteChromeProps {
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<WebsiteConfiguration, 'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'>;
  readonly pages: readonly WebsitePage[];
  readonly activePageId?: string;
  readonly onNavigate: (pageId: string) => void;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
  readonly children: React.ReactNode;
  /** Which side of every `LocalizedText` field to show, for every descendant (`WebsiteHeader`/`WebsiteFooter`/every section) via `usePublicWebsiteLocale`. Defaults to English. See `WebsiteRenderer`'s identical prop for who supplies what. */
  readonly locale?: PublicWebsiteLocale;
  /** Present only on the real public runtime (`PublicWebsitePage`/Sign In/Sign Up), which supplies real `/ar/...` URL navigation — absent in every dashboard preview context, where there is no real URL to switch to and the CMS has its own explicit language-tab control instead (`SectionConfigForm`). Its presence is what makes `WebsiteHeader` show the switcher at all. */
  readonly onLocaleChange?: (locale: PublicWebsiteLocale) => void;
  /** The real visitor's session — see `WebsiteHeaderAuthState`. Present only on the real public runtime; absent in every dashboard preview context, same convention as `linkRenderer`/`onLocaleChange`. */
  readonly authState?: WebsiteHeaderAuthState;
}

export function WebsiteChrome({
  academyName,
  academyLogo,
  configuration,
  pages,
  activePageId,
  onNavigate,
  linkRenderer,
  className,
  children,
  locale = DEFAULT_PUBLIC_WEBSITE_LOCALE,
  onLocaleChange,
  authState,
}: WebsiteChromeProps): JSX.Element {
  const theme = getWebsiteTheme(configuration.themeKey);
  const brand: Pick<WebsiteBrandConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'> =
    configuration.brand;

  return (
    <PublicWebsiteLocaleProvider locale={locale}>
    <WebsiteThemeScope theme={theme} brand={brand} className={className}>
      {/*
        `dir` scoped to this subtree (not just `document.documentElement`,
        which the real public runtime also sets — see
        `usePublicWebsiteDocumentDirection`) so an Arabic Academy previewed
        INSIDE the Atlas dashboard (itself always LTR) still renders
        genuinely right-to-left exactly as a real visitor would see it,
        without flipping the surrounding dashboard chrome.
      */}
      <div dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[locale]} className="min-h-full bg-background text-foreground">
        <WebsiteHeader
          logo={academyLogo}
          academyName={academyName}
          navigation={configuration.navigation}
          pages={pages}
          header={configuration.header}
          activePageId={activePageId}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
          locale={locale}
          onLocaleChange={onLocaleChange}
          authState={authState}
        />

        <main>{children}</main>

        <WebsiteFooter
          academyName={academyName}
          footer={configuration.footer}
          pages={pages}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
        />

        {/*
          Phase 6 — mandatory, platform-owned attribution. Placed here,
          below the Academy's OWN footer (never inside `WebsiteFooter`,
          which renders `configuration.footer` — Academy-authored CMS
          content) so it can never be an editable field. `WebsiteChrome`
          is the ONE shell both the real public website and the Academy's
          Sign In/Sign Up pages render through, so this one placement
          covers both surfaces without duplication.
        */}
        <div className="border-t border-border bg-background px-4 py-3">
          <AtlasPlatformAttribution />
        </div>
      </div>
    </WebsiteThemeScope>
    </PublicWebsiteLocaleProvider>
  );
}
