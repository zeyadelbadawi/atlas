/**
 * Theme 1's "page not found" and "coming soon" (plan §C.0, §C.7): real
 * Theme 1 hero compositions, not generic system screens.
 *
 * - **404:** inside the Academy's Theme 1 chrome. A large brand-tinted
 *   "404", a clear title, and the next useful places (Home, Courses,
 *   Contact).
 * - **Coming Soon:** before the website is published. Only the Academy's
 *   identity and public colours are known (the hostname lookup's
 *   `presentation`), so it shows the logo or name and a warm holding
 *   message on the brand composition — no invented dates, content or
 *   contact details.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { cn } from '@utils';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { resolvePagePath } from '../utils/link-resolution.utils';
import type {
  ThemeComingSoonProps,
  ThemeNotFoundProps,
} from '../theme-packs/theme-pack.types';
import { BrandShapePage, T1Heading, T1Link } from './t1-parts';

export function T1NotFound({
  pages,
  linkRenderer,
}: ThemeNotFoundProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const headingId = useId();
  const catalogHref = resolveCatalogHref(pages);
  const contact = pages.find((page) => page.coreType === 'contact');
  const contactHref = contact ? resolvePagePath(contact) : undefined;

  return (
    <section
      aria-labelledby={headingId}
      data-t1-page-hero="not-found"
      className="relative overflow-hidden bg-[var(--website-surface)] text-[var(--website-foreground)]"
    >
      <div
        className={cn(
          container,
          'grid min-h-[60vh] items-center gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
        )}
      >
        <div className="min-w-0 space-y-6">
          <p className="t1-eyebrow">{t('website:theme1.notFound.eyebrow')}</p>
          <T1Heading as="h1" id={headingId} size="display">
            {t('website:theme1.notFound.title')}
          </T1Heading>
          <p className="t1-lead">{t('website:theme1.notFound.description')}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <T1Link
              href={linkRenderer ? '/' : undefined}
              linkRenderer={linkRenderer}
              className="t1-cta t1-btn-lg"
            >
              {t('website:theme1.notFound.home')}
              <ArrowRight className="t1-arrow size-4" aria-hidden />
            </T1Link>
            {catalogHref ? (
              <T1Link
                href={linkRenderer ? catalogHref : undefined}
                linkRenderer={linkRenderer}
                className="t1-btn-secondary t1-btn-lg"
              >
                {t('website:theme1.notFound.courses')}
              </T1Link>
            ) : null}
            {contactHref ? (
              <T1Link
                href={linkRenderer ? contactHref : undefined}
                linkRenderer={linkRenderer}
                className="t1-link"
              >
                {t('website:theme1.notFound.contact')}
              </T1Link>
            ) : null}
          </div>
        </div>
        <div
          aria-hidden
          className="relative mx-auto hidden aspect-[13/9] w-full max-w-md sm:block"
        >
          <BrandShapePage className="inset-0 size-full" />
          <span className="absolute inset-0 flex items-center justify-center font-display text-[7rem] font-bold leading-none tracking-tight text-[var(--website-link)] md:text-[9rem]">
            404
          </span>
        </div>
      </div>
    </section>
  );
}

export function T1ComingSoon({
  academyName,
  academyLogo,
}: ThemeComingSoonProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <main
      aria-labelledby={headingId}
      data-testid="academy-coming-soon"
      data-t1-page-hero="coming-soon"
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[var(--website-surface)] px-4 py-16 text-[var(--website-foreground)] sm:px-6"
    >
      <BrandShapePage className="-end-40 -top-32 h-[26rem] w-[36rem] opacity-80" />
      <BrandShapePage className="-bottom-40 -start-44 hidden h-[22rem] w-[30rem] opacity-60 md:block" />
      <div className="relative mx-auto w-full max-w-2xl text-center">
        <div className="mb-10 flex justify-center">
          <div className="t1-card inline-flex min-h-24 min-w-24 max-w-full items-center justify-center px-8 py-6 shadow-[var(--t1-shadow-lift)]">
            {academyLogo ? (
              <img
                src={academyLogo}
                alt={academyName}
                className="h-14 w-auto max-w-[14rem] object-contain"
              />
            ) : (
              <span className="font-display text-xl font-bold" dir="auto">
                {academyName}
              </span>
            )}
          </div>
        </div>
        <p className="t1-eyebrow justify-center">
          {t('website:theme1.comingSoon.eyebrow')}
        </p>
        <T1Heading
          as="h1"
          id={headingId}
          size="display"
          className="mx-auto mt-4 max-w-xl"
        >
          {t('website:theme1.comingSoon.title', { name: academyName })}
        </T1Heading>
        <p className="t1-lead mx-auto mt-5">
          {t('website:theme1.comingSoon.description')}
        </p>
        <p className="mt-12 text-xs text-[var(--website-foreground-muted)]">
          {t('publicWebsite:comingSoon.attribution')}
        </p>
      </div>
    </main>
  );
}
