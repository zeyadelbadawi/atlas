/**
 * Customer request email routing
 * (`/dashboard/platform/customer-requests/routing`, Platform Owner only).
 *
 * One team inbox per request type: a new logo request can go to the
 * design team, a domain request to infrastructure. An empty inbox is
 * allowed and meaningful — that type's emails then go to every Platform
 * Owner, so a request is never routed to nobody. Saved as one table
 * (`PUT platform/customer-request-routing`); no address is hardcoded.
 */
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Loader2, Save } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@app/providers';
import { useDateFormatter } from '@hooks';
import { MIRROR_IN_RTL, cn } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  CR_NS,
  CUSTOMER_REQUEST_ROUTING_EMAIL_MAX,
  CUSTOMER_REQUEST_TYPES,
} from '../constants/customer-request.constants';
import {
  useCustomerRequestRouting,
  useUpdateCustomerRequestRouting,
} from '../hooks';
import {
  customerRequestErrorKey,
  customerRequestTypeIcon,
  customerRequestTypeLabelKey,
} from '../utils/customer-request.utils';
import type {
  CustomerRequestRoutingRule,
  CustomerRequestType,
} from '../types/customer-request.types';

const inbox = z
  .string()
  .trim()
  .max(CUSTOMER_REQUEST_ROUTING_EMAIL_MAX)
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success
  );

const routingSchema = z.object({
  logo: inbox,
  domain: inbox,
  theme: inbox,
  custom_section: inbox,
  custom_feature: inbox,
});

type RoutingFormValues = z.infer<typeof routingSchema>;

function toFormValues(
  rules: readonly CustomerRequestRoutingRule[] | undefined
): RoutingFormValues {
  const byType = new Map(rules?.map((rule) => [rule.type, rule.email]));
  return Object.fromEntries(
    CUSTOMER_REQUEST_TYPES.map((type) => [type, byType.get(type) ?? ''])
  ) as RoutingFormValues;
}

export default function PlatformCustomerRequestRoutingPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { notify, notifySuccess } = useToast();
  const idPrefix = useId();
  const routingQuery = useCustomerRequestRouting();
  const save = useUpdateCustomerRequestRouting();

  const form = useForm<RoutingFormValues>({
    resolver: zodResolver(routingSchema),
    defaultValues: toFormValues(undefined),
    mode: 'onTouched',
  });
  const { reset } = form;

  useEffect(() => {
    if (routingQuery.data) reset(toFormValues(routingQuery.data));
  }, [routingQuery.data, reset]);

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformCustomerRequests',
      path: DASHBOARD_ROUTES.platformCustomerRequests,
    },
    { labelKey: `${CR_NS}:routing.title` },
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    if (save.isPending) return;
    try {
      const saved = await save.mutateAsync({
        rules: CUSTOMER_REQUEST_TYPES.map((type) => ({
          type,
          email: values[type].trim() || null,
        })),
      });
      reset(toFormValues(saved));
      notifySuccess(`${CR_NS}:routing.saved`);
    } catch (error) {
      const reasonKey = customerRequestErrorKey(error);
      notify({
        intent: 'error',
        titleKey: `${CR_NS}:routing.saveFailed`,
        ...(reasonKey ? { descriptionKey: reasonKey } : {}),
      });
    }
  });

  const header = (
    <PageHeader
      titleKey={`${CR_NS}:routing.title`}
      descriptionKey={`${CR_NS}:routing.subtitle`}
      breadcrumbs={breadcrumbs}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to={DASHBOARD_ROUTES.platformCustomerRequests}>
            <ArrowLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
            {t(`${CR_NS}:routing.back`)}
          </Link>
        </Button>
      }
    />
  );

  if (routingQuery.isLoading) {
    return (
      <PageContainer>
        {header}
        <div className="space-y-3" aria-busy="true">
          {CUSTOMER_REQUEST_TYPES.map((type) => (
            <Skeleton key={type} className="h-20 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (routingQuery.error) {
    return (
      <PageContainer>
        {header}
        <ErrorState
          kind={routingQuery.error.kind}
          onRetry={() => void routingQuery.refetch()}
          headingLevel="h2"
        />
      </PageContainer>
    );
  }

  const updatedAt = (type: CustomerRequestType): string | null =>
    routingQuery.data?.find((rule) => rule.type === type)?.updatedAt ?? null;

  return (
    <PageContainer>
      {header}

      <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>{t(`${CR_NS}:routing.fallback`)}</AlertDescription>
        </Alert>

        <Card>
          <CardContent className="divide-y divide-border p-0">
            {CUSTOMER_REQUEST_TYPES.map((type) => {
              const Icon = customerRequestTypeIcon(type);
              const id = `${idPrefix}-${type}`;
              const error = form.formState.errors[type];
              const value = form.watch(type);
              const lastUpdated = updatedAt(type);
              const describedBy = [
                `${id}-team`,
                error ? `${id}-error` : `${id}-state`,
              ].join(' ');
              return (
                <div
                  key={type}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:p-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                      aria-hidden
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        {t(`${CR_NS}:routing.emailLabel`, {
                          type: t(customerRequestTypeLabelKey(type)),
                        })}
                      </Label>
                      <p
                        id={`${id}-team`}
                        className="text-xs text-muted-foreground"
                      >
                        {t(`${CR_NS}:types.${type}.team`)}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Input
                      id={id}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      dir="ltr"
                      data-testid={`routing-email-${type}`}
                      placeholder={t(`${CR_NS}:routing.placeholder`)}
                      maxLength={CUSTOMER_REQUEST_ROUTING_EMAIL_MAX}
                      aria-invalid={!!error}
                      aria-describedby={describedBy}
                      {...form.register(type)}
                    />
                    {error ? (
                      <p
                        id={`${id}-error`}
                        className="text-sm text-destructive"
                      >
                        {t(`${CR_NS}:routing.invalidEmail`)}
                      </p>
                    ) : (
                      <p
                        id={`${id}-state`}
                        className="text-xs text-muted-foreground"
                      >
                        {value.trim() === ''
                          ? t(`${CR_NS}:routing.emptyMeans`)
                          : lastUpdated
                            ? t(`${CR_NS}:routing.lastUpdated`, {
                                date: fmt.dateTime(lastUpdated),
                              })
                            : t(`${CR_NS}:routing.neverUpdated`)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            data-testid="routing-save"
            disabled={save.isPending || !form.formState.isDirty}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {t(`${CR_NS}:routing.save`)}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
