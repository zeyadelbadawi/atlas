/**
 * Atelier "page not found" and Coming Soon as typographic posters
 * (Reports/THEME_2_ATELIER_PLAN.md §5a "Chrome").
 *
 * - **404:** inside the Academy's chrome. A huge display "404" (decorative),
 *   the title, and the next useful places — Home, the catalog and Contact
 *   when those pages are visible — exactly the links Theme 1 offers.
 * - **Coming Soon:** before the website is published, only the Academy's
 *   identity and public colours are known, so the poster carries the logo
 *   or name and a holding line — no invented dates, content or contacts.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { resolvePagePath } from '@/features/website/utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type {
  ThemeComingSoonProps,
  ThemeNotFoundProps,
} from '@/features/website/theme-packs/theme-pack.types';
import {
  AtelierArrow,
  AtelierChapter,
  AtelierHeading,
  AtelierLink,
  formatAtelierNumber,
} from '../atelier-parts';
import '../atelier-pages.css';

export function AtelierNotFound({
  pages,
  linkRenderer,
}: ThemeNotFoundProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const catalogHref = resolveCatalogHref(pages);
  const contact = pages.find((page) => page.coreType === 'contact');
  const contactHref = contact ? resolvePagePath(contact) : undefined;

  return (
    <AtelierChapter
      labelledBy={headingId}
      thread="none"
      className="min-h-[70vh]"
    >
      <div
        data-atelier-poster="not-found"
        className="grid gap-10 lg:grid-cols-12 lg:items-end"
      >
        <p aria-hidden className="atp-poster-figure lg:col-span-7">
          {formatAtelierNumber(404, locale)}
        </p>
        <div className="min-w-0 space-y-6 lg:col-span-5 lg:pb-6">
          <p className="at-label at-label-brand">
            {t('website:atelier.pages.notFound.eyebrow')}
          </p>
          <AtelierHeading as="h1" id={headingId} size="title">
            {t('website:atelier.pages.notFound.title')}
          </AtelierHeading>
          <hr className="atp-poster-rule" />
          <p className="at-lead">
            {t('website:atelier.pages.notFound.description')}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
            <AtelierLink
              href={linkRenderer ? '/' : undefined}
              linkRenderer={linkRenderer}
              className="at-btn at-btn-lg"
            >
              {t('website:atelier.pages.notFound.home')}
              <AtelierArrow />
            </AtelierLink>
            {catalogHref ? (
              <AtelierLink
                href={linkRenderer ? catalogHref : undefined}
                linkRenderer={linkRenderer}
                className="at-btn-ghost at-btn-lg"
              >
                {t('website:atelier.pages.notFound.courses')}
              </AtelierLink>
            ) : null}
            {contactHref ? (
              <AtelierLink
                href={linkRenderer ? contactHref : undefined}
                linkRenderer={linkRenderer}
                className="at-link"
              >
                {t('website:atelier.pages.notFound.contact')}
              </AtelierLink>
            ) : null}
          </div>
        </div>
      </div>
    </AtelierChapter>
  );
}

export function AtelierComingSoon({
  academyName,
  academyLogo,
}: ThemeComingSoonProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <main
      aria-labelledby={headingId}
      data-testid="academy-coming-soon"
      data-atelier-poster="coming-soon"
      data-env="paper"
      className="flex min-h-[100dvh] flex-col"
    >
      <div className="at-container flex flex-1 flex-col justify-between gap-16 py-10 md:py-14">
        <div className="flex items-center justify-between gap-6 border-b border-[var(--atelier-hairline)] pb-6">
          {academyLogo ? (
            <img
              src={academyLogo}
              alt={academyName}
              className="h-10 w-auto max-w-[12rem] object-contain"
            />
          ) : (
            <span className="atp-wordmark" dir="auto">
              {academyName}
            </span>
          )}
          <p className="at-label at-label-brand">
            {t('website:atelier.pages.comingSoon.eyebrow')}
          </p>
        </div>
        <div className="max-w-5xl space-y-8">
          <AtelierHeading as="h1" id={headingId} size="display">
            {t('website:atelier.pages.comingSoon.title', { name: academyName })}
          </AtelierHeading>
          <hr className="atp-poster-rule" />
          <p className="at-lead">
            {t('website:atelier.pages.comingSoon.description')}
          </p>
        </div>
        <p className="text-xs text-[var(--atelier-text-muted)]">
          {t('publicWebsite:comingSoon.attribution')}
        </p>
      </div>
    </main>
  );
}
