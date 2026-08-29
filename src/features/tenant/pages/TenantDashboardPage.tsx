/**
 * Tenant Dashboard (SaaS Overview) Page.
 *
 * The Tenant Owner's landing view of their own subscription, usage and
 * add-ons — never another Tenant's, since every query embeds the active
 * organization id (see `tenantKeys`). Every number comes from
 * `TenantService`; nothing here is a hardcoded placeholder.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  BookOpen,
  Building2,
  ChevronRight,
  Columns3,
  CreditCard,
  GraduationCap,
  Users,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import {
  useTenantAddOns,
  useTenantSubscription,
  useTenantUsage,
} from '../hooks';
import {
  formatLimitValue,
  getDaysRemaining,
} from '../utils/entitlement.utils';
import { getSubscriptionStatusTone } from '../utils/subscription-status.utils';

export default function TenantDashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const subscriptionQuery = useTenantSubscription();
  const usageQuery = useTenantUsage();
  const addOnsQuery = useTenantAddOns();

  const isLoading =
    subscriptionQuery.isLoading || usageQuery.isLoading || addOnsQuery.isLoading;
  const error = subscriptionQuery.error ?? usageQuery.error ?? addOnsQuery.error;

  const refetchAll = () => {
    void subscriptionQuery.refetch();
    void usageQuery.refetch();
    void addOnsQuery.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // A real, legitimate "no subscription yet" — see `TenantSubscriptionPage`'s
  // identical branch for the full rationale. This page reads directly from
  // `subscription.plan`/`subscription.status` below, so it genuinely cannot
  // render its own content without one; the correct response is the same
  // guide-to-Plans empty state, not a generic error screen.
  if (subscriptionQuery.error?.kind === 'notFound') {
    return (
      <PageContainer>
        <PageHeader
          titleKey="tenant:dashboard.title"
          descriptionKey="tenant:dashboard.subtitle"
        />
        <EmptyState
          icon={CreditCard}
          titleKey="tenant:subscription.noSubscription.title"
          descriptionKey="tenant:subscription.noSubscription.description"
          primaryAction={{
            labelKey: 'tenant:subscription.noSubscription.action',
            icon: Columns3,
            onAction: () => navigate(DASHBOARD_ROUTES.plans),
          }}
        />
      </PageContainer>
    );
  }

  // Usage is a computed/cached row a background worker fills in shortly
  // after a subscription activates (see `TenantSubscriptionService.getUsage`'s
  // own doc comment) — a real 404 for a freshly-approved subscription, not
  // a failure. Subscription and add-ons are both real, so the page still
  // renders; only the "Key Metrics" section below degrades on its own.
  const usageNotReady = usageQuery.error?.kind === 'notFound';
  const usageBlocking = usageQuery.error && !usageNotReady;

  if (subscriptionQuery.error || !subscriptionQuery.data || usageBlocking || addOnsQuery.error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="tenant:dashboard.title"
          descriptionKey="tenant:dashboard.subtitle"
        />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const subscription = subscriptionQuery.data;
  const usage = usageQuery.data;
  const unlimitedLabel = t('tenant:common.unlimited');

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:dashboard.title"
        descriptionKey="tenant:dashboard.subtitle"
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
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            {subscription.status === 'trialing' && subscription.trialEndsAt ? (
              <p className="text-sm text-muted-foreground">
                {t('tenant:dashboard.trialDaysRemaining', {
                  count: getDaysRemaining(subscription.trialEndsAt),
                })}
              </p>
            ) : subscription.status === 'grace_period' &&
              subscription.graceEndsAt ? (
              <p className="text-sm text-warning">
                {t('tenant:dashboard.graceDaysRemaining', {
                  count: getDaysRemaining(subscription.graceEndsAt),
                })}
              </p>
            ) : subscription.status === 'past_due' ? (
              <p className="text-sm text-warning">
                {t('tenant:common.subscriptionStatusDescription.past_due')}
              </p>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantSubscription)}
            >
              {t('tenant:dashboard.viewSubscription')}
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">
              {t('tenant:dashboard.usageSectionTitle')}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantUsage)}
            >
              {t('tenant:dashboard.viewUsage')}
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
          </div>
          {usage ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                labelKey="tenant:common.limits.academies"
                icon={Building2}
                value={`${usage.academies.used} / ${formatLimitValue(usage.academies.limit, false, unlimitedLabel)}`}
              />
              <MetricCard
                labelKey="tenant:common.limits.students"
                icon={GraduationCap}
                value={`${usage.students.used} / ${formatLimitValue(usage.students.limit, false, unlimitedLabel)}`}
              />
              <MetricCard
                labelKey="tenant:common.limits.instructors"
                icon={Users}
                value={`${usage.instructors.used} / ${formatLimitValue(usage.instructors.limit, false, unlimitedLabel)}`}
              />
              <MetricCard
                labelKey="tenant:common.limits.staff"
                icon={Users}
                value={`${usage.staff.used} / ${formatLimitValue(usage.staff.limit, false, unlimitedLabel)}`}
              />
              <MetricCard
                labelKey="tenant:common.limits.courses"
                icon={BookOpen}
                value={`${usage.courses.used} / ${formatLimitValue(usage.courses.limit, false, unlimitedLabel)}`}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('tenant:usage.notReady.description')}
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t('tenant:dashboard.addOnsSectionTitle')}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantAddOns)}
            >
              {t('tenant:dashboard.viewAddOns')}
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Boxes className="size-4" strokeWidth={1.75} aria-hidden />
              {t('tenant:dashboard.activeAddOnsCount', {
                count: addOnsQuery.data?.length ?? 0,
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
