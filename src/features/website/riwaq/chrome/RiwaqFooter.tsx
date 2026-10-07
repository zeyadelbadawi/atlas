/**
 * Riwaq footer (plan §4, chrome): the deep ground — the crest and the
 * academy's name, then the Owner's link groups, the departments, the
 * contact details from the academy's identity and the social links, on
 * the page grid; the copyright line carries the platform attribution the
 * chrome hands in (never removable). Only resolvable links on the public
 * site; every link in previews.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAcademyIdentity, useCurrentYear, usePublicCourseCategories } from '@hooks';
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
import { RiwaqBand, RiwaqCrest } from '../riwaq-parts';
import '../riwaq-pages.css';

const TOP_CATEGORIES = 5;
const LONG_NAME = 24;

function formatAddress(address: AcademyAddress | undefined): string {
  if (!address) return '';
  return [address.street, address.city, address.state, address.postalCode, address.country]
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
    <div className="rwc-foot-col">
      <p className="rw-label">{title}</p>
      {children}
    </div>
  );
}

export function RiwaqFooter({
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
        className: 'rwc-foot-link',
        children: label,
      });
    }
    return (
      <button
        type="button"
        className="rwc-foot-link"
        onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
      >
        {label}
      </button>
    );
  };

  const usableLinks = (links: readonly WebsiteFooterLink[]) =>
    linkRenderer ? links.filter((link) => !!resolveWebsiteCtaHref(link, pages)) : links;
  const socialLinks = usableLinks(footer.socialLinks);
  const groups = footer.groups
    .map((group) => ({ ...group, links: usableLinks(group.links) }))
    .filter((group) => group.links.length > 0);

  const homePage = pages.find((page) => page.coreType === 'home');
  const homeLabel = t('website:chrome.homeLink', { name: academyName });
  const homeHref = linkRenderer && homePage ? resolvePagePath(homePage) : undefined;
  const name =
    homeHref && linkRenderer ? (
      linkRenderer({ href: homeHref, external: false, ariaLabel: homeLabel, children: academyName })
    ) : homePage && !linkRenderer ? (
      <button type="button" aria-label={homeLabel} onClick={() => onNavigate(homePage.id)}>
        {academyName}
      </button>
    ) : (
      academyName
    );

  const copyright =
    resolveLocalizedText(footer.copyrightText, locale) || `© ${currentYear} ${academyName}`;

  return (
    <RiwaqBand as="footer" ground="deep" className="rwc-foot">
      <div className="rw-grid">
        <div className="rwc-foot-id">
          {academyLogo ? (
            <img
              src={academyLogo}
              alt=""
              aria-hidden
              className="rwc-foot-logo"
            />
          ) : (
            <RiwaqCrest name={academyName} size="6rem" />
          )}
          <p
            className="rwc-foot-name"
            dir="auto"
            data-length={academyName.length > LONG_NAME ? 'long' : undefined}
          >
            {name}
          </p>
        </div>

        {groups.length > 0 || categories.length > 0 || hasContact || socialLinks.length > 0 ? (
          <div className="rwc-foot-cols">
            {groups.map((group) => (
              <FooterColumn key={group.id} title={resolveLocalizedText(group.title, locale)}>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.id}>{renderFooterLink(link)}</li>
                  ))}
                </ul>
              </FooterColumn>
            ))}
            {categories.length > 0 ? (
              <FooterColumn title={t('website:riwaq.chrome.departments')}>
                <ul>
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
                            className: 'rwc-foot-link',
                            children: <span dir="auto">{category.name}</span>,
                          })
                        ) : (
                          <span className="rwc-foot-link" dir="auto">
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
              <FooterColumn title={t('website:riwaq.chrome.contactColumn')}>
                <ul>
                  {email ? (
                    <li>
                      <a href={`mailto:${email}`} className="rwc-foot-link" dir="ltr">
                        {email.split('@')[0]}@<wbr />
                        {email.split('@').slice(1).join('@')}
                      </a>
                    </li>
                  ) : null}
                  {phone ? (
                    <li>
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="rwc-foot-link" dir="ltr">
                        {phone}
                      </a>
                    </li>
                  ) : null}
                  {address ? (
                    <li className="rwc-foot-address">
                      <span dir="auto">{address}</span>
                    </li>
                  ) : null}
                </ul>
              </FooterColumn>
            ) : null}
            {socialLinks.length > 0 ? (
              <FooterColumn title={t('website:riwaq.chrome.social')}>
                <ul aria-label={t('website:chrome.social')}>
                  {socialLinks.map((link) => (
                    <li key={link.id}>{renderFooterLink(link)}</li>
                  ))}
                </ul>
              </FooterColumn>
            ) : null}
          </div>
        ) : null}

        <div data-testid="website-footer-legal" className="rwc-foot-legal">
          <p>{copyright}</p>
          {attribution}
        </div>
      </div>
    </RiwaqBand>
  );
}
