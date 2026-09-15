/**
 * Zoom Operations — Attendance (reconciliation health).
 *
 * Read-only. Reconciliation state is DERIVED server-side from stored
 * fields (attendanceReconciledAt / status / reconciliationAttempts); this
 * page displays it and does not modify attendance — there is no approved
 * write capability, so none is offered.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@utils';
import { useZoomAttendance } from '../hooks/usePlatformZoom';
import { ZoomPager } from '../components/ZoomPager';
import type { ZoomReconciliationState } from '../types';
import type { LanguageCode } from '@types';

const STATES: readonly ZoomReconciliationState[] = ['reconciled', 'pending', 'failing', 'not_due'];
const STATE_VARIANT: Record<ZoomReconciliationState, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reconciled: 'default',
  pending: 'secondary',
  failing: 'destructive',
  not_due: 'outline',
};

export default function ZoomAttendancePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [state, setState] = useState<ZoomReconciliationState | undefined>();
  const [page, setPage] = useState(1);
  const query = useZoomAttendance({ page, pageSize: 20, state });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  const pick = (next?: ZoomReconciliationState) => { setState(next); setPage(1); };

  return (
    <PageContainer>
      <PageHeader titleKey="platformZoom:attendance.title" descriptionKey="platformZoom:attendance.subtitle" />
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={state === undefined ? 'default' : 'outline'} onClick={() => pick(undefined)}>
          {t('platformZoom:filters.all')}
        </Button>
        {STATES.map((v) => (
          <Button key={v} size="sm" variant={state === v ? 'default' : 'outline'} onClick={() => pick(state === v ? undefined : v)}>
            {t(`platformZoom:reconciliation.${v}`)}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} titleKey="platformZoom:attendance.emptyTitle" descriptionKey="platformZoom:attendance.emptyDescription" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformZoom:attendance.session')}</TableHead>
                  <TableHead>{t('platformZoom:attendance.academy')}</TableHead>
                  <TableHead>{t('platformZoom:attendance.state')}</TableHead>
                  <TableHead>{t('platformZoom:attendance.participants')}</TableHead>
                  <TableHead>{t('platformZoom:attendance.reconciledAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.sessionId}>
                    <TableCell className="font-medium">
                      <span className="block truncate">{r.title}</span>
                      {r.courseTitle ? <span className="block truncate text-xs text-muted-foreground">{r.courseTitle}</span> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block truncate">{r.academyName}</span>
                      <span className="block truncate text-xs">{r.organizationName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANT[r.reconciliationState]}>
                        {t(`platformZoom:reconciliation.${r.reconciliationState}`)}
                      </Badge>
                      {r.reconciliationState === 'failing' ? (
                        <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                          {t('platformZoom:attendance.attempts', { count: r.reconciliationAttempts })}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell dir="ltr">{r.participantCount}</TableCell>
                    <TableCell dir="ltr" className="text-xs">
                      {r.reconciledAt ? formatDate(r.reconciledAt, language, 'short') : '—'}
                    </TableCell>
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
