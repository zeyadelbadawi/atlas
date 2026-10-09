/**
 * Notification bell — the management topbar's notification centre.
 *
 * A popover, not a link: the badge says "three things happened", and the
 * next question is "what?" — answered here, in place, with the five most
 * recent UNREAD notifications, each markable read on its own, all of
 * them at once, and a way through to the full page. A bell that only
 * navigated made every glance at the badge cost a page change.
 *
 * The count comes from `useNotificationSummary()` (the one source of the
 * unread count; polled once a minute and on window focus by that hook).
 * The five rows are fetched ONLY while the popover is open: a topbar
 * widget that fetched a list on every dashboard mount would be the most
 * frequent request in the product for something most visits never open.
 *
 * Lives inside this feature (not `shared/components/controls`) because it
 * depends on this feature's own hooks — `shared/` must never import from
 * a feature. `DashboardLayout` composes it into the shell.
 */
import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { cn } from '@utils';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSummary,
  useNotifications,
} from '../hooks';
import { NotificationRow } from './NotificationList';

/** How many unread rows the popover shows before "View all". */
export const BELL_PREVIEW_SIZE = 5;

export interface NotificationBellProps {
  readonly className?: string;
}

export function NotificationBell({
  className,
}: NotificationBellProps): JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const summary = useNotificationSummary();
  const unreadCount = summary.data?.unread ?? 0;

  const preview = useNotifications({
    enabled: isOpen,
    query: {
      pagination: { page: 1, pageSize: BELL_PREVIEW_SIZE },
      filters: { isRead: false },
    },
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const label =
    unreadCount > 0
      ? t('common:notifications.bellUnread', { count: unreadCount })
      : t('common:notifications.bell');
  const items = preview.data?.items ?? [];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          className={cn(
            'relative text-muted-foreground hover:text-foreground',
            className
          )}
        >
          <Bell className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              data-testid="notification-bell-badge"
              className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
        aria-label={t('notifications:center.title')}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {t('notifications:center.title')}
            {unreadCount > 0 ? (
              <span className="ms-2 text-xs font-normal text-muted-foreground">
                {t('notifications:center.unreadCount', { count: unreadCount })}
              </span>
            ) : null}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="me-2 size-4" aria-hidden />
            {t('notifications:center.markAllRead')}
          </Button>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {preview.isLoading ? (
            <div
              role="status"
              aria-label={t('notifications:center.loading')}
              className="space-y-2"
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : preview.error ? (
            <ErrorState
              titleKey="notifications:messages.loadError"
              onRetry={() => preview.refetch()}
            />
          ) : preview.isPending && preview.fetchStatus === 'paused' ? (
            // Offline with no saved copy: say so, never "all caught up".
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t('common:connectivity.notSaved')}
            </p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t('notifications:center.noUnread')}
            </p>
          ) : (
            <ul className="space-y-1.5" aria-label={t('notifications:center.latestUnread')}>
              {items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  compact
                  onMarkRead={(id) => markAsRead.mutate(id)}
                  isMarking={
                    markAsRead.isPending && markAsRead.variables === notification.id
                  }
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link
              to={DASHBOARD_ROUTES.notifications}
              onClick={() => setIsOpen(false)}
            >
              {t('notifications:center.viewAll')}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
