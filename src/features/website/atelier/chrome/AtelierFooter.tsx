/**
 * Atelier footer: the colophon (Reports/THEME_2_ATELIER_PLAN.md §5a
 * "Chrome").
 *
 * The academy's name set very large in the display face, then columns of
 * the Owner's link groups, the top categories (live) and the academy's own
 * contact details (live), and the copyright line. Columns with no data are
 * left out; on the public site a link to a hidden page is left out and a
 * group with none left disappears — the same rules as Theme 1's footer.
 *
 * The platform attribution arrives as a finished element and is rendered on
 * the copyright line: the theme places it, it cannot remove or alter it.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
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
import '../atelier-pages.css';

const TOP_CATEGORIES = 5;

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
      <p className="at-label mb-4">{title}</p>
      {children}
    </div>
  );
}

export function AtelierFooter({
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
        className: 'atp-footer-link',
        children: label,
      });
    }
    return (
      <button
        type="button"
        className="atp-footer-link"
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
    <footer data-env="deep" className="atp-footer" data-atelier-footer="">
      <div className="at-container">
        <div className="flex flex-col gap-6">
          {academyLogo ? (
            <img
              src={academyLogo}
              alt=""
              aria-hidden
              className="h-10 w-auto max-w-[12rem] object-contain"
            />
          ) : null}
          <p className="atp-colophon-name" dir="auto">
            {name}
          </p>
        </div>

        <hr className="at-rule my-10 md:my-14" />

        <div
          className={cn(
            'grid gap-x-10 gap-y-10 sm:grid-cols-2',
            'lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]'
          )}
        >
          {groups.map((group) => (
            <FooterColumn
              key={group.id}
              title={resolveLocalizedText(group.title, locale)}
            >
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.id}>{renderFooterLink(link)}</li>
                ))}
              </ul>
            </FooterColumn>
          ))}

          {categories.length > 0 ? (
            <FooterColumn title={t('website:chrome.topCategories')}>
              <ul className="flex flex-col gap-1">
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
                          className: 'atp-footer-link',
                          children: <span dir="auto">{category.name}</span>,
                        })
                      ) : (
                        <span className="atp-footer-link" dir="auto">
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
            <FooterColumn title={t('website:chrome.contact')}>
              <ul className="flex flex-col gap-1">
                {email ? (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="atp-footer-link"
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
                      className="atp-footer-link"
                      dir="ltr"
                    >
                      {phone}
                    </a>
                  </li>
                ) : null}
                {address ? (
                  <li className="pt-2 text-[0.9375rem] text-[var(--atelier-text-muted)]">
                    <span dir="auto">{address}</span>
                  </li>
                ) : null}
              </ul>
            </FooterColumn>
          ) : null}

          {socialLinks.length > 0 ? (
            <FooterColumn title={t('website:atelier.chrome.social')}>
              <ul
                className="flex flex-col gap-1"
                aria-label={t('website:chrome.social')}
              >
                {socialLinks.map((link) => (
                  <li key={link.id}>{renderFooterLink(link)}</li>
                ))}
              </ul>
            </FooterColumn>
          ) : null}
        </div>

        <div
          data-testid="website-footer-legal"
          className="mt-14 flex flex-col items-center gap-x-6 gap-y-2 border-t border-[var(--atelier-hairline)] pt-6 sm:flex-row sm:flex-wrap sm:justify-between"
        >
          <p className="text-center text-xs text-[var(--atelier-text-muted)] sm:text-start">
            {copyright}
          </p>
          {attribution}
        </div>
      </div>
    </footer>
  );
}
