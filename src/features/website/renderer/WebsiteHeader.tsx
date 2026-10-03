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
import { Globe, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDisclosure } from '@hooks';
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';
import { useWebsiteContainerClass } from './renderer-style.utils';
import {
  resolveWebsiteCtaHref,
  isExternalHref,
} from '../utils/link-resolution.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type {
  WebsiteHeaderConfig,
  WebsiteNavigationItem,
  WebsitePage,
} from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';
import {
  WebsiteAccountMenu,
  WebsiteAccountSheetLinks,
  myLearnHref,
} from './WebsiteAccountMenu';

/**
 * The real visitor's session, supplied only by the public runtime (see
 * `WebsiteChromeProps.authState`) — absent in every dashboard preview
 * context, exactly like `linkRenderer`/`onLocaleChange`, so an Owner
 * editing/previewing their own site never sees THEIR OWN admin login
 * reflected back as if they were a signed-in visitor.
 */
export interface WebsiteHeaderAuthState {
  /** The signed-in visitor's display name. */
  readonly name: string;
  /** Absent while sign-out is not yet wired by a given caller — the greeting still renders, just without the action. */
  readonly onSignOut?: () => void;
  /**
   * Present only for a signed-in Student, on the real public runtime —
   * turns the greeting itself into a real link to their "My Learning"
   * area instead of adding a third header control (a real, reproduced
   * regression this deliberately avoids repeating — see the greeting's
   * own `truncate`/compact-mobile treatment, added after a real header-
   * crowding bug at 375px; a new, separate button here would reintroduce
   * exactly that). `undefined` for every other signed-in role (Owner/
   * Manager/Instructor previewing or genuinely visiting their own site),
   * which have no "My Learning" area to link to.
   */
  readonly myLearningHref?: string;
}

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
  readonly locale?: PublicWebsiteLocale;
  /** See `WebsiteChromeProps.onLocaleChange` — its presence is what makes the language switcher render at all. */
  readonly onLocaleChange?: (locale: PublicWebsiteLocale) => void;
  /** When present, replaces the Sign In/Sign Up CTA with the signed-in visitor's own name — see `WebsiteHeaderAuthState`. */
  readonly authState?: WebsiteHeaderAuthState;
}

function resolveLabel(
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

/** A plain, unstyled-menu two-way toggle (there are only ever two supported public-website locales today — see `locale.constants.ts`) — deliberately not a `Select`, so it reads as "switch language," not "configure a setting," matching the non-technical, client-facing register every other public-runtime control uses. */
function LanguageSwitcher({
  locale,
  onLocaleChange,
}: {
  readonly locale: PublicWebsiteLocale;
  readonly onLocaleChange: (locale: PublicWebsiteLocale) => void;
}): JSX.Element {
  const other =
    PUBLIC_WEBSITE_LOCALES.find((candidate) => candidate !== locale) ?? locale;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onLocaleChange(other)}
      className="shrink-0 gap-1.5 px-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:px-3"
      aria-label={`${PUBLIC_WEBSITE_LOCALE_LABELS.en} / ${PUBLIC_WEBSITE_LOCALE_LABELS.ar}`}
    >
      <Globe className="size-4 shrink-0" aria-hidden />
      {/* Label text hidden below `sm` — with the header's other controls
          (brand mark, auth state, hamburger) all sharing one narrow row,
          the icon alone (real `aria-label` above still names the action)
          is what keeps this row from competing for space on a real phone. */}
      <span className="hidden sm:inline">
        {PUBLIC_WEBSITE_LOCALE_LABELS[other]}
      </span>
    </Button>
  );
}

