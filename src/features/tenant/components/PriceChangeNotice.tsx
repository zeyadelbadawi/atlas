/**
 * B0-BIL-07 — the in-product notice Terms §9 promises before a price or
 * plan-content change applies to an active subscription.
 *
 * Shows the renewal price before and after for this organization's own
 * billing cycle, each limit that changes, and when it applies (the end of
 * the current paid period). Renders nothing when there is no notice. The
 * owner can dismiss it; the API refuses anyone else, and the error toast
 * says so.
 */
import { useTranslation } from 'react-i18next';
import { BellRing } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDateFormatter } from '@hooks';
import { formatCurrency } from '@utils';
import type {
  LanguageCode,
  LimitValue,
  PlanLimitKey,
  PriceChangeNotice as PriceChangeNoticeData,
  PriceChangeNoticePrice,
  TenantSubscription,
} from '@types';
import { isCustomerVisibleLimitKey } from '@utils';
import { STORAGE_LIMIT_KEYS } from '../constants/tenant.constants';
import { formatLimitValue } from '../utils/entitlement.utils';
import { useDismissPriceChangeNotice } from '../hooks';

interface PriceChangeNoticeProps {
  readonly subscription: TenantSubscription;
}

export function PriceChangeNotice({
  subscription,
}: PriceChangeNoticeProps): JSX.Element | null {
  const notice = subscription.priceChangeNotice;
  // The card (and its dismiss mutation) mounts only when there is a notice.
  return notice ? <PriceChangeNoticeCard notice={notice} /> : null;
}

function PriceChangeNoticeCard({
  notice,
}: {
  readonly notice: PriceChangeNoticeData;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const dismiss = useDismissPriceChangeNotice();

  const language = i18n.language as LanguageCode;
  const price = (value: PriceChangeNoticePrice | null): string =>
    value ? formatCurrency(value.amount, language, value.currency) : '';
  const from = price(notice.fromPrice);
  const to = price(notice.toPrice);
  const unlimited = t('tenant:common.unlimited');
  const limit = (key: string, value: LimitValue | null): string =>
    value === null
      ? t('tenant:subscription.priceChange.notIncluded')
      : formatLimitValue(
          value,
          STORAGE_LIMIT_KEYS.includes(key as PlanLimitKey),
          unlimited
        );
  const limitChanges = Object.entries(notice.limitChanges).filter(([key]) =>
    isCustomerVisibleLimitKey(key as PlanLimitKey)
  );

  return (
    <Alert data-testid="subscription-price-change">
      <BellRing className="size-4" aria-hidden />
      <AlertTitle>
        {t('tenant:subscription.priceChange.title', { plan: notice.planName })}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          {notice.effectiveAt
            ? t('tenant:subscription.priceChange.when', {
                date: fmt.date(notice.effectiveAt),
              })
            : t('tenant:subscription.priceChange.whenNextRenewal')}
        </p>
        {from && to && from !== to ? (
          <p data-testid="subscription-price-change-price">
            {t('tenant:subscription.priceChange.price', { from, to })}
          </p>
        ) : null}
        {to && !from ? (
          <p data-testid="subscription-price-change-price">
            {t('tenant:subscription.priceChange.newPrice', { to })}
          </p>
        ) : null}
        {limitChanges.length > 0 ? (
          <div>
            <p>{t('tenant:subscription.priceChange.limitsTitle')}</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5">
              {limitChanges.map(([key, change]) => (
                <li
                  key={key}
                  data-testid={`subscription-price-change-limit-${key}`}
                >
                  {t('tenant:subscription.priceChange.limit', {
                    name: t(`tenant:common.limits.${key}`, {
                      defaultValue: key,
                    }),
                    from: limit(key, change.from),
                    to: limit(key, change.to),
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate()}
          >
            {t('tenant:subscription.priceChange.dismiss')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
