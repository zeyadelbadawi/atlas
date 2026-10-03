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
import { usePlatformPayments } from '../hooks';
import {
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import { PlatformPaymentListToolbar } from '../components/PlatformPaymentListToolbar';
import {
  DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
  formatCheckoutSummary,
  toPlatformPaymentQuery,
  type PlatformPaymentListState,
} from '../utils/platform-payment-list.utils';
import type { Payment } from '@types';

export default function PlatformPaymentReviewListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PlatformPaymentListState>(
    DEFAULT_PLATFORM_PAYMENT_LIST_STATE
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: paymentsData,
    isLoading,
    error,
    refetch,
  } = usePlatformPayments({
    query: toPlatformPaymentQuery(filters, {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
  });

  useEffect(() => {
    if (paymentsData) setTotalItems(paymentsData.pagination.totalItems);
  }, [paymentsData]);

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
            {formatCheckoutSummary(t, row.original.checkoutSummary) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'money',
        enableSorting: false,
        header: t('payments:platformReview.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
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
          <PlatformPaymentListToolbar
            idPrefix="platform-payments"
            value={filters}
            onChange={(next) => {
              setFilters(next);
              pagination.goToFirstPage();
            }}
            searchLabelKey="payments:platformReview.searchLabel"
          />

          {error ? (
            <ErrorState onRetry={() => void refetch()} />
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
