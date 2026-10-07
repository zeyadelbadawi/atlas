/**
 * Riwaq masthead (plan §4, chrome): a porcelain bar ruled at the bottom,
 * sticky at the top — the academy's logo or name at the start, the
 * navigation as quiet links with a marker under the current page, the
 * locale switch, Sign in and the primary action printed in brand ink. As
 * the page scrolls the rule thickens (a CSS scroll timeline, no listener;
 * static without support or with reduced motion).
 *
 * Phones and tablets: the name, the primary action and a Menu button that
 * opens a bottom sheet (Radix Dialog via `Sheet`): navigation, the auth
 * actions and the locale switch, within thumb reach; it traps focus,
 * closes on Escape and returns focus to the button.
 *
 * Behaviour is the shared header's, as Themes 1–3 keep it: "My Learn"
 * follows the Owner's items; a signed-in visitor sees the account menu
 * instead of a call to action; a configured `header.cta` takes the primary
 * slot, with Sign in beside it unless the CTA already is Sign in; on the
 * public site a link to a hidden page renders nothing; in previews (no
 * `linkRenderer`) controls are buttons that call `onNavigate`.
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
import { RiwaqArrow } from '../riwaq-parts';
import '../riwaq-pages.css';

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

export function RiwaqHeader({
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

  /** A link on the public runtime, a button in previews; nothing for a dead target. */
  const renderLink = (
    target: { href?: string; pageId?: string },
    className: string,
    children: ReactNode,
    extra: { current?: boolean; onClick?: () => void; label?: string } = {}
  ): JSX.Element | null => {
    if (linkRenderer) {
      if (!target.href) return null;
      return (
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

  const linkClass = (variant: 'bar' | 'sheet') =>
    variant === 'bar' ? 'rwc-nav-link' : 'rwc-sheet-link';

  const navLinks = (variant: 'bar' | 'sheet') => [
    ...items.map((item) => {
      const current = item.pageId === activePageId;
      const href = linkRenderer ? resolveWebsiteCtaHref(item, pages) : undefined;
      if (linkRenderer && !href) return null;
      return (
        <li key={item.id}>
          {renderLink(
            { href, pageId: item.pageId },
            linkClass(variant),
            navLabel(item, pages, locale),
            { current, onClick: variant === 'sheet' ? menu.close : undefined }
          )}
        </li>
      );
    }),
    <li key="my-learn">
      {renderLink(
        { href: linkRenderer ? myLearnHref(authState) : undefined },
        linkClass(variant),
        t('publicWebsite:header.myLearn'),
        { onClick: variant === 'sheet' ? menu.close : undefined }
      )}
    </li>,
  ];

  const primaryAction = header.cta
    ? {
        href: linkRenderer ? resolveWebsiteCtaHref(header.cta, pages) : undefined,
        label: resolveLocalizedText(header.cta.label, locale),
      }
    : {
        href: linkRenderer ? '/sign-up' : undefined,
        label: t('website:riwaq.chrome.apply'),
      };
  const primaryButton = (className?: string, onClick?: () => void) =>
    primaryAction.label
      ? renderLink(
          { href: primaryAction.href },
          cn('rw-btn', className),
          <>
            <span className="min-w-0 break-words">{primaryAction.label}</span>
            <RiwaqArrow />
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
        className={cn('rwc-nav-link', className)}
        aria-label={`${PUBLIC_WEBSITE_LOCALE_LABELS.en} / ${PUBLIC_WEBSITE_LOCALE_LABELS.ar}`}
      >
        <Globe className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span lang={otherLocale}>{PUBLIC_WEBSITE_LOCALE_LABELS[otherLocale]}</span>
      </button>
    ) : null;

  const homePage = pages.find((page) => page.coreType === 'home');
  const brandContent = logo ? (
    <img
      src={logo}
      alt={academyName}
      className="h-9 w-auto max-w-[8rem] shrink-0 object-contain sm:max-w-[11rem]"
    />
  ) : (
    <span className="rwc-wordmark line-clamp-2" dir="auto">
      {academyName}
    </span>
  );
  const brandMark = (
    <div className="rwc-brand-wrap">
      {homePage
        ? renderLink(
            {
              href: linkRenderer ? resolvePagePath(homePage) : undefined,
              pageId: homePage.id,
            },
            'rwc-brand',
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
    <header className="rwc-mast" data-riwaq-header="" data-ground="porcelain">
      <div className="rw-container rwc-mast-bar">
        {brandMark}

        <nav aria-label={t('website:chrome.primaryNavigation')} className="rwc-nav-wrap">
          <ul className="rwc-nav">{navLinks('bar')}</ul>
        </nav>

        <div className="rwc-actions">
          {languageSwitcher()}
          {authState ? (
            <WebsiteAccountMenu
              authState={authState}
              linkRenderer={linkRenderer}
              avatarClassName="rounded-none bg-[var(--rw-action)] text-[var(--rw-action-text)]"
              triggerClassName="rounded-none text-[var(--rw-ink)] hover:bg-[var(--rw-stone)]"
            />
          ) : (
            <>
              {signInLink('rwc-nav-link')}
              {primaryButton()}
            </>
          )}
        </div>

        <div className="rwc-compact">
          {authState ? null : primaryButton('rwc-compact-cta')}
          <Sheet open={menu.isOpen} onOpenChange={menu.setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="rwc-menu-btn"
                aria-label={t('website:chrome.openMenu')}
              >
                <Menu className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="rwc-menu-btn-text">{t('website:riwaq.chrome.menu')}</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              dir={direction}
              data-riwaq-menu=""
              data-ground="porcelain"
              className="rwc-sheet motion-reduce:!animate-none [&>button:last-child]:hidden"
            >
              <SheetTitle className="rw-sr-only">
                {t('website:chrome.menuTitle', { name: academyName })}
              </SheetTitle>
              <div className="rwc-sheet-head">
                <span aria-hidden className="rw-label" data-mark="" dir="auto">
                  {academyName}
                </span>
                <SheetClose className="rwc-menu-btn" aria-label={t('website:riwaq.chrome.closeMenu')}>
                  <X className="size-5" strokeWidth={1.75} aria-hidden />
                </SheetClose>
              </div>
              <nav aria-label={t('website:chrome.primaryNavigation')}>
                <ul className="rwc-sheet-list">{navLinks('sheet')}</ul>
              </nav>
              <div className="rwc-sheet-foot">
                {authState ? (
                  <WebsiteAccountSheetLinks
                    authState={authState}
                    linkRenderer={linkRenderer}
                    onNavigate={menu.close}
                    linkClassName="rounded-none text-[var(--rw-ink)] hover:bg-[var(--rw-stone)]"
                  />
                ) : (
                  <>
                    {primaryButton('rw-btn-lg w-full', menu.close)}
                    {signInLink('rw-btn rw-btn-line rw-btn-lg w-full', menu.close)}
                  </>
                )}
                {onLocaleChange ? <div className="rwc-sheet-locale">{languageSwitcher()}</div> : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
