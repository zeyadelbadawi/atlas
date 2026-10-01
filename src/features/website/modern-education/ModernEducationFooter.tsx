/**
 * Theme 1 footer (plan §C.1 "Footer").
 *
 * Brand · the Owner's link groups · top categories (live) · contact (the
 * Academy's own details, live). Four columns on desktop, two on tablets,
 * and on phones each column after the brand folds into a disclosure
 * (native `<details>`: keyboard- and screen-reader-operable with no
 * script). Columns with no data are left out rather than shown empty.
 *
 * The platform attribution arrives as a finished element and is rendered
 * as the last row — the theme positions it, it cannot remove or alter it.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@utils';
import {
  useAcademyIdentity,
  useCurrentYear,
  usePublicCourseCategories,
} from '@hooks';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { MIN_COURSE_CATEGORIES } from '../constants/website.constants';
import type { ThemeFooterProps } from '../theme-packs/theme-pack.types';
import type { AcademyAddress, WebsiteFooterLink } from '@types';

const TOP_CATEGORIES = 5;
const LINK_CLASS = 't1-footer-link t1-focus text-sm';

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

/** A titled column: a plain column from `sm` up, a disclosure below it. */
function FooterColumn({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <details className="group border-b border-[var(--website-border)] sm:hidden">
        <summary className="t1-focus flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-[var(--website-foreground)] [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="pb-4">{children}</div>
      </details>
      <div className="hidden sm:block">
        <p className="mb-4 text-sm font-semibold text-[var(--website-foreground)]">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

export function ModernEducationFooter({
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
  const container = useWebsiteContainerClass();
  const { locale } = usePublicWebsiteLocale();
  const { data: identity } = useAcademyIdentity(academyId);
  const { data: categoryData } = usePublicCourseCategories(academyId);

  const categories =
    (categoryData?.length ?? 0) >= MIN_COURSE_CATEGORIES
      ? categoryData!.slice(0, TOP_CATEGORIES)
      : [];
  const address = formatAddress(identity?.address);
  const hasContact =
    !!identity?.contactEmail || !!identity?.contactPhone || !!address;

  const renderFooterLink = (link: WebsiteFooterLink): JSX.Element => {
    const label = resolveLocalizedText(link.label, locale);
    const href = linkRenderer ? resolveWebsiteCtaHref(link, pages) : undefined;
    if (href) {
      return linkRenderer!({
        href,
        external: isExternalHref(href),
        className: LINK_CLASS,
        children: label,
      });
    }
    return (
      <button
        type="button"
        className={cn(LINK_CLASS, 'text-start')}
        onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
      >
        {label}
      </button>
    );
  };

  const linkList = (links: readonly WebsiteFooterLink[]) => (
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.id}>{renderFooterLink(link)}</li>
      ))}
    </ul>
  );

  const currentYear = useCurrentYear();
  const copyright =
    resolveLocalizedText(footer.copyrightText, locale) ||
    `© ${currentYear} ${academyName}`;

  return (
    <footer className="mt-auto border-t border-[var(--website-border)] bg-[var(--website-surface)] pb-6 pt-14 sm:pt-16">
      <div
        className={cn(
          container,
          'grid gap-x-10 gap-y-2 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]'
        )}
      >
        <div className="min-w-0 space-y-4 pb-6 sm:pb-0">
          {academyLogo ? (
            <img
              src={academyLogo}
              alt={academyName}
              className="h-10 w-auto max-w-[12rem] object-contain"
            />
          ) : (
            <p
              className="break-words font-display text-xl font-bold text-[var(--website-foreground)]"
              dir="auto"
            >
              {academyName}
            </p>
          )}
          {footer.socialLinks.length > 0 ? (
            <ul
              className="flex flex-wrap gap-x-5 gap-y-2"
              aria-label={t('website:chrome.social')}
            >
              {footer.socialLinks.map((link) => (
                <li key={link.id}>{renderFooterLink(link)}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {footer.groups.map((group) => (
          <FooterColumn
            key={group.id}
            title={resolveLocalizedText(group.title, locale)}
          >
            {linkList(group.links)}
          </FooterColumn>
        ))}

        {categories.length > 0 ? (
          <FooterColumn title={t('website:chrome.topCategories')}>
            <ul className="flex flex-col gap-3">
              {categories.map((category) => {
                const href = linkRenderer
                  ? resolveCatalogHref(pages, { category: category.id })
                  : undefined;
                return (
                  <li key={category.id}>
                    {href ? (
                      linkRenderer!({
                        href,
                        external: false,
                        className: LINK_CLASS,
                        children: <span dir="auto">{category.name}</span>,
                      })
                    ) : (
                      <span
                        className="text-sm text-[var(--website-foreground-muted)]"
                        dir="auto"
                      >
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
            <ul className="flex flex-col gap-3 text-sm">
              {identity?.contactEmail ? (
                <li className="flex items-start gap-2">
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                    aria-hidden
                  />
                  <a
                    href={`mailto:${identity.contactEmail}`}
                    className={LINK_CLASS}
                    dir="ltr"
                  >
                    {/* Wrap only after the "@", never mid-word. */}
                    {identity.contactEmail.split('@')[0]}@<wbr />
                    {identity.contactEmail.split('@').slice(1).join('@')}
                  </a>
                </li>
              ) : null}
              {identity?.contactPhone ? (
                <li className="flex items-start gap-2">
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                    aria-hidden
                  />
                  <a
                    href={`tel:${identity.contactPhone.replace(/[^\d+]/g, '')}`}
                    className={LINK_CLASS}
                    dir="ltr"
                  >
                    {identity.contactPhone}
                  </a>
                </li>
              ) : null}
              {address ? (
                <li className="flex items-start gap-2 text-[var(--website-foreground-muted)]">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-[var(--website-icon-fg)]"
                    aria-hidden
                  />
                  <span dir="auto">{address}</span>
                </li>
              ) : null}
            </ul>
          </FooterColumn>
        ) : null}
      </div>

      <div
        className={cn(
          container,
          'mt-10 border-t border-[var(--website-border)] pt-6'
        )}
      >
        <p className="text-center text-xs text-[var(--website-foreground-muted)] sm:text-start">
          {copyright}
        </p>
      </div>
      {attribution}
    </footer>
  );
}
