/**
 * Platform Course Payments — List Page.
 *
 * The course-purchase analog of `PlatformPaymentReviewListPage` (which
 * reviews SUBSCRIPTION payments). Without this screen a manual-transfer
 * course purchase can never be approved, so the learner never gets access.
 *
 * Cross-tenant by design and reachable only by the Platform Owner role
 * (`RouteGuard`) — a UX gate; `PlatformOwnerGuard` on the backend is the
 * authority.
 *
 * SERVER-SIDE FILTERING. Search, the review/payment-status/method/date
 * filters and the sort are all sent to the backend, which applies them
 * before paging — the returned page is rendered as-is (an earlier
 * client-side re-filter of the page is gone now that the backend honours
 * `reviewStatus`). Rows name the academy and course and show the order's
 * own status and refund status instead of raw ids.
 *
 * The search, filters, sort and page live in the URL (the same
 * `PLATFORM_PAYMENT_LIST_URL_CONFIG` as the subscription review), so Back
 * from a payment returns to the same slice of the queue. While a new
 * slice loads, the previous rows stay on screen dimmed and `aria-busy`.
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
import {
  PLATFORM_PAYMENT_LIST_URL_CONFIG,
  PlatformPaymentListToolbar,
  formatMoney,
  getCourseOrderStatusTone,
  getManualReviewStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
  toPlatformPaymentQuery,
} from '@features/billing';
import { useCourseOrderPayments } from '../hooks';
import type { CourseOrderPayment, LanguageCode } from '@types';

export default function PlatformCoursePaymentListPage(): JSX.Element {
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
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } =
    useCourseOrderPayments({ query });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  // A restored URL can point past the end: land on the real last page.
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    const total = data.pagination.totalItems;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page > lastPage) setPage(lastPage);
  }, [data, isPlaceholderData, page, pageSize, setPage]);

  const payments = data?.items ?? [];

  const columns = useMemo<ColumnDef<CourseOrderPayment, unknown>[]>(
    () => [
      {
        id: 'academy',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.academy'),
        cell: ({ row }) =>
          row.original.academy ? (
            <span className="font-medium text-foreground" dir="auto">
              {row.original.academy.name}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('platformCommerce:coursePayments.unknownAcademy')}
            </span>
          ),
      },
      {
        id: 'course',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.course'),
        cell: ({ row }) => (
          <span className="text-muted-foreground" dir="auto">
            {row.original.course?.title ?? '—'}
          </span>
        ),
      },
      {
        id: 'orderStatus',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.orderStatus'),
        cell: ({ row }) =>
          row.original.courseOrderStatus ? (
            <StatusBadge
              labelKey={`payments:courseOrder.status.${row.original.courseOrderStatus}`}
              tone={getCourseOrderStatusTone(row.original.courseOrderStatus)}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'refund',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.refund'),
        cell: ({ row }) =>
          row.original.refundStatus ? (
            <StatusBadge
              labelKey={`payments:refund.status.${row.original.refundStatus}`}
              tone={getRefundStatusTone(row.original.refundStatus)}
            />
          ) : (
            <span className="text-muted-foreground">
              <span aria-hidden>—</span>
              <span className="sr-only">
                {t('payments:refund.status.none')}
              </span>
            </span>
          ),
      },
      {
        accessorKey: 'money',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, locale)}
          </span>
        ),
      },
      {
        accessorKey: 'methodType',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.method'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        enableSorting: false,
        header: t('platformCommerce:coursePayments.table.status'),
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
        header: t('platformCommerce:coursePayments.table.reviewStatus'),
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
        header: t('platformCommerce:coursePayments.table.submittedAt'),
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
        titleKey="platformCommerce:coursePayments.title"
        descriptionKey="platformCommerce:coursePayments.subtitle"
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <PlatformPaymentListToolbar
            idPrefix="course-payments"
            value={filters}
            onChange={setFilters}
            searchLabelKey="platformCommerce:coursePayments.searchLabel"
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
              emptyTitleKey="platformCommerce:coursePayments.emptyTitle"
              emptyDescriptionKey="platformCommerce:coursePayments.emptyDescription"
              getRowId={(payment) => payment.id}
              onRowSelect={(payment) =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.platformCoursePaymentDetail, {
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
