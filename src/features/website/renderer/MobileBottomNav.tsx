/**
 * Mobile Bottom Navigation.
 *
 * A fixed, mobile/tablet-only navigation bar for the Academy's public
 * website — Home / Courses / My Learning / Profile — inspired by modern
 * mobile commerce/LMS apps. Mounted once, inside `WebsiteChrome` (the ONE
 * shell every public-runtime surface already renders through — CMS pages,
 * Sign In/Sign Up, the embedded Student Learning routes), so every page
 * gets it for free with no second navigation tree to maintain.
 *
 * Reuses the EXACT SAME `linkRenderer` `WebsiteHeader`/`WebsiteFooter`
 * already use for real navigation (locale- and dev-preview-aware — see
 * `usePublicWebsiteLinkRenderer`'s own doc comment) rather than inventing
 * a second link-building mechanism. "My Learning"/"Profile" always link
 * to `/my-learning`/`/my-account` regardless of session state:
 * `PublicWebsiteLearningRoute` already redirects an unauthenticated
 * visitor to Sign In with a `returnTo` back to whichever of those they
 * tapped — the existing route guard, not a second one, decides access.
 *
 * `useMobileBottomNavVisibility` is exported separately so `WebsiteChrome`
 * can apply matching bottom padding to `<main>` — the two must never
 * disagree about whether the bar is showing, or content/CTAs end up
 * hidden behind it (or dead space appears when it isn't there).
 * Mobile/tablet-only visibility itself is pure CSS (`md:hidden` — matches
 * `WebsiteHeader`'s own `lg:hidden` hamburger convention), never a
 * `useBreakpoint` resize listener; only the ROUTE-based exception below
 * needs JS.
 *
 * Hidden on the immersive lesson/video screen specifically (`.../learn/
 * :lessonId`) per explicit product guidance: a fixed bar there would
 * shrink the video, sit under lesson controls, or otherwise fight for the
 * same screen space the video needs. Course browsing, course details, My
 * Learning, quizzes, and the profile pages all keep it — none of those
 * are full-bleed video surfaces.
 */
import { useLocation } from 'react-router-dom';
import { Compass, GraduationCap, Home, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { resolvePagePath } from '../utils/link-resolution.utils';
import { useMobileBottomNavVisibility } from './useMobileBottomNavVisibility';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';
import type { PublicWebsiteLocale, WebsitePage } from '@types';

export interface MobileBottomNavProps {
  readonly pages: readonly WebsitePage[];
  readonly locale: PublicWebsiteLocale;
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function MobileBottomNav({
  pages,
  locale,
  linkRenderer,
}: MobileBottomNavProps): JSX.Element | null {
  const { t } = useTranslation();
  const location = useLocation();
  const isVisible = useMobileBottomNavVisibility();

  // No real navigation possible without it (matches `WebsiteHeader`'s own
  // "absent in every dashboard preview context" convention) — the Theme
  // gallery/Page Editor preview simply doesn't render this bar.
  if (!linkRenderer || !isVisible) return null;

  const unprefixedPathname =
    locale === 'en' ? location.pathname : location.pathname.replace(/^\/ar/, '') || '/';
  const coursesPage = pages.find((page) => page.coreType === 'courses');
  const coursesPath = coursesPage ? resolvePagePath(coursesPage) : '/courses';

  const items = [
    {
      key: 'home',
      href: '/',
      label: t('website:mobileNav.home'),
      icon: Home,
      isActive: unprefixedPathname === '/',
    },
    {
      key: 'courses',
      href: coursesPath ?? '/courses',
      label: t('website:mobileNav.courses'),
      icon: Compass,
      isActive: !!coursesPath && unprefixedPathname.startsWith(coursesPath),
    },
    {
      key: 'myLearning',
      href: '/my-learning',
      label: t('website:mobileNav.myLearning'),
      icon: GraduationCap,
      isActive: unprefixedPathname.startsWith('/my-learning'),
    },
    {
      key: 'profile',
      href: '/my-account',
      label: t('website:mobileNav.profile'),
      icon: User,
      isActive: unprefixedPathname.startsWith('/my-account'),
    },
  ] as const;

  return (
    <nav
      aria-label={t('website:mobileNav.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {items.map(({ key, href, label, icon: Icon, isActive }) => (
            // `WebsiteLinkRenderer` returns the anchor/`Link` itself with
            // no `key` slot of its own — this wrapper (matching
            // `WebsiteBrandBridge`'s identical `contents` precedent) carries
            // the list key without becoming an extra grid box of its own.
            <div key={key} className="contents">
              {linkRenderer({
                href,
                external: false,
                className: cn(
                  'flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-[var(--website-primary-solid)]'
                    : 'text-muted-foreground hover:text-foreground'
                ),
                children: (
                  <>
                    <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                    {label}
                  </>
                ),
              })}
            </div>
          ))}
      </div>
    </nav>
  );
}
