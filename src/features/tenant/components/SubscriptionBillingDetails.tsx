/**
 * B5 (UX audit) — what the subscription really says about money and
 * dates, on the Subscription page.
 *
 * Before, an owner saw the plan and "active" — no price, no cycle, no
 * date — and learned a payment was due only once the period had lapsed.
 * Payments are MANUAL (bank transfer, wallet, InstaPay): nothing is ever
 * charged automatically, so the next payment date is the one fact that
 * decides what the owner does next.
 *
 * Every value is read from the subscription, never computed:
 *   - price: the plan's catalog price for the subscription's cycle
 *     (skipped for a Founding Academy or a pending price change — their
 *     own notices state the price that applies);
 *   - `currentPeriodEnd`: paid until / next payment due. Paying early
 *     adds the next period after this date (backend
 *     `PaymentApplicationService`: "paying early must never forfeit days
 *     already paid for");
 *   - past it, the backend moves the plan into a grace period and then
 *     expires it (`resolveEffectiveSubscriptionStatus`);
 *   - a trial: its end date, that nothing is charged, and that nothing is
 *     deleted when it ends.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { formatCurrency, formatDate } from '@utils';
import type { LanguageCode, TenantSubscription } from '@types';
import { planCyclePrice } from '../utils/plan-text.utils';

export interface SubscriptionBillingDetailsProps {
  readonly subscription: TenantSubscription;
}

function Row({
  label,
  value,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}): JSX.Element {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

export function SubscriptionBillingDetails({
  subscription,
}: SubscriptionBillingDetailsProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const date = (value: string) => formatDate(value, language, 'short');

  const renewPath = buildPath(DASHBOARD_ROUTES.tenantBillingCheckout, {
    targetType: 'plan_subscription',
    targetKey: subscription.plan.key,
  });

  if (subscription.status === 'trialing') {
    if (!subscription.trialEndsAt) return null;
    return (
      <div
        className="space-y-1 rounded-md border border-border p-3"
        data-testid="subscription-trial-details"
      >
        <p className="font-medium text-foreground">
          {t('tenant:subscription.billing.trialEndsOn', {
            date: date(subscription.trialEndsAt),
          })}
        </p>
        <p className="text-muted-foreground">
          {t('tenant:subscription.billing.trialWhatHappens')}
        </p>
      </div>
    );
  }

  const live =
    subscription.status === 'active' || subscription.status === 'grace_period';
  if (!live) return null;

  const cycle = subscription.billingCycle;
  const showPrice =
    cycle !== undefined &&
    subscription.founding?.status !== 'active' &&
    !subscription.priceChangeNotice;
  const price = cycle
    ? planCyclePrice(subscription.plan.pricing, cycle)
    : undefined;
  const currency = subscription.plan.pricing?.currency;
  const periodEnd = subscription.currentPeriodEnd;
  const inGrace = subscription.status === 'grace_period';

  return (
    <div
      className="space-y-3 rounded-md border border-border p-3"
      data-testid="subscription-billing-details"
    >
      <dl className="grid gap-3 sm:grid-cols-3">
        {showPrice && price !== undefined && currency ? (
          <Row
            label={t('tenant:subscription.billing.price')}
            value={`${formatCurrency(price, language, currency)} / ${t(
              `payments:common.billingCycleShort.${cycle}`
            )}`}
            testId="subscription-price"
          />
        ) : null}
        {cycle ? (
          <Row
            label={t('tenant:subscription.billing.cycle')}
            value={t(`payments:common.billingCycle.${cycle}`)}
            testId="subscription-cycle"
          />
        ) : null}
        {periodEnd ? (
          <Row
            label={
              subscription.cancelAtPeriodEnd
                ? t('tenant:subscription.billing.accessUntil')
                : t('tenant:subscription.billing.nextPaymentDue')
            }
            value={date(periodEnd)}
            testId="subscription-period-end"
          />
        ) : null}
      </dl>

      <p
        className="text-muted-foreground"
        data-testid="subscription-manual-note"
      >
        {inGrace
          ? subscription.graceEndsAt
            ? t('tenant:subscription.billing.graceNote', {
                date: date(subscription.graceEndsAt),
              })
            : t('tenant:subscription.billing.graceNoteNoDate')
          : subscription.cancelAtPeriodEnd
            ? periodEnd
              ? t('tenant:subscription.billing.cancelledNote', {
                  date: date(periodEnd),
                })
              : t('tenant:subscription.cancelAtPeriodEnd')
            : periodEnd
              ? t('tenant:subscription.billing.manualNote', {
                  date: date(periodEnd),
                })
              : t('tenant:subscription.billing.manualNoteNoDate')}
      </p>

      <Button asChild size="sm" variant={inGrace ? 'default' : 'outline'}>
        <Link to={renewPath} data-testid="subscription-pay-next-period">
          {inGrace
            ? t('tenant:subscription.billing.payNow')
            : t('tenant:subscription.billing.payNextPeriod')}
        </Link>
      </Button>
    </div>
  );
}
