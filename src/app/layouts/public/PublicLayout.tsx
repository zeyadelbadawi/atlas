/**
 * Public layout.
 *
 * Wraps unauthenticated marketing and system surfaces. It carries the same brand
 * identity as the product shell so a visitor who signs in experiences one
 * continuous product rather than two different applications.
 *
 * Design system: `design-system/atlas-marketing/MASTER.md`. The header and
 * footer measure themselves to `max-w-marketing` (75rem), narrower than the
 * dashboard shell, so the marketing nav lines up with marketing page content.
 */
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AtlasLogo } from '@components/branding';
import { LanguageSwitcher, ThemeSwitcher } from '@components/controls';
import { OfflineNotice } from '@components/feedback';
import { SkipToContentLink } from '@components/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { useAuth, useOnlineStatus } from '@hooks';
import { CookiePreferencesButton } from '@features/legal';

/** Id of the main landmark, targeted by the skip link. */
const MAIN_CONTENT_ID = 'atlas-public-content';

/** The marketing nav. Declared once and rendered by both desktop and drawer. */
const NAV_ITEMS: readonly { readonly to: string; readonly labelKey: string }[] =
  [
    { to: PUBLIC_ROUTES.features, labelKey: 'layout:public.nav.product' },
    { to: PUBLIC_ROUTES.pricing, labelKey: 'layout:public.nav.pricing' },
  ];

export function PublicLayout(): JSX.Element {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const isOnline = useOnlineStatus();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // A drawer left open across a route change would cover the page the visitor
  // just asked for. Closing on pathname change also keeps the browser Back
  // button predictable (UI/UX Pro Max `ux` → Back Button).
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipToContentLink targetId={MAIN_CONTENT_ID} />
      {!isOnline ? <OfflineNotice /> : null}

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-layout-header max-w-marketing items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              to={PUBLIC_ROUTES.home}
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <AtlasLogo />
            </Link>

            <nav
              className="hidden items-center gap-7 lg:flex"
              aria-label={t('layout:public.nav.label')}
            >
              {NAV_ITEMS.map((item) => {
                const isCurrent = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={
                      isCurrent
                        ? 'rounded-sm text-sm font-medium text-foreground transition-colors duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                        : 'rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-normal hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    }
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeSwitcher />

            {isAuthenticated ? (
              <Button asChild size="sm" className="ms-2">
                <Link to={DASHBOARD_ROUTES.root}>
                  {t('layout:public.nav.getStarted')}
                </Link>
              </Button>
            ) : (
              <>
                {/* Sign in is the lower-priority action, so it stays text-only
                    and is hidden on the narrowest viewports where the drawer
                    carries it instead — never two competing filled buttons. */}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="ms-2 hidden sm:inline-flex"
                >
                  <Link to={AUTH_ROUTES.signIn}>
                    {t('layout:public.nav.signIn')}
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={AUTH_ROUTES.register}>
                    {t('layout:public.nav.getStarted')}
                  </Link>
                </Button>
              </>
            )}

            {/* Mobile navigation. `Sheet` (Radix Dialog) gives a real focus
                trap, Escape-to-close and scroll lock — the accessibility floor
                a hand-rolled dropdown usually misses. */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t('layout:public.nav.openMenu')}
                >
                  <Menu className="size-5" strokeWidth={1.75} aria-hidden />
                </Button>
              </SheetTrigger>

              {/*
                `Sheet` exposes only physical sides (`left`/`right`), so the
                inline-end side is resolved from the active direction rather
                than hardcoded — otherwise the Arabic drawer would fly in from
                the side opposite its own trigger button.
              */}
              <SheetContent
                side={isRtl ? 'left' : 'right'}
                className="w-[min(20rem,85vw)]"
              >
                {/* `SheetHeader` ships `sm:text-left`, a physical alignment
                    that mis-aligns Arabic. Overridden locally with the logical
                    property rather than editing the shared primitive, which the
                    dashboard also uses. */}
                <SheetHeader className="text-start sm:text-start">
                  <SheetTitle>{t('layout:public.nav.menuTitle')}</SheetTitle>
                </SheetHeader>

                <nav
                  className="mt-8 flex flex-col"
                  aria-label={t('layout:public.nav.label')}
                >
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={
                        location.pathname === item.to ? 'page' : undefined
                      }
                      /* min-h-11 = 44px — the touch-target floor. */
                      className="flex min-h-11 items-center border-b border-border text-base font-medium text-foreground transition-colors duration-normal hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </nav>

                {!isAuthenticated ? (
                  <div className="mt-8 flex flex-col gap-3">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={AUTH_ROUTES.signIn}>
                        {t('layout:public.nav.signIn')}
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to={AUTH_ROUTES.register}>
                        {t('layout:public.nav.getStarted')}
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-marketing px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
            <div className="flex max-w-[38ch] flex-col gap-3">
              <AtlasLogo />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('layout:public.footer.tagline')}
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 sm:gap-16">
              <nav
                aria-label={t('layout:public.footer.productGroup')}
                className="flex flex-col gap-3"
              >
                <h2 className="font-display text-sm font-semibold text-foreground">
                  {t('layout:public.footer.productGroup')}
                </h2>
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors duration-normal hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
              </nav>

              {/* Atlas's own legal links. Deliberately NOT added to tenant
                  academy websites — these govern the Atlas platform, not an
                  individual academy's relationship with its students. */}
              <nav
                aria-label={t('layout:public.footer.legal')}
                className="flex flex-col items-start gap-3"
              >
                <h2 className="font-display text-sm font-semibold text-foreground">
                  {t('layout:public.footer.legal')}
                </h2>
                <Link
                  to={PUBLIC_ROUTES.privacyPolicy}
                  className="rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors duration-normal hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t('legal:privacyPolicy')}
                </Link>
                <Link
                  to={PUBLIC_ROUTES.terms}
                  className="rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors duration-normal hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t('legal:terms')}
                </Link>
                {/* Reopens the consent dialog so a choice can always be
                    revisited — required for consent to be withdrawable. */}
                <CookiePreferencesButton />
              </nav>
            </div>
          </div>

          <p className="mt-10 border-t border-border pt-8 text-sm text-muted-foreground">
            {t('layout:public.footer.rights', {
              year: new Date().getFullYear(),
            })}
          </p>
        </div>
      </footer>
    </div>
  );
}
