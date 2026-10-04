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
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  Hourglass,
  Loader2,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { PlanChangeSummary } from '../components/PlanChangeSummary';
import { ManualPaymentBrandChip } from '../components/ManualPaymentBrandChip';
import {
  PlanGiftOffer,
  usePlanCatalog,
  useSubscriptionLifecycleState,
  useTenantSubscription,
} from '@features/tenant';
import {
  cn,
  formatCurrency,
  isOnboardingReturnPath,
  MIRROR_IN_RTL,
  planBillingCycles,
  toErrorsNamespaceKey,
} from '@utils';
import type { ApiError } from '@api';
import type {
  CheckoutTarget,
  CheckoutTargetType,
  LanguageCode,
  PlanPricingMetadata,
  SubscriptionBillingCycle,
} from '@types';

/** The catalog price (major units) for one cycle, or `undefined` when there is none. */
function catalogPriceFor(
  pricing: PlanPricingMetadata | undefined,
  cycle: SubscriptionBillingCycle
): number | undefined {
  if (!pricing?.currency) return undefined;
  if (cycle === 'yearly' && pricing.billingCycle === 'monthly') {
    return pricing.yearlyAmount;
  }
  return pricing.amount;
}

/** The existing payment a 409 `alreadyUnderReview` points at, if the error carries one. */
function paymentUnderReviewId(error: ApiError | null): string | undefined {
  if (error?.messageKey !== 'errors.payment.alreadyUnderReview') {
    return undefined;
  }
  const paymentId = error.details?.paymentId;
  return typeof paymentId === 'string' && paymentId ? paymentId : undefined;
}

/**
 * The specific translation key for a backend error's own `messageKey`
 * (e.g. `errors.checkout.pricingUnavailable`), if one is actually mapped
 * — otherwise `undefined`, so `ErrorState` falls back to its own generic,
 * `kind`-based message instead of rendering a raw/missing translation
 * key. Fixes `CheckoutPage`'s previous behavior of collapsing every
 * checkout/payment failure (including ordinary, well-typed, backend-
 * explained validation errors like `pricingUnavailable`) into the same
 * unhelpful generic "Unexpected error" card.
 */
function specificDescriptionKey(
  i18n: { exists: (key: string) => boolean },
  error: ApiError
): string | undefined {
  const key = toErrorsNamespaceKey(error.messageKey);
  return i18n.exists(key) ? key : undefined;
}

