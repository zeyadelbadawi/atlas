/**
 * Zoom Operations — Recordings (lifecycle).
 *
 * Read-only lifecycle from LiveSessionRecording. `quotaConsumed` reflects
 * the stored quotaConsumedAt (one session = one unit), NOT the number of
 * files. Per-organization quota totals (X / Y recorded sessions) live on
 * the Academy Detail page, where they can be shown with one entitlement
 * call instead of one per row.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@utils';
import { useZoomRecordings } from '../hooks/usePlatformZoom';
import { ZoomPager } from '../components/ZoomPager';
import type { LanguageCode } from '@types';

const STATUSES = ['requested', 'processing', 'available', 'failed'] as const;

export default function ZoomRecordingsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [status, setStatus] = useState<(typeof STATUSES)[number] | undefined>();
  const [page, setPage] = useState(1);
  const query = useZoomRecordings({ page, pageSize: 20, status });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const pick = (v?: (typeof STATUSES)[number]) => { setStatus(v); setPage(1); };

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:recordings.title" descriptionKey="platformZoom:recordings.subtitle" />
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={status === undefined ? 'default' : 'outline'} onClick={() => pick(undefined)}>
          {t('platformZoom:filters.all')}
        </Button>
        {STATUSES.map((v) => (
          <Button key={v} size="sm" variant={status === v ? 'default' : 'outline'} onClick={() => pick(status === v ? undefined : v)}>
            {t(`platformZoom:recordingStatus.${v}`)}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={Film} titleKey="platformZoom:recordings.emptyTitle" descriptionKey="platformZoom:recordings.emptyDescription" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformZoom:recordings.session')}</TableHead>
                  <TableHead>{t('platformZoom:recordings.academy')}</TableHead>
                  <TableHead>{t('platformZoom:recordings.status')}</TableHead>
                  <TableHead>{t('platformZoom:recordings.files')}</TableHead>
                  <TableHead>{t('platformZoom:recordings.quota')}</TableHead>
                  <TableHead>{t('platformZoom:recordings.created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.recordingId}>
                    <TableCell className="font-medium"><span className="block truncate">{r.title}</span></TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block truncate">{r.academyName}</span>
                      <span className="block truncate text-xs">{r.organizationName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'available' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                        {t(`platformZoom:recordingStatus.${r.status}`, { defaultValue: r.status })}
                      </Badge>
                      {r.failureReason ? <span className="block text-xs text-destructive">{r.failureReason}</span> : null}
                    </TableCell>
                    <TableCell dir="ltr">{r.fileCount}</TableCell>
                    <TableCell>
                      {r.quotaConsumed ? t('platformZoom:recordings.quotaConsumed') : t('platformZoom:recordings.quotaFree')}
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">{formatDate(r.createdAt, language, 'short')}</TableCell>
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
