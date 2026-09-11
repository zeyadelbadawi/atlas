/**
 * What actually changes when this plan purchase completes.
 *
 * WHAT WAS MISSING. Checkout showed the plan being bought and its real
 * price, and nothing about what the customer is moving FROM. Someone on a
 * trial with eleven days left, or on Starter mid-month, had no way to see
 * what happens to that — which is the single question anyone asks before
 * pressing a billing button.
 *
 * EVERY VALUE HERE IS READ, NEVER COMPUTED. The current plan, status,
 * billing cycle and trial end come from the authoritative subscription; the
 * new plan's price comes from the Checkout snapshot the backend froze. This
 * component derives no money at all.
 *
 * WHAT IT DELIBERATELY DOES NOT SAY, and why:
 *
 *   - NO PRORATION, CREDIT OR REFUND. Atlas's only registered payment
 *     provider is manual bank transfer (`atlas_manual`). There is no
 *     gateway to compute a proration, so any figure shown here would be
 *     invented — and an invented credit is a promise the billing system
 *     cannot keep.
 *   - NO "EFFECTIVE IMMEDIATELY". With a manual transfer the plan changes
 *     when the payment is CONFIRMED, which is a human step that happens
 *     later. Saying "immediately" would be false at the moment it is most
 *     load-bearing.
 *   - NO NEXT BILLING DATE. The period starts when the payment is applied,
 *     so the date does not exist yet. It appears on the subscription page
 *     once it is real.
 *
 * These are honest limitations of the current provider, not gaps in the UI.
 * When a gateway that supports proration is integrated, its real numbers
 * belong here — nothing invented in the meantime.
 */
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@components/data-display';
import { formatDate } from '@utils';
import type { LanguageCode, TenantSubscription } from '@types';

export interface PlanChangeSummaryProps {
  /** Absent for an Organization buying its first plan — then there is nothing to compare against. */
  readonly subscription?: TenantSubscription;
  readonly newPlanName: string;
}

export function PlanChangeSummary({
  subscription,
  newPlanName,
}: PlanChangeSummaryProps): JSX.Element | null {
  const { t, i18n } = useTranslation();

  // A first purchase has no "from" side. Rendering a comparison against
  // nothing would be noise.
  if (!subscription) return null;

  const isTrial = subscription.status === 'trialing';

  return (
    <Card data-testid="plan-change-summary">
      <CardHeader>
        <CardTitle className="text-base">
          {t('payments:planChange.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('payments:planChange.currentPlan')}
            </p>
            <p className="font-medium text-foreground">
              {subscription.plan.name}
            </p>
          </div>

          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
            aria-hidden
          />

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('payments:planChange.newPlan')}
            </p>
            <p className="font-medium text-foreground">{newPlanName}</p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">
              {t('payments:planChange.currentStatus')}
            </dt>
            <dd>
              <StatusBadge
                labelKey={`tenant:common.subscriptionStatus.${subscription.status}`}
                tone={subscription.status === 'active' ? 'success' : 'info'}
              />
            </dd>
          </div>

          {/* Only while a trial is genuinely running. */}
          {isTrial && subscription.trialEndsAt ? (
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('payments:planChange.trialEnds')}
              </dt>
              <dd className="text-sm text-foreground">
                {formatDate(
                  subscription.trialEndsAt,
                  i18n.language as LanguageCode
                )}
              </dd>
            </div>
          ) : null}

          {subscription.billingCycle ? (
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">
                {t('payments:planChange.currentBillingCycle')}
              </dt>
              <dd className="text-sm text-foreground">
                {t(`payments:common.billingCycle.${subscription.billingCycle}`)}
              </dd>
            </div>
          ) : null}

          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">
              {t('payments:planChange.effective')}
            </dt>
            {/*
              "When your payment is confirmed" — not "immediately". With a
              manual transfer that confirmation is a later, human step, and
              claiming otherwise would be false exactly where it matters.
            */}
            <dd className="text-sm text-foreground">
              {t('payments:planChange.effectiveOnConfirmation')}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-muted-foreground">
          {isTrial
            ? t('payments:planChange.trialConversionNote')
            : t('payments:planChange.replacementNote')}
        </p>
      </CardContent>
    </Card>
  );
}
