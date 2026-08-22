/**
 * Invoices Page.
 *
 * Invoice-ready — read-only, no accounting logic. Shows whatever the
 * backend has issued (`TenantInvoice`).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import type { StatusTone } from '@components/data-display';
import { usePagination } from '@hooks';
import { useInvoices } from '../hooks';
import { formatMoney } from '../utils/money.utils';
import type { InvoiceStatus, TenantInvoice } from '@types';

const INVOICE_STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: 'neutral',
  issued: 'info',
  paid: 'success',
  void: 'destructive',
};

export default function InvoicesPage(): JSX.Element {
  const { t, i18n } = useTranslation();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: invoicesData,
    isLoading,
    error,
    refetch,
  } = useInvoices({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (invoicesData) setTotalItems(invoicesData.pagination.totalItems);
  }, [invoicesData]);

  const invoices = invoicesData?.items ?? [];

  const columns = useMemo<ColumnDef<TenantInvoice, unknown>[]>(
    () => [
      {
        accessorKey: 'number',
        header: t('payments:invoices.table.number'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.number}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('payments:invoices.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:invoices.status.${row.original.status}`}
            tone={INVOICE_STATUS_TONE[row.original.status]}
          />
        ),
      },
      {
        accessorKey: 'money',
        header: t('payments:invoices.table.amount'),
        cell: ({ row }) => (
          <span data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: 'issuedAt',
        header: t('payments:invoices.table.issuedAt'),
        cell: ({ row }) =>
          row.original.issuedAt ? (
            <span className="text-muted-foreground">
              {new Date(row.original.issuedAt).toLocaleDateString(i18n.language)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'paidAt',
        header: t('payments:invoices.table.paidAt'),
        cell: ({ row }) =>
          row.original.paidAt ? (
            <span className="text-muted-foreground">
              {new Date(row.original.paidAt).toLocaleDateString(i18n.language)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, i18n.language]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:invoices.title"
        descriptionKey="payments:invoices.subtitle"
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
              data={invoices}
              isLoading={isLoading}
              pagination={pagination}
              emptyTitleKey="payments:invoices.emptyState"
              emptyDescriptionKey="payments:invoices.emptyStateDescription"
              getRowId={(invoice) => invoice.id}
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
