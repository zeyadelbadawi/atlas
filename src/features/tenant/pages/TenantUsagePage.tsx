/**
 * Tenant Usage Page.
 *
 * Every resource limit Prompt 6 tracks, each shown as usage vs. limit with
 * an explicit status (allowed / limit reached / unlimited / unknown) and,
 * when a limit is reached, the centralized upgrade-vs-add-on guidance from
 * `getLimitGapAction`. Usage is authoritative backend data (`TenantUsage`)
 * — never recalculated from local state.
 *
 * Frontend limit checks are UX only; the future backend remains the actual
 * enforcement point (see `Reports/ARCHITECTURE.md`, Prompt 6).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns3 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddOnCatalog,
  usePlanCatalog,
  useTenantSubscription,
  useTenantUsage,
} from '../hooks';
import {
  PLAN_LIMIT_KEYS,
  STORAGE_LIMIT_KEYS,
} from '../constants/tenant.constants';
import {
  formatLimitValue,
  getLimitGapAction,
  getUsageMetricStatus,
  getUsagePercentage,
} from '../utils/entitlement.utils';
import { PlanComparisonDialog } from '../components/PlanComparisonDialog';
import type { StatusTone } from '@components/data-display';
import type { ResourceLimitStatus } from '@types';

const STATUS_TONE: Record<ResourceLimitStatus, StatusTone> = {
  allowed: 'neutral',
  limitReached: 'destructive',
  unlimited: 'info',
  unknown: 'neutral',
};

export default function TenantUsagePage(): JSX.Element {
  const { t } = useTranslation();
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const usageQuery = useTenantUsage();
  const subscriptionQuery = useTenantSubscription();
  const addOnCatalogQuery = useAddOnCatalog();
  // Only fetched once the comparison dialog is actually opened, not on
  // every Usage page visit.
  const planCatalogQuery = usePlanCatalog();

  const isLoading = usageQuery.isLoading || subscriptionQuery.isLoading;
  const error = usageQuery.error ?? subscriptionQuery.error;

  const refetchAll = () => {
    void usageQuery.refetch();
    void subscriptionQuery.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !usageQuery.data || !subscriptionQuery.data) {
    return (
      <PageContainer>
        <PageHeader titleKey="tenant:usage.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const usage = usageQuery.data;
  const plan = subscriptionQuery.data.plan;
  const catalogAddOns = addOnCatalogQuery.data ?? [];
  const unlimitedLabel = t('tenant:common.unlimited');

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:usage.title"
        descriptionKey="tenant:usage.subtitle"
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {PLAN_LIMIT_KEYS.map((limitKey) => {
            const metric = usage[limitKey];
            const status = getUsageMetricStatus(metric);
            const percentage = getUsagePercentage(metric);
            const gapAction = getLimitGapAction(
              limitKey,
              status,
              plan.key,
              catalogAddOns
            );
            const isStorage = STORAGE_LIMIT_KEYS.includes(limitKey);

            return (
              <div key={limitKey} className="space-y-2 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {t(`tenant:common.limits.${limitKey}`)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm text-muted-foreground"
                      data-atlas-numeric="true"
                    >
                      {isStorage ? `${metric.used} GB` : metric.used} /{' '}
                      {formatLimitValue(metric.limit, isStorage, unlimitedLabel)}
                    </span>
                    <StatusBadge
                      labelKey={`tenant:common.usageStatus.${status}`}
                      tone={STATUS_TONE[status]}
                    />
                  </div>
                </div>

                {percentage !== null ? (
                  <Progress
                    value={percentage}
                    aria-label={t(`tenant:common.limits.${limitKey}`)}
                  />
                ) : null}

                {gapAction !== 'none' ? (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-warning-surface px-3 py-2">
                    <span className="text-xs text-warning">
                      {t(`tenant:usage.gapMessage.${gapAction}`)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setComparisonOpen(true)}
                    >
                      <Columns3 className="size-3.5" strokeWidth={2} aria-hidden />
                      {t('tenant:subscription.comparePlans')}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t('tenant:usage.enforcementNote')}
      </p>

      <PlanComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        plans={planCatalogQuery.data}
        isLoading={planCatalogQuery.isLoading}
        currentPlanKey={plan.key}
      />
    </PageContainer>
  );
}
