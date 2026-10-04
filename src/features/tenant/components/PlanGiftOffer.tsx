/**
 * W8 — "Your first paid subscription includes N gifted setup days" on plan
 * cards and the checkout summary. Shown only while the backend says the
 * gift is still available to this customer (`lifecycle.giftAvailable`) and
 * the plan offers one for the chosen cycle. Display only.
 */
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import type { Plan } from '@types';
import { planGiftedDaysFor } from '../utils/gifted-days.utils';

export interface PlanGiftOfferProps {
  readonly plan: Pick<Plan, 'giftedDaysMonthly' | 'giftedDaysYearly'>;
  readonly cycle: 'monthly' | 'yearly';
  readonly giftAvailable: boolean | undefined;
  readonly showNote?: boolean;
}

export function PlanGiftOffer({
  plan,
  cycle,
  giftAvailable,
  showNote = false,
}: PlanGiftOfferProps): JSX.Element | null {
  const { t } = useTranslation();
  const days = planGiftedDaysFor(plan, cycle);
  if (!giftAvailable || days === null) return null;
  return (
    <div
      className="flex items-start gap-2 text-sm"
      data-testid="plan-gift-offer"
    >
      <Gift
        className="mt-0.5 size-4 shrink-0 text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {t('tenant:gift.offer', { count: days })}
        </p>
        {showNote ? (
          <p className="text-xs text-muted-foreground">
            {t('tenant:gift.offerNote')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
