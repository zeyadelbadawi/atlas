/**
 * Payment History Page.
 *
 * Works identically for manual and any future gateway payment — both are
 * the same `Payment` shape (see `payment.types.ts`).
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
import { usePaymentHistory } from '../hooks';
import { getManualReviewStatusTone, getPaymentStatusTone } from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import type { Payment } from '@types';

export default function PaymentHistoryPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: paymentsData,
    isLoading,
    error,
    refetch,
  } = usePaymentHistory({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (paymentsData) setTotalItems(paymentsData.pagination.totalItems);
  }, [paymentsData]);

  const payments = paymentsData?.items ?? [];

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'money',
        header: t('payments:paymentHistory.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: 'methodType',
        header: t('payments:paymentHistory.table.method'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('payments:paymentHistory.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:payment.status.${row.original.status}`}
            tone={getPaymentStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'reviewStatus',
        header: t('payments:paymentHistory.table.reviewStatus'),
        cell: ({ row }) =>
          row.original.reviewStatus === 'not_required' ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <StatusBadge
              labelKey={`payments:payment.reviewStatus.${row.original.reviewStatus}`}
              tone={getManualReviewStatusTone(row.original.reviewStatus)}
            />
          ),
      },
      {
        accessorKey: 'createdAt',
        header: t('payments:paymentHistory.table.createdAt'),
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
        titleKey="payments:paymentHistory.title"
        descriptionKey="payments:paymentHistory.subtitle"
      />

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState onRetry={() => refetch()} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={payments}
              isLoading={isLoading}
              pagination={pagination}
              emptyTitleKey="payments:paymentHistory.emptyState"
              emptyDescriptionKey="payments:paymentHistory.emptyStateDescription"
              getRowId={(payment) => payment.id}
              onRowSelect={(payment) =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
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
