/**
 * Announcement Feed Page.
 *
 * Shows the current user's visible announcement feed — platform, academy
 * and course scoped items the backend has already resolved for this
 * session. No scope filtering happens client-side.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge, Pagination } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAnnouncementFeed } from '../hooks';
import type { AnnouncementAudience } from '@types';

function getAudienceTone(audience: AnnouncementAudience) {
  switch (audience) {
    case 'platform':
      return 'info' as const;
    case 'academy':
      return 'neutral' as const;
    case 'course':
    default:
      return 'neutral' as const;
  }
}

export default function AnnouncementFeedPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useAnnouncementFeed({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const announcements = data?.items ?? [];

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="announcements:feed.title"
          descriptionKey="announcements:feed.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="announcements:feed.title"
        descriptionKey="announcements:feed.subtitle"
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          titleKey="announcements:feed.empty"
          descriptionKey="announcements:feed.emptyDescription"
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.announcementDetail, {
                    announcementId: announcement.id,
                  })
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(
                    buildPath(DASHBOARD_ROUTES.announcementDetail, {
                      announcementId: announcement.id,
                    })
                  );
                }
              }}
              className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="flex items-start gap-3 pt-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-primary-surface text-primary">
                  <Megaphone className="size-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {announcement.title}
                    </h3>
                    <StatusBadge
                      labelKey={`announcements:audience.${announcement.audience}`}
                      tone={getAudienceTone(announcement.audience)}
                    />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {announcement.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('announcements:feed.byAuthor', {
                      name: announcement.authorName,
                    })}
                    {announcement.publishedAt
                      ? ` · ${new Date(
                          announcement.publishedAt
                        ).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination pagination={pagination} />
        </div>
      )}
    </PageContainer>
  );
}
