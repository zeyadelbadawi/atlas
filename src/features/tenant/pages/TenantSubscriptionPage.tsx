/**
 * Tenant Subscription Page.
 *
 * Full subscription lifecycle detail, plan features (effective — Plan +
 * active Add-ons, via `useEffectiveEntitlements`), and the Plan Comparison
 * dialog. Since Prompt 7, selecting a plan in the dialog navigates into
 * real Checkout (`/dashboard/tenant/billing/checkout/plan_subscription/:planKey`)
 * — but this page itself still never submits a plan change or claims one
 * happened; only an authoritative, backend-confirmed Payment does that.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, Columns3, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useAddOnCatalog,
  useEffectiveEntitlements,
  usePlanCatalog,
  useTenantSubscription,
} from '../hooks';
import { PLAN_FEATURE_KEYS } from '../constants/tenant.constants';
import {
  getDaysRemaining,
  getFeatureGapAction,
} from '../utils/entitlement.utils';
import { getSubscriptionStatusTone } from '../utils/subscription-status.utils';
import { PlanComparisonDialog } from '../components/PlanComparisonDialog';

export default function TenantSubscriptionPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const subscriptionQuery = useTenantSubscription();
  const entitlements = useEffectiveEntitlements();
  const planCatalogQuery = usePlanCatalog();
  const addOnCatalogQuery = useAddOnCatalog();

  const isLoading = subscriptionQuery.isLoading || entitlements.isLoading;
  const error = subscriptionQuery.error ?? entitlements.error;

  const refetchAll = () => {
    void subscriptionQuery.refetch();
    entitlements.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !subscriptionQuery.data || !entitlements.data) {
    return (
      <PageContainer>
        <PageHeader titleKey="tenant:subscription.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const subscription = subscriptionQuery.data;
  const catalogAddOns = addOnCatalogQuery.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:subscription.title"
        descriptionKey="tenant:subscription.subtitle"
        actions={
          <Button type="button" onClick={() => setComparisonOpen(true)}>
            <Columns3 className="size-4" strokeWidth={2} aria-hidden />
            {t('tenant:subscription.comparePlans')}
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{subscription.plan.name}</CardTitle>
              {subscription.plan.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscription.plan.description}
                </p>
              ) : null}
            </div>
            <StatusBadge
              labelKey={`tenant:common.subscriptionStatus.${subscription.status}`}
              tone={getSubscriptionStatusTone(subscription.status)}
            />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {t(
                `tenant:common.subscriptionStatusDescription.${subscription.status}`
              )}
            </p>

            {subscription.status === 'trialing' && subscription.trialEndsAt ? (
              <p className="font-medium text-info">
                {t('tenant:dashboard.trialDaysRemaining', {
                  count: getDaysRemaining(subscription.trialEndsAt),
                })}
              </p>
            ) : null}

            {subscription.status === 'grace_period' &&
            subscription.graceEndsAt ? (
              <p className="font-medium text-warning">
                {t('tenant:dashboard.graceDaysRemaining', {
                  count: getDaysRemaining(subscription.graceEndsAt),
                })}
              </p>
            ) : null}

            {subscription.cancelAtPeriodEnd ? (
              <p className="font-medium text-warning">
                {t('tenant:subscription.cancelAtPeriodEnd')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('tenant:subscription.featuresTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('tenant:subscription.featuresSubtitle')}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {PLAN_FEATURE_KEYS.map((featureKey) => {
                const included = entitlements.data!.features[featureKey];
                const gapAction = getFeatureGapAction(
                  featureKey,
                  included,
                  subscription.plan.key,
                  catalogAddOns
                );

                return (
                  <li
                    key={featureKey}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {included ? (
                        <Check
                          className="size-4 shrink-0 text-success"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : (
                        <X
                          className="size-4 shrink-0 text-muted-foreground"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          included ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {t(`tenant:common.features.${featureKey}`)}
                      </span>
                    </span>

                    {gapAction !== 'none' ? (
                      <StatusBadge
                        labelKey={`tenant:common.gapAction.${gapAction}`}
                        tone={gapAction === 'addOn' ? 'info' : 'warning'}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <PlanComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        plans={planCatalogQuery.data}
        isLoading={planCatalogQuery.isLoading}
        currentPlanKey={subscription.plan.key}
        onSelectPlan={(plan) => {
          setComparisonOpen(false);
          navigate(
            buildPath(DASHBOARD_ROUTES.tenantBillingCheckout, {
              targetType: 'plan_subscription',
              targetKey: plan.key,
            })
          );
        }}
      />
    </PageContainer>
  );
}
