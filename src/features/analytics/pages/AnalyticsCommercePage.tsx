/**
 * Analysis › Commerce (P64 Phase 4).
 *
 * The Platform Owner's checkout report, fed by `GET /platform-metrics/
 * commerce`: orders by status, the manual-payment review queue and how
 * long approvals take, refunds, and paid revenue per currency — all over
 * the shared analytics window (`useAnalyticsRange().days`, 7/30/90).
 *
 * Two honesty rules the layout encodes:
 *   - `awaitingReview` is a CURRENT backlog, not a window count. Its tile
 *     says so, because "3 awaiting review" next to "last 90 days" would
 *     otherwise read as "3 in 90 days".
 *   - Revenue is minor units per currency and goes through `formatMoney`
 *     — the one place that knows how to divide. Currencies are listed,
 *     never summed: there is no exchange rate to sum with.
 */
import { useTranslation } from 'react-i18next';
import { Clock, Inbox, Receipt, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import { formatMoney } from '@features/billing';
import { usePlatformCommerceMetrics } from '@features/platform';
import { formatNumber, formatPercentage } from '@utils';
import {
  BreakdownTable,
  FigureList,
  GeneratedAt,
  ReportSection,
  StatTile,
  TruncatedNotice,
} from '@components/reporting';
import {
  NO_VALUE,
  formatApprovalDuration,
} from '../utils/analytics-duration.utils';
import { useAnalyticsRange } from './useAnalyticsRange';
import type { LanguageCode, PlatformCommerceMetrics } from '@types';

const ORDER_STATUSES = [
  'draft',
  'pendingPayment',
  'paid',
  'expired',
  'refunded',
  'cancelled',
] as const;

/** Nothing happened and nothing is waiting: show the empty state, not a page of zeros. */
function isEmptyWindow(data: PlatformCommerceMetrics): boolean {
  const revenue = Object.values(data.revenue.paidByCurrency).some((v) => v > 0);
  return (
    data.orders.created === 0 &&
    data.payments.awaitingReview === 0 &&
    data.payments.approvedInWindow === 0 &&
    data.payments.rejectedInWindow === 0 &&
    data.refunds.requestedInWindow === 0 &&
    data.refunds.completedInWindow === 0 &&
    !revenue
  );
}

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export default function AnalyticsCommercePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { days } = useAnalyticsRange();
  const { data, isLoading, error, refetch } = usePlatformCommerceMetrics(days);

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <ErrorState
        kind={error?.kind}
        requestId={error?.requestId}
        onRetry={() => void refetch()}
      />
    );
  }

  if (isEmptyWindow(data)) {
    return (
      <EmptyState
        icon={ShoppingBag}
        titleKey="analytics:commerce.empty.title"
        descriptionKey="analytics:commerce.empty.description"
        values={{ count: data.windowDays }}
      />
    );
  }

  const num = (value: number) => formatNumber(value, language);
  const share = (ratio: number) => formatPercentage(ratio, language, 0);
  const duration = (seconds: number | null) =>
    formatApprovalDuration(seconds, t);

  const revenueRows = Object.entries(data.revenue.paidByCurrency)
    .filter(([, amount]) => amount > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const revenueHeadline =
    revenueRows.length === 0
      ? NO_VALUE
      : revenueRows
          .map(([currency, amountMinorUnits]) =>
            formatMoney({ amountMinorUnits, currency }, i18n.language)
          )
          .join(' · ');

  const latency = data.approvalLatencySeconds;
  const orderRows = ORDER_STATUSES.map((status) => ({
    key: status,
    label: t(`analytics:commerce.orders.status.${status}`),
    value: data.orders[status],
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ShoppingBag}
          label={t('analytics:commerce.headline.paidOrders')}
          value={num(data.orders.paid)}
          hint={t('analytics:commerce.headline.paidOrdersHint', {
            count: data.orders.created,
          })}
        />
        <StatTile
          icon={Receipt}
          label={t('analytics:commerce.headline.revenue')}
          value={revenueHeadline}
          hint={
            revenueRows.length > 1
              ? t('analytics:commerce.headline.revenueHintMulti', {
                  count: revenueRows.length,
                })
              : t('analytics:commerce.headline.revenueHint')
          }
        />
        <StatTile
          icon={Inbox}
          label={t('analytics:commerce.headline.awaitingReview')}
          value={num(data.payments.awaitingReview)}
          hint={t('analytics:commerce.headline.awaitingReviewHint')}
          emphasis={data.payments.awaitingReview > 0 ? 'warning' : 'default'}
        />
        <StatTile
          icon={Clock}
          label={t('analytics:commerce.headline.approvalTime')}
          value={duration(latency.p50)}
          hint={t('analytics:commerce.headline.approvalTimeHint', {
            p95: duration(latency.p95),
            count: latency.sampleSize,
          })}
        />
      </div>

      <ReportSection
        title={t('analytics:commerce.orders.title')}
        description={t('analytics:commerce.orders.description', {
          count: data.orders.created,
        })}
      >
        <BreakdownTable
          caption={t('analytics:commerce.orders.title')}
          rows={orderRows}
          total={data.orders.created}
          columns={{
            label: t('analytics:commerce.orders.columns.status'),
            count: t('analytics:commerce.orders.columns.count'),
            share: t('analytics:commerce.orders.columns.share'),
          }}
          formatNumber={num}
          formatShare={share}
        />
      </ReportSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection
          title={t('analytics:commerce.payments.title')}
          description={t('analytics:commerce.payments.description')}
        >
          <FigureList
            items={[
              {
                key: 'approved',
                label: t('analytics:commerce.payments.approved'),
                value: num(data.payments.approvedInWindow),
              },
              {
                key: 'rejected',
                label: t('analytics:commerce.payments.rejected'),
                value: num(data.payments.rejectedInWindow),
              },
              {
                key: 'p50',
                label: t('analytics:commerce.payments.p50'),
                value: duration(latency.p50),
              },
              {
                key: 'p95',
                label: t('analytics:commerce.payments.p95'),
                value: duration(latency.p95),
                hint: t('analytics:commerce.payments.sampleSize', {
                  count: latency.sampleSize,
                }),
              },
            ]}
          />
          <TruncatedNotice
            show={latency.truncated}
            message={t('analytics:commerce.payments.truncated')}
          />
        </ReportSection>

        <ReportSection
          title={t('analytics:commerce.refunds.title')}
          description={t('analytics:commerce.refunds.description')}
        >
          <FigureList
            items={[
              {
                key: 'requested',
                label: t('analytics:commerce.refunds.requested'),
                value: num(data.refunds.requestedInWindow),
              },
              {
                key: 'completed',
                label: t('analytics:commerce.refunds.completed'),
                value: num(data.refunds.completedInWindow),
              },
              {
                key: 'orders',
                label: t('analytics:commerce.refunds.refundedOrders'),
                value: num(data.orders.refunded),
              },
            ]}
          />
        </ReportSection>
      </div>

      <ReportSection
        title={t('analytics:commerce.revenue.title')}
        description={t('analytics:commerce.revenue.description')}
      >
        {revenueRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('analytics:commerce.revenue.none')}
          </p>
        ) : (
          <ul className="divide-y divide-border" aria-label={t('analytics:commerce.revenue.title')}>
            {revenueRows.map(([currency, amountMinorUnits]) => (
              <li
                key={currency}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="text-foreground">{currency}</span>
                <span
                  className="tabular-nums text-foreground"
                  data-atlas-numeric="true"
                >
                  {formatMoney({ amountMinorUnits, currency }, i18n.language)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      <GeneratedAt timestamp={data.generatedAt} language={language} />
    </div>
  );
}
