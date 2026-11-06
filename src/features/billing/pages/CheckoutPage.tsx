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
import { useEffect, useMemo, useRef, useState } from 'react';
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
  localizedAddOnText,
  localizedPaymentMethodText,
  PlanGiftOffer,
  planCyclePrice,
  resolvePlanName,
  useAddOnCatalog,
  usePlanCatalog,
  usePlanByKey,
  useSubscriptionLifecycleState,
  useTenantAddOns,
  useTenantSubscription,
} from '@features/tenant';
import {
  cn,
  displayableErrorKey,
  formatCurrency,
  formatDate,
  isOnboardingReturnPath,
  isTranslatedString,
  MIRROR_IN_RTL,
  planBillingCycles,
  toErrorsNamespaceKey,
} from '@utils';
import type { i18n as I18nInstance } from 'i18next';
import type { ApiError } from '@api';
import type {
  CheckoutTarget,
  CheckoutTargetType,
  LanguageCode,
  SubscriptionBillingCycle,
  TenantSubscription,
} from '@types';

/**
 * B5 (UX audit) — what checking out a plan does to the subscription
 * already there, as the backend applies it (`PaymentApplicationService`):
 * the SAME plan while a paid period runs adds one more period after it
 * ends; anything else changes or starts the plan.
 */
