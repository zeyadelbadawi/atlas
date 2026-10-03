/**
 * Website Footer.
 *
 * Three structural variants (`columns`/`simple`/`stacked`), same
 * token-driven-variant pattern as `WebsiteHeader`.
 */
import type { ReactNode } from 'react';
import { AtlasPlatformAttribution } from '@components/branding';
import { cn } from '@utils';
import { useCurrentYear } from '@hooks';
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import { useWebsiteContainerClass } from './renderer-style.utils';
import {
  resolveWebsiteCtaHref,
  isExternalHref,
} from '../utils/link-resolution.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { usePublicWebsiteLocale } from './PublicWebsiteLocaleContext';
import type {
  WebsiteFooterConfig,
  WebsiteFooterLink,
  WebsitePage,
} from '@types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteFooterProps {
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly footer: WebsiteFooterConfig;
  readonly pages: readonly WebsitePage[];
  readonly onNavigate: (pageId: string) => void;

  /** See `website-link-renderer.types.ts` — absent in every dashboard preview context, supplied only by the public runtime. */
  readonly linkRenderer?: WebsiteLinkRenderer;
}

/**
 * The footer's closing line: the Academy's copyright with the mandatory
 * Atlas attribution beside it (Phase 6: platform-owned, rendered from
 * component code, no CMS field or prop can hide it).
 *
 * It used to be a separate bordered row under the copyright, which read as
 * a second footer stacked beneath the Academy's. It now shares the
 * copyright's line on wide screens and stacks under it, centred, on phones
 * — part of the Academy's footer, visually secondary to its identity.
 */
export function FooterLegalLine({
  copyright,
  className,
}: {
  readonly copyright: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <div
      data-testid="website-footer-legal"
      className={cn(
        'flex flex-col items-center gap-x-4 gap-y-1.5 sm:flex-row sm:flex-wrap',
        className
      )}
    >
      {copyright}
      <AtlasPlatformAttribution className="shrink-0" />
    </div>
  );
}

function FooterLinkButton({
  link,
  pages,
  onNavigate,
  linkRenderer,
  locale,
}: {
  readonly link: WebsiteFooterLink;
  readonly pages: readonly WebsitePage[];
  readonly onNavigate: (pageId: string) => void;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly locale: PublicWebsiteLocale;
}): JSX.Element {
  const className =
    'text-start text-sm text-muted-foreground hover:text-foreground';
  const href = linkRenderer ? resolveWebsiteCtaHref(link, pages) : undefined;
  const label = resolveLocalizedText(link.label, locale);

  if (href) {
    return linkRenderer!({
      href,
      external: isExternalHref(href),
      className,
      children: label,
    });
  }

  return (
    <button
      type="button"
      onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
      className={className}
    >
      {label}
    </button>
  );
}

export function WebsiteFooter({
  academyName,
  footer,
  pages,
  onNavigate,
  linkRenderer,
}: WebsiteFooterProps): JSX.Element {
  const design = useWebsiteDesignSystem();
  const container = useWebsiteContainerClass();
  const { locale } = usePublicWebsiteLocale();
  const currentYear = useCurrentYear();
  const copyright =
    resolveLocalizedText(footer.copyrightText, locale) ||
    `© ${currentYear} ${academyName}`;

  // `footer.groups` (titled link columns) and `footer.socialLinks` (the
  // flat list the settings UI's "Social links" section actually edits)
  // are two independent arrays. Every variant used to render only
  // `groups`, so social links an admin added always saved correctly but
  // never appeared anywhere on the public site.
  const groupLinks = footer.groups.flatMap((group) => group.links);

  if (design.footerVariant === 'simple') {
    return (
      <footer className="border-t border-border py-8">
        <div
          className={`${container} flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-start`}
        >
          <FooterLegalLine
            copyright={
              <p className="text-sm text-muted-foreground">{copyright}</p>
            }
          />
          <div className="flex flex-wrap items-center gap-4">
            {[...groupLinks, ...footer.socialLinks].map((link) => (
              <FooterLinkButton
                key={link.id}
                link={link}
                pages={pages}
                onNavigate={onNavigate}
                linkRenderer={linkRenderer}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </footer>
    );
  }

  if (design.footerVariant === 'stacked') {
    return (
      <footer className="border-t border-border py-12">
        <div className={`${container} space-y-8 text-center`}>
          <p
            className="font-display text-lg font-semibold text-foreground"
            dir="auto"
          >
            {academyName}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {[...groupLinks, ...footer.socialLinks].map((link) => (
              <FooterLinkButton
                key={link.id}
                link={link}
                pages={pages}
                onNavigate={onNavigate}
                linkRenderer={linkRenderer}
                locale={locale}
              />
            ))}
          </div>
          <FooterLegalLine
            className="sm:justify-center"
            copyright={
              <p className="text-xs text-muted-foreground">{copyright}</p>
            }
          />
        </div>
      </footer>
    );
  }

  // columns
  return (
    <footer className="border-t border-border py-12">
      {/* `auto-fit`/`minmax`, not fixed `sm:grid-cols-2 lg:grid-cols-4` — an
          Academy with only 1-2 configured link groups never reserves empty
          desktop columns next to the brand column. */}
      <div
        className={`${container} grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-8`}
      >
        <div className="min-w-0 space-y-2">
          <p
            className="break-words font-display text-lg font-semibold text-foreground"
            dir="auto"
          >
            {academyName}
          </p>
        </div>
        {footer.groups.map((group) => (
          <div key={group.id} className="min-w-0 space-y-3">
            <p className="break-words text-sm font-medium text-foreground">
              {resolveLocalizedText(group.title, locale)}
            </p>
            <div className="flex flex-col gap-2">
              {group.links.map((link) => (
                <FooterLinkButton
                  key={link.id}
                  link={link}
                  pages={pages}
                  onNavigate={onNavigate}
                  linkRenderer={linkRenderer}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        className={`${container} mt-8 flex flex-col items-center gap-3 border-t border-border pt-6 text-center sm:flex-row sm:justify-between sm:text-start`}
      >
        <FooterLegalLine
          copyright={
            <p className="text-xs text-muted-foreground">{copyright}</p>
          }
        />
        {footer.socialLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            {footer.socialLinks.map((link) => (
              <FooterLinkButton
                key={link.id}
                link={link}
                pages={pages}
                onNavigate={onNavigate}
                linkRenderer={linkRenderer}
                locale={locale}
              />
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
