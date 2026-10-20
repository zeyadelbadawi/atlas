/**
 * B1 (DL-50) — a marketing page reached INSIDE the app.
 *
 * The platform host's marketing pages (`STATIC_MARKETING_ROUTES`: `/`,
 * `/pricing`, `/ar/...`) are static HTML the edge serves on a full page
 * load (Caddyfile, `@marketing_page`); the app has no copy of them. When
 * an in-app link or a client-side redirect lands on one, this reloads the
 * document once (`location.replace`, so Back is not doubled) and the
 * browser receives the static page.
 *
 * If the reload comes back to the app — the static site switched off
 * (`ATLAS_MARKETING_STATIC=off`, where the edge also marks `/` and `/ar`
 * noindex), or a dev server with no marketing build — the guard
 * (`static-marketing-reload.ts`) refuses a second reload and a minimal
 * page is shown instead: the product name, a link to try the page again,
 * sign in, contact and the legal pages. Never a loop.
 *
 * The old homepage contact anchor (`/#contact`) opens the contact form.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AUTH_ROUTES, PUBLIC_ROUTES } from './route-paths';
import {
  claimStaticMarketingReload,
  sessionStorageOrNull,
} from './static-marketing-reload';

type FallbackLocale = 'en' | 'ar';

const FALLBACK_COPY: Record<
  FallbackLocale,
  {
    readonly direction: 'ltr' | 'rtl';
    readonly productName: string;
    readonly sentence: string;
    readonly openPage: string;
    readonly signIn: string;
    readonly contact: string;
    readonly privacyPolicy: string;
    readonly terms: string;
    readonly legalLabel: string;
  }
> = {
  en: {
    direction: 'ltr',
    productName: 'Atlas',
    sentence: 'Atlas is a platform for running an online academy.',
    openPage: 'Open this page',
    signIn: 'Sign in',
    contact: 'Contact',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms of Service',
    legalLabel: 'Legal',
  },
  ar: {
    direction: 'rtl',
    productName: 'أطلس',
    // Needs a native Arabic review before release (as the D6 holding page's).
    sentence: 'أطلس منصة لإدارة أكاديمية عبر الإنترنت.',
    openPage: 'افتح هذه الصفحة',
    signIn: 'تسجيل الدخول',
    contact: 'تواصل معنا',
    privacyPolicy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    legalLabel: 'الشؤون القانونية',
  },
};

const LINK_CLASS =
  'rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function reloadDocument(): void {
  window.location.replace(window.location.href);
}

export interface StaticMarketingRedirectProps {
  /** Test seam; defaults to `location.replace(location.href)`. */
  readonly reload?: () => void;
}

export function StaticMarketingRedirect({
  reload = reloadDocument,
}: StaticMarketingRedirectProps): JSX.Element {
  const { pathname, search, hash } = useLocation();
  const contactAnchor = hash === '#contact';
  const [reloading] = useState(
    () =>
      !contactAnchor &&
      claimStaticMarketingReload(sessionStorageOrNull(), pathname, Date.now())
  );

  useEffect(() => {
    if (reloading) reload();
  }, [reloading, reload]);

  // The old homepage contact section (`/#contact`) is its own page now.
  if (contactAnchor) {
    return <Navigate to={`${PUBLIC_ROUTES.contact}${search}`} replace />;
  }
  if (reloading) {
    return <div role="status" aria-busy="true" className="min-h-dvh" />;
  }

  const locale: FallbackLocale =
    pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : 'en';
  const copy = FALLBACK_COPY[locale];
  return (
    <div
      lang={locale}
      dir={copy.direction}
      className="flex min-h-dvh flex-col bg-background text-foreground"
      data-testid="static-marketing-fallback"
    >
      <main className="flex flex-1 items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {copy.productName}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {copy.sentence}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-base font-medium">
            {/* A plain link: a full page load, which the edge answers with
                the static page whenever it is on. */}
            <a href={`${pathname}${search}`} className={LINK_CLASS}>
              {copy.openPage}
            </a>
            <Link to={AUTH_ROUTES.signIn} className={LINK_CLASS}>
              {copy.signIn}
            </Link>
            <Link
              to={`${PUBLIC_ROUTES.contact}?topic=sales`}
              className={LINK_CLASS}
            >
              {copy.contact}
            </Link>
          </nav>
        </div>
      </main>
      <footer className="border-t border-border">
        <nav
          aria-label={copy.legalLabel}
          className="mx-auto flex w-full max-w-xl flex-wrap gap-x-6 gap-y-3 px-4 py-6 text-sm text-muted-foreground"
        >
          <Link to={PUBLIC_ROUTES.privacyPolicy} className={LINK_CLASS}>
            {copy.privacyPolicy}
          </Link>
          <Link to={PUBLIC_ROUTES.terms} className={LINK_CLASS}>
            {copy.terms}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
