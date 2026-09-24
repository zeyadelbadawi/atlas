/**
 * The notification list — one component, two surfaces.
 *
 * `/dashboard/notifications` (management) and `/my/notifications`
 * (learner) show the same rows, and the bell popover shows the same rows
 * five at a time. Extracting the row and the list here means a change to
 * how an unread notification is marked — or how its action link is built
 * — lands on every surface at once, rather than on the one that was
 * being looked at.
 *
 * UNREAD IS NEVER COLOUR ALONE. A tinted background is the first thing a
 * designer reaches for and the last thing a colour-blind reader or a
 * screen reader notices, so an unread row carries three signals: a dot
 * (a shape, not a hue), a heavier title, and a screen-reader-only
 * "Unread" prefix. The dot's slot is reserved on read rows too, so titles
 * line up whichever state a row is in.
 *
 * ACTION LINKS GO THROUGH `buildHref`. A learner's action URL is a bare
 * `/my/...` path, and the `/ar` prefix (and the dev-preview parameter)
 * are applied by the surface that owns them — never rebuilt here. The
 * management surface passes no builder and gets the URL as stored.
 *
 * FOLLOWING AN ACTION MARKS THE ROW READ. Opening "View course" from an
 * unread notification is the act of reading it; leaving the badge lit
 * afterwards would tell the person there is still something to see.
 */
import { Bell, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import type { PaginationState } from '@hooks';
import { cn, formatDate, formatRelativeTime } from '@utils';
import type { LanguageCode, Notification } from '@types';

export interface NotificationRowProps {
  readonly notification: Notification;
  readonly onMarkRead: (notificationId: string) => void;
  /** Set while this row's own mark-read request is in flight. */
  readonly isMarking?: boolean;
  /** Turns a stored `actionUrl` into an href on the current surface. */
  readonly buildHref?: (path: string) => string;
  /** Tighter spacing, no type badge — the bell popover's variant. */
  readonly compact?: boolean;
}

export function NotificationRow({
  notification,
  onMarkRead,
  isMarking = false,
  buildHref,
  compact = false,
}: NotificationRowProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const values = notification.values ?? {};
  const title = t(notification.titleKey, values);
  const message = t(notification.messageKey, values);
  const isUnread = !notification.isRead;
  const actionHref = notification.actionUrl
    ? (buildHref?.(notification.actionUrl) ?? notification.actionUrl)
    : undefined;
  const isUrgent =
    notification.priority === 'urgent' || notification.priority === 'high';

  return (
    <li
      data-unread={isUnread ? 'true' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-md border border-border',
        compact ? 'p-2.5' : 'p-3 sm:p-4',
        isUnread && 'bg-accent/40'
      )}
    >
      {/* The dot: a shape, so it survives colour-blindness and high-contrast
          modes. Its slot is kept on read rows for alignment. */}
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          isUnread ? 'bg-primary' : 'bg-transparent'
        )}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={cn(
            'text-sm text-foreground',
            isUnread ? 'font-semibold' : 'font-medium'
          )}
        >
          {isUnread ? (
            <span className="sr-only">
              {t('notifications:center.unreadLabel')}{' '}
            </span>
          ) : null}
          {title}
        </p>
        <p
          className={cn(
            'text-sm text-muted-foreground',
            compact && 'line-clamp-2'
          )}
        >
          {message}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <time
            dateTime={notification.createdAt}
            title={formatDate(notification.createdAt, language, 'dateTime')}
          >
            {formatRelativeTime(notification.createdAt, language)}
          </time>
          {!compact ? (
            <Badge variant="outline" className="font-normal">
              {t(`notifications:types.${notification.type}`)}
            </Badge>
          ) : null}
          {!compact && isUrgent ? (
            <Badge variant="destructive" className="font-normal">
              {t(`notifications:priority.${notification.priority}`)}
            </Badge>
          ) : null}
          {actionHref ? (
            <Link
              to={actionHref}
              onClick={isUnread ? () => onMarkRead(notification.id) : undefined}
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            >
              {t(notification.actionLabelKey ?? 'notifications:actions.viewDetails')}
              <span className="sr-only">: {title}</span>
            </Link>
          ) : null}
        </div>
      </div>

      {isUnread ? (
        <Button
          type="button"
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className={cn('shrink-0', compact && 'size-8')}
          onClick={() => onMarkRead(notification.id)}
          disabled={isMarking}
          aria-label={t('notifications:center.markAsReadNamed', { title })}
        >
          <Check className="size-4" aria-hidden />
          {!compact ? (
            <span className="ms-2 hidden sm:inline">
              {t('notifications:center.markAsRead')}
            </span>
          ) : null}
        </Button>
      ) : null}
    </li>
  );
}

export interface NotificationListProps {
  readonly notifications: readonly Notification[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly onMarkRead: (notificationId: string) => void;
  /** The id whose mark-read request is in flight, if any. */
  readonly markingId?: string | null;
  readonly buildHref?: (path: string) => string;
  /** Rendered below the rows when there is more than one page. */
  readonly pagination?: PaginationState;
  /** True when a filter is narrowing the list — changes the empty copy. */
  readonly isFiltered?: boolean;
  readonly className?: string;
}

export function NotificationList({
  notifications,
  isLoading,
  error,
  onRetry,
  onMarkRead,
  markingId = null,
  buildHref,
  pagination,
  isFiltered = false,
  className,
}: NotificationListProps): JSX.Element {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={t('notifications:center.loading')}
        className={cn('space-y-3', className)}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        titleKey="notifications:messages.loadError"
        onRetry={onRetry}
      />
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        titleKey={
          isFiltered
            ? 'common:states.noResults.title'
            : 'notifications:center.empty'
        }
        descriptionKey={
          isFiltered
            ? 'common:states.noResults.description'
            : 'notifications:center.emptyDescription'
        }
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ul className="space-y-2" aria-label={t('notifications:title')}>
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            isMarking={markingId === notification.id}
            buildHref={buildHref}
          />
        ))}
      </ul>
      {/* Same gate as every other Atlas list: a single page needs no pager. */}
      {pagination && pagination.totalPages > 1 ? (
        <Pagination pagination={pagination} hidePageSize />
      ) : null}
    </div>
  );
}
