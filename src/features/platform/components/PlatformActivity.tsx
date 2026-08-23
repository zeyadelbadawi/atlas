/**
 * Platform Activity Component.
 *
 * Shows the 5 most recent Audit Log entries (Prompt 13) — the same real
 * contract `PlatformAuditLogListPage` reads, filtered to a small page
 * size for this summary panel. Distinct SURFACE, same underlying data;
 * never a separate invented "activity feed" endpoint.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogEntries } from '@features/audit-log';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';

const RECENT_ACTIVITY_PAGE_SIZE = 5;

export function PlatformActivity(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useAuditLogEntries({
    query: {
      pagination: { page: 1, pageSize: RECENT_ACTIVITY_PAGE_SIZE },
      sort: { field: 'occurredAt', direction: 'desc' },
    },
  });

  const entries = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('platform:sections.activity')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">{t('platform:activity.empty')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="cursor-pointer rounded-md p-2 text-sm hover:bg-accent"
                  onClick={() =>
                    navigate(buildPath(DASHBOARD_ROUTES.platformAuditLogDetail, { eventId: entry.id }))
                  }
                >
                  <p className="font-medium text-foreground">{entry.actor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="font-mono">{entry.action}</code>
                    {' · '}
                    {new Date(entry.occurredAt).toLocaleString(i18n.language)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
