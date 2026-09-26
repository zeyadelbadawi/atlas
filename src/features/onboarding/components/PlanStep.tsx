/**
 * Setup — Plan.
 *
 * Shown only while the subscription is not trialing/active. Four honest
 * states, each read from the server status, never inferred:
 *
 *   1. A payment is awaiting confirmation → say so, link to it, and wait
 *      (the shell polls while this is true).
 *   2. The latest payment failed / was cancelled / expired → say why
 *      (`failureReason` is a message KEY, translated; `reviewNotes` is the
 *      reviewer's own words, shown verbatim) and offer to pay again.
 *   3. A trial is still available → offer it, with a plan choice, through
 *      the existing `useStartTrial` (the backend re-checks eligibility).
 *   4. Otherwise → the existing paid path: the plan's checkout, with a
 *      `returnTo` so the checkout can offer "Back to setup".
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useToast } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { formatCurrency, toErrorsNamespaceKey } from '@utils';
import {
  resolvePlanName,
  usePlanCatalog,
  useStartTrial,
} from '@features/tenant';
import { TrialPlanPicker } from '@features/auth';
import type {
  LanguageCode,
  OnboardingSubscriptionPayment,
  PaymentLifecycleStatus,
  Plan,
  PlanPricingMetadata,
} from '@types';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepPanel } from './StepPanel';
import {
  buildPlanCheckoutPath,
  findStep,
} from '../utils/onboarding-status.utils';
import type { OnboardingStepProps } from './step.types';

/** The payment outcomes that call for a new submission. */
const FAILED_PAYMENT_STATUSES: readonly PaymentLifecycleStatus[] = [
  'failed',
  'cancelled',
  'expired',
];

/** Same "field present, never truthiness" rule `PlanComparisonDialog` uses. */
function hasUsablePricing(plan: Plan): boolean {
  return (
    plan.pricing?.amount !== undefined &&
    plan.pricing.amount !== null &&
    !!plan.pricing?.currency
  );
}

/**
 * "$49 / month" — whole amounts without decimals, the cycle in words.
 * Only called for plans that passed `hasUsablePricing`.
 */
