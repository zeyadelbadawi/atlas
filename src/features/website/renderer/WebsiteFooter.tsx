/**
 * Website Footer.
 *
 * Three structural variants (`columns`/`simple`/`stacked`), same
 * token-driven-variant pattern as `WebsiteHeader`.
 */
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import { useWebsiteContainerClass } from './renderer-style.utils';
import { resolveWebsiteCtaHref, isExternalHref } from '../utils/link-resolution.utils';
import type { WebsiteFooterConfig, WebsiteFooterLink, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteFooterProps {
  readonly academyName: string;
  readonly footer: WebsiteFooterConfig;
  readonly pages: readonly WebsitePage[];
  readonly onNavigate: (pageId: string) => void;
  /** See `website-link-renderer.types.ts` — absent in every dashboard preview context, supplied only by the public runtime. */
  readonly linkRenderer?: WebsiteLinkRenderer;
}

function FooterLinkButton({
  link,
  pages,
  onNavigate,
  linkRenderer,
}: {
  readonly link: WebsiteFooterLink;
  readonly pages: readonly WebsitePage[];
  readonly onNavigate: (pageId: string) => void;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const className = 'text-start text-sm text-muted-foreground hover:text-foreground';
  const href = linkRenderer ? resolveWebsiteCtaHref(link, pages) : undefined;

  if (href) {
    return linkRenderer!({ href, external: isExternalHref(href), className, children: link.label });
  }

  return (
    <button
      type="button"
      onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
      className={className}
    >
      {link.label}
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
  const copyright =
    footer.copyrightText ?? `© ${new Date().getFullYear()} ${academyName}`;

  if (design.footerVariant === 'simple') {
    return (
      <footer className="border-t border-border py-8">
        <div className={`${container} flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-start`}>
          <p className="text-sm text-muted-foreground">{copyright}</p>
          <div className="flex flex-wrap items-center gap-4">
            {footer.groups.flatMap((group) => group.links).map((link) => (
              <FooterLinkButton
                key={link.id}
                link={link}
                pages={pages}
                onNavigate={onNavigate}
                linkRenderer={linkRenderer}
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
          <p className="font-display text-lg font-semibold text-foreground">{academyName}</p>
          <div className="flex flex-wrap justify-center gap-6">
            {footer.groups.flatMap((group) => group.links).map((link) => (
              <FooterLinkButton
                key={link.id}
                link={link}
                pages={pages}
                onNavigate={onNavigate}
                linkRenderer={linkRenderer}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{copyright}</p>
        </div>
      </footer>
    );
  }

  // columns
  return (
    <footer className="border-t border-border py-12">
      <div className={`${container} grid gap-8 sm:grid-cols-2 lg:grid-cols-4`}>
        <div className="space-y-2">
          <p className="font-display text-lg font-semibold text-foreground">{academyName}</p>
        </div>
        {footer.groups.map((group) => (
          <div key={group.id} className="space-y-3">
            <p className="text-sm font-medium text-foreground">{group.title}</p>
            <div className="flex flex-col gap-2">
              {group.links.map((link) => (
                <FooterLinkButton
                  key={link.id}
                  link={link}
                  pages={pages}
                  onNavigate={onNavigate}
                  linkRenderer={linkRenderer}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`${container} mt-8 border-t border-border pt-6`}>
        <p className="text-xs text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  );
}
