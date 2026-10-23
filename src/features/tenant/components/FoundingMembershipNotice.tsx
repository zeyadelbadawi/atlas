/**
 * B2 — "Founding Academy — price locked until {date}" on the owner's plan
 * page, with what the next yearly renewal will cost. Everything comes from
 * the server (`subscription.founding`): the lock dates and the renewal
 * amount decided by the same rule checkout applies. Once the lock is over
 * the card says the renewal is at the current catalog price.
 */
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDateFormatter } from '@hooks';
import { formatCurrency } from '@utils';
import type { LanguageCode, TenantSubscription } from '@types';

export function FoundingMembershipNotice({
  subscription,
}: {
  readonly subscription: TenantSubscription;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const founding = subscription.founding;
  if (!founding) return null;
  const language = (
    i18n.language?.startsWith('ar') ? 'ar' : 'en'
  ) as LanguageCode;
  const money = (value: { amount: number; currency: string }) =>
    formatCurrency(value.amount, language, value.currency);
  const lockOver = founding.status === 'ended';
  return (
    <Alert data-testid="subscription-founding">
      <Award className="size-4" aria-hidden />
      <AlertTitle>
        {lockOver
          ? t('tenant:subscription.founding.titleEnded')
          : t('tenant:subscription.founding.title', {
              date: fmt.date(founding.lockEndsAt),
            })}
      </AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          {t('tenant:subscription.founding.lockedPrice', {
            price: money(founding.lockedPrice),
          })}
        </p>
        {founding.nextRenewal ? (
          <p data-testid="subscription-founding-renewal">
            {t(
              founding.nextRenewal.locked
                ? 'tenant:subscription.founding.renewalLocked'
                : 'tenant:subscription.founding.renewalCatalog',
              {
                price: money(founding.nextRenewal),
                date: fmt.date(founding.nextRenewal.periodStartsAt),
              }
            )}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
