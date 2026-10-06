/**
 * Manara header (Reports/THEME_3_MANARA_PLAN.md §3.11): a solid brand
 * block, sticky at the top, the academy's logo or name in the display
 * face at the start, the navigation as underline-draw links, the locale
 * switch, a quiet Sign in and the accent **Join**. The beam under the bar
 * fills as the page scrolls (a CSS scroll timeline in `manara.css`; no
 * listener; hidden without support).
 *
 * Phones and tablets: logo, Join and a menu button that opens a
 * full-screen night menu (Radix Dialog via `Sheet`) of display-size
 * links, the auth actions and the locale switch: it traps focus, closes
 * on Escape and returns focus to the button.
 *
 * Behaviour is the shared header's, as Theme 1 and Atelier keep it: "My
 * Learn" always follows the Owner's items; a signed-in visitor sees the
 * account menu instead of any call to action; a configured `header.cta`
 * takes the Join slot, with Sign in beside it unless the CTA already is
 * Sign in; on the public site a link to a hidden page renders nothing; in
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
import { ManaraArrow } from '../manara-parts';
import '../manara-pages.css';

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

export function ManaraHeader({
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
    variant === 'bar' ? 'mnp-nav-link' : 'mnp-menu-link';

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

  // The Join action: a configured CTA, otherwise sign-up.
  const primaryAction = header.cta
    ? {
        href: linkRenderer
          ? resolveWebsiteCtaHref(header.cta, pages)
          : undefined,
        label: resolveLocalizedText(header.cta.label, locale),
      }
    : {
        href: linkRenderer ? '/sign-up' : undefined,
        label: t('website:manara.chrome.join'),
      };
  const joinButton = (className?: string, onClick?: () => void) =>
    primaryAction.label
      ? renderLink(
          { href: primaryAction.href },
          cn('mn-btn', className),
          <>
            <span className="min-w-0 break-words">{primaryAction.label}</span>
            <ManaraArrow />
          </>,
          { onClick }
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
  const languageSwitcher = (className?: string) =>
    onLocaleChange ? (
      <button
        type="button"
        onClick={() => onLocaleChange(otherLocale)}
        className={cn('mnp-nav-link gap-1.5', className)}
        aria-label={`${PUBLIC_WEBSITE_LOCALE_LABELS.en} / ${PUBLIC_WEBSITE_LOCALE_LABELS.ar}`}
      >
        <Globe className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span lang={otherLocale}>
          {PUBLIC_WEBSITE_LOCALE_LABELS[otherLocale]}
        </span>
      </button>
    ) : null;

  // The name leads to this Academy's Home — a link only while Home is a
  // visible page.
  const homePage = pages.find((page) => page.coreType === 'home');
  const brandContent = logo ? (
    <img
      src={logo}
      alt={academyName}
      className="h-9 w-auto max-w-[8rem] shrink-0 object-contain sm:max-w-[11rem]"
    />
  ) : (
    <span className="mnp-wordmark line-clamp-2" dir="auto">
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
            'mnp-brand',
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
    <header className="mnp-header" data-manara-header="">
      <div className="mn-container mnp-header-bar">
        {brandMark}

        <nav
          aria-label={t('website:chrome.primaryNavigation')}
          className="hidden min-w-0 lg:block"
        >
          <ul className="mnp-nav">{navLinks('bar')}</ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {languageSwitcher()}
          {authState ? (
            <WebsiteAccountMenu
              authState={authState}
              linkRenderer={linkRenderer}
              avatarClassName="bg-[var(--mn-accent)] text-[var(--mn-accent-text)]"
              triggerClassName="text-[var(--mn-block-text)] hover:bg-[var(--mn-block-hover)]"
            />
          ) : (
            <>
              {signInLink('mn-btn mn-btn-quiet')}
              {joinButton()}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          {authState ? null : joinButton('px-3.5 text-sm')}
          <Sheet open={menu.isOpen} onOpenChange={menu.setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="mnp-icon-btn"
                aria-label={t('website:chrome.openMenu')}
              >
                <Menu className="size-6" strokeWidth={2.25} aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent
              side="top"
              dir={direction}
              data-env="night"
              data-manara-menu=""
              className="mnp-menu motion-reduce:!animate-none [&>button:last-child]:hidden"
            >
              <SheetTitle className="mn-sr-only">
                {t('website:chrome.menuTitle', { name: academyName })}
              </SheetTitle>
              <div className="mn-container mnp-menu-bar">
                <span
                  aria-hidden
                  className="mnp-wordmark line-clamp-1"
                  dir="auto"
                >
                  {academyName}
                </span>
                <SheetClose
                  className="mnp-icon-btn"
                  aria-label={t('website:manara.chrome.closeMenu')}
                >
                  <X className="size-6" strokeWidth={2.25} aria-hidden />
                </SheetClose>
              </div>
              <nav
                aria-label={t('website:chrome.primaryNavigation')}
                className="mn-container"
              >
                <ul className="mnp-menu-list">{navLinks('menu')}</ul>
              </nav>
              <div className="mn-container mnp-menu-foot">
                {authState ? (
                  <WebsiteAccountSheetLinks
                    authState={authState}
                    linkRenderer={linkRenderer}
                    onNavigate={menu.close}
                    linkClassName="text-[var(--mn-night-text)] hover:bg-[var(--mn-night-raised)]"
                  />
                ) : (
                  <>
                    {joinButton('mn-btn-lg w-full', menu.close)}
                    {signInLink(
                      'mn-btn mn-btn-outline mn-btn-lg w-full',
                      menu.close
                    )}
                  </>
                )}
                {onLocaleChange ? (
                  <div className="flex justify-center pt-2">
                    {languageSwitcher()}
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <span aria-hidden className="mn-header-beam" />
    </header>
  );
}
