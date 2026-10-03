/**
 * The learner's way into their learning, from every theme's header
 * (Task B).
 *
 * "My Learn" is a fixed navigation item — not an Owner-authored link, and
 * not hidden behind a greeting: before this, a signed-in learner's only
 * route to their courses was the "Welcome, {name}" text happening to be a
 * link, and a signed-out visitor had none at all. Signed out, it leads to
 * this Academy's sign-in with `returnTo` set to My Learn (validated by the
 * sign-in page's `isSafeReturnPath`), so they land where they meant to go.
 *
 * Signed in, the visitor's name opens an account menu — My Learn (the
 * learner overview), My Courses, Profile & settings, Sign out — built on
 * Radix DropdownMenu: keyboard operable (arrows, Home/End, typeahead),
 * closes on Escape and on an outside click or tap, returns focus to the
 * trigger, and portals inside the website's theme scope so it wears the
 * Academy's colours. In the phone/tablet side sheet, which is already a
 * menu, the same entries render as a plain list.
 */
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogOut,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { cn, initialsFromName } from '@utils';
import type { WebsiteHeaderAuthState } from './WebsiteHeader';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

/** Signed out, "My Learn" asks them to sign in first, then brings them back. */
export const MY_LEARN_SIGN_IN_HREF = `/sign-in?returnTo=${encodeURIComponent(
  LEARNER_ROUTES.root
)}`;

/** Where "My Learn" leads for this visitor (bare path; the link renderer localises it). */
export function myLearnHref(
  authState: WebsiteHeaderAuthState | undefined
): string {
  return authState
    ? (authState.myLearningHref ?? LEARNER_ROUTES.root)
    : MY_LEARN_SIGN_IN_HREF;
}

interface AccountLink {
  readonly key: string;
  readonly href: string;
  readonly labelKey: string;
  readonly icon: LucideIcon;
}

const ACCOUNT_LINKS: readonly AccountLink[] = [
  {
    key: 'my-learn',
    href: LEARNER_ROUTES.root,
    labelKey: 'publicWebsite:header.myLearn',
    icon: GraduationCap,
  },
  {
    key: 'my-courses',
    href: LEARNER_ROUTES.courses,
    labelKey: 'publicWebsite:header.myCourses',
    icon: BookOpen,
  },
  {
    key: 'profile',
    href: LEARNER_ROUTES.profile,
    labelKey: 'publicWebsite:header.profileSettings',
    icon: UserCog,
  },
];

export interface WebsiteAccountMenuProps {
  readonly authState: WebsiteHeaderAuthState;
  readonly linkRenderer?: WebsiteLinkRenderer;
  /** Classes for the trigger (each theme styles its own header controls). */
  readonly triggerClassName?: string;
  /** The initials badge's colours, from the theme's own tokens. */
  readonly avatarClassName?: string;
  /** Hide the name beside the avatar below `sm` (crowded headers). */
  readonly compact?: boolean;
}

export function WebsiteAccountMenu({
  authState,
  linkRenderer,
  triggerClassName,
  avatarClassName,
  compact = false,
}: WebsiteAccountMenuProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="website-account-menu"
          aria-label={t('publicWebsite:header.accountMenu', {
            name: authState.name,
          })}
          className={cn(
            'inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full ps-1 pe-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            triggerClassName
          )}
        >
          <span
            aria-hidden
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              avatarClassName ?? 'bg-primary text-primary-foreground'
            )}
          >
            {initialsFromName(authState.name)}
          </span>
          <span
            className={cn(
              'max-w-[9rem] truncate',
              compact && 'hidden sm:inline'
            )}
            dir="auto"
          >
            {authState.name}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // The entries carry the focus highlight; the container, focused
        // when the menu opens, must not draw a ring around all of them.
        className="min-w-56 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <DropdownMenuLabel className="truncate" dir="auto">
          {authState.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_LINKS.map(({ key, href, labelKey, icon: Icon }) =>
          linkRenderer ? (
            <DropdownMenuItem key={key} asChild className="min-h-11 gap-2">
              {linkRenderer({
                href,
                external: false,
                children: (
                  <>
                    <Icon className="size-4" aria-hidden />
                    {t(labelKey)}
                  </>
                ),
              })}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={key} disabled className="min-h-11 gap-2">
              <Icon className="size-4" aria-hidden />
              {t(labelKey)}
            </DropdownMenuItem>
          )
        )}
        {authState.onSignOut ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 gap-2"
              onSelect={() => authState.onSignOut?.()}
            >
              <LogOut className="size-4" aria-hidden />
              {t('publicWebsite:header.signOut')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface WebsiteAccountSheetLinksProps {
  readonly authState: WebsiteHeaderAuthState;
  readonly linkRenderer?: WebsiteLinkRenderer;
  /** Closes the side sheet when an entry is followed. */
  readonly onNavigate?: () => void;
  readonly linkClassName?: string;
}

/** The account entries inside a phone/tablet side sheet (already a menu). */
export function WebsiteAccountSheetLinks({
  authState,
  linkRenderer,
  onNavigate,
  linkClassName,
}: WebsiteAccountSheetLinksProps): JSX.Element {
  const { t } = useTranslation();
  const itemClass = cn(
    'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-base font-medium',
    linkClassName
  );
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="website-account-sheet"
      role="group"
      aria-label={t('publicWebsite:header.accountMenu', {
        name: authState.name,
      })}
    >
      <p className="truncate px-3 pb-1 text-sm font-semibold" dir="auto">
        {authState.name}
      </p>
      {linkRenderer
        ? ACCOUNT_LINKS.filter((link) => link.key !== 'my-learn').map(
            ({ key, href, labelKey, icon: Icon }) => (
              <span key={key} className="contents" onClickCapture={onNavigate}>
                {linkRenderer({
                  href,
                  external: false,
                  className: itemClass,
                  children: (
                    <>
                      <Icon className="size-4" aria-hidden />
                      {t(labelKey)}
                    </>
                  ),
                })}
              </span>
            )
          )
        : null}
      {authState.onSignOut ? (
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            onNavigate?.();
            authState.onSignOut?.();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          {t('publicWebsite:header.signOut')}
        </button>
      ) : null}
    </div>
  );
}
