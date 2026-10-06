/**
 * Manara footer (Reports/THEME_3_MANARA_PLAN.md §3.11): a night block with
 * a slanted seam against the page above, the academy's name set large in
 * the display face, then the Owner's link groups, the top categories
 * (live), the academy's own contact details (live), the social links and
 * the copyright line. Columns with no data are left out; on the public
 * site a link to a hidden page is left out and a group with none left
 * disappears — the same rules as Theme 1's footer.
 *
 * The platform attribution arrives as a finished element and is rendered
 * on the copyright line: the theme places it, it cannot remove or alter it.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAcademyIdentity,
  useCurrentYear,
  usePublicCourseCategories,
} from '@hooks';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import {
  isExternalHref,
  resolvePagePath,
  resolveWebsiteCtaHref,
} from '@/features/website/utils/link-resolution.utils';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { MIN_COURSE_CATEGORIES } from '@/features/website/constants/website.constants';
import type { ThemeFooterProps } from '@/features/website/theme-packs/theme-pack.types';
import type { AcademyAddress, WebsiteFooterLink } from '@types';
import { ManaraBlock } from '../manara-parts';
import '../manara-pages.css';

const TOP_CATEGORIES = 5;

/** Names longer than this set a size smaller still, so they stay a signature, not a banner. */
const LONG_NAME = 24;

function formatAddress(address: AcademyAddress | undefined): string {
  if (!address) return '';
  return [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function FooterColumn({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="mn-label mn-muted mb-3">{title}</p>
      {children}
    </div>
  );
}

export function ManaraFooter({
  academyId,
  academyName,
  academyLogo,
  footer,
  pages,
  onNavigate,
  linkRenderer,
  attribution,
}: ThemeFooterProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const { data: identity } = useAcademyIdentity(academyId);
  const { data: categoryData } = usePublicCourseCategories(academyId);
  const currentYear = useCurrentYear();

  const categories =
    categoryData && categoryData.length >= MIN_COURSE_CATEGORIES
      ? categoryData.slice(0, TOP_CATEGORIES)
      : [];
  const address = formatAddress(identity?.address);
  const email = identity?.contactEmail;
  const phone = identity?.contactPhone;
  const hasContact = !!email || !!phone || !!address;

  const renderFooterLink = (link: WebsiteFooterLink): JSX.Element | null => {
    const label = resolveLocalizedText(link.label, locale);
    if (linkRenderer) {
      const href = resolveWebsiteCtaHref(link, pages);
      if (!href) return null;
      return linkRenderer({
        href,
        external: isExternalHref(href),
        className: 'mnp-footer-link',
        children: label,
      });
    }
    return (
      <button
        type="button"
        className="mnp-footer-link"
        onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
      >
        {label}
      </button>
    );
  };

  /** All links in previews; only resolvable ones on the public site. */
  const usableLinks = (links: readonly WebsiteFooterLink[]) =>
    linkRenderer
      ? links.filter((link) => !!resolveWebsiteCtaHref(link, pages))
      : links;
  const socialLinks = usableLinks(footer.socialLinks);
  const groups = footer.groups
    .map((group) => ({ ...group, links: usableLinks(group.links) }))
    .filter((group) => group.links.length > 0);

  // The name leads to this Academy's Home, as in the header — only while
  // Home is a visible page.
  const homePage = pages.find((page) => page.coreType === 'home');
  const homeLabel = t('website:chrome.homeLink', { name: academyName });
  const homeHref =
    linkRenderer && homePage ? resolvePagePath(homePage) : undefined;
  const name =
    homeHref && linkRenderer ? (
      linkRenderer({
        href: homeHref,
        external: false,
        ariaLabel: homeLabel,
        children: academyName,
      })
    ) : homePage && !linkRenderer ? (
      <button
        type="button"
        aria-label={homeLabel}
        onClick={() => onNavigate(homePage.id)}
      >
        {academyName}
      </button>
    ) : (
      academyName
    );

  const copyright =
    resolveLocalizedText(footer.copyrightText, locale) ||
    `© ${currentYear} ${academyName}`;

  return (
    <ManaraBlock as="footer" env="night" seamTop className="mnp-footer">
      <div className="flex flex-col gap-6">
        {academyLogo ? (
          <img
            src={academyLogo}
            alt=""
            aria-hidden
            className="h-10 w-auto max-w-[12rem] object-contain"
          />
        ) : null}
        <p
          className="mnp-footer-name"
          dir="auto"
          data-length={academyName.length > LONG_NAME ? 'long' : undefined}
        >
          {name}
        </p>
      </div>

      {groups.length > 0 ||
      categories.length > 0 ||
      hasContact ||
      socialLinks.length > 0 ? (
        <div className="mnp-footer-columns">
          {groups.map((group) => (
            <FooterColumn
              key={group.id}
              title={resolveLocalizedText(group.title, locale)}
            >
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.id}>{renderFooterLink(link)}</li>
                ))}
              </ul>
            </FooterColumn>
          ))}

          {categories.length > 0 ? (
            <FooterColumn title={t('website:chrome.topCategories')}>
              <ul className="flex flex-col">
                {categories.map((category) => {
                  const href = linkRenderer
                    ? resolveCatalogHref(pages, { category: category.id })
                    : undefined;
                  return (
                    <li key={category.id}>
                      {href && linkRenderer ? (
                        linkRenderer({
                          href,
                          external: false,
                          className: 'mnp-footer-link',
                          children: <span dir="auto">{category.name}</span>,
                        })
                      ) : (
                        <span className="mnp-footer-link" dir="auto">
                          {category.name}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </FooterColumn>
          ) : null}

          {hasContact ? (
            <FooterColumn title={t('website:manara.chrome.contactColumn')}>
              <ul className="flex flex-col">
                {email ? (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="mnp-footer-link"
                      dir="ltr"
                    >
                      {/* Wrap only after the "@", never mid-word. */}
                      {email.split('@')[0]}@<wbr />
                      {email.split('@').slice(1).join('@')}
                    </a>
                  </li>
                ) : null}
                {phone ? (
                  <li>
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                      className="mnp-footer-link"
                      dir="ltr"
                    >
                      {phone}
                    </a>
                  </li>
                ) : null}
                {address ? (
                  <li className="mn-muted pt-2 text-[0.9375rem] leading-relaxed">
                    <span dir="auto">{address}</span>
                  </li>
                ) : null}
              </ul>
            </FooterColumn>
          ) : null}

          {socialLinks.length > 0 ? (
            <FooterColumn title={t('website:manara.chrome.social')}>
              <ul
                className="flex flex-col"
                aria-label={t('website:chrome.social')}
              >
                {socialLinks.map((link) => (
                  <li key={link.id}>{renderFooterLink(link)}</li>
                ))}
              </ul>
            </FooterColumn>
          ) : null}
        </div>
      ) : null}

      <div data-testid="website-footer-legal" className="mnp-footer-legal">
        <p>{copyright}</p>
        {attribution}
      </div>
    </ManaraBlock>
  );
}
