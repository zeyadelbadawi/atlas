/**
 * Theme 1 header (plan §C.1 "Header", §G).
 *
 * Logo · navigation · language · Sign in · Sign up (the CTA slot). Sticky;
 * transparent at the top of the page and solid once it scrolls (one
 * passive, rAF-throttled listener — the only scroll-linked script §G
 * allows). On phones and tablets the primary action stays in the bar,
 * one tap away (§B), and everything else moves into a side sheet that
 * opens from the logical end, traps focus, closes on Escape and returns
 * focus to the menu button (Radix Dialog).
 *
 * Behaviour matches the shared header exactly — a signed-in visitor sees
 * their greeting instead of any CTA; a configured `header.cta` wins over
 * the default Sign in / Sign up pair; without `linkRenderer` (dashboard
 * previews) nothing navigates. Only the presentation is Theme 1's.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, Menu } from 'lucide-react';
import { cn } from '@utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDisclosure } from '@hooks';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type { WebsiteHeaderProps } from '../renderer/WebsiteHeader';
import type { WebsiteNavigationItem, WebsitePage } from '@types';

/** Scroll distance at which the header turns solid (§G). */
const SOLID_AFTER_PX = 24;

function useScrolledPast(threshold: number): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setPast(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return past;
}

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

export function ModernEducationHeader({
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
  const container = useWebsiteContainerClass();
  const menu = useDisclosure();
  const solid = useScrolledPast(SOLID_AFTER_PX);
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const items = [...navigation].sort((a, b) => a.order - b.order);

  /** A link when the public runtime can navigate, a button otherwise. */
  const renderLink = (
    target: { href?: string; pageId?: string },
    className: string,
    children: React.ReactNode,
    extra: { current?: boolean; onClick?: () => void } = {}
  ): JSX.Element => {
    if (target.href && linkRenderer) {
      return (
        // `contents`: no box of its own; only here to close the sheet
        // when a link inside it is followed.
        <span className="contents" onClickCapture={extra.onClick}>
          {linkRenderer({
            href: target.href,
            external: isExternalHref(target.href),
            className,
            ariaCurrent: extra.current ? 'page' : undefined,
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
        onClick={() => {
          if (target.pageId) onNavigate(target.pageId);
          extra.onClick?.();
        }}
      >
        {children}
      </button>
    );
  };

  const navLinks = (variant: 'bar' | 'sheet') =>
    items.map((item) => {
      const current = item.pageId === activePageId;
      const href = linkRenderer
        ? resolveWebsiteCtaHref(item, pages)
        : undefined;
      return (
        <li key={item.id}>
          {renderLink(
            { href, pageId: item.pageId },
            variant === 'bar'
              ? cn(
                  't1-nav-link text-[0.9375rem] font-medium',
                  current
                    ? 'text-[var(--website-foreground)]'
                    : 'text-[var(--website-foreground-muted)] hover:text-[var(--website-foreground)]'
                )
              : cn(
                  't1-focus flex min-h-11 w-full items-center rounded-[var(--t1-radius-control)] px-3 text-base font-medium',
                  current
                    ? 'bg-[var(--website-chip-bg)] text-[var(--website-chip-fg)]'
                    : 'text-[var(--website-foreground)] hover:bg-[var(--website-surface)]'
                ),
            navLabel(item, pages, locale),
            {
              current,
              onClick: variant === 'sheet' ? menu.close : undefined,
            }
          )}
        </li>
      );
    });

  // The primary action: configured CTA → it; otherwise Sign up.
  const configuredLabel = header.cta
    ? resolveLocalizedText(header.cta.label, locale)
    : '';
  const primaryAction = header.cta
    ? {
        href: linkRenderer
          ? resolveWebsiteCtaHref(header.cta, pages)
          : undefined,
        label: configuredLabel,
      }
    : {
        href: linkRenderer ? '/sign-up' : undefined,
        label: t('publicWebsite:header.signUp'),
      };
  const primaryButton = (className?: string) =>
    renderLink(
      { href: primaryAction.href },
      cn('t1-cta', className),
      primaryAction.label
    );
  // Theme 1 always offers Sign in beside the CTA slot (plan §C.1) — unless
  // the configured CTA already is Sign in.
  const showSignIn = header.cta?.authAction !== 'signIn';
  const signInLink = (className: string) =>
    renderLink(
      { href: linkRenderer ? '/sign-in' : undefined },
      className,
      t('publicWebsite:header.signIn')
    );

  const otherLocale =
    PUBLIC_WEBSITE_LOCALES.find((candidate) => candidate !== locale) ?? locale;
  const languageSwitcher = (className: string) =>
    onLocaleChange ? (
      <button
        type="button"
        onClick={() => onLocaleChange(otherLocale)}
        className={cn('t1-focus inline-flex items-center gap-1.5', className)}
        aria-label={`${PUBLIC_WEBSITE_LOCALE_LABELS.en} / ${PUBLIC_WEBSITE_LOCALE_LABELS.ar}`}
      >
        <Globe className="size-4 shrink-0" aria-hidden />
        <span lang={otherLocale}>
          {PUBLIC_WEBSITE_LOCALE_LABELS[otherLocale]}
        </span>
      </button>
    ) : null;

  const greeting = authState
    ? t('publicWebsite:header.greeting', { name: authState.name })
    : '';
  const account = (layout: 'bar' | 'sheet') =>
    authState ? (
      <div
        className={cn(
          'flex min-w-0 items-center gap-2',
          layout === 'sheet' && 'flex-col items-stretch'
        )}
      >
        {authState.myLearningHref && linkRenderer ? (
          renderLink(
            { href: authState.myLearningHref },
            't1-focus max-w-[12rem] truncate text-sm font-semibold text-[var(--website-link)] hover:underline',
            greeting
          )
        ) : (
          <span className="max-w-[12rem] truncate text-sm font-medium text-[var(--website-foreground-muted)]">
            {greeting}
          </span>
        )}
        {authState.onSignOut ? (
          <button
            type="button"
            onClick={authState.onSignOut}
            className="t1-focus inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-[var(--website-foreground-muted)] hover:text-[var(--website-foreground)]"
          >
            <LogOut className="size-4" aria-hidden />
            {t('publicWebsite:header.signOut')}
          </button>
        ) : null}
      </div>
    ) : layout === 'bar' ? (
      <div className="flex items-center gap-4">
        {showSignIn
          ? signInLink(
              't1-nav-link text-[0.9375rem] font-medium text-[var(--website-foreground)]'
            )
          : null}
        {primaryButton()}
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {primaryButton('w-full')}
        {showSignIn
          ? signInLink(
              't1-focus inline-flex min-h-11 items-center justify-center rounded-[var(--t1-radius-control)] border border-[var(--website-border)] text-base font-medium text-[var(--website-foreground)]'
            )
          : null}
      </div>
    );

  const brandMark = (
    <div className="flex min-w-0 items-center">
      {logo ? (
        <img
          src={logo}
          alt={academyName}
          className="h-9 w-auto max-w-[9rem] shrink-0 object-contain sm:max-w-[12rem]"
        />
      ) : (
        // Two lines rather than an ellipsis on phones (plan §M.5 #15).
        <span
          className="line-clamp-2 break-words font-display text-base font-bold leading-tight text-[var(--website-foreground)] sm:text-lg"
          dir="auto"
        >
          {academyName}
        </span>
      )}
    </div>
  );

  return (
    <header
      data-solid={solid ? 'true' : 'false'}
      className="t1-header sticky top-0 z-40"
    >
      <div
        className={cn(
          container,
          'flex h-[var(--t1-header-height)] items-center justify-between gap-4'
        )}
      >
        {brandMark}

        <nav
          aria-label={t('website:chrome.primaryNavigation')}
          className="hidden min-w-0 lg:block"
        >
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-1">
            {navLinks('bar')}
          </ul>
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          {languageSwitcher(
            'text-sm font-medium text-[var(--website-foreground-muted)] hover:text-[var(--website-foreground)]'
          )}
          {account('bar')}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {authState ? null : primaryButton('min-h-10 px-4 text-sm')}
          <Sheet open={menu.isOpen} onOpenChange={menu.setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="t1-focus inline-flex size-11 items-center justify-center rounded-[var(--t1-radius-control)] text-[var(--website-foreground)] hover:bg-[var(--website-surface)]"
                aria-label={t('website:chrome.openMenu')}
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent
              side={direction === 'rtl' ? 'left' : 'right'}
              dir={direction}
              className="flex w-[min(22rem,88vw)] flex-col gap-6 bg-[var(--website-background)] p-6 pt-14 text-[var(--website-foreground)]"
            >
              <SheetTitle className="sr-only">
                {t('website:chrome.menuTitle', { name: academyName })}
              </SheetTitle>
              <nav aria-label={t('website:chrome.primaryNavigation')}>
                <ul className="flex flex-col gap-1">{navLinks('sheet')}</ul>
              </nav>
              <div className="mt-auto flex flex-col gap-4 border-t border-[var(--website-border)] pt-6">
                {account('sheet')}
                {languageSwitcher(
                  'min-h-11 justify-center text-sm font-medium text-[var(--website-foreground-muted)] hover:text-[var(--website-foreground)]'
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
