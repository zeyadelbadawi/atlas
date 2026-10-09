/**
 * Customer requests — the Platform Owner console
 * (`/dashboard/platform/customer-requests`).
 *
 * Every academy's custom-service requests in one queue: a counts strip
 * (open + per status, from the filter-independent `/counts`), filters by
 * status (incl. Open), type and assignee (incl. Unassigned), search over
 * title / academy / requester, and sort. All filtering is server-side
 * and lives in the URL, so Back from a request lands on the same view.
 *
 * Platform Owner only — the route guard hides the page; the API's
 * `PlatformOwnerGuard` and RLS are the actual control.
 */
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Inbox, Route as RouteIcon, SearchX, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDateFormatter, useLanguage, usePagination } from '@hooks';
import { formatNumber, formatRelativeTime } from '@utils';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { CR_NS } from '../constants/customer-request.constants';
import {
  usePlatformCustomerRequestAssignees,
  usePlatformCustomerRequestCounts,
  usePlatformCustomerRequestListState,
  usePlatformCustomerRequests,
} from '../hooks';
import {
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
  customerRequestTypeIcon,
  customerRequestTypeLabelKey,
} from '../utils/customer-request.utils';
import type { PlatformCustomerRequestSummary } from '../types/customer-request.types';
import { CustomerRequestsToolbar } from '../components/CustomerRequestsToolbar';

const TABLE_COLUMN_COUNT = 7;

export default function PlatformCustomerRequestsPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();

  const {
    state,
    page,
    pageSize,
    query,
    set,
    setPage,
    setPageSize,
    clearFilters,
    hasFilters,
  } = usePlatformCustomerRequestListState();

  const listQuery = usePlatformCustomerRequests(query);
  const countsQuery = usePlatformCustomerRequestCounts();
  const assigneesQuery = usePlatformCustomerRequestAssignees();

  const pagination = usePagination({
    totalItems: listQuery.data?.pagination.totalItems ?? 0,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  useEffect(() => {
    if (!listQuery.data || listQuery.isPlaceholderData) return;
    const total = listQuery.data.pagination.totalItems;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page > lastPage) setPage(lastPage);
  }, [listQuery.data, listQuery.isPlaceholderData, page, pageSize, setPage]);

  const openDetail = (request: PlatformCustomerRequestSummary) =>
    navigate(
      buildPath(DASHBOARD_ROUTES.platformCustomerRequestDetail, {
        requestId: request.id,
      })
    );

  const columns = useMemo<ColumnDef<PlatformCustomerRequestSummary, unknown>[]>(
    () => [
      {
        id: 'request',
        header: t(`${CR_NS}:platform.columns.request`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block min-w-0 max-w-[18rem]">
            <span
              className="block truncate font-medium text-foreground"
              dir="auto"
              title={row.original.title}
            >
              {row.original.title}
            </span>
            <span
              className="block font-mono text-xs text-muted-foreground"
              dir="ltr"
              data-ltr-content
            >
              {row.original.reference}
            </span>
          </span>
        ),
      },
      {
        id: 'type',
        header: t(`${CR_NS}:platform.columns.type`),
        enableSorting: false,
        cell: ({ row }) => {
          const Icon = customerRequestTypeIcon(row.original.type);
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {t(customerRequestTypeLabelKey(row.original.type))}
            </span>
          );
        },
      },
      {
        id: 'academy',
        header: t(`${CR_NS}:platform.columns.academy`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block min-w-0 max-w-[12rem]">
            <span className="block truncate text-foreground" dir="auto">
              {row.original.academy.name}
            </span>
            <span
              className="block truncate text-xs text-muted-foreground"
              dir="auto"
            >
              {row.original.organization.name}
            </span>
          </span>
        ),
      },
      {
        id: 'requester',
        header: t(`${CR_NS}:platform.columns.requester`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[10rem] truncate text-muted-foreground"
            dir="auto"
          >
            {row.original.requester.name}
          </span>
        ),
      },
      {
        id: 'status',
        header: t(`${CR_NS}:platform.columns.status`),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={customerRequestStatusLabelKey(row.original.status)}
            tone={customerRequestStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'assignee',
        header: t(`${CR_NS}:platform.columns.assignee`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[10rem] truncate text-muted-foreground"
            dir="auto"
          >
            {row.original.assignee?.name ?? t(`${CR_NS}:platform.unassigned`)}
          </span>
        ),
      },
      {
        id: 'lastActivityAt',
        header: t(`${CR_NS}:platform.columns.lastActivity`),
        enableSorting: false,
        cell: ({ row }) => (
          <time
            dateTime={row.original.lastActivityAt}
            title={fmt.dateTime(row.original.lastActivityAt)}
            className="whitespace-nowrap text-muted-foreground"
          >
            {formatRelativeTime(row.original.lastActivityAt, language)}
          </time>
        ),
      },
    ],
    [t, fmt, language]
  );

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: 'navigation:items.platformCustomerRequests' },
  ];

  const requests = listQuery.data?.items ?? [];

  const renderBody = (): JSX.Element => {
    if (listQuery.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={listQuery.error.kind}
            onRetry={() => {
              void listQuery.refetch();
              void countsQuery.refetch();
            }}
            headingLevel="h2"
          />
        </div>
      );
    }

    if (listQuery.isLoading) {
      return (
        <div aria-busy="true" className="p-4">
          <SkeletonTable columns={TABLE_COLUMN_COUNT} />
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${CR_NS}:list.noResults.title`}
              descriptionKey={`${CR_NS}:list.noResults.description`}
              headingLevel="h2"
              primaryAction={{
                labelKey: `${CR_NS}:list.clearFilters`,
                onAction: clearFilters,
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              titleKey={`${CR_NS}:platform.empty.title`}
              descriptionKey={`${CR_NS}:platform.empty.description`}
              headingLevel="h2"
            />
          )}
        </div>
      );
    }

    return (
      <>
        <section
          aria-label={t(`${CR_NS}:platform.caption`)}
          className="hidden lg:block"
        >
          <DataTable
            columns={columns}
            data={requests}
            getRowId={(request) => request.id}
            onRowSelect={openDetail}
            isBusy={listQuery.isPlaceholderData}
          />
        </section>

        <ul
          aria-label={t(`${CR_NS}:platform.caption`)}
          className="divide-y divide-border lg:hidden"
        >
          {requests.map((request) => {
            const Icon = customerRequestTypeIcon(request.type);
            return (
              <li key={request.id}>
                <button
                  type="button"
                  onClick={() => openDetail(request)}
                  className="block w-full space-y-2 p-4 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className="min-w-0 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]"
                      dir="auto"
                    >
                      {request.title}
                    </span>
                    <StatusBadge
                      labelKey={customerRequestStatusLabelKey(request.status)}
                      tone={customerRequestStatusTone(request.status)}
                      className="shrink-0"
                    />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Icon className="size-3.5 text-primary" aria-hidden />
                      {t(customerRequestTypeLabelKey(request.type))}
                    </span>
                    <span dir="auto">{request.academy.name}</span>
                    <span className="font-mono" dir="ltr" data-ltr-content>
                      {request.reference}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span dir="auto">
                      {request.assignee?.name ??
                        t(`${CR_NS}:platform.unassigned`)}
                    </span>
                    <time dateTime={request.lastActivityAt}>
                      {formatRelativeTime(request.lastActivityAt, language)}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Pagination
          pagination={pagination}
          summary={t(`${CR_NS}:list.resultRange`, {
            from: formatNumber(pagination.rangeStart, language),
            to: formatNumber(pagination.rangeEnd, language),
            total: formatNumber(pagination.totalItems, language),
          })}
        />
      </>
    );
  };

  const openCount = countsQuery.data?.open;

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${CR_NS}:platform.title`}
        descriptionKey={`${CR_NS}:platform.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {openCount !== undefined ? (
              <StatusBadge
                labelKey={`${CR_NS}:platform.counts.openCount`}
                tone={openCount > 0 ? 'info' : 'neutral'}
                values={{ formatted: formatNumber(openCount, language) }}
              />
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link to={DASHBOARD_ROUTES.platformCustomerRequestRouting}>
                <RouteIcon className="size-4" strokeWidth={2} aria-hidden />
                {t(`${CR_NS}:platform.routingLink`)}
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <CustomerRequestsToolbar
          value={state}
          hasFilters={hasFilters}
          onChange={(key, next) => set(key as keyof typeof state, next)}
          onClearFilters={clearFilters}
          searchLabelKey={`${CR_NS}:platform.searchLabel`}
          counts={countsQuery.data}
          assignees={assigneesQuery.data}
        />

        <Card>
          <CardContent className="p-0">{renderBody()}</CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
