/**
 * Academy Revenue & Payouts page (backend P13) — the money this academy has
 * earned through Atlas Payments and the payouts Atlas has made to it, for
 * the academy named in the route. Read-only: payouts are created and marked
 * paid by the Platform Owner.
 *
 * Presentation rules that follow from the backend contract:
 *
 *   - ORGANIZATION OWNER ONLY. Both endpoints answer 403 to a manager or
 *     instructor. The route is gated on `tenant.billing.view` (the owner-only
 *     money permission) so they are not led here, but the server decides:
 *     a 403 renders ONE permission state in place of both sections, never a
 *     blank page or a generic error.
 *   - THE SUMMARY IS NET AND UNSETTLED. It is sales minus Atlas's platform
 *     fee and refunds that have not yet been included in a payout, grouped by
 *     currency and never converted or added across currencies. A refund can
 *     outweigh sales, so a negative figure is real and is explained, not
 *     hidden.
 *   - ONLY ATLAS PAYMENTS SALES APPEAR. A sale collected through the
 *     organization's own gateway never enters this ledger — the empty state
 *     says so, so an owner who sells that way is not left wondering where
 *     their money went.
 *   - Status is never carried by colour alone: every badge has its text.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Info, ShieldOff, Wallet } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import type { StatusTone } from '@components/data-display';
import { DataTable } from '@components/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter, usePagination } from '@hooks';
import { formatMoney } from '@features/billing';
import { LANGUAGES } from '@localization';
import { useAcademyPayouts, useAcademyRevenueSummary } from '../hooks';
import type {
  AcademyPayout,
  AcademyPayoutStatus,
  CollectionQuery,
  LanguageCode,
  Money,
} from '@types';

const PAYOUT_STATUS_TONE: Readonly<Record<AcademyPayoutStatus, StatusTone>> = {
  pending: 'neutral',
  processing: 'info',
  paid: 'success',
  failed: 'destructive',
};

/** The 403 state: only the Organization Owner may see this academy's money. */
function PermissionState(): JSX.Element {
  return (
    <EmptyState
      icon={ShieldOff}
      titleKey="academy:revenue.forbidden.title"
      descriptionKey="academy:revenue.forbidden.description"
    />
  );
}

interface BalanceCardProps {
  readonly balance: Money;
  readonly locale: string;
}

function BalanceCard({ balance, locale }: BalanceCardProps): JSX.Element {
  const { t } = useTranslation();
  const negative = balance.amountMinorUnits < 0;
  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5">
      <p className="text-sm font-medium text-muted-foreground">
        {t('academy:revenue.summary.currencyLabel', {
          currency: balance.currency,
        })}
      </p>
      <p
        className="mt-3 font-display text-3xl font-semibold leading-none text-foreground"
        data-atlas-numeric="true"
      >
        {formatMoney(balance, locale)}
      </p>
      {negative ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('academy:revenue.summary.negative')}
        </p>
      ) : null}
    </li>
  );
}

export default function AcademyRevenuePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const query: CollectionQuery = useMemo(
    () => ({
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    }),
    [pagination.page, pagination.pageSize]
  );

  const summary = useAcademyRevenueSummary(academyId);
  const payouts = useAcademyPayouts(academyId, query);

  useEffect(() => {
    if (payouts.data) setTotalItems(payouts.data.pagination.totalItems);
  }, [payouts.data]);

  const columns = useMemo<ColumnDef<AcademyPayout, unknown>[]>(
    () => [
      {
        id: 'period',
        header: t('academy:revenue.payouts.columns.period'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-foreground">
            {t('academy:revenue.payouts.periodRange', {
              from: fmt.date(row.original.periodStart),
              to: fmt.date(row.original.periodEnd),
            })}
          </span>
        ),
      },
      {
        id: 'amount',
        header: t('academy:revenue.payouts.columns.amount'),
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap font-medium tabular-nums"
            data-atlas-numeric="true"
          >
            {formatMoney(row.original.money, locale)}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('academy:revenue.payouts.columns.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`academy:revenue.payouts.status.${row.original.status}`}
            tone={PAYOUT_STATUS_TONE[row.original.status] ?? 'neutral'}
          />
        ),
      },
      {
        id: 'paidAt',
        header: t('academy:revenue.payouts.columns.paidAt'),
        cell: ({ row }) =>
          row.original.paidAt ? (
            <span className="whitespace-nowrap text-muted-foreground">
              {fmt.date(row.original.paidAt)}
            </span>
          ) : (
            <span className="text-muted-foreground">
              <span aria-hidden>—</span>
              <span className="sr-only">
                {t('academy:revenue.payouts.notPaidYet')}
              </span>
            </span>
          ),
      },
      {
        id: 'reference',
        header: t('academy:revenue.payouts.columns.reference'),
        cell: ({ row }) =>
          row.original.providerReference ? (
            <span className="break-all font-mono text-xs text-muted-foreground">
              {row.original.providerReference}
            </span>
          ) : (
            <span className="text-muted-foreground">
              <span aria-hidden>—</span>
              <span className="sr-only">
                {t('academy:revenue.payouts.noReference')}
              </span>
            </span>
          ),
      },
    ],
    [t, fmt, locale]
  );

  const header = (
    <PageHeader
      titleKey="academy:revenue.title"
      descriptionKey="academy:revenue.description"
    />
  );

  if (!academyId) {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={Wallet}
            titleKey="academy:revenue.noAcademy.title"
            descriptionKey="academy:revenue.noAcademy.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  // Both reads share one authorization rule server-side, so either refusal
  // means the caller may see neither — one notice, not two.
  const forbidden =
    summary.error?.kind === 'forbidden' || payouts.error?.kind === 'forbidden';

  if (forbidden) {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <PermissionState />
        </SectionCard>
      </PageContainer>
    );
  }

  const balances = summary.data?.unsettled ?? [];

  return (
    <PageContainer>
      {header}

      <SectionCard
        titleKey="academy:revenue.summary.title"
        descriptionKey="academy:revenue.summary.description"
      >
        {summary.isLoading ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            <span className="sr-only" role="status">
              {t('academy:revenue.summary.loading')}
            </span>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : summary.error ? (
          <ErrorState
            kind={summary.error.kind}
            titleKey="academy:revenue.summary.error.title"
            descriptionKey="academy:revenue.summary.error.description"
            requestId={summary.error.requestId}
            onRetry={() => void summary.refetch()}
          />
        ) : balances.length === 0 ? (
          <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{t('academy:revenue.summary.empty')}</span>
          </p>
        ) : (
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={t('academy:revenue.summary.title')}
          >
            {balances.map((balance) => (
              <BalanceCard
                key={balance.currency}
                balance={balance}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        titleKey="academy:revenue.payouts.title"
        descriptionKey="academy:revenue.payouts.description"
        flushBody
      >
        {payouts.error ? (
          <div className="p-6">
            <ErrorState
              kind={payouts.error.kind}
              titleKey="academy:revenue.payouts.error.title"
              descriptionKey="academy:revenue.payouts.error.description"
              requestId={payouts.error.requestId}
              onRetry={() => void payouts.refetch()}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payouts.data?.items ?? []}
            isLoading={payouts.isLoading}
            pagination={totalItems > 0 ? pagination : undefined}
            emptyTitleKey="academy:revenue.payouts.empty.title"
            emptyDescriptionKey="academy:revenue.payouts.empty.description"
            getRowId={(payout) => payout.id}
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
