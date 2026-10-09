/**
 * My Requests — every custom service this academy has asked the Atlas
 * team for (`/dashboard/academy/:academyId/requests`).
 *
 * Owner/administrator only (the API's `AcademyRoles` rule, re-checked
 * here against the verified academy membership so a manager sees an
 * explanation instead of a failed read). Available while a subscription
 * is inactive, like the API (`@AllowInactiveSubscription`): asking for
 * help is exactly what a lapsed customer may need to do.
 *
 * All filtering is server-side and lives in the URL. The empty state is
 * not a dead end: it explains what can be requested and offers every
 * kind of request as an entry point.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, SearchX, ShieldAlert, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter, useLanguage, usePagination } from '@hooks';
import { formatNumber } from '@utils';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { CR_NS } from '../constants/customer-request.constants';
import {
  useCustomerRequestAccess,
  useCustomerRequestListState,
  useCustomerRequests,
} from '../hooks';
import {
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
  customerRequestTypeIcon,
  customerRequestTypeLabelKey,
} from '../utils/customer-request.utils';
import type {
  CustomerRequestSummary,
  CustomerRequestType,
} from '../types/customer-request.types';
import { CreateCustomerRequestDialog } from '../components/CreateCustomerRequestDialog';
import { CustomerRequestsToolbar } from '../components/CustomerRequestsToolbar';
import { RequestCatalog } from '../components/RequestCatalog';

const TABLE_COLUMN_COUNT = 5;

/** Which dialog is open: a preset type, the type picker, or none. */
type DialogState =
  | { readonly open: false }
  | { readonly open: true; readonly type?: CustomerRequestType };

