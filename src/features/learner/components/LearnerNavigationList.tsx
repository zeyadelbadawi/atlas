/**
 * The learner navigation, rendered once and reused by both places that
 * show it in full: the desktop rail and the mobile drawer.
 *
 * A row is a single `<Link>` containing an icon, a label and a chevron —
 * nothing inside it is interactive on its own. That is the audit finding
 * (§E.6, "no nested interactive controls") applied at the source: a button
 * nested inside a link is announced as one confused control by every screen
 * reader and is unreachable by keyboard in some, and the way that bug gets
 * in is a "remove"/"pin" affordance added to a nav row later. There is no
 * slot here to add one to.
 *
 * The chevron mirrors in RTL (`rtl:-scale-x-100`, the same treatment
 * `Breadcrumbs` uses for its separator) so it always points AWAY from the
 * reading start, which is what makes it read as "onward" rather than
 * "back" in Arabic.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { isPathActive } from '@app/routes/route-paths';
import { cn } from '@utils';
import { LEARNER_NAVIGATION } from '../constants/learner-navigation.constants';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface LearnerNavigationListProps {
  /** Invoked after a row is followed, so the drawer can close itself. */
  readonly onNavigate?: () => void;
  /** Trailing chevrons — useful in the drawer, noise in the desktop rail. */
  readonly showChevron?: boolean;
  readonly className?: string;
}

export function LearnerNavigationList({
  onNavigate,
  showChevron = false,
  className,
}: LearnerNavigationListProps): JSX.Element {
  const { t } = useTranslation();
  const { buildHref, pathname } = useLearnerSurface();

  return (
    <ul className={cn('space-y-1', className)}>
      {LEARNER_NAVIGATION.map((item) => {
        const isActive = isPathActive(pathname, item.path, item.matchNestedPaths);

        return (
          <li key={item.id}>
            <Link
              to={buildHref(item.path)}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
                'transition-colors duration-fast ease-standard motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )}
            >
              <item.icon
                className="size-[1.125rem] shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="truncate">{t(item.labelKey)}</span>
              {showChevron ? (
                <ChevronRight
                  className="ms-auto size-4 shrink-0 text-border-strong rtl:-scale-x-100"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
