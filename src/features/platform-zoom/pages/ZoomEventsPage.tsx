/**
 * Zoom Operations — Webhooks & Events.
 *
 * All from live_provider_events (received/processed/unmatched/failed) plus
 * a by-type breakdown. Read-only.
 *
 * NOT SHOWN, on purpose: signature-verification failures, replayed/stale
 * requests, malformed bodies. Those are rejected BEFORE any row is
 * persisted, so there is no stored data for them — surfacing them would
 * require a telemetry system this project deliberately does not have.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Webhook } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@utils';
import { useZoomEvents } from '../hooks/usePlatformZoom';
import { ZoomPager } from '../components/ZoomPager';
import type { LanguageCode } from '@types';

const STATUSES = ['received', 'processed', 'unmatched', 'failed'] as const;

function Stat({ labelKey, value }: { labelKey: string; value: number }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground" dir="ltr">{value}</p>
    </div>
  );
}

export default function ZoomEventsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [status, setStatus] = useState<(typeof STATUSES)[number] | undefined>();
  const [page, setPage] = useState(1);
  const query = useZoomEvents({ page, pageSize: 20, status });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const health = query.data?.health;
  const pick = (v?: (typeof STATUSES)[number]) => { setStatus(v); setPage(1); };

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:events.title" descriptionKey="platformZoom:events.subtitle" />

      {health ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat labelKey="platformZoom:eventStatus.processed" value={health.processed} />
          <Stat labelKey="platformZoom:eventStatus.received" value={health.received} />
          <Stat labelKey="platformZoom:eventStatus.unmatched" value={health.unmatched} />
          <Stat labelKey="platformZoom:eventStatus.failed" value={health.failed} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={status === undefined ? 'default' : 'outline'} onClick={() => pick(undefined)}>
          {t('platformZoom:filters.all')}
        </Button>
        {STATUSES.map((v) => (
          <Button key={v} size="sm" variant={status === v ? 'default' : 'outline'} onClick={() => pick(status === v ? undefined : v)}>
            {t(`platformZoom:eventStatus.${v}`)}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={Webhook} titleKey="platformZoom:events.emptyTitle" descriptionKey="platformZoom:events.emptyDescription" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformZoom:events.event')}</TableHead>
                  <TableHead>{t('platformZoom:events.status')}</TableHead>
                  <TableHead>{t('platformZoom:events.academy')}</TableHead>
                  <TableHead>{t('platformZoom:events.session')}</TableHead>
                  <TableHead>{t('platformZoom:events.received')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs" dir="ltr">{r.eventType}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'processed' ? 'default' : r.status === 'failed' ? 'destructive' : r.status === 'unmatched' ? 'secondary' : 'outline'}>
                        {t(`platformZoom:eventStatus.${r.status}`, { defaultValue: r.status })}
                      </Badge>
                      {r.failureReason ? <span className="block text-xs text-destructive">{r.failureReason}</span> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.academyName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground"><span className="block truncate">{r.sessionTitle ?? '—'}</span></TableCell>
                    <TableCell dir="ltr" className="text-xs">{formatDate(r.receivedAt, language, 'short')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {pagination ? <ZoomPager page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPage={setPage} /> : null}
    </PageContainer>
  );
}
