/**
 * Tenant Add-ons Page.
 *
 * Lists the Add-ons active on the Tenant's subscription (`TenantAddOn`,
 * from `TenantService`) separately from the full catalog (`AddOn`, from
 * `PlanService`) — the two are different resources with different scopes
 * (see `Reports/ARCHITECTURE.md`, Prompt 6). Since Prompt 7, a compatible
 * available Add-on now has a real "Purchase" action that starts Checkout
 * (`/dashboard/tenant/billing/checkout/add_on/:addOnKey`) — this page
 * itself still never sells anything or claims a purchase happened; only
 * an authoritative, backend-confirmed Payment activates an Add-on.
 */
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '@hooks';
import { useNavigate } from 'react-router-dom';
import { Boxes, Columns3, CreditCard, ShoppingCart } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useAddOnCatalog,
  useTenantAddOns,
  useTenantSubscription,
} from '../hooks';
import { formatLimitValue } from '../utils/entitlement.utils';
import type { AddOn } from '@types';

function AddOnEffectSummary({ addOn }: { readonly addOn: AddOn }): JSX.Element {
  const { t } = useTranslation();
  const unlimitedLabel = t('tenant:common.unlimited');

  if (addOn.effect.type === 'limit') {
    return (
      <span>
        {t('tenant:addOns.limitEffect', {
          amount: formatLimitValue(
            addOn.effect.amount,
            addOn.effect.limitKey === 'generalStorage' ||
              addOn.effect.limitKey === 'videoStorage',
            unlimitedLabel
          ),
          resource: t(`tenant:common.limits.${addOn.effect.limitKey}`),
        })}
      </span>
    );
  }

  return (
    <span>
      {t('tenant:addOns.featureEffect', {
        feature: t(`tenant:common.features.${addOn.effect.featureKey}`),
      })}
    </span>
  );
}

export default function TenantAddOnsPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const activeAddOnsQuery = useTenantAddOns();
  const catalogQuery = useAddOnCatalog();
  const subscriptionQuery = useTenantSubscription();

  const isLoading =
    activeAddOnsQuery.isLoading ||
    catalogQuery.isLoading ||
    subscriptionQuery.isLoading;
  const error =
    activeAddOnsQuery.error ?? catalogQuery.error ?? subscriptionQuery.error;

  const refetchAll = () => {
    void activeAddOnsQuery.refetch();
    void catalogQuery.refetch();
    void subscriptionQuery.refetch();
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

  // A real, legitimate "no subscription yet" — see `TenantSubscriptionPage`'s
  // identical branch for the full rationale. This page reads the plan's
  // `key` to determine add-on compatibility below, so it genuinely cannot
  // render without one; the correct response is the same guide-to-Plans
  // empty state, not a generic error screen.
  if (subscriptionQuery.error?.kind === 'notFound') {
    return (
      <PageContainer>
        <PageHeader titleKey="tenant:addOns.title" />
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

  if (
    error ||
    !activeAddOnsQuery.data ||
    !catalogQuery.data ||
    !subscriptionQuery.data
  ) {
    return (
      <PageContainer>
        <PageHeader titleKey="tenant:addOns.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  // The server is authoritative for what is "Coming Soon": the catalog it
  // returns carries `comingSoon` per add-on (derived from the backend
  // catalog status), and DRAFT add-ons are omitted entirely. A Coming Soon
  // add-on must never present as an active customer feature — even for a
  // tenant that holds a row from before it was unpublished — so it is
  // filtered out of "Active" and always surfaced under "Available" as
  // Coming Soon (with no purchase action).
  const comingSoonKeys = new Set(
    catalogQuery.data.filter((addOn) => addOn.comingSoon).map((addOn) => addOn.key),
  );
  const activeAddOns = activeAddOnsQuery.data.filter(
    (a) => !comingSoonKeys.has(a.addOn.key),
  );
  const activeAddOnIds = new Set(activeAddOns.map((a) => a.addOnId));
  const currentPlanKey = subscriptionQuery.data.plan.key;
  const availableAddOns = catalogQuery.data.filter(
    (addOn) => comingSoonKeys.has(addOn.key) || !activeAddOnIds.has(addOn.id),
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="tenant:addOns.title"
        descriptionKey="tenant:addOns.subtitle"
      />

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-foreground">
            {t('tenant:addOns.activeSectionTitle')}
          </h2>

          {activeAddOns.length === 0 ? (
            <EmptyState
              titleKey="tenant:addOns.noActiveAddOns"
              descriptionKey="tenant:addOns.noActiveAddOnsDescription"
              icon={Boxes}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeAddOns.map((tenantAddOn) => (
                <Card key={tenantAddOn.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-foreground">
                        {tenantAddOn.addOn.name}
                      </h3>
                      <StatusBadge
                        labelKey={
                          comingSoonKeys.has(tenantAddOn.addOn.key)
                            ? 'tenant:addOns.comingSoonBadge'
                            : 'tenant:addOns.activeBadge'
                        }
                        tone={
                          comingSoonKeys.has(tenantAddOn.addOn.key) ? 'neutral' : 'success'
                        }
                      />
                    </div>
                    {tenantAddOn.addOn.description ? (
                      <p className="text-sm text-muted-foreground">
                        {tenantAddOn.addOn.description}
                      </p>
                    ) : null}
                    <p className="text-sm text-foreground">
                      <AddOnEffectSummary addOn={tenantAddOn.addOn} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('tenant:addOns.activatedAt', {
                        date: fmt.date(tenantAddOn.activatedAt),
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-foreground">
            {t('tenant:addOns.availableSectionTitle')}
          </h2>

          {availableAddOns.length === 0 ? (
            <EmptyState
              titleKey="tenant:addOns.noAvailableAddOns"
              icon={Boxes}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableAddOns.map((addOn) => {
                const compatible =
                  addOn.compatiblePlanKeys.includes(currentPlanKey);
                return (
                  <Card
                    key={addOn.id}
                    className={!compatible ? 'opacity-70' : ''}
                  >
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-foreground">
                          {addOn.name}
                        </h3>
                        <StatusBadge
                          labelKey={
                            comingSoonKeys.has(addOn.key)
                              ? 'tenant:addOns.comingSoonBadge'
                              : compatible
                                ? 'tenant:addOns.availableBadge'
                                : 'tenant:addOns.incompatibleBadge'
                          }
                          tone={
                            comingSoonKeys.has(addOn.key)
                              ? 'neutral'
                              : compatible
                                ? 'info'
                                : 'neutral'
                          }
                        />
                      </div>
                      {addOn.description ? (
                        <p className="text-sm text-muted-foreground">
                          {addOn.description}
                        </p>
                      ) : null}
                      <p className="text-sm text-foreground">
                        <AddOnEffectSummary addOn={addOn} />
                      </p>
                      {comingSoonKeys.has(addOn.key) ? (
                        <p className="text-xs text-muted-foreground">
                          {t('tenant:addOns.comingSoonNote')}
                        </p>
                      ) : compatible ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              buildPath(
                                DASHBOARD_ROUTES.tenantBillingCheckout,
                                { targetType: 'add_on', targetKey: addOn.key }
                              )
                            )
                          }
                        >
                          <ShoppingCart
                            className="size-3.5"
                            strokeWidth={2}
                            aria-hidden
                          />
                          {t('tenant:addOns.purchaseAction')}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t('tenant:addOns.notOnCurrentPlan')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
