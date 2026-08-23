/**
 * Platform Audit Log — Detail Page (Prompt 13).
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogEntry } from '../hooks';

export default function PlatformAuditLogDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();

  const { data: entry, isLoading, error, refetch } = useAuditLogEntry(eventId ?? '');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !entry) {
    return (
      <PageContainer>
        <PageHeader titleKey="auditLog:detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const contextEntries = entry.context ? Object.entries(entry.context) : [];

  return (
    <PageContainer>
      <PageHeader titleKey="auditLog:detailTitle" title={entry.action} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('auditLog:overviewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('auditLog:table.actor')}</p>
              <p className="text-sm text-foreground">{entry.actor.name}</p>
              {entry.actor.email ? (
                <p className="text-xs text-muted-foreground">{entry.actor.email}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('auditLog:table.occurredAt')}</p>
              <p className="text-sm text-foreground">
                {new Date(entry.occurredAt).toLocaleString(i18n.language)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('auditLog:table.target')}</p>
              <p className="text-sm text-foreground">
                {entry.targetLabel ?? entry.targetId} ({entry.targetType})
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('auditLog:table.organization')}</p>
              <p className="text-sm text-foreground">{entry.organizationName ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('auditLog:contextTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {contextEntries.length === 0 ? (
              <EmptyState titleKey="auditLog:noContext" />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                {contextEntries.map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <dt className="text-xs text-muted-foreground">{key}</dt>
                    <dd className="text-sm text-foreground">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
