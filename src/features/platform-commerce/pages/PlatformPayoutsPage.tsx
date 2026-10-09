/**
 * Platform Academy Payouts.
 *
 * Every recorded payout across every academy, newest first (the backend's
 * order). Two actions, both Platform-Owner-only server-side:
 *   - Create payout — the backend computes the amount from unsettled
 *     revenue for the chosen academy and period (`CreatePayoutDialog`).
 *   - Mark paid — confirmed in `MarkPayoutPaidDialog`; offered only for
 *     `pending`/`processing` rows, the statuses the backend will move.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { BadgeCheck, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { formatMoney } from '@features/billing';
import type { AcademyPayout } from '@types';
import { useAcademyPayouts } from '../hooks';
import {
  canMarkPayoutPaid,
  getAcademyPayoutStatusTone,
} from '../utils/payout-status.utils';
import { CreatePayoutDialog } from '../components/CreatePayoutDialog';
import { MarkPayoutPaidDialog } from '../components/MarkPayoutPaidDialog';

export default function PlatformPayoutsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payoutToMark, setPayoutToMark] = useState<AcademyPayout | null>(null);

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useAcademyPayouts({
    pagination: { page: pagination.page, pageSize: pagination.pageSize },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const columns = useMemo<ColumnDef<AcademyPayout, unknown>[]>(() => {
    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString(i18n.language, { timeZone: 'UTC' });
    return [
      {
        accessorKey: 'academyId',
        header: t('platformCommerce:payouts.table.academy'),
        cell: ({ row }) => (
          <Link
            to={buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
              academyId: row.original.academyId,
            })}
            className="font-mono text-xs text-primary hover:underline"
            dir="ltr"
            data-ltr-content
          >
            {row.original.academyId}
          </Link>
        ),
      },
      {
        accessorKey: 'money',
        header: t('platformCommerce:payouts.table.amount'),
        cell: ({ row }) => (
          <span className="font-medium" data-atlas-numeric="true">
            {formatMoney(row.original.money, i18n.language)}
          </span>
        ),
      },
      {
        id: 'period',
        header: t('platformCommerce:payouts.table.period'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {t('platformCommerce:payouts.periodRange', {
              start: formatDate(row.original.periodStart),
              end: formatDate(row.original.periodEnd),
            })}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('platformCommerce:payouts.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`platformCommerce:payouts.status.${row.original.status}`}
            tone={getAcademyPayoutStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'paid',
        header: t('platformCommerce:payouts.table.paidAt'),
        cell: ({ row }) =>
          row.original.paidAt ? (
            <div className="space-y-0.5">
              <p>
                {new Date(row.original.paidAt).toLocaleDateString(
                  i18n.language
                )}
              </p>
              {row.original.providerReference ? (
                <p
                  className="font-mono text-xs text-muted-foreground"
                  dir="auto"
                >
                  {row.original.providerReference}
                </p>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => (
          <span className="sr-only">
            {t('platformCommerce:payouts.table.actions')}
          </span>
        ),
        cell: ({ row }) =>
          canMarkPayoutPaid(row.original.status) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(event) => {
                // Rows are not activatable here, but never let the click
                // bubble into a future row handler.
                event.stopPropagation();
                setPayoutToMark(row.original);
              }}
              aria-label={t('platformCommerce:payouts.markPaid.rowLabel', {
                amount: formatMoney(row.original.money, i18n.language),
              })}
            >
              <BadgeCheck className="size-4" aria-hidden />
              {t('platformCommerce:payouts.markPaid.action')}
            </Button>
          ) : null,
      },
    ];
  }, [t, i18n.language]);

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformCommerce:payouts.title"
        descriptionKey="platformCommerce:payouts.subtitle"
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t('platformCommerce:payouts.create.open')}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          {error ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <DataTable
              columns={columns}
              data={data?.items ?? []}
              isLoading={isLoading}
              pagination={pagination}
              emptyTitleKey="platformCommerce:payouts.emptyTitle"
              emptyDescriptionKey="platformCommerce:payouts.emptyDescription"
              getRowId={(payout) => payout.id}
            />
          )}
        </CardContent>
      </Card>

      <CreatePayoutDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <MarkPayoutPaidDialog
        payout={payoutToMark}
        onClose={() => setPayoutToMark(null)}
      />
    </PageContainer>
  );
}
