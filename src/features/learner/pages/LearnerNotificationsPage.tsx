/**
 * `/my/notifications` — the learner's own notification centre.
 *
 * Until now a learner had no notification surface at all: grades,
 * certificates, live-session changes and purchase receipts were written
 * to their inbox and shown nowhere on the academy host. This page is the
 * management centre's rows (`NotificationList`, shared) inside the
 * learner shell, with two learner-specific differences:
 *
 * - ACTION LINKS GO THROUGH `buildHref`. A stored `actionUrl` is a bare
 *   `/my/...` path; the `/ar` prefix and the dev-preview parameter belong
 *   to this surface, and are applied here and nowhere else.
 * - NO TYPE OR PRIORITY FILTERS. A learner's inbox is one person's
 *   handful of events, not an operator's stream; All/Unread is the only
 *   split that has earned its place. The server-side filter set is still
 *   there for the day it does.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@components/feedback';
import { usePagination } from '@hooks';
import {
  NotificationList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSummary,
  useNotifications,
} from '@features/notifications';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { useLearnerSurface } from '../context/LearnerSurface.context';

type StatusFilter = 'all' | 'unread';

export default function LearnerNotificationsPage(): JSX.Element {
  const { t } = useTranslation();
  const { buildHref } = useLearnerSurface();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const { goToFirstPage } = pagination;

  const summaryQuery = useNotificationSummary();
  const notificationsQuery = useNotifications({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters: status === 'unread' ? { isRead: false } : undefined,
    },
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (notificationsQuery.data) {
      setTotalItems(notificationsQuery.data.pagination.totalItems);
    }
  }, [notificationsQuery.data]);

  const unreadCount = summaryQuery.data?.unread ?? 0;

  return (
    <>
      <LearnerPageHeader
        section="notifications"
        titleKey="learning:learnerDashboard.notifications.title"
        descriptionKey="learning:learnerDashboard.notifications.subtitle"
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

      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as StatusFilter);
          goToFirstPage();
        }}
      >
        <TabsList aria-label={t('notifications:filters.status')}>
          <TabsTrigger value="all">{t('notifications:filters.all')}</TabsTrigger>
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

      {markAllAsRead.error ? (
        <ErrorState
          titleKey="notifications:messages.actionError"
          onRetry={() => markAllAsRead.mutate()}
        />
      ) : null}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <NotificationList
            notifications={notificationsQuery.data?.items ?? []}
            isLoading={notificationsQuery.isLoading}
            error={notificationsQuery.error}
            onRetry={() => notificationsQuery.refetch()}
            onMarkRead={(id) => markAsRead.mutate(id)}
            markingId={markAsRead.isPending ? markAsRead.variables : null}
            buildHref={buildHref}
            pagination={pagination}
            isFiltered={status === 'unread'}
          />
        </CardContent>
      </Card>
    </>
  );
}
