/**
 * Plan/Add-on Catalog Administration — Platform Owner Console (Prompt 13).
 *
 * `PlanService` (Prompt 6/7, `features/tenant`) exposes only READ methods
 * for the catalog — `getPlans`/`getAddOn`/etc. — plus `updateTrialPolicy`
 * for the unrelated trial-policy resource. No create/update/archive
 * mutation for a Plan or Add-on exists anywhere in the Vision/Constitution
 * documents or the existing service contract. Per Prompt 13's explicit
 * boundary ("create/edit/retire ONLY where the specification explicitly
 * supports those mutations"), this page is therefore a real, live
 * READ-ONLY catalog view — reusing the exact same `usePlanCatalog`/
 * `useAddOnCatalog` hooks the Tenant-facing plan comparison already
 * uses — with the undefined mutation boundary documented rather than
 * invented.
 */
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanCatalog, useAddOnCatalog } from '@features/tenant';
import { formatCurrency } from '@utils';
import type { LanguageCode } from '@types';

export default function PlatformPlanCatalogPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const plansQuery = usePlanCatalog();
  const addOnsQuery = useAddOnCatalog();

  return (
    <PageContainer>
      <PageHeader titleKey="platform:planCatalog.title" descriptionKey="platform:planCatalog.subtitle" />

      <div className="space-y-6">
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>{t('platform:planCatalog.boundaryTitle')}</AlertTitle>
          <AlertDescription>{t('platform:planCatalog.boundaryDescription')}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:planCatalog.plansTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {plansQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : plansQuery.error ? (
              <ErrorState onRetry={() => plansQuery.refetch()} />
            ) : !plansQuery.data || plansQuery.data.length === 0 ? (
              <EmptyState titleKey="platform:planCatalog.noPlans" />
            ) : (
              <ul className="divide-y divide-border">
                {plansQuery.data.map((plan) => (
                  <li key={plan.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">{plan.name}</p>
                      {plan.description ? (
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {plan.pricing?.amount !== undefined && plan.pricing.currency ? (
                        <span className="text-sm text-muted-foreground" data-atlas-numeric="true">
                          {formatCurrency(plan.pricing.amount, language, plan.pricing.currency)}
                          {plan.pricing.billingCycle
                            ? ` / ${t(`platform:planCatalog.billingCycle.${plan.pricing.billingCycle}`)}`
                            : ''}
                        </span>
                      ) : null}
                      <StatusBadge
                        labelKey={`platform:planCatalog.status.${plan.status}`}
                        tone={plan.status === 'active' ? 'success' : 'neutral'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:planCatalog.addOnsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {addOnsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : addOnsQuery.error ? (
              <ErrorState onRetry={() => addOnsQuery.refetch()} />
            ) : !addOnsQuery.data || addOnsQuery.data.length === 0 ? (
              <EmptyState titleKey="platform:planCatalog.noAddOns" />
            ) : (
              <ul className="divide-y divide-border">
                {addOnsQuery.data.map((addOn) => (
                  <li key={addOn.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-foreground">{addOn.name}</p>
                      {addOn.description ? (
                        <p className="text-xs text-muted-foreground">{addOn.description}</p>
                      ) : null}
                    </div>
                    {addOn.pricing?.amount !== undefined && addOn.pricing.currency ? (
                      <span className="text-sm text-muted-foreground" data-atlas-numeric="true">
                        {formatCurrency(addOn.pricing.amount, language, addOn.pricing.currency)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