function NavLinks({
  navigation,
  pages,
  activePageId,
  onNavigate,
  linkRenderer,
  locale = DEFAULT_PUBLIC_WEBSITE_LOCALE,
  className,
  authState,
  onLinkFollowed,
}: Pick<
  WebsiteHeaderProps,
  | 'navigation'
  | 'pages'
  | 'activePageId'
  | 'onNavigate'
  | 'linkRenderer'
  | 'locale'
  | 'authState'
> & {
  readonly className?: string;
  /** Closes the mobile sheet when a link in it is followed. */
  readonly onLinkFollowed?: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const linkClass =
    'text-sm font-medium text-foreground/80 hover:text-foreground';
  return (
    <nav
      className={className}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('a')) onLinkFollowed?.();
      }}
    >
      {[...navigation]
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const activeClassName =
            item.pageId === activePageId
              ? 'text-sm font-medium text-[var(--website-primary-solid)]'
              : 'text-sm font-medium text-foreground/80 hover:text-foreground';
          const href = linkRenderer
            ? resolveWebsiteCtaHref(item, pages)
            : undefined;

          if (href) {
            return (
              <span key={item.id}>
                {linkRenderer!({
                  href,
                  external: isExternalHref(href),
                  className: activeClassName,
                  children: resolveLabel(item, pages, locale),
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
              {resolveLabel(item, pages, locale)}
            </button>
          );
        })}
      {/* "My Learn" — fixed, after the Owner's own items (Task B). */}
      {linkRenderer ? (
        <span>
          {linkRenderer({
            href: myLearnHref(authState),
            external: false,
            className: linkClass,
            children: t('publicWebsite:header.myLearn'),
          })}
        </span>
      ) : (
        <span className={linkClass}>{t('publicWebsite:header.myLearn')}</span>
      )}
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
  locale = DEFAULT_PUBLIC_WEBSITE_LOCALE,
  onLocaleChange,
  authState,
}: WebsiteHeaderProps): JSX.Element {
  const { t } = useTranslation();
  const design = useWebsiteDesignSystem();
  const container = useWebsiteContainerClass();
  const mobileMenu = useDisclosure();

  // `dir="auto"` on the academy-name span below — a plain, single-language
  // string (never `LocalizedText`), so it can genuinely be English on an
  // Arabic-locale page or vice versa; see `FeaturedCoursesSection`'s
  // identical comment for the reproduced ellipsis-position bug this avoids.
  const brandMark = (
    <div className="flex min-w-0 max-w-[10rem] items-center gap-2 sm:max-w-[16rem]">
      {logo ? (
        <img src={logo} alt={academyName} className="h-8 w-auto shrink-0" />
      ) : (
        <span
          className="truncate font-display text-lg font-bold text-foreground"
          dir="auto"
        >
          {academyName}
        </span>
      )}
    </div>
  );

  const ctaLabel = header.cta
    ? resolveLocalizedText(header.cta.label, locale)
    : undefined;
  const ctaHref =
    header.cta && linkRenderer
      ? resolveWebsiteCtaHref(header.cta, pages)
      : undefined;
  const ctaButtonProps = {
    size: 'sm' as const,
    style: { backgroundColor: 'var(--website-primary-solid)' },
    className: 'text-white hover:opacity-90',
  };

  // A signed-in visitor never sees the Sign In/Sign Up CTA — regardless of
  // what `header.cta` is configured to (an Owner has no field that can
  // remove this branch, matching how `AtlasPlatformAttribution` is
  // deliberately unremovable). `authState` is only ever populated by the
  // real public runtime (never dashboard/preview callers), so an Owner
  // editing their own site is never shown their own admin session here.
  const cta = authState ? (
    // The account menu (Task B) — name beside the initials from `sm` up,
    // initials alone on a phone, so the row never wraps.
    <WebsiteAccountMenu
      authState={authState}
      linkRenderer={linkRenderer}
      compact
      avatarClassName="bg-[var(--website-primary-solid)] text-white"
      triggerClassName="text-foreground hover:bg-muted"
    />
  ) : header.cta ? (
    ctaHref ? (
      <Button {...ctaButtonProps} asChild>
        {linkRenderer!({
          href: ctaHref,
          external: isExternalHref(ctaHref),
          children: ctaLabel,
        })}
      </Button>
    ) : (
      <Button {...ctaButtonProps}>{ctaLabel}</Button>
    )
  ) : (
    /*
     * P64 Phase 1 — an academy website with no CMS CTA configured used to
     * render NOTHING here, which left a signed-out visitor on a real
     * academy site with no way to reach `/sign-in` or `/sign-up` at all
     * unless the Owner happened to add navigation items for them. Sign in
     * and sign up are not marketing copy an Owner opts into; they are how
     * a student gets to their courses, so they are the default. An
     * explicitly configured CTA still wins (the branch above), and a
     * signed-in visitor never sees either (the `authState` branch).
     *
     * `linkRenderer` is absent in every dashboard preview context, where
     * there is no real navigation — the same non-linking `Button`
     * fallback the configured CTA uses keeps the preview truthful about
     * what a visitor will see without pretending to navigate.
     */
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {linkRenderer ? (
        linkRenderer({
          href: '/sign-in',
          external: false,
          className:
            'whitespace-nowrap px-1 text-sm font-medium text-foreground/80 hover:text-foreground sm:px-2',
          children: t('publicWebsite:header.signIn'),
        })
      ) : (
        <span className="whitespace-nowrap px-1 text-sm font-medium text-foreground/80 sm:px-2">
          {t('publicWebsite:header.signIn')}
        </span>
      )}
      {linkRenderer ? (
        <Button {...ctaButtonProps} asChild>
          {linkRenderer({
            href: '/sign-up',
            external: false,
            children: t('publicWebsite:header.signUp'),
          })}
        </Button>
      ) : (
        <Button {...ctaButtonProps}>{t('publicWebsite:header.signUp')}</Button>
      )}
    </div>
  );

  const languageSwitcher = onLocaleChange ? (
    <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} />
  ) : null;

  const mobileTrigger = (
    <Sheet open={mobileMenu.isOpen} onOpenChange={mobileMenu.setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t('website:chrome.openMenu')}
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="top">
        <SheetTitle className="sr-only">
          {t('website:chrome.menuTitle', { name: academyName })}
        </SheetTitle>
        <NavLinks
          navigation={navigation}
          pages={pages}
          activePageId={activePageId}
          onNavigate={(pageId) => {
            onNavigate(pageId);
            mobileMenu.close();
          }}
          onLinkFollowed={mobileMenu.close}
          linkRenderer={linkRenderer}
          locale={locale}
          authState={authState}
          className="flex flex-col gap-4 pt-8"
        />
        {authState ? (
          <div className="mt-4 border-t border-border pt-4">
            <WebsiteAccountSheetLinks
              authState={authState}
              linkRenderer={linkRenderer}
              onNavigate={mobileMenu.close}
              linkClassName="text-foreground hover:bg-muted"
            />
          </div>
        ) : null}
        {languageSwitcher}
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
              locale={locale}
              authState={authState}
              // `flex-wrap` — the Owner-authored item count/label length is
              // unbounded (longer still under Arabic), so this row must be
              // able to grow to a second line instead of forcing horizontal
              // overflow past the header's own container.
              className="hidden min-w-0 flex-wrap items-center gap-x-6 gap-y-2 lg:flex"
            />
            {languageSwitcher}
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
              locale={locale}
              authState={authState}
              // `flex-wrap` — the Owner-authored item count/label length is
              // unbounded (longer still under Arabic), so this row must be
              // able to grow to a second line instead of forcing horizontal
              // overflow past the header's own container.
              className="hidden min-w-0 flex-wrap items-center gap-x-6 gap-y-2 lg:flex"
            />
            {/*
              `minimal`'s own design intentionally omits a marketing CTA
              button (no Sign In/Sign Up here, by theme personality) — but
              a signed-in visitor's own auth status is not a marketing CTA,
              so it still renders here, matching every other header variant.

              P64 Phase 1 — neither is the DEFAULT sign in/sign up pair
              that stands in when the Owner configured no CTA at all: with
              this variant's `header.cta` unset, a signed-out student had
              no route to their courses from anywhere in the chrome. Only
              an Owner-authored marketing CTA is still suppressed here.
            */}
            {authState || !header.cta ? cta : null}
            {languageSwitcher}
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
          locale={locale}
          activePageId={activePageId}
          onNavigate={onNavigate}
          linkRenderer={linkRenderer}
          authState={authState}
          className="hidden min-w-0 flex-wrap items-center gap-x-6 gap-y-2 lg:flex"
        />
        <div className="flex items-center gap-2">
          {languageSwitcher}
          {cta}
          {mobileTrigger}
        </div>
      </div>
    </header>
  );
}
