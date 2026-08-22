/**
 * Platform Payment Review — List Page.
 *
 * Cross-tenant by design (see `PlatformPaymentService`'s doc comment) —
 * this is the ONE payment listing in Atlas that intentionally spans every
 * organization. Only reachable by the Platform Owner role (`RouteGuard`),
 * mirroring the Prompt 6 Trial Policy precedent.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePlatformPayments } from '../hooks';
import { getManualReviewStatusTone, getPaymentStatusTone } from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import type { ManualReviewStatus, Payment } from '@types';

export default function PlatformPaymentReviewListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [reviewFilter, setReviewFilter] = useState<ManualReviewStatus | 'all'>(
    'pending'
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: paymentsData,
    isLoading,
    error,
    refetch,
  } = usePlatformPayments({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters: reviewFilter === 'all' ? undefined : { reviewStatus: reviewFilter },
    },
  });

  useEffect(() => {
    if (paymentsData) setTotalItems(paymentsData.pagination.totalItems);
  }, [paymentsData]);

  const payments = paymentsData?.items ?? [];

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'organizationId',
        header: t('payments:platformReview.table.organization'),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.organizationId}
          </span>
        ),
      },
      {
        accessorKey: 'money',
        header: t('payments:platformReview.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: 'methodType',
        header: t('payments:platformReview.table.method'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
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
        header: t('payments:platformReview.table.submittedAt'),
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
        titleKey="payments:platformReview.title"
        descriptionKey="payments:platformReview.subtitle"
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <Select
            value={reviewFilter}
            onValueChange={(value) =>
              setReviewFilter(value as ManualReviewStatus | 'all')
            }
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('payments:platformReview.filterAll')}
              </SelectItem>
              <SelectItem value="pending">
                {t('payments:payment.reviewStatus.pending')}
              </SelectItem>
              <SelectItem value="approved">
                {t('payments:payment.reviewStatus.approved')}
              </SelectItem>
              <SelectItem value="rejected">
                {t('payments:payment.reviewStatus.rejected')}
              </SelectItem>
            </SelectContent>
          </Select>

          {error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              isLoading={isLoading}
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