function formatPlanPrice(
  pricing: PlanPricingMetadata,
  language: LanguageCode,
  t: (key: string, values?: Record<string, unknown>) => string
): string {
  const amount = pricing.amount as number;
  const price = formatCurrency(amount, language, pricing.currency as string, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
  switch (pricing.billingCycle) {
    case 'monthly':
      return t('onboarding:plan.priceMonthly', { price });
    case 'yearly':
      return t('onboarding:plan.priceYearly', { price });
    default:
      return price;
  }
}

function FailedPaymentNotice({
  payment,
}: {
  readonly payment: OnboardingSubscriptionPayment;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const reasonKey = payment.failureReason
    ? toErrorsNamespaceKey(payment.failureReason)
    : undefined;
  const reason =
    reasonKey && i18n.exists(reasonKey)
      ? t(reasonKey)
      : t('onboarding:plan.failedGeneric');

  return (
    <StepPanel
      icon={AlertTriangle}
      tone="destructive"
      title={t('onboarding:plan.failedTitle')}
      testId="plan-payment-failed"
      description={
        <div className="space-y-1.5">
          <p>{reason}</p>
          {payment.reviewNotes ? (
            // The reviewer's own words — business content, either language.
            <p
              className="rounded-md bg-muted px-3 py-2 text-foreground"
              dir="auto"
              data-testid="plan-payment-review-notes"
            >
              {payment.reviewNotes}
            </p>
          ) : null}
        </div>
      }
      actions={
        <Button asChild>
          <Link to={buildPlanCheckoutPath(payment.planKey)}>
            {t('onboarding:plan.resubmit')}
          </Link>
        </Button>
      }
    />
  );
}

export function PlanStep({
  status,
  eyebrow,
  onBack,
  onNext,
  refresh,
}: OnboardingStepProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { toast } = useToast();
  const planStep = findStep(status, 'plan');
  const payment = status.latestSubscriptionPayment;
  const isAwaiting = planStep?.status === 'awaiting_confirmation';
  const lastPaymentFailed =
    !!payment && FAILED_PAYMENT_STATUSES.includes(payment.status);

  const catalogQuery = usePlanCatalog();
  const startTrial = useStartTrial();
  const [trialPlanId, setTrialPlanId] = useState<string>();
  const [trialRefused, setTrialRefused] = useState(false);

  const activePlans = [...(catalogQuery.data ?? [])]
    .filter((plan) => plan.status === 'active')
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const trialPlans = activePlans.filter((plan) => plan.trialEligible);
  const paidPlans = activePlans.filter(hasUsablePricing);
  const offerTrial =
    status.subscription.trialAvailable && !trialRefused && !isAwaiting;

  const handleStartTrial = (): void => {
    if (!trialPlanId) return;
    startTrial.mutate(
      { planId: trialPlanId },
      {
        onSuccess: async (result) => {
          if (result.started) {
            toast({ title: t('onboarding:plan.trialStarted') });
            await refresh();
            onNext();
            return;
          }
          // A refusal is an ordinary answer (200, `started: false`), not an
          // error: fall through to the paid path, and re-read the status so
          // `trialAvailable` agrees with what just happened.
          setTrialRefused(true);
          void refresh();
        },
      }
    );
  };

  const renderChoice = (): JSX.Element => {
    if (catalogQuery.isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    if (catalogQuery.error) {
      return <ErrorState onRetry={() => void catalogQuery.refetch()} />;
    }

    if (offerTrial && trialPlans.length > 0) {
      return (
        <div className="space-y-6" data-testid="plan-trial-offer">
          <TrialPlanPicker
            plans={trialPlans}
            value={trialPlanId}
            onChange={setTrialPlanId}
            disabled={startTrial.isPending}
          />
          {startTrial.error ? (
            <p role="alert" className="text-sm text-destructive">
              {t('onboarding:plan.trialFailed')}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={handleStartTrial}
            disabled={!trialPlanId || startTrial.isPending}
            aria-busy={startTrial.isPending}
          >
            {startTrial.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('onboarding:plan.starting')}
              </>
            ) : (
              t('onboarding:plan.startTrial')
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4" data-testid="plan-paid-offer">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-foreground">
            {t('onboarding:plan.paidTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              trialRefused
                ? 'onboarding:plan.trialRefused'
                : 'onboarding:plan.paidDescription'
            )}
          </p>
        </div>
        {paidPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('onboarding:plan.noPlans')}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {paidPlans.map((plan) => {
              const name = resolvePlanName(plan, language);
              return (
                <li
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p
                      className="font-display text-sm font-semibold text-foreground"
                      dir="auto"
                    >
                      {name}
                    </p>
                    <p
                      className="text-sm text-muted-foreground"
                      data-atlas-numeric="true"
                    >
                      {formatPlanPrice(plan.pricing!, language, t)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={buildPlanCheckoutPath(plan.key)}
                      data-testid={`plan-checkout-${plan.key}`}
                    >
                      <CreditCard className="size-4" aria-hidden />
                      {t('onboarding:plan.choosePlan', { plan: name })}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <OnboardingStepFrame
      stepKey="plan"
      eyebrow={eyebrow}
      title={t('onboarding:steps.plan.title')}
      description={t('onboarding:steps.plan.description')}
      onBack={onBack}
    >
      <div className="space-y-6">
        {isAwaiting ? (
          <StepPanel
            icon={Clock}
            tone="warning"
            title={t('onboarding:plan.awaitingTitle')}
            description={t('onboarding:plan.awaitingDescription')}
            testId="plan-awaiting-confirmation"
            actions={
              <>
                {payment ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
                        paymentId: payment.id,
                      })}
                    >
                      {t('onboarding:plan.viewPayment')}
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link to={DASHBOARD_ROUTES.support}>
                    {t('onboarding:plan.contactSupport')}
                  </Link>
                </Button>
              </>
            }
          />
        ) : (
          <>
            {lastPaymentFailed && payment ? (
              <FailedPaymentNotice payment={payment} />
            ) : null}
            {renderChoice()}
          </>
        )}
      </div>
    </OnboardingStepFrame>
  );
}
