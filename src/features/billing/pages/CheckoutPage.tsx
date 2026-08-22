/**
 * Checkout Page.
 *
 * The one shared Checkout surface for both targets Prompt 7 supports
 * (`plan_subscription`/`add_on`) and every payment method — manual or
 * future gateway. It creates the Checkout, lets the Tenant pick a
 * payment method, creates the Payment through that method's resolved
 * provider adapter, then hands off to `PaymentDetailsPage`, which owns
 * every method-specific completion flow (proof upload, gateway redirect,
 * status polling). Splitting it this way keeps this page identical
 * regardless of method — exactly what "manual and gateway flows share the
 * core checkout architecture" (acceptance criteria C-7-47) requires.
 *
 * Never claims a payment succeeded — creating a Checkout or a Payment is
 * not a purchase; only an authoritative, backend-confirmed
 * `Payment.status === 'succeeded'` is (see `Reports/ARCHITECTURE.md`,
 * Prompt 7, "Payment Is Not Subscription").
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAuth } from '@hooks';
import {
  useCreateCheckout,
  useCreatePayment,
  usePaymentMethods,
} from '../hooks';
import { getPaymentProvider } from '../providers/PaymentProviderRegistry';
import { generateIdempotencyKey } from '../utils/idempotency.utils';
import { formatMoney } from '../utils/money.utils';
import type {
  CheckoutTarget,
  CheckoutTargetType,
  SubscriptionBillingCycle,
} from '@types';

const BILLING_CYCLES: readonly SubscriptionBillingCycle[] = ['monthly', 'yearly'];

export default function CheckoutPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { targetType, targetKey } = useParams<{
    targetType: CheckoutTargetType;
    targetKey: string;
  }>();
  const { organization } = useAuth();

  const idempotencyKey = useState(() => generateIdempotencyKey())[0];
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>('monthly');
  const [selectedMethodKey, setSelectedMethodKey] = useState<string>();

  const createCheckout = useCreateCheckout();
  const createPayment = useCreatePayment();
  const paymentMethodsQuery = usePaymentMethods();

  const target: CheckoutTarget | undefined = useMemo(() => {
    if (!targetType || !targetKey) return undefined;
    return targetType === 'plan_subscription'
      ? { type: 'plan_subscription', planKey: targetKey }
      : { type: 'add_on', addOnKey: targetKey };
  }, [targetType, targetKey]);

  if (!target || !organization?.id) {
    return (
      <PageContainer>
        <PageHeader titleKey="payments:checkout.title" />
        <ErrorState kind="notFound" />
      </PageContainer>
    );
  }

  const checkout = createCheckout.data;

  const handleStartCheckout = () => {
    createCheckout.mutate({
      organizationId: organization.id,
      payload: {
        target,
        billingCycle: target.type === 'plan_subscription' ? billingCycle : undefined,
        idempotencyKey,
      },
    });
  };

  const handleContinueToPayment = () => {
    if (!checkout || !selectedMethodKey) return;
    const method = paymentMethodsQuery.data?.find(
      (candidate) => candidate.key === selectedMethodKey
    );
    if (!method) return;
    const provider = getPaymentProvider(method.provider);
    if (!provider) return;

    createPayment.mutate(
      {
        organizationId: organization.id,
        checkout,
        methodKey: method.key,
        provider,
      },
      {
        onSuccess: (payment) => {
          navigate(
            buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
              paymentId: payment.id,
            })
          );
        },
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:checkout.title"
        descriptionKey="payments:checkout.subtitle"
      />

      <div className="space-y-6">
        {!checkout ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('payments:checkout.reviewTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t(
                  target.type === 'plan_subscription'
                    ? 'payments:checkout.reviewPlanDescription'
                    : 'payments:checkout.reviewAddOnDescription'
                )}
              </p>

              {target.type === 'plan_subscription' ? (
                <div className="space-y-2">
                  <Label>{t('payments:checkout.billingCycleLabel')}</Label>
                  <RadioGroup
                    value={billingCycle}
                    onValueChange={(value) =>
                      setBillingCycle(value as SubscriptionBillingCycle)
                    }
                    className="flex gap-4"
                  >
                    {BILLING_CYCLES.map((cycle) => (
                      <div key={cycle} className="flex items-center gap-2">
                        <RadioGroupItem value={cycle} id={`cycle-${cycle}`} />
                        <Label htmlFor={`cycle-${cycle}`} className="font-normal">
                          {t(`payments:common.billingCycle.${cycle}`)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : null}

              {createCheckout.error ? (
                <ErrorState onRetry={handleStartCheckout} />
              ) : (
                <Button
                  type="button"
                  onClick={handleStartCheckout}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t('payments:checkout.startingCheckout')}
                    </>
                  ) : (
                    t('payments:checkout.startCheckout')
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('payments:checkout.summaryTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-display text-lg font-semibold text-foreground">
                  {checkout.snapshot.displayName}
                </p>
                <p
                  className="text-2xl font-semibold text-foreground"
                  data-atlas-numeric="true"
                >
                  {formatMoney(checkout.snapshot.price, i18n.language)}
                  {checkout.snapshot.billingCycle ? (
                    <span className="ms-1 text-sm font-normal text-muted-foreground">
                      /{t(`payments:common.billingCycleShort.${checkout.snapshot.billingCycle}`)}
                    </span>
                  ) : null}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('payments:checkout.paymentMethodTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethodsQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : paymentMethodsQuery.error ? (
                  <ErrorState onRetry={() => paymentMethodsQuery.refetch()} />
                ) : (
                  <RadioGroup
                    value={selectedMethodKey}
                    onValueChange={setSelectedMethodKey}
                    className="gap-3"
                  >
                    {(paymentMethodsQuery.data ?? [])
                      .filter((method) => method.enabled)
                      .map((method) => {
                        const available = !!getPaymentProvider(method.provider);
                        return (
                          <div
                            key={method.key}
                            className="flex items-start gap-3 rounded-md border border-border p-3"
                          >
                            <RadioGroupItem
                              value={method.key}
                              id={`method-${method.key}`}
                              disabled={!available}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={`method-${method.key}`}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              <span className="block font-medium text-foreground">
                                {method.displayName}
                              </span>
                              {method.description ? (
                                <span className="block text-sm text-muted-foreground">
                                  {method.description}
                                </span>
                              ) : null}
                              {!available ? (
                                <span className="block text-sm text-warning">
                                  {t('payments:checkout.methodUnavailable')}
                                </span>
                              ) : null}
                            </Label>
                          </div>
                        );
                      })}
                  </RadioGroup>
                )}

                {createPayment.error ? (
                  <ErrorState onRetry={handleContinueToPayment} />
                ) : null}

                <Button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={!selectedMethodKey || createPayment.isPending}
                >
                  {createPayment.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t('payments:checkout.creatingPayment')}
                    </>
                  ) : (
                    t('payments:checkout.continueToPayment')
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
