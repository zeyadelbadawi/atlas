/**
 * Website Header.
 *
 * Three structural variants (`standard`/`centered`/`minimal`), driven by
 * the active `WebsiteThemeTokens.headerVariant` — never a per-theme
 * bespoke header component. Navigation items and the CTA are content
 * (`WebsiteNavigationItem[]`/`WebsiteHeaderConfig`), resolved against the
 * page list the caller already has — this component never fetches
 * anything itself.
 *
 * `onNavigate(pageId)` remains the callback every dashboard preview
 * context uses to switch the previewed page in place. Prompt 11's public
 * runtime additionally supplies `linkRenderer`, which turns navigation
 * and the header CTA into real `<a>`/`<Link>` elements — both mechanisms
 * coexist so `onNavigate` still fires for `<button>`-based fallback
 * clicks and any caller that hasn't supplied a `linkRenderer` keeps
 * behaving exactly as it did before Prompt 11 (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Header/Footer Real Navigation").
 */
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDisclosure } from '@hooks';
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import { useWebsiteContainerClass } from './renderer-style.utils';
import { resolveWebsiteCtaHref, isExternalHref } from '../utils/link-resolution.utils';
import type { WebsiteHeaderConfig, WebsiteNavigationItem, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteHeaderProps {
  readonly logo?: string;
  readonly academyName: string;
  readonly navigation: readonly WebsiteNavigationItem[];
  readonly pages: readonly WebsitePage[];
  readonly header: WebsiteHeaderConfig;
  readonly activePageId?: string;
  readonly onNavigate: (pageId: string) => void;
  /** See `website-link-renderer.types.ts` — absent in every dashboard preview context, supplied only by the public runtime. */
  readonly linkRenderer?: WebsiteLinkRenderer;
}

function resolveLabel(item: WebsiteNavigationItem, pages: readonly WebsitePage[]): string {
  return item.label || pages.find((page) => page.id === item.pageId)?.title || '';
}

function NavLinks({
  navigation,
  pages,
  activePageId,
  onNavigate,
  linkRenderer,
  className,
}: Pick<WebsiteHeaderProps, 'navigation' | 'pages' | 'activePageId' | 'onNavigate' | 'linkRenderer'> & {
  readonly className?: string;
}): JSX.Element {
  return (
    <nav className={className}>
      {[...navigation]
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const activeClassName =
            item.pageId === activePageId
              ? 'text-sm font-medium text-[var(--website-primary-solid)]'
              : 'text-sm font-medium text-foreground/80 hover:text-foreground';
          const href = linkRenderer ? resolveWebsiteCtaHref(item, pages) : undefined;

          if (href) {
            return (
              <span key={item.id}>
                {linkRenderer!({
                  href,
                  external: isExternalHref(href),
                  className: activeClassName,
                  children: resolveLabel(item, pages),
                })}
              </span>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.pageId)}
              className={activeClassName}
            >
              {resolveLabel(item, pages)}
            </button>
          );
        })}
    </nav>
  );
}

export function WebsiteHeader({
  logo,
  academyName,
  navigation,
  pages,
  header,
  activePageId,
  onNavigate,
  linkRenderer,
}: WebsiteHeaderProps): JSX.Element {
  const design = useWebsiteDesignSystem();
  const container = useWebsiteContainerClass();
  const mobileMenu = useDisclosure();

  const brandMark = (
    <div className="flex items-center gap-2">
      {logo ? (
        <img src={logo} alt={academyName} className="h-8 w-auto" />
      ) : (
        <span className="font-display text-lg font-bold text-foreground">{academyName}</span>
      )}
    </div>
  );

  const ctaHref = header.cta && linkRenderer ? resolveWebsiteCtaHref(header.cta, pages) : undefined;
  const ctaButtonProps = {
    size: 'sm' as const,
    style: { backgroundColor: 'var(--website-primary-solid)' },
    className: 'text-white hover:opacity-90',
  };

  const cta = header.cta ? (
    ctaHref ? (
      <Button {...ctaButtonProps} asChild>
        {linkRenderer!({ href: ctaHref, external: isExternalHref(ctaHref), children: header.cta.label })}
      </Button>
    ) : (
      <Button {...ctaButtonProps}>{header.cta.label}</Button>
    )
  ) : null;

  const mobileTrigger = (
    <Sheet open={mobileMenu.isOpen} onOpenChange={mobileMenu.setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="top">
        <NavLinks
          navigation={navigation}
          pages={pages}
          activePageId={activePageId}
          onNavigate={(pageId) => {
            onNavigate(pageId);
            mobileMenu.close();
          }}
          linkRenderer={linkRenderer}
          className="flex flex-col gap-4 pt-8"
        />
      </SheetContent>
    </Sheet>
  );

  if (design.headerVariant === 'centered') {
    return (
      <header className="border-b border-border py-5">
        <div className={`${container} flex flex-col items-center gap-4`}>
          {brandMark}
          <div className="flex items-center gap-6">
            <NavLinks
              navigation={navigation}
              pages={pages}
              activePageId={activePageId}
              onNavigate={onNavigate}
              linkRenderer={linkRenderer}
              className="hidden items-center gap-6 lg:flex"
            />
            {mobileTrigger}
          </div>
          {cta}
        </div>
      </header>
    );
  }

  if (design.headerVariant === 'minimal') {
    return (
      <header className="py-6">
        <div className={`${container} flex items-center justify-between`}>
          {brandMark}
          <div className="flex items-center gap-4">
            <NavLinks
              navigation={navigation}
              pages={pages}
              activePageId={activePageId}
              onNavigate={onNavigate}
              linkRenderer={linkRenderer}
              className="hidden items-center gap-6 lg:flex"
            />
            {mobileTrigger}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border py-4">
      <div className={`${container} flex items-center justify-between`}>
        {brandMark}
        <NavLinks
          navigation={navigation}
          pages={pages}
          activePageId={activePageId}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
          className="hidden items-center gap-6 lg:flex"
        />
        <div className="flex items-center gap-2">
          {cta}
          {mobileTrigger}
        </div>
      </div>
    </header>
  );
}
