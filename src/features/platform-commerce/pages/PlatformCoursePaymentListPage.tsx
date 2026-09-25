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
 * REVIEW-STATUS FILTER. The backend's list DTO accepts `reviewStatus` but
 * (as of this writing) its repository query ignores it. The filter is
 * still SENT, so the server does the work the moment it honours it, and
 * the returned page is also filtered here so a "Pending" view can never
 * show an already-approved row in the meantime.
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  formatMoney,
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from '@features/billing';
import { useCourseOrderPayments } from '../hooks';
import type { CourseOrderPayment, ManualReviewStatus } from '@types';

type ReviewFilter = Exclude<ManualReviewStatus, 'not_required'> | 'all';

const REVIEW_FILTERS: readonly ReviewFilter[] = [
  'pending',
  'approved',
  'rejected',
  'all',
];

export default function PlatformCoursePaymentListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('pending');

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useCourseOrderPayments({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters:
        reviewFilter === 'all' ? undefined : { reviewStatus: reviewFilter },
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const payments = useMemo(
    () =>
      (data?.items ?? []).filter(
        (payment) =>
          reviewFilter === 'all' || payment.reviewStatus === reviewFilter
      ),
    [data, reviewFilter]
  );

  const columns = useMemo<ColumnDef<CourseOrderPayment, unknown>[]>(
    () => [
      {
        accessorKey: 'payeeAcademyId',
        header: t('platformCommerce:coursePayments.table.academy'),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {row.original.payeeAcademyId}
          </span>
        ),
      },
      {
        accessorKey: 'money',
        header: t('platformCommerce:coursePayments.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: 'methodType',
        header: t('platformCommerce:coursePayments.table.method'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
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
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <Label htmlFor="course-payments-review-filter">
              {t('platformCommerce:coursePayments.filterLabel')}
            </Label>
            <Select
              value={reviewFilter}
              onValueChange={(value) => {
                setReviewFilter(value as ReviewFilter);
                pagination.goToFirstPage();
              }}
            >
              <SelectTrigger
                id="course-payments-review-filter"
                className="w-full sm:w-[220px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_FILTERS.map((filter) => (
                  <SelectItem key={filter} value={filter}>
                    {filter === 'all'
                      ? t('platformCommerce:coursePayments.filterAll')
                      : t(`payments:payment.reviewStatus.${filter}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
