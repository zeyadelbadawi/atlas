/**
 * W8 — gifted setup days on a subscription ("Includes N gifted setup days").
 *
 * Rendered only when the backend recorded a gift on this subscription. The
 * paid period starts when the gift ends, so during the gift the paid period
 * is shown as upcoming ("starts on"), never as already running. Pure
 * display: the gift was decided server-side at payment approval.
 */
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import { useDateFormatter } from '@hooks';
import type { TenantSubscription } from '@types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionGiftDetailsProps {
  readonly subscription: Pick<
    TenantSubscription,
    | 'giftedDays'
    | 'giftedStartsAt'
    | 'giftedEndsAt'
    | 'currentPeriodStart'
    | 'currentPeriodEnd'
  >;
  /** Injectable for tests; defaults to the current time. */
  readonly now?: Date;
}

export function SubscriptionGiftDetails({
  subscription,
  now = new Date(),
}: SubscriptionGiftDetailsProps): JSX.Element | null {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { giftedDays, giftedStartsAt, giftedEndsAt } = subscription;
  if (!giftedDays || !giftedStartsAt || !giftedEndsAt) return null;

  const msLeft = new Date(giftedEndsAt).getTime() - now.getTime();
  const running = msLeft > 0;
  const daysLeft = Math.ceil(msLeft / DAY_MS);

  return (
    <section
      className="rounded-md border border-border bg-muted/40 p-3 text-sm"
      aria-labelledby="subscription-gift-title"
      data-testid="subscription-gift"
    >
      <div className="flex items-start gap-2">
        <Gift
          className="mt-0.5 size-4 shrink-0 text-primary"
          strokeWidth={2}
          aria-hidden
        />
        <div className="min-w-0 space-y-2">
          <p
            id="subscription-gift-title"
            className="font-medium text-foreground"
          >
            {t('tenant:gift.includes', { count: giftedDays })}
            {running ? (
              <span className="ms-2 font-normal text-muted-foreground">
                {t('tenant:gift.daysLeft', { count: daysLeft })}
              </span>
            ) : null}
          </p>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">
              {t('tenant:gift.segmentLabel')}
            </dt>
            <dd className="text-foreground" data-atlas-numeric="true">
              {t('tenant:gift.range', {
                start: fmt.date(giftedStartsAt),
                end: fmt.date(giftedEndsAt),
              })}
            </dd>
            {subscription.currentPeriodStart &&
            subscription.currentPeriodEnd ? (
              <>
                <dt className="text-muted-foreground">
                  {t('tenant:gift.paidPeriodLabel')}
                </dt>
                <dd className="text-foreground" data-atlas-numeric="true">
                  {t('tenant:gift.range', {
                    start: fmt.date(subscription.currentPeriodStart),
                    end: fmt.date(subscription.currentPeriodEnd),
                  })}
                </dd>
              </>
            ) : null}
          </dl>
          {running && subscription.currentPeriodStart ? (
            <p className="text-muted-foreground">
              {t('tenant:gift.paidPeriodStarts', {
                date: fmt.date(subscription.currentPeriodStart),
              })}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t('tenant:gift.firstSubscriptionNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
