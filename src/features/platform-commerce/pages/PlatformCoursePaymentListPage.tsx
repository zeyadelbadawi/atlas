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
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
  PlatformPaymentListToolbar,
  formatMoney,
  getCourseOrderStatusTone,
  getManualReviewStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
  toPlatformPaymentQuery,
  type PlatformPaymentListState,
} from '@features/billing';
import { useCourseOrderPayments } from '../hooks';
import type { CourseOrderPayment } from '@types';

export default function PlatformCoursePaymentListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PlatformPaymentListState>(
    DEFAULT_PLATFORM_PAYMENT_LIST_STATE
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useCourseOrderPayments({
    query: toPlatformPaymentQuery(filters, {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

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
            {formatMoney(row.original.money, i18n.language)}
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
          <span className="text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString(i18n.language)}
          </span>
        ),
      },
    ],
    [t, i18n.language]
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
            onChange={(next) => {
              setFilters(next);
              pagination.goToFirstPage();
            }}
            searchLabelKey="platformCommerce:coursePayments.searchLabel"
          />

          {error ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              isLoading={isLoading}
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
