/**
 * Announcement Detail Page.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnnouncement } from '../hooks';

export default function AnnouncementDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { announcementId } = useParams<{ announcementId: string }>();

  const { data: announcement, isLoading, error, refetch } = useAnnouncement(
    announcementId ?? ''
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  if (error || !announcement) {
    return (
      <PageContainer>
        <PageHeader titleKey="announcements:detail.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={announcement.title}
        titleKey="announcements:detail.title"
        actions={
          <StatusBadge
            labelKey={`announcements:audience.${announcement.audience}`}
            tone="neutral"
          />
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs text-muted-foreground">
            {t('announcements:feed.byAuthor', {
              name: announcement.authorName,
            })}
            {announcement.publishedAt
              ? ` · ${new Date(announcement.publishedAt).toLocaleString()}`
              : ''}
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {announcement.body}
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
