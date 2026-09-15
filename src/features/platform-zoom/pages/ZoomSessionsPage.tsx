/**
 * Zoom Operations Center — Live Sessions.
 *
 * Operational session state, not connection configuration: which sessions
 * are running, which failed, and which upcoming ones are going to fail.
 *
 * "AT RISK" IS DERIVED FROM STORED STATE, never guessed. A session is at
 * risk when it still has to run AND either Atlas holds no provider meeting
 * for it (`provider_meeting_id` is null) or its academy's connection is in
 * a state that cannot reach Zoom. Both facts are already in the database.
 *
 * There is deliberately no "provider unavailable" status here, because
 * `LiveSessionStatus` has no such value — the real states are
 * draft/scheduled/live/ended/cancelled/failed, and a provider problem
 * surfaces as `failed` plus the stored `failureReason`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@utils';
import { useZoomSessions } from '../hooks/usePlatformZoom';
import { ZoomSessionBadge } from '../components/ZoomStatusBadge';
import type { ZoomSessionStatus } from '../types';
import type { LanguageCode } from '@types';

const STATUSES: readonly ZoomSessionStatus[] = [
  'scheduled',
  'live',
  'ended',
  'cancelled',
  'failed',
];

export default function ZoomSessionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ZoomSessionStatus | undefined>();
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const [page, setPage] = useState(1);

  const query = useZoomSessions({
    page,
    pageSize: 20,
    search: search || undefined,
    status,
    atRiskOnly: atRiskOnly || undefined,
  });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  const reset = (fn: () => void): void => {
    fn();
    setPage(1);
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformZoom:sessions.title"
        descriptionKey="platformZoom:sessions.subtitle"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => reset(() => setSearch(event.target.value))}
            placeholder={t('platformZoom:sessions.searchPlaceholder')}
            className="ps-9"
            aria-label={t('platformZoom:sessions.searchPlaceholder')}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={status === undefined && !atRiskOnly ? 'default' : 'outline'}
            onClick={() =>
              reset(() => {
                setStatus(undefined);
                setAtRiskOnly(false);
              })
            }
          >
            {t('platformZoom:filters.all')}
          </Button>
          {STATUSES.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => reset(() => setStatus(status === value ? undefined : value))}
            >
              {t(`platformZoom:sessionStatus.${value}`)}
            </Button>
          ))}
          <Button
            size="sm"
            variant={atRiskOnly ? 'destructive' : 'outline'}
            onClick={() => reset(() => setAtRiskOnly((v) => !v))}
          >
            {t('platformZoom:sessions.atRiskOnly')}
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          titleKey="platformZoom:sessions.emptyTitle"
          descriptionKey="platformZoom:sessions.emptyDescription"
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformZoom:sessions.session')}</TableHead>
                  <TableHead>{t('platformZoom:sessions.academy')}</TableHead>
                  <TableHead>{t('platformZoom:sessions.start')}</TableHead>
                  <TableHead>{t('platformZoom:sessions.status')}</TableHead>
                  <TableHead>{t('platformZoom:sessions.provisioning')}</TableHead>
                  <TableHead>{t('platformZoom:sessions.recording')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <span className="block truncate">{row.title}</span>
                      {row.courseTitle ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.courseTitle}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block truncate">{row.academyName}</span>
                      <span className="block truncate text-xs">{row.organizationName}</span>
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">
                      {formatDate(row.scheduledStartAt, language, 'short')}
                    </TableCell>
                    <TableCell>
                      <ZoomSessionBadge status={row.status} />
                      {row.atRisk ? (
                        <Badge variant="destructive" className="ms-2">
                          {t(`platformZoom:risk.${row.riskReason ?? 'unknown'}`)}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t(
                        row.provisioned
                          ? 'platformZoom:sessions.provisioned'
                          : 'platformZoom:sessions.notProvisioned',
                      )}
                      {row.failureReason ? (
                        <span className="block text-xs text-destructive">{row.failureReason}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.recordingEnabled
                        ? t(`platformZoom:recordingStatus.${row.recordingStatus ?? 'pending'}`, {
                            defaultValue: row.recordingStatus ?? '—',
                          })
                        : t('platformZoom:sessions.recordingOff')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t('platformZoom:pagination.summary', {
              page: pagination.page,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('platformZoom:pagination.previous')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('platformZoom:pagination.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
