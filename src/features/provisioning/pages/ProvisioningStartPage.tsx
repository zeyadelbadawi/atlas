/**
 * Provisioning Start Page.
 *
 * Gated by Prompt 6's existing entitlement/usage abstraction — never a
 * hardcoded `plan.key`/`plan.name` check (see `Reports/ARCHITECTURE.md`,
 * Prompt 8, "Plan Limit Enforcement"). This page only creates the
 * `ProvisioningRequest`; it never creates an Academy record itself — the
 * backend's orchestration does that as part of fulfilling the request.
 *
 * The form itself is `AcademySetupForm`, shared with the New Customer
 * Onboarding shell; this page keeps the plan-limit gating around it and
 * navigates to the status screen once the request exists.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getLimitGapAction,
  getUsageMetricStatus,
  useAddOnCatalog,
  useTenantSubscription,
  useTenantUsage,
} from '@features/tenant';
import { AcademySetupForm } from '../components/AcademySetupForm';

export default function ProvisioningStartPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organization } = useAuth();

  const usageQuery = useTenantUsage();
  const subscriptionQuery = useTenantSubscription();
  const addOnCatalogQuery = useAddOnCatalog();
  const isLoading = usageQuery.isLoading || subscriptionQuery.isLoading;

  // Usage is a computed/cached row a background worker fills in shortly
  // after a subscription activates (see `TenantSubscriptionService.getUsage`'s
  // own doc comment) — a real 404 for a freshly-approved subscription, not
  // a failure. Confirmed live: a brand-new organization whose payment was
  // just approved could never reach Setup at all, because this page
  // treated that timing gap as a hard "Unexpected error" and blocked the
  // form outright. This page cannot know the academies limit without a
  // usage row, but a subscription this fresh cannot have created any
  // academy yet either — proceed to the form instead of blocking
  // onboarding on an infra timing artifact; the backend remains the
  // actual limit-enforcement authority regardless (see
  // `TenantUsagePage`'s own doc comment, "Frontend limit checks are UX
  // only").
  const usageNotReady = usageQuery.error?.kind === 'notFound';
  const error = (usageQuery.error && !usageNotReady) || subscriptionQuery.error;

  const refetchAll = () => {
    void usageQuery.refetch();
    void subscriptionQuery.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !subscriptionQuery.data || !organization?.id) {
    return (
      <PageContainer>
        <PageHeader titleKey="provisioning:start.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const usageStatus = usageQuery.data
    ? getUsageMetricStatus(usageQuery.data.academies)
    : 'allowed';
  const limitReached = usageStatus === 'limitReached';

  if (limitReached && usageQuery.data) {
    const gapAction = getLimitGapAction(
      'academies',
      usageStatus,
      subscriptionQuery.data.plan.key,
      addOnCatalogQuery.data ?? []
    );

    return (
      <PageContainer>
        <PageHeader
          titleKey="provisioning:start.title"
          descriptionKey="provisioning:start.subtitle"
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('provisioning:start.limitReachedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('provisioning:start.limitReachedDescription', {
                used: usageQuery.data.academies.used,
              })}
            </p>
            {gapAction !== 'none' ? (
              <StatusBadge
                labelKey={`tenant:common.gapAction.${gapAction}`}
                tone={gapAction === 'addOn' ? 'info' : 'warning'}
              />
            ) : null}
            <div>
              <Button
                type="button"
                onClick={() => navigate(DASHBOARD_ROUTES.tenantSubscription)}
              >
                {t('provisioning:start.viewPlans')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="provisioning:start.title"
        descriptionKey="provisioning:start.subtitle"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('provisioning:start.formTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AcademySetupForm
            organizationId={organization.id}
            brandStudioOpen
            onCreated={(request) => {
              navigate(
                buildPath(DASHBOARD_ROUTES.provisioningStatus, {
                  requestId: request.id,
                })
              );
            }}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
