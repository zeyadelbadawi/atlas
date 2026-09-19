/**
 * The learner dashboard's mobile bottom bar — Overview, Courses,
 * Assessments, Profile (§E.1).
 *
 * Not the academy website's own bar (`MobileBottomNav`, Home / Courses /
 * My Learning / Profile): that one is for a VISITOR browsing the site, this
 * one is for a learner inside their dashboard, and the two answer different
 * questions. They are mutually exclusive rather than stacked —
 * `useMobileBottomNavVisibility` stands the website bar down across `/my/*`
 * — because two fixed bars would occupy the bottom of a phone screen twice
 * and leave a learner scrolling past both to reach anything.
 *
 * Mobile/tablet-only visibility is pure CSS (`md:hidden`), matching that
 * component's own convention; only the player exception needs JS, and it
 * lives in `useLearnerBottomNavVisibility` so the shell's bottom padding
 * can read the same boolean.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isPathActive } from '@app/routes/route-paths';
import { cn } from '@utils';
import { LEARNER_BOTTOM_NAVIGATION } from '../constants/learner-navigation.constants';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useLearnerBottomNavVisibility } from '../hooks/useLearnerBottomNavVisibility';

export function LearnerBottomNav(): JSX.Element | null {
  const { t } = useTranslation();
  const { buildHref, pathname } = useLearnerSurface();
  const isVisible = useLearnerBottomNavVisibility();

  if (!isVisible) return null;

  return (
    <nav
      aria-label={t('learning:learnerDashboard.nav.bottomLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {LEARNER_BOTTOM_NAVIGATION.map((item) => {
          const isActive = isPathActive(
            pathname,
            item.path,
            item.matchNestedPaths
          );

          return (
            <li key={item.id} className="contents">
              <Link
                to={buildHref(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs font-medium',
                  'transition-colors duration-fast ease-standard motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon
                  className="size-5"
                  // A heavier stroke, not a colour change alone, so the
                  // active tab survives a colour-blind reading of the bar.
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden
                />
                {t(item.shortLabelKey ?? item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
