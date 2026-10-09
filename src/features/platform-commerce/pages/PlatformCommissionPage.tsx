/**
 * Platform Commission Settings.
 *
 * The §4.2 hierarchy, top to bottom, the way it resolves:
 *   1. Organization override (custom rate or exempt) — edited on each
 *      organization's detail page, where the Platform Owner already is when
 *      deciding about one customer.
 *   2. Plan override — one row per catalog plan (the SAME plan list the
 *      Plan Catalog page reads), each fetched by plan key.
 *   3. Global default — the fallback for everything else.
 *
 * Every rate is shown and typed as a percentage and sent as integer basis
 * points (`commission.utils.ts`). Changes apply to FUTURE course payments —
 * each payment snapshots its rate when it is created.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2, Pencil } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useConfirmDialog, useToast } from '@app/providers';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { apiErrorMessage } from '@utils';
import { resolvePlanName, usePlanCatalog } from '@features/tenant';
import type { LanguageCode, Plan } from '@types';
import {
  useGlobalCommission,
  usePlanCommission,
  useUpdateGlobalCommission,
} from '../hooks';
import {
  commissionRateSchema,
  type CommissionRateFormData,
} from '../schemas/platform-commerce.schemas';
import {
  basisPointsToPercent,
  formatBasisPoints,
  percentToBasisPoints,
} from '../utils/commission.utils';
import {
  PlanCommissionDialog,
  type PlanCommissionTarget,
} from '../components/PlanCommissionDialog';

function GlobalCommissionCard(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { notifySuccess } = useToast();
  const { data, isLoading, error, refetch } = useGlobalCommission();
  const update = useUpdateGlobalCommission();

  const form = useForm<CommissionRateFormData>({
    resolver: zodResolver(commissionRateSchema),
    defaultValues: { percent: '' },
  });

  const { reset } = form;
  useEffect(() => {
    if (!data) return;
    reset({
      percent:
        data.defaultCommissionBasisPoints === null
          ? ''
          : String(basisPointsToPercent(data.defaultCommissionBasisPoints)),
    });
  }, [data, reset]);

  const current =
    data?.defaultCommissionBasisPoints == null
      ? t('platformCommerce:commission.notConfigured')
      : formatBasisPoints(data.defaultCommissionBasisPoints, i18n.language);

  const onSubmit = async (values: CommissionRateFormData) => {
    const basisPoints = percentToBasisPoints(Number(values.percent));
    const confirmed = await confirm({
      titleKey: 'platformCommerce:commission.global.confirmTitle',
      descriptionKey: 'platformCommerce:commission.global.confirmDescription',
      confirmLabelKey: 'platformCommerce:commission.global.save',
      values: {
        from: current,
        to: formatBasisPoints(basisPoints, i18n.language),
      },
    });
    if (!confirmed) return;
    update.mutate(
      { defaultCommissionBasisPoints: basisPoints },
      {
        onSuccess: () =>
          notifySuccess('platformCommerce:commission.global.saved'),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('platformCommerce:commission.global.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full sm:w-64" />
          </div>
        ) : error || !data ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t('platformCommerce:commission.global.current')}{' '}
              <span
                className="font-medium text-foreground"
                data-atlas-numeric="true"
              >
                {current}
              </span>
            </p>
            {data.defaultCommissionBasisPoints === null ? (
              <Alert>
                <Info className="size-4" aria-hidden />
                <AlertDescription>
                  {t('platformCommerce:commission.global.unsetNotice')}
                </AlertDescription>
              </Alert>
            ) : null}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="percent"
                  render={({ field }) => (
                    <FormItem className="sm:max-w-xs">
                      <FormLabel>
                        {t('platformCommerce:commission.percentLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('platformCommerce:commission.percentHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {update.error ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>
                      {apiErrorMessage(t, i18n, update.error)}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  disabled={update.isPending || !form.formState.isDirty}
                >
                  {update.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('platformCommerce:commission.global.save')}
                </Button>
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlanCommissionRow({
  plan,
  onEdit,
}: {
  readonly plan: Plan;
  readonly onEdit: (target: PlanCommissionTarget) => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const planName = resolvePlanName(plan, i18n.language as LanguageCode);
  const { data, isLoading, error, refetch } = usePlanCommission(plan.key);

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{planName}</p>
        <p
          className="font-mono text-xs text-muted-foreground"
          dir="ltr"
          data-ltr-content
        >
          {plan.key}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-5 w-24" />
        ) : error ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void refetch()}
          >
            {t('platformCommerce:commission.plans.loadErrorRetry')}
          </Button>
        ) : (
          <span className="text-sm" data-atlas-numeric="true">
            {data?.commissionBasisPoints == null
              ? t('platformCommerce:commission.plans.usesDefault')
              : formatBasisPoints(data.commissionBasisPoints, i18n.language)}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isLoading || Boolean(error)}
          aria-label={t('platformCommerce:commission.plans.editLabel', {
            plan: planName,
          })}
          onClick={() =>
            onEdit({
              planKey: plan.key,
              planName,
              currentBasisPoints: data?.commissionBasisPoints ?? null,
            })
          }
        >
          <Pencil className="size-4" aria-hidden />
          {t('common:actions.edit')}
        </Button>
      </div>
    </li>
  );
}

function PlanCommissionCard(): JSX.Element {
  const { t } = useTranslation();
  const plans = usePlanCatalog();
  const [editing, setEditing] = useState<PlanCommissionTarget | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('platformCommerce:commission.plans.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('platformCommerce:commission.plans.subtitle')}
        </p>
      </CardHeader>
      <CardContent>
        {plans.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : plans.error ? (
          <ErrorState onRetry={() => void plans.refetch()} />
        ) : !plans.data || plans.data.length === 0 ? (
          <EmptyState titleKey="platformCommerce:commission.plans.empty" />
        ) : (
          <ul className="divide-y divide-border">
            {plans.data.map((plan) => (
              <PlanCommissionRow
                key={plan.id}
                plan={plan}
                onEdit={setEditing}
              />
            ))}
          </ul>
        )}
      </CardContent>
      <PlanCommissionDialog target={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}

export default function PlatformCommissionPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformCommerce:commission.title"
        descriptionKey="platformCommerce:commission.subtitle"
      />

      <div className="space-y-6">
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>
            {t('platformCommerce:commission.hierarchyTitle')}
          </AlertTitle>
          <AlertDescription>
            {t('platformCommerce:commission.hierarchyDescription')}{' '}
            <Link
              to={DASHBOARD_ROUTES.platformOrganizations}
              className="font-medium text-primary hover:underline"
            >
              {t('platformCommerce:commission.organizationsLink')}
            </Link>
          </AlertDescription>
        </Alert>

        <GlobalCommissionCard />
        <PlanCommissionCard />
      </div>
    </PageContainer>
  );
}
