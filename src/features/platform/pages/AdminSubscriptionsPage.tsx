/**
 * Platform-admin subscription and trial operations dashboard.
 *
 * EVERY FIGURE ON THIS PAGE IS A REAL AGGREGATE returned by
 * `GET /platform-subscriptions/overview`. Nothing is sampled, seeded, or
 * placeholder.
 *
 * REVENUE IS MEASURED, NEVER DERIVED FROM LIST PRICES (B0-ANL-01). Monthly
 * recurring revenue comes from approved subscription payments only, one
 * figure per currency (never summed across currencies), and the page says
 * how many active subscriptions have no approved payment behind them and
 * that test organizations are still included.
 *
 * AUTHORIZATION IS NOT THIS FILE'S JOB. The sidebar hides this page from
 * non-admins and the route is role-gated, but the actual control is
 * `PlatformOwnerGuard` on the API. Someone who navigates here directly
 * gets a 403 from the server and an error state from this page.
 */
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Building2,
  CreditCard,
  TimerReset,
  XCircle,
} from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { MetricCard } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Badge } from '@/components/ui/badge';
import { useApiQuery } from '@/shared/hooks';
import { platformSubscriptionKeys } from '@services/query';
import { adminSubscriptionsService } from '../services/AdminSubscriptionsService';
import { formatDate } from '@/shared/utils/date.utils';
import { formatCurrency } from '@utils';
import type { LanguageCode, AdminSubscriptionOverview } from '@types';
import type { ApiError } from '@api';

