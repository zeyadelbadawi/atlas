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
import { cn } from '@utils';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { WebsiteHeader, type WebsiteHeaderAuthState } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import { MobileBottomNav } from './MobileBottomNav';
import { useMobileBottomNavVisibility } from './useMobileBottomNavVisibility';
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
  readonly configuration: Pick<
    WebsiteConfiguration,
    'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'
  >;
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
  const brand: Pick<
    WebsiteBrandConfig,
    'primaryColor' | 'secondaryColor' | 'accentColor'
  > = configuration.brand;
  // `linkRenderer` absent means dashboard preview (Theme gallery/Page
  // Editor) — `MobileBottomNav` itself already renders `null` there too;
  // computed once here as well so `<main>`'s bottom padding stays in sync
  // with the bar's actual visibility (see `MobileBottomNav`'s own doc
  // comment for why these must never disagree).
  const isBottomNavRouteVisible = useMobileBottomNavVisibility();
  const showBottomNav = !!linkRenderer && isBottomNavRouteVisible;

  return (
    <PublicWebsiteLocaleProvider locale={locale} className="min-h-[100dvh]">
      <WebsiteThemeScope
        theme={theme}
        brand={brand}
        className={cn('min-h-[100dvh]', className)}
      >
        {/*
        `dir` is no longer set here — `PublicWebsiteLocaleProvider` owns it,
        so every surface that renders public-website content gets correct
        direction by construction rather than each shell remembering to.
        See that provider's own doc comment.

        THE FULL-VIEWPORT RULE. This was `min-h-full` (`min-height: 100%`),
        which only resolves against an ancestor with a definite height — and
        none of `#root`/`body`/`html` has one. So on an Academy with little
        or no content the page collapsed to content height and the Atlas
        dashboard's own dark body showed through underneath it, which is
        exactly what a visitor must never see. `100dvh` is measured against
        the viewport itself, needs no ancestor height, and follows mobile
        browser chrome as it appears and disappears.

        MIN-height, never a fixed height: the column below grows normally
        once the Academy has real content, so a long page simply scrolls.
      */}
        <div className="flex min-h-[100dvh] flex-col bg-[var(--website-background)] text-[var(--website-foreground)]">
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

          {/* `flex-1` is what makes the empty-Academy case work: with little
              or no content the main region absorbs the remaining viewport
              height, so the footer rests at the bottom and the space above
              it belongs to the ACADEMY's background rather than revealing
              whatever is painted behind the app.

              Bottom padding matches `MobileBottomNav`'s own height +
              safe-area inset whenever it's showing, so the bar never covers
              the page's own last CTA/content — see that component's own doc
              comment for why this and its render condition must never
              disagree. */}
          <main className={cn('flex-1', showBottomNav && 'pb-16 md:pb-0')}>
            {children}
          </main>

          {/*
          ONE footer region, not two. The mandatory Atlas attribution used
          to be a SEPARATE bordered strip rendered here, directly beneath
          `WebsiteFooter`, which read to visitors as two stacked footers —
          the Academy's, then the platform's.

          It now renders INSIDE `WebsiteFooter`'s own `<footer>` element as
          its bottom row. The Phase 6 requirement that it be
          platform-owned and un-hideable is unchanged and unchanged-able:
          it is still emitted from component code, never from
          `configuration.footer`, so no CMS field, prop or toggle can
          remove it. What moved is where the markup sits, not who controls
          it.
        */}
          <WebsiteFooter
            academyName={academyName}
            footer={configuration.footer}
            pages={pages}
            onNavigate={onNavigate}
            linkRenderer={linkRenderer}
          />

          <MobileBottomNav
            pages={pages}
            locale={locale}
            linkRenderer={linkRenderer}
          />
        </div>
      </WebsiteThemeScope>
    </PublicWebsiteLocaleProvider>
  );
}
