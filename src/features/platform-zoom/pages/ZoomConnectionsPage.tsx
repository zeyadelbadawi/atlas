/**
 * Zoom Operations Center — Connections.
 *
 * Answers "which academies use Zoom, and which of them are broken".
 *
 * LISTED FROM ACADEMIES, NOT FROM CONNECTION ROWS. An academy that never
 * connected has no connection row at all, and those are precisely the rows
 * an operator is looking for — so the server bases this list on academies
 * and left-joins the connection.
 *
 * SEARCH, FILTERS AND PAGING ALL HAPPEN ON THE SERVER. This table spans
 * every tenant; narrowing it in the browser would mean fetching all of it
 * first.
 *
 * NOTHING SENSITIVE IS RENDERED: the provider account id arrives already
 * masked, and no token, credential or payload is part of the response.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link2Off, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@utils';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useZoomConnections } from '../hooks/usePlatformZoom';
import { ZoomStatusBadge } from '../components/ZoomStatusBadge';
import type { ZoomConnectionStatus } from '../types';
import type { LanguageCode } from '@types';

const STATUSES: readonly ZoomConnectionStatus[] = [
  'connected',
  'reconnect_required',
  'revoked',
  'expired',
  'error',
  'not_connected',
];

export default function ZoomConnectionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ZoomConnectionStatus | undefined>();
  const [page, setPage] = useState(1);

  const query = useZoomConnections({ page, pageSize: 20, search: search || undefined, status });
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  /** Any filter change returns to page 1 — page 4 of a new filter is meaningless. */
  const applyStatus = (next: ZoomConnectionStatus | undefined): void => {
    setStatus(next);
    setPage(1);
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformZoom:connections.title"
        descriptionKey="platformZoom:connections.subtitle"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t('platformZoom:connections.searchPlaceholder')}
            className="ps-9"
            aria-label={t('platformZoom:connections.searchPlaceholder')}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={status === undefined ? 'default' : 'outline'}
            onClick={() => applyStatus(undefined)}
          >
            {t('platformZoom:filters.all')}
          </Button>
          {STATUSES.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => applyStatus(value)}
            >
              {t(`platformZoom:connectionStatus.${value}`)}
            </Button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Link2Off}
          titleKey="platformZoom:connections.emptyTitle"
          descriptionKey="platformZoom:connections.emptyDescription"
        />
      ) : (
        <Card>
          {/* The table scrolls inside its own container so a narrow
              viewport never scrolls the whole page sideways. */}
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformZoom:connections.academy')}</TableHead>
                  <TableHead>{t('platformZoom:connections.organization')}</TableHead>
                  <TableHead>{t('platformZoom:connections.status')}</TableHead>
                  <TableHead>{t('platformZoom:connections.account')}</TableHead>
                  <TableHead>{t('platformZoom:connections.connectedAt')}</TableHead>
                  <TableHead>{t('platformZoom:connections.lastChecked')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.academyId}>
                    <TableCell className="font-medium">
                      <Link
                        to={buildPath(DASHBOARD_ROUTES.platformZoomAcademyDetail, { academyId: row.academyId })}
                        className="text-primary hover:underline"
                      >
                        {row.academyName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.organizationName}</TableCell>
                    <TableCell>
                      <ZoomStatusBadge status={row.status} />
                      {row.lastCheckReason ? (
                        <span className="ms-2 text-xs text-muted-foreground">
                          {t(`platformZoom:reason.${row.lastCheckReason}`, {
                            defaultValue: row.lastCheckReason,
                          })}
                        </span>
                      ) : null}
                    </TableCell>
                    {/* Masked by the server. Direction-isolated: an opaque
                        Latin id inside an Arabic row reorders otherwise. */}
                    <TableCell dir="ltr" className="font-mono text-xs">
                      {row.maskedAccountId ?? '—'}
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">
                      {row.connectedAt ? formatDate(row.connectedAt, language, 'short') : '—'}
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">
                      {row.lastCheckedAt ? formatDate(row.lastCheckedAt, language, 'short') : '—'}
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
