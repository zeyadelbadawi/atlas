/**
 * B0-SEC-13 — the Platform Owner's privacy-request queue
 * (`/dashboard/platform/privacy-requests`).
 *
 * Open requests first, oldest first: that is the order they should be
 * handled in. No handling time is shown or promised (no SLA is published).
 * Platform Owner only — the route guard hides the page; the API's
 * `PlatformOwnerGuard` and RLS are the actual control.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDateFormatter } from '@hooks';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { usePlatformPrivacyRequests } from '../hooks/usePrivacyRequests';
import { privacyStatusTone } from '../utils';
import type { PrivacyRequestStatus } from '../types';

const NS = 'platform:privacyRequests';
const PAGE_SIZE = 20;
const FILTERS = [
  'submitted',
  'in_progress',
  'completed',
  'rejected',
  'all',
] as const;
type Filter = (typeof FILTERS)[number];

export default function PlatformPrivacyRequestsPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('submitted');
  const [page, setPage] = useState(1);

  const query = usePlatformPrivacyRequests({
    page,
    pageSize: PAGE_SIZE,
    status: filter === 'all' ? undefined : (filter as PrivacyRequestStatus),
  });

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: 'navigation:items.platformPrivacyRequests' },
  ];

  const rows = query.data?.items ?? [];
  const totalPages = query.data?.pagination.totalPages ?? 1;

  const body = (): JSX.Element => {
    if (query.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={query.error.kind}
            titleKey={`${NS}.loadFailed`}
            onRetry={() => void query.refetch()}
            headingLevel="h2"
          />
        </div>
      );
    }
    if (query.isLoading) {
      return (
        <div aria-busy="true" className="p-4">
          <SkeletonTable columns={5} />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="p-4">
          <EmptyState
            icon={ShieldCheck}
            titleKey={`${NS}.empty`}
            headingLevel="h2"
          />
        </div>
      );
    }
    return (
      <ul aria-label={t(`${NS}.title`)} className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              data-testid="privacy-request-row"
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.platformPrivacyRequestDetail, {
                    requestId: row.id,
                  })
                )
              }
              className="grid w-full gap-2 p-4 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[10rem_1fr_10rem_8rem] sm:items-center"
            >
              <span className="text-sm font-medium">
                {t(`${NS}.type.${row.type}`)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm" dir="auto">
                  {row.requesterName}
                </span>
                <span
                  className="block truncate text-xs text-muted-foreground"
                  dir="auto"
                >
                  {row.academyName ?? t(`${NS}.noAcademy`)}
                </span>
              </span>
              <StatusBadge
                labelKey={`${NS}.status.${row.status}`}
                tone={privacyStatusTone(row.status)}
                className="w-fit"
              />
              <time
                dateTime={row.createdAt}
                className="text-xs text-muted-foreground"
              >
                {fmt.date(row.createdAt)}
              </time>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${NS}.title`}
        descriptionKey={`${NS}.subtitle`}
        breadcrumbs={breadcrumbs}
      />

      <div
        role="group"
        aria-label={t(`${NS}.columns.status`)}
        className="mb-4 flex flex-wrap gap-2"
      >
        {FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {value === 'all'
              ? t(`${NS}.filters.all`)
              : t(`${NS}.status.${value}`)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">{body()}</CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('common:actions.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common:actions.next')}
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}