export function AdminSubscriptionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const overview = useApiQuery<AdminSubscriptionOverview, ApiError>({
    queryKey: platformSubscriptionKeys.overview(),
    queryFn: () => adminSubscriptionsService.getOverview(),
    staleTime: 60_000,
  });

  const renderBody = (): JSX.Element => {
    if (overview.isLoading) return <SectionLoader />;
    if (overview.isError) {
      return <ErrorState onRetry={() => void overview.refetch()} />;
    }

    const data = overview.data;
    if (!data) return <ErrorState onRetry={() => void overview.refetch()} />;

    const statusEntries = Object.entries(data.subscriptions.byStatus).sort(
      (a, b) => b[1] - a[1]
    );
    const reasonEntries = Object.entries(data.cancellations.byReason).sort(
      (a, b) => b[1] - a[1]
    );

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            labelKey="platform:adminSubscriptions.metrics.organizations"
            value={String(data.organizations)}
            icon={Building2}
          />
          <MetricCard
            labelKey="platform:adminSubscriptions.metrics.activePaid"
            value={String(data.subscriptions.activePaid)}
            icon={CreditCard}
          />
          <MetricCard
            labelKey="platform:adminSubscriptions.metrics.activeTrials"
            value={String(data.trials.active)}
            icon={TimerReset}
          />
          <MetricCard
            labelKey="platform:adminSubscriptions.metrics.trialsRedeemed"
            value={String(data.trials.everRedeemed)}
            icon={TimerReset}
          />
        </div>

        <SectionCard
          titleKey="platform:adminSubscriptions.trials.title"
          descriptionKey="platform:adminSubscriptions.trials.description"
        >
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">
                {t('platform:adminSubscriptions.trials.everRedeemed')}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {data.trials.everRedeemed}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t('platform:adminSubscriptions.trials.convertedToPaid')}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {data.trials.convertedToPaid}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t('platform:adminSubscriptions.trials.cancelled')}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {data.trials.cancelled}
              </dd>
            </div>
          </dl>
          {/* States what the conversion number is and is not, rather than
              letting a reader assume it is a historical funnel. */}
          <p className="mt-4 text-xs text-muted-foreground">
            {t('platform:adminSubscriptions.trials.conversionNote')}
          </p>
        </SectionCard>

        <SectionCard titleKey="platform:adminSubscriptions.status.title">
          {statusEntries.length === 0 ? (
            <EmptyState titleKey="platform:adminSubscriptions.status.empty" />
          ) : (
            <ul className="space-y-2">
              {statusEntries.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">
                    {t(`platform:adminSubscriptions.status.values.${status}`, {
                      defaultValue: status,
                    })}
                  </span>
                  <span className="font-medium tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard titleKey="platform:adminSubscriptions.plans.title">
          {data.plans.length === 0 ? (
            <EmptyState titleKey="platform:adminSubscriptions.plans.empty" />
          ) : (
            <ul className="space-y-2">
              {data.plans.map((plan) => (
                <li
                  key={plan.planId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{plan.planName}</span>
                  <span className="font-medium tabular-nums">
                    {plan.subscriptions}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data.totalPlansWithSubscriptions > data.plans.length ? (
            // Say so rather than letting a truncated chart imply the
            // catalog is this size. The full catalog lives on Plans &
            // Add-ons, which pages properly.
            <p className="mt-3 text-xs text-muted-foreground">
              {t('platform:adminSubscriptions.plans.truncated', {
                shown: data.plans.length,
                total: data.totalPlansWithSubscriptions,
              })}
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          titleKey="platform:adminSubscriptions.cancellations.title"
          descriptionKey="platform:adminSubscriptions.cancellations.description"
          values={{
            trials: data.cancellations.trials,
            paid: data.cancellations.paid,
          }}
        >
          {reasonEntries.length > 0 ? (
            <ul className="mb-6 space-y-2">
              {reasonEntries.map(([reason, count]) => (
                <li
                  key={reason}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">
                    {t(`tenant:cancellation.reasons.${reason}`, {
                      defaultValue: reason,
                    })}
                  </span>
                  <span className="font-medium tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {data.cancellations.recent.length === 0 ? (
            <EmptyState
              icon={XCircle}
              titleKey="platform:adminSubscriptions.cancellations.empty"
              descriptionKey="platform:adminSubscriptions.cancellations.emptyDescription"
            />
          ) : (
            <div className="overflow-x-auto">
              <ul className="min-w-[40rem] space-y-3">
                {data.cancellations.recent.map((row) => (
                  <li key={row.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {row.organizationName}
                      </span>
                      <Badge
                        variant={row.kind === 'trial' ? 'secondary' : 'outline'}
                      >
                        {row.kind === 'trial'
                          ? t(
                              'platform:adminSubscriptions.cancellations.kindTrial'
                            )
                          : t(
                              'platform:adminSubscriptions.cancellations.kindPaid'
                            )}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(`tenant:cancellation.reasons.${row.reason}`, {
                        defaultValue: row.reason,
                      })}
                      {' · '}
                      {formatDate(row.cancelledAt, language, 'short')}
                      {row.cancelledByName ? ` · ${row.cancelledByName}` : ''}
                    </p>
                    {row.feedback ? (
                      <p className="mt-2 rounded-md bg-muted p-2 text-sm">
                        {row.feedback}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard
          titleKey="platform:adminSubscriptions.revenue.title"
          descriptionKey="platform:adminSubscriptions.revenue.description"
        >
          <div className="space-y-4" data-testid="platform-mrr">
            {data.revenue.mrr.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('platform:adminSubscriptions.revenue.none')}
              </p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.revenue.mrr.map((row) => (
                  <div key={row.currency}>
                    <dt className="text-sm text-muted-foreground">
                      {t('platform:adminSubscriptions.revenue.currencyLabel', {
                        currency: row.currency,
                      })}
                    </dt>
                    <dd className="text-2xl font-semibold tabular-nums">
                      {formatCurrency(
                        row.monthlyAmountMinorUnits / 100,
                        language,
                        row.currency
                      )}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {t(
                        'platform:adminSubscriptions.revenue.subscriptionsCount',
                        { count: row.subscriptions }
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {data.revenue.activeWithoutPayment > 0 ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {t('platform:adminSubscriptions.revenue.withoutPayment', {
                    count: data.revenue.activeWithoutPayment,
                  })}
                </span>
              </p>
            ) : null}
            {data.revenue.excludesInternalOrganizations ? null : (
              <p className="text-xs text-muted-foreground">
                {t('platform:adminSubscriptions.revenue.internalIncluded')}
              </p>
            )}
            <div>
              <p className="text-sm font-medium">
                {t('platform:adminSubscriptions.revenue.cyclesTitle')}
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-4">
                {(['monthly', 'yearly', 'none'] as const).map((cycle) => (
                  <div key={cycle}>
                    <dt className="text-xs text-muted-foreground">
                      {t(`platform:adminSubscriptions.revenue.cycle.${cycle}`)}
                    </dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {data.subscriptions.byStatusAndCycle.active?.[cycle] ?? 0}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </SectionCard>

        <p className="text-xs text-muted-foreground">
          {t('platform:adminSubscriptions.generatedAt', {
            timestamp: formatDate(data.generatedAt, language, 'short'),
          })}
        </p>
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:adminSubscriptions.title"
        descriptionKey="platform:adminSubscriptions.description"
      />
      {renderBody()}
    </PageContainer>
  );
}
