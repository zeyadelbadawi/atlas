/**
 * Organization commission override — a card for the Platform Owner's
 * Organization detail page.
 *
 * Shows the rate that is ACTUALLY in force (`effective`, resolved by the
 * backend: organization override → plan → global default) and lets the
 * Platform Owner choose the organization's mode:
 *   - `default` — no override; the plan or global rate applies
 *   - `custom`  — a specific rate (required, 0–100%)
 *   - `exempt`  — no Atlas commission at all
 *
 * Saving is confirmed first: it changes what Atlas keeps from every future
 * course sale of this organization. An organization can never reach this
 * write itself — the route tree is `PlatformOwnerGuard`-gated.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog, useToast } from '@app/providers';
import { apiErrorMessage } from '@utils';
import {
  ORGANIZATION_COMMISSION_MODES,
  type OrganizationCommission,
} from '@types';
import {
  useOrganizationCommission,
  useUpdateOrganizationCommission,
} from '../hooks';
import {
  organizationCommissionSchema,
  type OrganizationCommissionFormData,
} from '../schemas/platform-commerce.schemas';
import {
  basisPointsToPercent,
  formatBasisPoints,
  percentToBasisPoints,
} from '../utils/commission.utils';

export interface OrganizationCommissionCardProps {
  readonly organizationId: string;
}

function toFormValues(
  commission: OrganizationCommission
): OrganizationCommissionFormData {
  return {
    commissionMode: commission.commissionMode,
    percent:
      commission.customPercentageBasisPoints === null
        ? ''
        : String(basisPointsToPercent(commission.customPercentageBasisPoints)),
  };
}

export function OrganizationCommissionCard({
  organizationId,
}: OrganizationCommissionCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { notifySuccess } = useToast();
  const { data, isLoading, error, refetch } =
    useOrganizationCommission(organizationId);
  const update = useUpdateOrganizationCommission();

  const form = useForm<OrganizationCommissionFormData>({
    resolver: zodResolver(organizationCommissionSchema),
    defaultValues: { commissionMode: 'default', percent: '' },
  });
  const mode = useWatch({ control: form.control, name: 'commissionMode' });

  const { reset } = form;
  useEffect(() => {
    if (data) reset(toFormValues(data));
  }, [data, reset]);

  const onSubmit = async (values: OrganizationCommissionFormData) => {
    const confirmed = await confirm({
      titleKey: 'platformCommerce:commission.organization.confirmTitle',
      descriptionKey: `platformCommerce:commission.organization.confirmDescription.${values.commissionMode}`,
      confirmLabelKey: 'platformCommerce:commission.organization.save',
      values: {
        rate:
          values.commissionMode === 'custom'
            ? formatBasisPoints(
                percentToBasisPoints(Number(values.percent)),
                i18n.language
              )
            : '',
      },
    });
    if (!confirmed) return;
    update.mutate(
      {
        organizationId,
        payload:
          values.commissionMode === 'custom'
            ? {
                commissionMode: 'custom',
                customPercentageBasisPoints: percentToBasisPoints(
                  Number(values.percent)
                ),
              }
            : { commissionMode: values.commissionMode },
      },
      {
        onSuccess: () =>
          notifySuccess('platformCommerce:commission.organization.saved'),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('platformCommerce:commission.organization.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error || !data ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">
                {t('platformCommerce:commission.organization.effective')}
              </p>
              <p className="font-medium text-foreground">
                {data.effective.resolved
                  ? t(
                      'platformCommerce:commission.organization.effectiveValue',
                      {
                        rate: formatBasisPoints(
                          data.effective.basisPoints,
                          i18n.language
                        ),
                        source: t(
                          `platformCommerce:commission.source.${data.effective.source}`
                        ),
                      }
                    )
                  : t('platformCommerce:commission.organization.unresolved')}
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="commissionMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('platformCommerce:commission.organization.mode')}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="gap-3"
                        >
                          {ORGANIZATION_COMMISSION_MODES.map((option) => (
                            <div
                              key={option}
                              className="flex items-start gap-3"
                            >
                              <RadioGroupItem
                                value={option}
                                id={`org-commission-mode-${option}`}
                                aria-describedby={`org-commission-mode-${option}-hint`}
                                className="mt-0.5"
                              />
                              <div className="space-y-0.5">
                                <Label
                                  htmlFor={`org-commission-mode-${option}`}
                                  className="font-normal"
                                >
                                  {t(
                                    `platformCommerce:commission.organization.modes.${option}.label`
                                  )}
                                </Label>
                                <p
                                  id={`org-commission-mode-${option}-hint`}
                                  className="text-xs text-muted-foreground"
                                >
                                  {t(
                                    `platformCommerce:commission.organization.modes.${option}.hint`
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === 'custom' ? (
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
                ) : null}

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
                  {t('platformCommerce:commission.organization.save')}
                </Button>
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
