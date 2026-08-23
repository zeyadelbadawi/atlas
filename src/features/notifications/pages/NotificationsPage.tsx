/**
 * Notifications Page.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — real list, real
 * unread count, a real "mark all read" mutation. The inert "Clear All"
 * button is removed (not wired to a fake call): no archive/clear
 * contract is specification-supported.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@hooks';
import {
  useNotifications,
  useNotificationSummary,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks';

export default function NotificationsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const summaryQuery = useNotificationSummary();
  const notificationsQuery = useNotifications({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters: filter === 'unread' ? { isRead: false } : undefined,
    },
  });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (notificationsQuery.data) setTotalItems(notificationsQuery.data.pagination.totalItems);
  }, [notificationsQuery.data]);

  const notifications = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data]
  );
  const unreadCount = summaryQuery.data?.unread ?? 0;

  return (
    <PageContainer>
      <PageHeader titleKey="notifications:title" descriptionKey="notifications:subtitle" />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">{t('notifications:filters.all')}</TabsTrigger>
            <TabsTrigger value="unread">
              {t('notifications:filters.unread')}
              {!summaryQuery.isLoading ? (
                <Badge variant="secondary" className="ml-2" data-atlas-numeric="true">
                  {unreadCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            {t('notifications:center.markAllRead')}
          </Button>
        </div>

        <TabsContent value={filter} className="space-y-4">
          {markAllAsRead.error ? <ErrorState onRetry={() => markAllAsRead.reset()} /> : null}

          <Card>
            <CardContent className="p-6">
              {notificationsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : notificationsQuery.error ? (
                <ErrorState onRetry={() => notificationsQuery.refetch()} />
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">{t('notifications:center.empty')}</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <ul className="space-y-2">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className={`flex items-start justify-between gap-3 rounded-md border border-border p-3 ${
                          notification.isRead ? '' : 'bg-accent/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {t(notification.titleKey, notification.values ?? {})}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t(notification.messageKey, notification.values ?? {})}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString(i18n.language)}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead.mutate(notification.id)}
                            disabled={markAsRead.isPending}
                          >
                            {t('notifications:center.markAsRead')}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
