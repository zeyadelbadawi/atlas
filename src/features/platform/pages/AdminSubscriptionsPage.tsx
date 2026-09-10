/**
 * Platform-admin subscription and trial operations dashboard.
 *
 * EVERY FIGURE ON THIS PAGE IS A REAL AGGREGATE returned by
 * `GET /platform/subscriptions/overview`. Nothing is sampled, seeded, or
 * placeholder.
 *
 * REVENUE IS SHOWN AS UNTRACKED, NOT AS ZERO. Atlas does not record
 * subscription revenue — plan prices are catalog metadata and no ledger
 * ties a subscription to money received. A "$0 MRR" tile would be read as
 * a measurement, so the page states the limitation in words instead. This
 * is the same honest treatment the tenant dashboard already gives
 * revenue.
 *
 * AUTHORIZATION IS NOT THIS FILE'S JOB. The sidebar hides this page from
 * non-admins and the route is role-gated, but the actual control is
 * `PlatformOwnerGuard` on the API. Someone who navigates here directly
 * gets a 403 from the server and an error state from this page.
 */
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, CreditCard, TimerReset, XCircle } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { MetricCard } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Badge } from '@/components/ui/badge';
import { useApiQuery } from '@/shared/hooks';
import { adminSubscriptionsService } from '../services/AdminSubscriptionsService';
import { formatDate } from '@/shared/utils/date.utils';
import type { LanguageCode, AdminSubscriptionOverview } from '@types';
import type { ApiError } from '@api';

export function AdminSubscriptionsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const overview = useApiQuery<AdminSubscriptionOverview, ApiError>({
    queryKey: ['platform', 'subscriptions', 'overview'],
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
                  <span className="font-medium tabular-nums">{plan.subscriptions}</span>
                </li>
              ))}
            </ul>
          )}
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
                      <span className="font-medium">{row.organizationName}</span>
                      <Badge variant={row.kind === 'trial' ? 'secondary' : 'outline'}>
                        {row.kind === 'trial'
                          ? t('platform:adminSubscriptions.cancellations.kindTrial')
                          : t('platform:adminSubscriptions.cancellations.kindPaid')}
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

        {/* The limitation, stated plainly where a revenue tile would
            otherwise sit. */}
        <SectionCard titleKey="platform:adminSubscriptions.revenue.title">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              {t('platform:adminSubscriptions.revenue.notTracked')}
            </p>
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