export function planCheckoutMode(
  subscription: TenantSubscription | undefined,
  planKey: string,
  now: Date = new Date()
): 'first' | 'renew' | 'change' {
  if (!subscription || subscription.status === 'no_plan') return 'first';
  const periodRunning =
    (subscription.status === 'active' ||
      subscription.status === 'grace_period') &&
    !!subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > now.getTime();
  return subscription.plan.key === planKey && periodRunning
    ? 'renew'
    : 'change';
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
  i18n: I18nInstance,
  error: ApiError
): string | undefined {
  // B5 (UX audit) — `i18n.exists` is true for an OBJECT key such as
  // `errors.conflict` ({ title, description }), and `t()` on it printed
  // "key 'conflict (en)' returned an object instead of string." Only a
  // string key (or the object's description) is ever handed on.
  return (
    displayableErrorKey(toErrorsNamespaceKey(error.messageKey), (key) =>
      isTranslatedString(i18n, key)
    ) ?? undefined
  );
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
  const foundingLock = subscriptionQuery.data?.founding;

  const idempotencyKey = useState(() => generateIdempotencyKey())[0];
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>('monthly');
  const [selectedMethodKey, setSelectedMethodKey] = useState<string>();
  const [methodMissing, setMethodMissing] = useState(false);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);

  const createCheckout = useCreateCheckout();
  const createPayment = useCreatePayment();
  const paymentMethodsQuery = usePaymentMethods();
  const plansQuery = usePlanCatalog();
  const addOnCatalogQuery = useAddOnCatalog();
  const tenantAddOnsQuery = useTenantAddOns();

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

  const listedPlan =
    target?.type === 'plan_subscription'
      ? plansQuery.data?.find((plan) => plan.key === target.planKey)
      : undefined;
  // B0-BIL-11 — a hidden plan (founding lock, Enterprise deal) is never in
  // the customer-facing list; once the list has loaded without it, read it
  // by key so its price and billing cycles still show.
  const hiddenPlanQuery = usePlanByKey(
    target?.type === 'plan_subscription' ? target.planKey : undefined,
    plansQuery.isSuccess && !listedPlan
  );
  const targetPlan = listedPlan ?? hiddenPlanQuery.data;
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
  const cyclePrice = planCyclePrice(planPricing, effectiveBillingCycle);
  const language = i18n.language as LanguageCode;

  // B5 (UX audit) — the add-on being bought, from the catalog: its name
  // and price are shown before anything starts, and a checkout is not
  // offered for one that is already active or not for sale.
  const targetAddOn =
    target?.type === 'add_on'
      ? addOnCatalogQuery.data?.find((addOn) => addOn.key === target.addOnKey)
      : undefined;
  const addOnActive =
    target?.type === 'add_on' &&
    !!tenantAddOnsQuery.data?.some(
      (tenantAddOn) => tenantAddOn.addOn.key === target.addOnKey
    );
  const addOnBlock: 'active' | 'notForSale' | 'incompatible' | null =
    target?.type !== 'add_on'
      ? null
      : addOnActive
        ? 'active'
        : // Unknown until the catalog loads: a failed catalog request must
          // not read as "not for sale" (the server still refuses a bad add-on).
          !addOnCatalogQuery.isSuccess
          ? null
          : !targetAddOn ||
              targetAddOn.comingSoon ||
              targetAddOn.catalogStatus === 'coming_soon'
            ? 'notForSale'
            : subscriptionQuery.data &&
                !targetAddOn.compatiblePlanKeys.includes(
                  subscriptionQuery.data.plan.key
                )
              ? 'incompatible'
              : null;
  const addOnPrice =
    targetAddOn?.pricing?.currency && targetAddOn.pricing.amount !== undefined
      ? `${formatCurrency(
          targetAddOn.pricing.amount,
          language,
          targetAddOn.pricing.currency,
          // B5 (UX audit) — "USD 15.00", never a bare "$" beside EGP plans.
          { currencyDisplay: 'code' }
        )} / ${t(
          `payments:common.billingCycleShort.${targetAddOn.pricing.billingCycle ?? 'monthly'}`
        )}`
      : undefined;
  const checkoutMode =
    target?.type === 'plan_subscription'
      ? planCheckoutMode(subscriptionQuery.data, target.planKey)
      : null;
  const targetName =
    target?.type === 'plan_subscription'
      ? targetPlan
        ? resolvePlanName(targetPlan, language)
        : undefined
      : targetAddOn
        ? localizedAddOnText(t, i18n, targetAddOn.key, 'name', targetAddOn.name)
        : undefined;

  const checkoutReady = !!createCheckout.data;
  // B5 (UX audit) — once the checkout exists the review card is replaced:
  // focus moves to the order summary instead of being lost on <body>.
  useEffect(() => {
    if (checkoutReady) summaryHeadingRef.current?.focus();
  }, [checkoutReady]);

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
    if (!checkout) return;
    if (!selectedMethodKey) {
      setMethodMissing(true);
      return;
    }
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
              {targetName ? (
                <div className="space-y-1" data-testid="checkout-target">
                  <p
                    className="font-display text-lg font-semibold text-foreground"
                    dir="auto"
                  >
                    {targetName}
                  </p>
                  {targetAddOn?.description ? (
                    <p className="text-sm text-muted-foreground" dir="auto">
                      {localizedAddOnText(
                        t,
                        i18n,
                        targetAddOn.key,
                        'description',
                        targetAddOn.description
                      )}
                    </p>
                  ) : null}
                  {addOnPrice ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="checkout-add-on-price"
                    >
                      {t('payments:checkout.catalogPriceLabel')}{' '}
                      <span
                        className="font-semibold text-foreground"
                        data-atlas-numeric="true"
                        dir="ltr"
                        data-ltr-content
                      >
                        {addOnPrice}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t(
                  target.type === 'add_on'
                    ? 'payments:checkout.reviewAddOnDescription'
                    : checkoutMode === 'renew'
                      ? 'payments:checkout.reviewRenewDescription'
                      : checkoutMode === 'first'
                        ? 'payments:checkout.reviewFirstPlanDescription'
                        : 'payments:checkout.reviewPlanDescription'
                )}
              </p>
              {checkoutMode === 'renew' &&
              subscriptionQuery.data?.currentPeriodEnd ? (
                <p
                  className="text-sm text-foreground"
                  data-testid="checkout-renew-note"
                >
                  {t('payments:checkout.renewNote', {
                    date: formatDate(
                      subscriptionQuery.data.currentPeriodEnd,
                      language
                    ),
                  })}
                </p>
              ) : null}

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
                        <span dir="ltr" data-ltr-content>
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
                  {/* B2 — display only: the checkout the server creates
                      decides the price from the membership, never this. */}
                  {foundingLock &&
                  effectiveBillingCycle === 'yearly' &&
                  targetPlan?.id === foundingLock.planId &&
                  foundingLock.nextRenewal?.locked ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="checkout-founding-preview"
                    >
                      {t('payments:checkout.foundingPreview', {
                        price: formatCurrency(
                          foundingLock.nextRenewal.amount,
                          i18n.language as LanguageCode,
                          foundingLock.nextRenewal.currency
                        ),
                        date: formatDate(
                          foundingLock.lockEndsAt,
                          i18n.language as LanguageCode
                        ),
                      })}
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

              {addOnBlock ? (
                /* B5 (UX audit) — no checkout that can only be refused. */
                <Alert data-testid={`checkout-add-on-${addOnBlock}`}>
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertTitle>
                    {t(`payments:checkout.addOnBlocked.${addOnBlock}.title`)}
                  </AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      {t(
                        `payments:checkout.addOnBlocked.${addOnBlock}.description`
                      )}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link to={DASHBOARD_ROUTES.tenantAddOns}>
                        {t('payments:checkout.addOnBlocked.backToAddOns')}
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : createCheckout.error ? (
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
                  <span
                    ref={summaryHeadingRef}
                    tabIndex={-1}
                    className="outline-none"
                    data-testid="checkout-summary-heading"
                  >
                    {t('payments:checkout.summaryTitle')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p
                  className="font-display text-lg font-semibold text-foreground"
                  dir="auto"
                >
                  {targetName ?? checkout.snapshot.displayName}
                </p>
                <p
                  className="text-2xl font-semibold text-foreground"
                  data-atlas-numeric="true"
                >
                  <span dir="ltr" data-ltr-content>
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
                {checkout.snapshot.founding ? (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="checkout-founding-price"
                  >
                    {t('payments:checkout.foundingPrice', {
                      date: formatDate(
                        checkout.snapshot.founding.lockEndsAt,
                        i18n.language as LanguageCode
                      ),
                    })}
                  </p>
                ) : null}
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
                newPlanName={targetName ?? checkout.snapshot.displayName}
                mode={checkoutMode ?? 'change'}
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
                    onValueChange={(value) => {
                      setSelectedMethodKey(value);
                      setMethodMissing(false);
                    }}
                    className="gap-3"
                    aria-label={t('payments:checkout.paymentMethodTitle')}
                    aria-invalid={methodMissing || undefined}
                    aria-describedby={
                      methodMissing ? 'checkout-method-missing' : undefined
                    }
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
                              <span
                                className="font-medium text-foreground"
                                dir="auto"
                              >
                                {localizedPaymentMethodText(
                                  t,
                                  i18n,
                                  method.key,
                                  'name',
                                  method.displayName
                                )}
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
                              <span
                                className="block text-sm text-muted-foreground"
                                dir="auto"
                              >
                                {localizedPaymentMethodText(
                                  t,
                                  i18n,
                                  method.key,
                                  'description',
                                  method.description
                                )}
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

                {methodMissing && !selectedMethodKey ? (
                  <p
                    id="checkout-method-missing"
                    role="alert"
                    className="text-sm text-destructive"
                    data-testid="checkout-method-missing"
                  >
                    {t('payments:checkout.chooseMethodFirst')}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={
                    createPayment.isPending || enabledMethods.length === 0
                  }
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
