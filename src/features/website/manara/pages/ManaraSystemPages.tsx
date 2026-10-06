/**
 * Manara "page not found" and Coming Soon as night posters
 * (Reports/THEME_3_MANARA_PLAN.md §3.11).
 *
 * - **404:** inside the Academy's chrome. A giant "404" in the locale's
 *   digits (decorative), the title, and the next useful places — Home, the
 *   catalogue and Contact when those pages are visible — exactly the links
 *   Theme 1 offers.
 * - **Coming Soon:** before the website is published, only the Academy's
 *   identity and public colours are known, so the poster carries the logo
 *   and the name set giant, with a holding line — no invented dates,
 *   content or contacts.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { resolvePagePath } from '@/features/website/utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type {
  ThemeComingSoonProps,
  ThemeNotFoundProps,
} from '@/features/website/theme-packs/theme-pack.types';
import {
  ManaraArrow,
  ManaraBlock,
  ManaraHeading,
  ManaraLink,
  ManaraNumeral,
  formatManaraNumber,
  manaraEnter,
} from '../manara-parts';
import '../manara-pages.css';

export function ManaraNotFound({
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
    <ManaraBlock
      env="night"
      beam="centre"
      labelledBy={headingId}
      className="mnp-poster"
    >
      <div
        data-manara-poster="not-found"
        className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10"
      >
        <p aria-hidden className="mnp-poster-figure lg:col-span-6">
          <ManaraNumeral value={formatManaraNumber(404, locale)} />
        </p>
        <div className="grid min-w-0 gap-5 lg:col-span-6 lg:pb-4">
          <p className="mn-label mn-muted">
            {t('website:manara.pages.notFound.eyebrow')}
          </p>
          <ManaraHeading as="h1" id={headingId} size="title">
            {t('website:manara.pages.notFound.title')}
          </ManaraHeading>
          <p
            className={cn('mn-lead mn-muted', manaraEnter(0).className)}
            style={manaraEnter(0).style}
          >
            {t('website:manara.pages.notFound.description')}
          </p>
          <div
            className={cn(
              'flex flex-wrap items-center gap-3 pt-2',
              manaraEnter(1).className
            )}
            style={manaraEnter(1).style}
          >
            <ManaraLink
              href={linkRenderer ? '/' : undefined}
              linkRenderer={linkRenderer}
              className="mn-btn mn-btn-lg"
            >
              {t('website:manara.pages.notFound.home')}
              <ManaraArrow />
            </ManaraLink>
            {catalogHref ? (
              <ManaraLink
                href={linkRenderer ? catalogHref : undefined}
                linkRenderer={linkRenderer}
                className="mn-btn mn-btn-outline mn-btn-lg"
              >
                {t('website:manara.pages.notFound.courses')}
              </ManaraLink>
            ) : null}
            {contactHref ? (
              <ManaraLink
                href={linkRenderer ? contactHref : undefined}
                linkRenderer={linkRenderer}
                className="mn-link min-h-11 px-2"
              >
                {t('website:manara.pages.notFound.contact')}
              </ManaraLink>
            ) : null}
          </div>
        </div>
      </div>
    </ManaraBlock>
  );
}

export function ManaraComingSoon({
  academyName,
  academyLogo,
}: ThemeComingSoonProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <main
      aria-labelledby={headingId}
      data-testid="academy-coming-soon"
      data-manara-poster="coming-soon"
      className="mnp-coming-soon"
    >
      <ManaraBlock as="div" env="night" beam="centre" className="mnp-poster">
        <div className="flex min-h-[60dvh] flex-col justify-between gap-12">
          <div className="flex items-center justify-between gap-6">
            {academyLogo ? (
              <img
                src={academyLogo}
                alt={academyName}
                className="h-10 w-auto max-w-[12rem] object-contain"
              />
            ) : (
              <span className="mnp-wordmark" dir="auto">
                {academyName}
              </span>
            )}
            <p className="mn-label mn-muted">
              {t('website:manara.pages.comingSoon.eyebrow')}
            </p>
          </div>
          <div className="grid max-w-5xl gap-6">
            <p aria-hidden className="mnp-poster-name" dir="auto">
              {academyName}
            </p>
            <ManaraHeading as="h1" id={headingId} size="title">
              {t('website:manara.pages.comingSoon.title', {
                name: academyName,
              })}
            </ManaraHeading>
            <p
              className={cn('mn-lead mn-muted', manaraEnter(0).className)}
              style={manaraEnter(0).style}
            >
              {t('website:manara.pages.comingSoon.description')}
            </p>
          </div>
          <p className="mn-muted text-xs">
            {t('publicWebsite:comingSoon.attribution')}
          </p>
        </div>
      </ManaraBlock>
    </main>
  );
}
