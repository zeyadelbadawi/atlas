/**
 * Platform Activity Component.
 *
 * The 5 most recent audit entries — the same real cursor feed
 * `PlatformAuditLogListPage` reads (`GET audit-log/feed`, one small page),
 * rendered with the same readable sentence row (Task 3) instead of a raw
 * action code. Distinct SURFACE, same underlying data.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorKind } from '@api';
import {
  AuditEntryRow,
  platformEntryToRow,
  useAuditLogFeed,
} from '@features/audit-log';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';

const RECENT_ACTIVITY_PAGE_SIZE = 5;

export function PlatformActivity(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useAuditLogFeed(
    {},
    { limit: RECENT_ACTIVITY_PAGE_SIZE }
  );
  const rows = useMemo(
    () => (data?.pages[0]?.items ?? []).map(platformEntryToRow),
    [data]
  );

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
            <ErrorState
              kind={apiErrorKind(error)}
              onRetry={() => void refetch()}
            />
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                {t('platform:activity.empty')}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border pe-3">
              {rows.map((row) => (
                <AuditEntryRow
                  key={row.id}
                  row={row}
                  compact
                  showAcademy
                  onOpen={(selected) =>
                    navigate(
                      buildPath(DASHBOARD_ROUTES.platformAuditLogDetail, {
                        eventId: selected.id,
                      })
                    )
                  }
                />
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
