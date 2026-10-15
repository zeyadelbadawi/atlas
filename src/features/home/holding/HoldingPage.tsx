/**
 * The platform host's holding page — `/` (English) and `/ar` (Arabic).
 *
 * Owner decision D6 (14 Oct 2026): the legacy Atlas marketing site is
 * retired. Until its replacement ships (a static site switched on behind
 * `ATLAS_MARKETING_STATIC`, B1 — not built here), the platform's root
 * shows only this: the Atlas mark, one factual sentence, and links to
 * sign in, contact, the Privacy Policy and the Terms, plus the language
 * switch. Academy websites never reach it (`AppRouter` decides by host).
 *
 * SELF-CONTAINED ON PURPOSE. No `PublicLayout` (its header carries the
 * app's navigation), and its copy comes from `holding-page.copy.ts`, keyed
 * by the URL's language rather than the stored preference — so `/ar` is
 * Arabic for everyone and replacing the page later means deleting this
 * folder and the routes that mount it.
 *
 * NOT INDEXED: `noindex, follow` while it is mounted, so search engines
 * drop the page but still follow its links to the legal and contact
 * pages, which the static sitemap lists.
 *
 * Old links to the homepage contact form (`/#contact`) land on the form
 * itself.
 */
import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AtlasLogo } from '@components/branding';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@hooks';
import { AUTH_ROUTES, PUBLIC_ROUTES } from '@app/routes/route-paths';
import { CookiePreferencesButton } from '@features/legal';
import { HOLDING_PAGE_COPY, type HoldingPageLocale } from './holding-page.copy';

/** The document title on both languages (D6). */
export const HOLDING_PAGE_TITLE = 'Atlas';
/** Dropped from search results; its links are still followed. */
export const HOLDING_PAGE_ROBOTS = 'noindex, follow';
/** The contact form, opened on its sales topic. */
export const HOLDING_PAGE_CONTACT_HREF = `${PUBLIC_ROUTES.contact}?topic=sales`;

const HOME_BY_LOCALE: Record<HoldingPageLocale, string> = {
  en: PUBLIC_ROUTES.home,
  ar: PUBLIC_ROUTES.homeAr,
};

const LINK_CLASS =
  'rounded-sm underline-offset-4 transition-colors duration-normal hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Sets a `<meta name>` while the page is mounted; the returned function
 * puts back what was there (or removes the tag it added).
 */
function setMeta(name: string, content: string): () => void {
  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  const meta = existing ?? document.createElement('meta');
  const previous = existing?.getAttribute('content') ?? null;
  if (!existing) {
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
  return () => {
    if (!existing) meta.remove();
    else if (previous !== null) meta.setAttribute('content', previous);
  };
}

function useHoldingPageHead(description: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = HOLDING_PAGE_TITLE;
    const restore = [
      setMeta('robots', HOLDING_PAGE_ROBOTS),
      setMeta('description', description),
    ];
    return () => {
      document.title = previousTitle;
      restore.forEach((undo) => undo());
    };
  }, [description]);
}

export interface HoldingPageProps {
  readonly locale: HoldingPageLocale;
}

export default function HoldingPage({ locale }: HoldingPageProps): JSX.Element {
  const copy = HOLDING_PAGE_COPY[locale];
  const otherLocale: HoldingPageLocale = locale === 'en' ? 'ar' : 'en';
  const { setLanguage } = useLanguage();
  const location = useLocation();
  useHoldingPageHead(copy.sentence);

  // The marketing homepage's contact section, linked as `/#contact` until
  // D6: the same form, now its own page.
  if (location.hash === '#contact') {
    return <Navigate to={PUBLIC_ROUTES.contact} replace />;
  }

  return (
    <div
      lang={locale}
      dir={copy.direction}
      className="flex min-h-dvh flex-col bg-background text-foreground"
      data-testid="holding-page"
    >
      <div className="mx-auto flex h-layout-header w-full max-w-marketing items-center justify-end px-4 sm:px-6 lg:px-8">
        {/* Choosing a language here is a choice like the app's language
            menu, so it is remembered for the pages that follow. */}
        <Link
          to={HOME_BY_LOCALE[otherLocale]}
          lang={otherLocale}
          hrefLang={otherLocale}
          dir={HOLDING_PAGE_COPY[otherLocale].direction}
          onClick={() => setLanguage(otherLocale)}
          className={`${LINK_CLASS} inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground`}
        >
          {copy.otherLanguageName}
        </Link>
      </div>

      <main className="flex flex-1 items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-6">
          <h1 className="flex items-center gap-3">
            <AtlasLogo size="lg" markOnly decorative />
            <span className="font-display text-3xl font-semibold tracking-tight">
              {copy.productName}
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {copy.sentence}
          </p>
          <nav
            aria-label={copy.linksLabel}
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <Button asChild size="lg">
              <Link to={AUTH_ROUTES.signIn}>{copy.signIn}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={HOLDING_PAGE_CONTACT_HREF}>{copy.contact}</Link>
            </Button>
          </nav>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-marketing flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <nav
            aria-label={copy.legalLabel}
            className="flex flex-wrap gap-x-6 gap-y-3"
          >
            <Link to={PUBLIC_ROUTES.privacyPolicy} className={LINK_CLASS}>
              {copy.privacyPolicy}
            </Link>
            <Link to={PUBLIC_ROUTES.terms} className={LINK_CLASS}>
              {copy.terms}
            </Link>
          </nav>
          {/* Not a link: reopens the consent dialog, so a cookie choice
              can be withdrawn from every page. */}
          <CookiePreferencesButton className={LINK_CLASS} />
        </div>
      </footer>
    </div>
  );
}
