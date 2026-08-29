/**
 * Provisioning Start Page.
 *
 * Gated by Prompt 6's existing entitlement/usage abstraction — never a
 * hardcoded `plan.key`/`plan.name` check (see `Reports/ARCHITECTURE.md`,
 * Prompt 8, "Plan Limit Enforcement"). This page only creates the
 * `ProvisioningRequest`; it never creates an Academy record itself — the
 * backend's orchestration does that as part of fulfilling the request.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@utils';
import { listWebsiteThemes } from '@features/website';
import type { WebsiteThemeDefinition } from '@types';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getLimitGapAction,
  getUsageMetricStatus,
  useAddOnCatalog,
  useTenantSubscription,
  useTenantUsage,
} from '@features/tenant';
import {
  useCheckSubdomainAvailability,
  useCreateProvisioningRequest,
} from '../hooks';
import {
  createProvisioningRequestSchema,
  type CreateProvisioningRequestFormData,
} from '../schemas/provisioning.schemas';
import { generateProvisioningIdempotencyKey } from '../utils/idempotency.utils';

export default function ProvisioningStartPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organization } = useAuth();

  const usageQuery = useTenantUsage();
  const subscriptionQuery = useTenantSubscription();
  const addOnCatalogQuery = useAddOnCatalog();
  const createRequest = useCreateProvisioningRequest();

  const idempotencyKey = useState(() => generateProvisioningIdempotencyKey())[0];

  const form = useForm<CreateProvisioningRequestFormData>({
    resolver: zodResolver(createProvisioningRequestSchema),
    defaultValues: { academyName: '', requestedSubdomain: '', selectedThemeKey: undefined },
  });

  const themes = listWebsiteThemes();
  const selectedThemeKey = form.watch('selectedThemeKey');

  useServerValidation(form, createRequest.error);

  const subdomainValue = form.watch('requestedSubdomain');
  const availability = useCheckSubdomainAvailability(subdomainValue);

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

  const onSubmit = (data: CreateProvisioningRequestFormData) => {
    createRequest.mutate(
      {
        organizationId: organization.id,
        payload: {
          academyName: data.academyName,
          requestedSubdomain: data.requestedSubdomain,
          selectedThemeKey: data.selectedThemeKey,
          idempotencyKey,
        },
      },
      {
        onSuccess: (request) => {
          navigate(
            buildPath(DASHBOARD_ROUTES.provisioningStatus, { requestId: request.id })
          );
        },
      }
    );
  };

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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="academyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('provisioning:start.academyNameLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestedSubdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('provisioning:start.subdomainLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input {...field} className="flex-1" />
                        {field.value ? (
                          availability.isLoading ? (
                            <Loader2
                              className="size-4 shrink-0 animate-spin text-muted-foreground"
                              aria-hidden
                            />
                          ) : availability.data?.status === 'available' ? (
                            <CheckCircle2
                              className="size-4 shrink-0 text-success"
                              aria-hidden
                            />
                          ) : availability.data ? (
                            <XCircle
                              className="size-4 shrink-0 text-destructive"
                              aria-hidden
                            />
                          ) : null
                        ) : null}
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('provisioning:start.subdomainHelp')}
                    </FormDescription>
                    {field.value && availability.data?.status !== 'available' && availability.data ? (
                      <p className="text-sm text-destructive">
                        {t(`provisioning:start.subdomainStatus.${availability.data.status}`)}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phase P19 — real theme selection during onboarding
                  (previously always skipped — see `Reports/
                  DEVELOPMENT_E2E_FLOW_AUDIT.md` P1-1). Optional: skipping
                  leaves the Website Builder's own bootstrap default in
                  place, applied the first time the Academy's website is
                  ever read (`WebsiteBootstrapService`). */}
              <FormField
                control={form.control}
                name="selectedThemeKey"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('provisioning:start.themeLabel')}</FormLabel>
                    <FormDescription>
                      {t('provisioning:start.themeHelp')}
                    </FormDescription>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {themes.map((theme: WebsiteThemeDefinition) => {
                        const isSelected = selectedThemeKey === theme.key;
                        return (
                          <button
                            key={theme.key}
                            type="button"
                            onClick={() =>
                              form.setValue(
                                'selectedThemeKey',
                                isSelected ? undefined : theme.key,
                                { shouldDirty: true }
                              )
                            }
                            className={cn(
                              'flex flex-col gap-3 rounded-lg border p-4 text-start transition-colors',
                              isSelected
                                ? 'border-2 border-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex gap-1.5">
                                {[
                                  theme.tokens.defaultPrimary,
                                  theme.tokens.defaultSecondary,
                                  theme.tokens.defaultAccent,
                                ].map((hsl, index) => (
                                  <span
                                    key={index}
                                    className="size-4 rounded-full border border-border"
                                    style={{ backgroundColor: `hsl(${hsl})` }}
                                    aria-hidden
                                  />
                                ))}
                              </span>
                              {isSelected ? (
                                <Check
                                  className="size-4 text-primary"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t(theme.nameKey)}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t(theme.descriptionKey)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={
                    createRequest.isPending || availability.data?.status !== 'available'
                  }
                >
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t('provisioning:start.creating')}
                    </>
                  ) : (
                    t('provisioning:start.submit')
                  )}
                </Button>
              </div>

              {createRequest.error ? (
                <ErrorState onRetry={form.handleSubmit(onSubmit)} />
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
