/**
 * Platform Payment Review — List Page.
 *
 * Cross-tenant by design (see `PlatformPaymentService`'s doc comment) —
 * this is the ONE payment listing in Atlas that intentionally spans every
 * organization. Only reachable by the Platform Owner role (`RouteGuard`),
 * mirroring the Prompt 6 Trial Policy precedent.
 *
 * Search, every filter and the sort are applied by the SERVER before it
 * pages (`toPlatformPaymentQuery`); rows name the organization and the
 * plan + billing cycle instead of raw ids. List rows never carry the
 * manual-transfer instructions — only the detail page does.
 *
 * The search, filters, sort and page live in the URL
 * (`PLATFORM_PAYMENT_LIST_URL_CONFIG`), so Back from a payment returns to
 * the same slice of the queue. While a new slice loads, the previous rows
 * stay on screen dimmed and the table is `aria-busy`.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { useDateFormatter, usePagination, useUrlListState } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { LANGUAGES } from '@localization';
import { usePlatformPayments } from '../hooks';
import {
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import { PlatformPaymentListToolbar } from '../components/PlatformPaymentListToolbar';
import {
  PLATFORM_PAYMENT_LIST_URL_CONFIG,
  formatCheckoutSummary,
  toPlatformPaymentQuery,
} from '../utils/platform-payment-list.utils';
import type { LanguageCode, Payment } from '@types';

export default function PlatformPaymentReviewListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;
  const {
    state: filters,
    page,
    pageSize,
    setState: setFilters,
    setPage,
    setPageSize,
  } = useUrlListState(PLATFORM_PAYMENT_LIST_URL_CONFIG);

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({
    totalItems,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  const query = useMemo(
    () => toPlatformPaymentQuery(filters, { page, pageSize }),
    [filters, page, pageSize]
  );
  const {
    data: paymentsData,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = usePlatformPayments({ query });

  useEffect(() => {
    if (paymentsData) setTotalItems(paymentsData.pagination.totalItems);
  }, [paymentsData]);

  // A restored URL can point past the end: land on the real last page.
  useEffect(() => {
    if (!paymentsData || isPlaceholderData) return;
    const total = paymentsData.pagination.totalItems;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page > lastPage) setPage(lastPage);
  }, [paymentsData, isPlaceholderData, page, pageSize, setPage]);

  const payments = paymentsData?.items ?? [];

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        id: 'organization',
        enableSorting: false,
        header: t('payments:platformReview.table.organization'),
        cell: ({ row }) =>
          row.original.organization ? (
            <span className="font-medium text-foreground" dir="auto">
              {row.original.organization.name}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('payments:platformReview.unknownOrganization')}
            </span>
          ),
      },
      {
        id: 'plan',
        enableSorting: false,
        header: t('payments:platformReview.planColumn'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground" dir="auto">
            {formatCheckoutSummary(t, row.original.checkoutSummary) ?? (
              <>
                <span aria-hidden>—</span>
                <span className="sr-only">
                  {t('payments:platformReview.noPlan')}
                </span>
              </>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'money',
        enableSorting: false,
        header: t('payments:platformReview.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, locale)}
          </span>
        ),
      },
      {
        accessorKey: 'methodType',
        enableSorting: false,
        header: t('payments:platformReview.table.method'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        enableSorting: false,
        header: t('payments:platformReview.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:payment.status.${row.original.status}`}
            tone={getPaymentStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'reviewStatus',
        enableSorting: false,
        header: t('payments:platformReview.table.reviewStatus'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:payment.reviewStatus.${row.original.reviewStatus}`}
            tone={getManualReviewStatusTone(row.original.reviewStatus)}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        enableSorting: false,
        header: t('payments:platformReview.table.submittedAt'),
        cell: ({ row }) => (
          <time
            dateTime={row.original.createdAt}
            className="whitespace-nowrap text-muted-foreground"
          >
            {fmt.date(row.original.createdAt)}
          </time>
        ),
      },
    ],
    [t, fmt, locale]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:platformReview.title"
        descriptionKey="payments:platformReview.subtitle"
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <PlatformPaymentListToolbar
            idPrefix="platform-payments"
            value={filters}
            onChange={setFilters}
            searchLabelKey="payments:platformReview.searchLabel"
          />

          {error ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              isLoading={isLoading}
              isBusy={isFetching && isPlaceholderData}
              pagination={pagination}
              emptyTitleKey="payments:platformReview.emptyState"
              emptyDescriptionKey="payments:platformReview.emptyStateDescription"
              getRowId={(payment) => payment.id}
              onRowSelect={(payment) =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.platformPaymentDetail, {
                    paymentId: payment.id,
                  })
                )
              }
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
