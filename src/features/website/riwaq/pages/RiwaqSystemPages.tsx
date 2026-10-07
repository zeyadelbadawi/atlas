/**
 * Riwaq "page not found" and Coming Soon (plan §4, system pages).
 *
 * - **404:** inside the Academy's chrome — a photograph window of a
 *   corridor turning a corner, "404" set as a light ledger figure
 *   (decorative), the title and the next useful places: Home, the
 *   catalogue and Contact when those pages are visible.
 * - **Coming Soon:** before the website is published only the Academy's
 *   identity and public colours are known — the crest, the name, a holding
 *   line and a photograph of a hall being prepared; no invented dates,
 *   content or contacts.
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
  RiwaqArrow,
  RiwaqBand,
  RiwaqCrest,
  RiwaqHeading,
  RiwaqLink,
  RiwaqWindow,
  formatRiwaqNumber,
  riwaqEnter,
} from '../riwaq-parts';
import '../riwaq-pages.css';

const NOT_FOUND_IMAGE = 'theme-asset:riwaq/not-found';
const COMING_SOON_IMAGE = 'theme-asset:riwaq/coming-soon';

export function RiwaqNotFound({ pages, linkRenderer }: ThemeNotFoundProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const catalogHref = resolveCatalogHref(pages);
  const contact = pages.find((page) => page.coreType === 'contact');
  const contactHref = contact ? resolvePagePath(contact) : undefined;
  return (
    <RiwaqBand labelledBy={headingId} className="rwp-system">
      <div data-riwaq-poster="not-found" className="rw-grid rwp-system-grid">
        <RiwaqWindow
          priority
          value={NOT_FOUND_IMAGE}
          alt=""
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="rwp-system-window aspect-[3/2]"
        />
        <div className="rwp-system-copy">
          <p aria-hidden className="rw-figure rwp-system-figure">
            {formatRiwaqNumber(404, locale)}
          </p>
          <p className="rw-label" data-mark="">
            {t('website:riwaq.pages.notFound.eyebrow')}
          </p>
          <RiwaqHeading as="h1" id={headingId}>
            {t('website:riwaq.pages.notFound.title')}
          </RiwaqHeading>
          <p className={`rw-lead ${riwaqEnter(0).className}`} style={riwaqEnter(0).style}>
            {t('website:riwaq.pages.notFound.description')}
          </p>
          <div className={`rwh-hero-actions ${riwaqEnter(1).className}`} style={riwaqEnter(1).style}>
            <RiwaqLink href={linkRenderer ? '/' : undefined} linkRenderer={linkRenderer} className="rw-btn rw-btn-lg">
              {t('website:riwaq.pages.notFound.home')}
              <RiwaqArrow />
            </RiwaqLink>
            {catalogHref ? (
              <RiwaqLink
                href={linkRenderer ? catalogHref : undefined}
                linkRenderer={linkRenderer}
                className="rw-btn rw-btn-line rw-btn-lg"
              >
                {t('website:riwaq.pages.notFound.courses')}
              </RiwaqLink>
            ) : null}
            {contactHref ? (
              <RiwaqLink
                href={linkRenderer ? contactHref : undefined}
                linkRenderer={linkRenderer}
                className="rw-link"
              >
                {t('website:riwaq.pages.notFound.contact')}
              </RiwaqLink>
            ) : null}
          </div>
        </div>
      </div>
    </RiwaqBand>
  );
}

export function RiwaqComingSoon({ academyName, academyLogo }: ThemeComingSoonProps): JSX.Element {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <main
      aria-labelledby={headingId}
      data-testid="academy-coming-soon"
      data-riwaq-poster="coming-soon"
      className="rwp-coming-soon"
    >
      <RiwaqBand as="div" className="rwp-system">
        <div className="rw-grid rwp-system-grid">
          <div className="rwp-system-copy">
            <div className="rwp-coming-id">
              {academyLogo ? (
                <img src={academyLogo} alt={academyName} className="rwp-coming-logo" />
              ) : (
                <RiwaqCrest name={academyName} size="clamp(6rem, 4rem + 6vw, 9rem)" />
              )}
              <p className="rw-label" data-mark="">
                {t('website:riwaq.pages.comingSoon.eyebrow')}
              </p>
            </div>
            <RiwaqHeading as="h1" id={headingId} size="display">
              {t('website:riwaq.pages.comingSoon.title', { name: academyName })}
            </RiwaqHeading>
            <p className={`rw-lead ${riwaqEnter(0).className}`} style={riwaqEnter(0).style}>
              {t('website:riwaq.pages.comingSoon.description')}
            </p>
            <p className="rw-label">{t('publicWebsite:comingSoon.attribution')}</p>
          </div>
          <RiwaqWindow
            priority
            value={COMING_SOON_IMAGE}
            alt=""
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="rwp-system-window aspect-[4/3] lg:aspect-[16/9]"
          />
        </div>
      </RiwaqBand>
    </main>
  );
}
