/**
 * The learner shell's bell — a link with a live unread badge.
 *
 * A LINK, NOT A POPOVER, unlike the management topbar's bell. The learner
 * shell is a page region below the academy's own header, not a persistent
 * app chrome, and `/my/notifications` is one tap away in the same shell;
 * a popover here would be a second, smaller copy of a page the person is
 * already standing next to. What the shell needs is the SIGNAL — that
 * something happened — visible at every breakpoint, because the bottom
 * bar has no room for a fifth item and the drawer is closed by default.
 *
 * The count is `useNotificationSummary()`'s (polled once a minute and on
 * window focus), the same source as the management bell and the page's
 * own Unread tab, so the three can never disagree.
 */
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { useNotificationSummary } from '@features/notifications';
import { cn } from '@utils';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface LearnerNotificationBellProps {
  readonly className?: string;
}

export function LearnerNotificationBell({
  className,
}: LearnerNotificationBellProps): JSX.Element {
  const { t } = useTranslation();
  const { buildHref } = useLearnerSurface();
  const { data } = useNotificationSummary();
  const unreadCount = data?.unread ?? 0;
  const label =
    unreadCount > 0
      ? t('common:notifications.bellUnread', { count: unreadCount })
      : t('common:notifications.bell');

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={cn(
        'relative text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <Link
        to={buildHref(LEARNER_ROUTES.notifications)}
        aria-label={label}
        title={label}
      >
        <Bell className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            data-testid="learner-notification-badge"
            className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
