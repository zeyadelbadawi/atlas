/**
 * Atelier header (Reports/THEME_2_ATELIER_PLAN.md §5a "Chrome").
 *
 * The academy's wordmark (or logo) at the start, the navigation in tracked
 * small caps, and one call to action. It sits on the paper and draws its
 * hairline once the page scrolls — a CSS scroll timeline, no listener
 * (`atelier-pages.css`). Below `lg` the navigation moves into a
 * full-screen menu of display-size links (Radix Dialog via `Sheet`): it
 * traps focus, closes on Escape and returns focus to the menu button.
 *
 * Behaviour is the shared header's, exactly as Theme 1 keeps it: "My
 * Learn" always follows the Owner's items; a signed-in visitor sees the
 * account menu instead of any call to action; a configured `header.cta`
 * takes the CTA slot, with Sign in beside it unless the CTA already is Sign
 * in; on the public site a link to a hidden page renders nothing; in
 * previews (no `linkRenderer`) controls are buttons that call `onNavigate`.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import { cn } from '@utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDisclosure } from '@hooks';
import {
  WebsiteAccountMenu,
  WebsiteAccountSheetLinks,
  myLearnHref,
} from '@/features/website/renderer/WebsiteAccountMenu';
import {
  isExternalHref,
  resolvePagePath,
  resolveWebsiteCtaHref,
} from '@/features/website/utils/link-resolution.utils';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '@/features/website/constants/locale.constants';
import type { WebsiteHeaderProps } from '@/features/website/renderer/WebsiteHeader';
import type { WebsiteNavigationItem, WebsitePage } from '@types';
import '../atelier-pages.css';

function navLabel(
  item: WebsiteNavigationItem,
  pages: readonly WebsitePage[],
  locale: PublicWebsiteLocale
): string {
  return (
    resolveLocalizedText(item.label, locale) ||
    pages.find((page) => page.id === item.pageId)?.title ||
    ''
  );
}

export function AtelierHeader({
  logo,
  academyName,
  navigation,
  pages,
  header,
  activePageId,
  onNavigate,
  linkRenderer,
  locale = DEFAULT_PUBLIC_WEBSITE_LOCALE,
  onLocaleChange,
  authState,
}: WebsiteHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const menu = useDisclosure();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const items = [...navigation].sort((a, b) => a.order - b.order);

  /**
   * A link when the public runtime can navigate, a button in previews; on
   * the public site a target that resolves to nothing renders nothing.
   */
  const renderLink = (
    target: { href?: string; pageId?: string },
    className: string,
    children: ReactNode,
    extra: { current?: boolean; onClick?: () => void; label?: string } = {}
  ): JSX.Element | null => {
    if (linkRenderer) {
      if (!target.href) return null;
      return (
        // `contents`: no box of its own; it only closes the menu when a
        // link inside it is followed.
        <span className="contents" onClickCapture={extra.onClick}>
          {linkRenderer({
            href: target.href,
            external: isExternalHref(target.href),
            className,
            ariaCurrent: extra.current ? 'page' : undefined,
            ariaLabel: extra.label,
            children,
          })}
        </span>
      );
    }
    return (
      <button
        type="button"
        className={className}
        aria-current={extra.current ? 'page' : undefined}
        aria-label={extra.label}
        onClick={() => {
          if (target.pageId) onNavigate(target.pageId);
          extra.onClick?.();
        }}
      >
        {children}
      </button>
    );
  };

  const linkClass = (variant: 'bar' | 'menu') =>
    variant === 'bar' ? 'atp-text-btn' : 'atp-overlay-link';

  const navLinks = (variant: 'bar' | 'menu') => [
    ...items.map((item) => {
      const current = item.pageId === activePageId;
      const href = linkRenderer
        ? resolveWebsiteCtaHref(item, pages)
        : undefined;
      if (linkRenderer && !href) return null;
      return (
        <li key={item.id}>
          {renderLink(
            { href, pageId: item.pageId },
            linkClass(variant),
            navLabel(item, pages, locale),
            { current, onClick: variant === 'menu' ? menu.close : undefined }
          )}
        </li>
      );
    }),
    // "My Learn" — fixed, after the Owner's own items.
    <li key="my-learn">
      {renderLink(
        { href: linkRenderer ? myLearnHref(authState) : undefined },
        linkClass(variant),
        t('publicWebsite:header.myLearn'),
        { onClick: variant === 'menu' ? menu.close : undefined }
      )}
    </li>,
  ];

  // The one call to action: a configured CTA, otherwise Sign up.
  const primaryAction = header.cta
    ? {
        href: linkRenderer
          ? resolveWebsiteCtaHref(header.cta, pages)
          : undefined,
        label: resolveLocalizedText(header.cta.label, locale),
      }
    : {
        href: linkRenderer ? '/sign-up' : undefined,
        label: t('publicWebsite:header.signUp'),
      };
  const primaryButton = (className?: string, onClick?: () => void) =>
    primaryAction.label
      ? renderLink(
          { href: primaryAction.href },
          cn('at-btn', className),
          primaryAction.label,
          {
            onClick,
          }
        )
      : null;
  const showSignIn = header.cta?.authAction !== 'signIn';
  const signInLink = (className: string, onClick?: () => void) =>
    showSignIn
      ? renderLink(
          { href: linkRenderer ? '/sign-in' : undefined },
          className,
          t('publicWebsite:header.signIn'),
          { onClick }
        )
      : null;

  const otherLocale =
    PUBLIC_WEBSITE_LOCALES.find((candidate) => candidate !== locale) ?? locale;
  const languageSwitcher = onLocaleChange ? (
    <button
      type="button"
      onClick={() => onLocaleChange(otherLocale)}
      className="atp-text-btn"
      aria-label={`${PUBLIC_WEBSITE_LOCALE_LABELS.en} / ${PUBLIC_WEBSITE_LOCALE_LABELS.ar}`}
    >
      <Globe className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <span lang={otherLocale}>
        {PUBLIC_WEBSITE_LOCALE_LABELS[otherLocale]}
      </span>
    </button>
  ) : null;

  // The wordmark leads to this Academy's Home — a link only while Home is a
  // visible page.
  const homePage = pages.find((page) => page.coreType === 'home');
  const brandContent = logo ? (
    <img
      src={logo}
      alt={academyName}
      className="h-9 w-auto max-w-[9rem] shrink-0 object-contain sm:max-w-[12rem]"
    />
  ) : (
    <span className="atp-wordmark line-clamp-2 break-words" dir="auto">
      {academyName}
    </span>
  );
  const brandMark = (
    <div className="flex min-w-0 items-center">
      {homePage
        ? renderLink(
            {
              href: linkRenderer ? resolvePagePath(homePage) : undefined,
              pageId: homePage.id,
            },
            'flex min-h-11 min-w-0 items-center text-start',
            brandContent,
            {
              current: homePage.id === activePageId,
              label: t('website:chrome.homeLink', { name: academyName }),
            }
          )
        : brandContent}
    </div>
  );

  return (
    <header data-env="paper" className="atp-header" data-atelier-header="">
      <div className="at-container atp-header-bar">
        {brandMark}

        <nav
          aria-label={t('website:chrome.primaryNavigation')}
          className="hidden min-w-0 lg:block"
        >
          <ul className="atp-nav-list">{navLinks('bar')}</ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-6 lg:flex">
          {languageSwitcher}
          {authState ? (
            <WebsiteAccountMenu
              authState={authState}
              linkRenderer={linkRenderer}
              avatarClassName="bg-[var(--website-chip-bg)] text-[var(--website-chip-fg)]"
              triggerClassName="text-[var(--atelier-text)] hover:bg-[var(--atelier-paper-deep)]"
            />
          ) : (
            <>
              {signInLink('atp-text-btn')}
              {primaryButton()}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          {authState ? null : primaryButton('min-h-11 px-4 text-sm')}
          <Sheet open={menu.isOpen} onOpenChange={menu.setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="atp-icon-btn"
                aria-label={t('website:chrome.openMenu')}
              >
                <Menu className="size-6" strokeWidth={1.25} aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent
              side="top"
              dir={direction}
              data-env="paper"
              data-atelier-menu=""
              className="atp-overlay motion-reduce:!animate-none [&>button:last-child]:hidden"
            >
              <SheetTitle className="sr-only">
                {t('website:chrome.menuTitle', { name: academyName })}
              </SheetTitle>
              <div className="at-container atp-header-bar">
                <span
                  aria-hidden
                  className="atp-wordmark line-clamp-1"
                  dir="auto"
                >
                  {academyName}
                </span>
                <SheetClose
                  className="atp-icon-btn"
                  aria-label={t('website:atelier.chrome.closeMenu')}
                >
                  <X className="size-6" strokeWidth={1.25} aria-hidden />
                </SheetClose>
              </div>
              <nav
                aria-label={t('website:chrome.primaryNavigation')}
                className="at-container mt-6"
              >
                <ul className="atp-overlay-list">{navLinks('menu')}</ul>
              </nav>
              <div className="at-container mt-auto flex flex-col gap-4 pb-10 pt-10">
                {authState ? (
                  <WebsiteAccountSheetLinks
                    authState={authState}
                    linkRenderer={linkRenderer}
                    onNavigate={menu.close}
                    linkClassName="text-[var(--atelier-text)] hover:bg-[var(--atelier-paper-deep)]"
                  />
                ) : (
                  <>
                    {primaryButton('w-full at-btn-lg', menu.close)}
                    {signInLink('at-btn-ghost at-btn-lg w-full', menu.close)}
                  </>
                )}
                {languageSwitcher ? (
                  <div className="flex justify-center">{languageSwitcher}</div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
