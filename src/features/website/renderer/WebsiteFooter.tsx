/**
 * Website Footer.
 *
 * Three structural variants (`columns`/`simple`/`stacked`), same
 * token-driven-variant pattern as `WebsiteHeader`.
 */
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import { useWebsiteContainerClass } from './renderer-style.utils';
import type { WebsiteFooterConfig } from '@types';

export interface WebsiteFooterProps {
  readonly academyName: string;
  readonly footer: WebsiteFooterConfig;
  readonly onNavigate: (pageId: string) => void;
}

function FooterLinkButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick?: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-start text-sm text-muted-foreground hover:text-foreground"
    >
      {label}
    </button>
  );
}

export function WebsiteFooter({ academyName, footer, onNavigate }: WebsiteFooterProps): JSX.Element {
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
                label={link.label}
                onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
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
                label={link.label}
                onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
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
                  label={link.label}
                  onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
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