export default function AcademyRequestsPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { academyId, canRequest, isResolving } = useCustomerRequestAccess();
  const [dialog, setDialog] = useState<DialogState>({ open: false });

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
  } = useCustomerRequestListState();

  const listQuery = useCustomerRequests(
    canRequest ? academyId : undefined,
    query
  );

  const pagination = usePagination({
    totalItems: listQuery.data?.pagination.totalItems ?? 0,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  // A restored URL can point past the last page: land on the real one.
  useEffect(() => {
    if (!listQuery.data || listQuery.isPlaceholderData) return;
    const total = listQuery.data.pagination.totalItems;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page > lastPage) setPage(lastPage);
  }, [listQuery.data, listQuery.isPlaceholderData, page, pageSize, setPage]);

  const openDetail = (request: CustomerRequestSummary) =>
    navigate(
      buildPath(DASHBOARD_ROUTES.academyRequestDetail, {
        academyId: academyId ?? '',
        requestId: request.id,
      })
    );

  const columns = useMemo<ColumnDef<CustomerRequestSummary, unknown>[]>(
    () => [
      {
        id: 'request',
        header: t(`${CR_NS}:list.columns.request`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block min-w-0 max-w-[22rem]">
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
            >
              {row.original.reference}
            </span>
          </span>
        ),
      },
      {
        id: 'type',
        header: t(`${CR_NS}:list.columns.type`),
        enableSorting: false,
        cell: ({ row }) => <TypeLabel type={row.original.type} />,
      },
      {
        id: 'status',
        header: t(`${CR_NS}:list.columns.status`),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={customerRequestStatusLabelKey(row.original.status)}
            tone={customerRequestStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'createdAt',
        header: t(`${CR_NS}:list.columns.created`),
        enableSorting: false,
        cell: ({ row }) => (
          <time
            dateTime={row.original.createdAt}
            className="whitespace-nowrap text-muted-foreground"
          >
            {fmt.date(row.original.createdAt)}
          </time>
        ),
      },
      {
        id: 'lastActivityAt',
        header: t(`${CR_NS}:list.columns.updated`),
        enableSorting: false,
        cell: ({ row }) => (
          <time
            dateTime={row.original.lastActivityAt}
            className="whitespace-nowrap text-muted-foreground"
          >
            {fmt.date(row.original.lastActivityAt)}
          </time>
        ),
      },
    ],
    [t, fmt]
  );

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      path: academyId
        ? buildPath(DASHBOARD_ROUTES.academyOverview, { academyId })
        : DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'navigation:items.academyRequests' },
  ];

  const header = (
    <PageHeader
      titleKey={`${CR_NS}:title`}
      descriptionKey={`${CR_NS}:subtitle`}
      breadcrumbs={breadcrumbs}
      actions={
        canRequest ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog({ open: true, type: 'custom_feature' })}
            >
              {t(`${CR_NS}:list.requestFeature`)}
            </Button>
            <Button
              type="button"
              data-testid="new-customer-request"
              onClick={() => setDialog({ open: true })}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t(`${CR_NS}:list.newRequest`)}
            </Button>
          </>
        ) : undefined
      }
    />
  );

  if (isResolving) {
    return (
      <PageContainer>
        {header}
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!canRequest) {
    return (
      <PageContainer>
        {header}
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={ShieldAlert}
              titleKey={`${CR_NS}:detail.notAllowed.title`}
              descriptionKey={`${CR_NS}:detail.notAllowed.description`}
              headingLevel="h2"
            />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const requests = listQuery.data?.items ?? [];
  const isFirstLoad = listQuery.isLoading;
  const isEmptyAcademy =
    !isFirstLoad && !listQuery.error && requests.length === 0 && !hasFilters;

  const renderBody = (): JSX.Element => {
    if (listQuery.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={listQuery.error.kind}
            onRetry={() => void listQuery.refetch()}
            headingLevel="h2"
          />
        </div>
      );
    }

    if (isFirstLoad) {
      return (
        <div
          aria-busy="true"
          aria-label={t(`${CR_NS}:list.loading`)}
          className="p-4"
        >
          <SkeletonTable columns={TABLE_COLUMN_COUNT} />
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="p-4">
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
        </div>
      );
    }

    return (
      <>
        <section
          aria-label={t(`${CR_NS}:list.caption`)}
          className="hidden md:block"
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
          aria-label={t(`${CR_NS}:list.caption`)}
          className="divide-y divide-border md:hidden"
          data-testid="customer-requests-mobile-list"
        >
          {requests.map((request) => (
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
                  <TypeLabel type={request.type} />
                  <span className="font-mono" dir="ltr">
                    {request.reference}
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t(`${CR_NS}:list.createdOn`, {
                      date: fmt.date(request.createdAt),
                    })}
                  </span>
                  <span>
                    {t(`${CR_NS}:list.updatedOn`, {
                      date: fmt.date(request.lastActivityAt),
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}
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

  return (
    <PageContainer>
      {header}

      {isEmptyAcademy ? (
        <section
          aria-labelledby="customer-requests-empty-title"
          className="space-y-4"
          data-testid="customer-requests-empty"
        >
          <div className="space-y-1">
            <h2
              id="customer-requests-empty-title"
              className="font-display text-lg font-semibold text-foreground"
            >
              {t(`${CR_NS}:list.empty.title`)}
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              {t(`${CR_NS}:list.empty.description`)}
            </p>
          </div>
          <RequestCatalog />
        </section>
      ) : (
        <div className="space-y-4">
          <CustomerRequestsToolbar
            value={state}
            hasFilters={hasFilters}
            onChange={(key, next) => set(key as keyof typeof state, next)}
            onClearFilters={clearFilters}
            searchLabelKey={`${CR_NS}:list.searchLabel`}
          />
          <Card>
            <CardContent className="p-0">{renderBody()}</CardContent>
          </Card>
        </div>
      )}

      {dialog.open ? (
        <CreateCustomerRequestDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialog({ open: false });
          }}
          initialType={dialog.type}
          academyId={academyId}
        />
      ) : null}
    </PageContainer>
  );
}

function TypeLabel({ type }: { readonly type: CustomerRequestType }) {
  const { t } = useTranslation();
  const Icon = customerRequestTypeIcon(type);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      {t(customerRequestTypeLabelKey(type))}
    </span>
  );
}