export default function CheckoutPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { targetType, targetKey } = useParams<{
    targetType: CheckoutTargetType;
    targetKey: string;
  }>();
  const { organization } = useAuth();
  /*
    New Customer Onboarding — the setup shell's Plan step sends the owner
    here with `?returnTo=/onboarding…`. Only a path under `/onboarding` is
    honoured (never an arbitrary URL), and it only adds a way back; the
    checkout itself is unchanged.
  */
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const setupReturnPath = isOnboardingReturnPath(returnTo) ? returnTo : null;
  /*
    The authoritative "from" side of the comparison. The hook resolves the
    session's active Organization itself — the same source the rest of the
    tenant surfaces use — so the cache key follows an organization switch
    rather than being pinned to whatever id this page happened to read.

    An Organization buying its first plan has no subscription, and the
    summary renders nothing rather than inventing a previous plan.
  */
  const subscriptionQuery = useTenantSubscription();

  const idempotencyKey = useState(() => generateIdempotencyKey())[0];
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>('monthly');
  const [selectedMethodKey, setSelectedMethodKey] = useState<string>();

  const createCheckout = useCreateCheckout();
  const createPayment = useCreatePayment();
  const paymentMethodsQuery = usePaymentMethods();
  const plansQuery = usePlanCatalog();

  /*
    Derived once and used by BOTH the empty check and the list below, so the
    two can never disagree about whether there is anything to choose from —
    which is exactly the shape of bug that leaves a customer looking at an
    empty panel where the code believes it rendered options.
  */
  const enabledMethods = useMemo(
    () => (paymentMethodsQuery.data ?? []).filter((method) => method.enabled),
    [paymentMethodsQuery.data]
  );

  const target: CheckoutTarget | undefined = useMemo(() => {
    if (!targetType || !targetKey) return undefined;
    return targetType === 'plan_subscription'
      ? { type: 'plan_subscription', planKey: targetKey }
      : { type: 'add_on', addOnKey: targetKey };
  }, [targetType, targetKey]);

  const targetPlan =
    target?.type === 'plan_subscription'
      ? plansQuery.data?.find((plan) => plan.key === target.planKey)
      : undefined;
  const planPricing = targetPlan?.pricing;
  // W8 — display-only gift availability; the backend decides at approval.
  const { state: lifecycle } = useSubscriptionLifecycleState();
  // The same cycle rule the backend's checkout pricing applies (`@utils`).
  const billingCycles = planBillingCycles(planPricing);
  // A cycle chosen before the catalog loaded (or one this plan doesn't
  // offer) never reaches the request.
  const effectiveBillingCycle = billingCycles.includes(billingCycle)
    ? billingCycle
    : billingCycles[0];
  const cyclePrice = catalogPriceFor(planPricing, effectiveBillingCycle);

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
        billingCycle:
          target.type === 'plan_subscription'
            ? effectiveBillingCycle
            : undefined,
        idempotencyKey,
      },
    });
  };

  // Carry the setup return path onward, so the owner who uploads their
  // proof still has a way back into onboarding.
  const paymentDetailPath = (paymentId: string): string => {
    const detailPath = buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
      paymentId,
    });
    return setupReturnPath
      ? `${detailPath}?returnTo=${encodeURIComponent(setupReturnPath)}`
      : detailPath;
  };

  const existingPaymentId = paymentUnderReviewId(createPayment.error);

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
          navigate(paymentDetailPath(payment.id));
        },
      }
    );
  };

  return (
    <PageContainer>
      {setupReturnPath ? (
        <Link
          to={setupReturnPath}
          data-testid="checkout-back-to-setup"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          {t('payments:checkout.backToSetup')}
        </Link>
      ) : null}
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
                    value={effectiveBillingCycle}
                    onValueChange={(value) =>
                      setBillingCycle(value as SubscriptionBillingCycle)
                    }
                    className="flex gap-4"
                  >
                    {billingCycles.map((cycle) => (
                      <div key={cycle} className="flex items-center gap-2">
                        <RadioGroupItem value={cycle} id={`cycle-${cycle}`} />
                        <Label
                          htmlFor={`cycle-${cycle}`}
                          className="font-normal"
                        >
                          {t(`payments:common.billingCycle.${cycle}`)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {cyclePrice !== undefined && planPricing?.currency ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="checkout-cycle-price"
                    >
                      {t('payments:checkout.catalogPriceLabel')}{' '}
                      <span
                        className="font-semibold text-foreground"
                        data-atlas-numeric="true"
                      >
                        <span dir="ltr">
                          {formatCurrency(
                            cyclePrice,
                            i18n.language as LanguageCode,
                            planPricing.currency
                          )}
                        </span>
                        <span className="ms-1 font-normal text-muted-foreground">
                          /
                          {t(
                            `payments:common.billingCycleShort.${effectiveBillingCycle}`
                          )}
                        </span>
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {targetPlan ? (
                <PlanGiftOffer
                  plan={targetPlan}
                  cycle={effectiveBillingCycle}
                  giftAvailable={lifecycle?.giftAvailable}
                  showNote
                />
              ) : null}

              {createCheckout.error ? (
                <ErrorState
                  kind={createCheckout.error.kind}
                  descriptionKey={specificDescriptionKey(
                    i18n,
                    createCheckout.error
                  )}
                  requestId={createCheckout.error.requestId}
                  onRetry={handleStartCheckout}
                />
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
                  <span dir="ltr">
                    {formatMoney(checkout.snapshot.price, i18n.language)}
                  </span>
                  {checkout.snapshot.billingCycle ? (
                    <span className="ms-1 text-sm font-normal text-muted-foreground">
                      /
                      {t(
                        `payments:common.billingCycleShort.${checkout.snapshot.billingCycle}`
                      )}
                    </span>
                  ) : null}
                </p>
              </CardContent>
            </Card>

            {/*
              Only for a plan purchase, and only when there is an existing
              subscription to compare against — see `PlanChangeSummary` for
              what it deliberately refuses to claim about proration and
              effective dates under a manual-transfer provider.
            */}
            {target.type === 'plan_subscription' ? (
              <PlanChangeSummary
                subscription={subscriptionQuery.data}
                newPlanName={checkout.snapshot.displayName}
              />
            ) : null}

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
                ) : enabledMethods.length === 0 ? (
                  /*
                    Loading and failure were handled; being handed an empty
                    list was not, so a customer who had already reviewed a
                    price and committed to buying reached a blank panel and a
                    disabled button with nothing explaining either. Which
                    methods exist is platform configuration, not something
                    this tenant can fix from here — so the honest thing is to
                    say that plainly and point at the one route that can
                    actually resolve it.
                  */
                  <EmptyState
                    icon={CreditCard}
                    titleKey="payments:checkout.noMethodsTitle"
                    descriptionKey="payments:checkout.noMethodsDescription"
                    primaryAction={{
                      labelKey: 'payments:checkout.contactSupport',
                      onAction: () => navigate(DASHBOARD_ROUTES.support),
                    }}
                  />
                ) : (
                  <RadioGroup
                    value={selectedMethodKey}
                    onValueChange={setSelectedMethodKey}
                    className="gap-3"
                  >
                    {enabledMethods.map((method) => {
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
                            {/*
                              Bank Transfer, E-Wallet and InstaPay share this
                              one list and flow; the kind (and a wallet's
                              provider, e.g. "Vodafone Cash") is spelled out
                              so a customer never has to guess from the name.
                            */}
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {method.displayName}
                              </span>
                              <span
                                className="rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                data-testid={`checkout-method-type-${method.key}`}
                              >
                                {t(`payments:common.methodType.${method.type}`)}
                              </span>
                              {method.manualInstructions?.type ===
                              'manual_wallet_transfer' ? (
                                <ManualPaymentBrandChip
                                  instructions={method.manualInstructions}
                                  testId={`checkout-method-provider-${method.key}`}
                                />
                              ) : null}
                            </span>
                            {method.description ? (
                              <span className="block text-sm text-muted-foreground">
                                {method.description}
                              </span>
                            ) : null}
                            {method.manualInstructions?.placeholder ? (
                              /*
                                Only reachable in development/staging, where
                                a seeded placeholder may be enabled for
                                testing; production refuses to enable one.
                              */
                              <span
                                className="mt-1 flex items-start gap-1.5 text-sm font-medium text-warning"
                                data-testid={`checkout-method-placeholder-${method.key}`}
                              >
                                <AlertTriangle
                                  className="mt-0.5 size-4 shrink-0"
                                  aria-hidden
                                />
                                {t('payments:checkout.placeholderWarning')}
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

                {existingPaymentId ? (
                  /*
                    A payment for this checkout is already awaiting review:
                    the backend never replaces it (409
                    `alreadyUnderReview`), so the useful answer is the way to
                    that payment, not a retry button that can only fail again.
                  */
                  <Alert data-testid="checkout-payment-under-review">
                    <Hourglass className="size-4" aria-hidden />
                    <AlertTitle>
                      {t('payments:checkout.alreadyUnderReviewTitle')}
                    </AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>{t('errors:payment.alreadyUnderReview')}</p>
                      <Button asChild size="sm" variant="outline">
                        <Link to={paymentDetailPath(existingPaymentId)}>
                          {t('payments:checkout.viewExistingPayment')}
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : createPayment.error ? (
                  <ErrorState
                    kind={createPayment.error.kind}
                    descriptionKey={specificDescriptionKey(
                      i18n,
                      createPayment.error
                    )}
                    requestId={createPayment.error.requestId}
                    onRetry={handleContinueToPayment}
                  />
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
