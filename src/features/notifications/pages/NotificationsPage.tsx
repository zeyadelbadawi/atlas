/**
 * Notifications Page — the management notification centre.
 *
 * FILTERS LIVE IN THE URL (`?status=unread&type=security&priority=high`).
 * A filtered view is something a person copies to a colleague, comes
 * back to after following an action link, and expects the browser's Back
 * button to restore; component state does none of that. Every filter is
 * a SERVER-SIDE query parameter (`ListNotificationsQueryDto`), so a
 * filtered page is a page of matching rows, never a thinned page.
 *
 * Changing any filter returns to page one: page seven of "all" is a
 * meaningless place to land inside "security only".
 *
 * The rows, their unread affordances and their action links come from
 * `NotificationList`, shared with the learner surface and the bell.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePagination } from '@hooks';
import type { NotificationPriority, NotificationType } from '@types';
import {
  useNotifications,
  useNotificationSummary,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks';
import { NotificationList } from '../components/NotificationList';
import {
  NOTIFICATION_PRIORITY_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
  NotificationFilters,
} from '../components/NotificationFilters';

type StatusFilter = 'all' | 'unread';

/** Reads a query parameter only when it is one of the allowed values. */
function readParam<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export default function NotificationsPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const status: StatusFilter =
    readParam(searchParams.get('status'), ['all', 'unread'] as const) ?? 'all';
  const type = readParam(searchParams.get('type'), NOTIFICATION_TYPE_OPTIONS);
  const priority = readParam(
    searchParams.get('priority'),
    NOTIFICATION_PRIORITY_OPTIONS
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const { goToFirstPage } = pagination;

  const setFilter = useCallback(
    (key: 'status' | 'type' | 'priority', value: string | undefined) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === undefined || (key === 'status' && value === 'all')) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true }
      );
      goToFirstPage();
    },
    [setSearchParams, goToFirstPage]
  );

  const filters = useMemo(
    () => ({
      ...(status === 'unread' ? { isRead: false } : {}),
      ...(type ? { type } : {}),
      ...(priority ? { priority } : {}),
    }),
    [status, type, priority]
  );
  const isFiltered = Object.keys(filters).length > 0;

  const summaryQuery = useNotificationSummary();
  const notificationsQuery = useNotifications({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters: isFiltered ? filters : undefined,
    },
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (notificationsQuery.data) {
      setTotalItems(notificationsQuery.data.pagination.totalItems);
    }
  }, [notificationsQuery.data]);

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = summaryQuery.data?.unread ?? 0;

  return (
    <PageContainer>
      <PageHeader
        titleKey="notifications:title"
        descriptionKey="notifications:subtitle"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="me-2 size-4" aria-hidden />
            {t('notifications:center.markAllRead')}
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Tabs
            value={status}
            onValueChange={(value) => setFilter('status', value)}
          >
            <TabsList aria-label={t('notifications:filters.status')}>
              <TabsTrigger value="all">
                {t('notifications:filters.all')}
              </TabsTrigger>
              <TabsTrigger value="unread">
                {t('notifications:filters.unread')}
                {summaryQuery.data ? (
                  <Badge
                    variant="secondary"
                    className="ms-2"
                    data-atlas-numeric="true"
                  >
                    {unreadCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <NotificationFilters
            type={type}
            priority={priority}
            onTypeChange={(next) => setFilter('type', next)}
            onPriorityChange={(next) => setFilter('priority', next)}
            onClear={() => {
              setSearchParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.delete('type');
                  next.delete('priority');
                  return next;
                },
                { replace: true }
              );
              goToFirstPage();
            }}
          />
        </div>

        {markAllAsRead.error ? (
          <ErrorState
            titleKey="notifications:messages.actionError"
            onRetry={() => markAllAsRead.mutate()}
          />
        ) : null}

        <Card>
          <CardContent className="p-4 sm:p-6">
            <NotificationList
              notifications={notifications}
              isLoading={notificationsQuery.isLoading}
              error={notificationsQuery.error}
              onRetry={() => notificationsQuery.refetch()}
              onMarkRead={(id) => markAsRead.mutate(id)}
              markingId={markAsRead.isPending ? markAsRead.variables : null}
              pagination={pagination}
              isFiltered={isFiltered}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
