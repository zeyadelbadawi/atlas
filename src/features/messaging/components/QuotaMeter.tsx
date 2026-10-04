/**
 * W3-compose — "23 of 50 emails used this month, resets 1 Nov."
 *
 * The numbers are the server's (`tenant_email_usage_periods`), never a
 * client-side count. The bar is a real `progressbar` with its value text,
 * and it fills from the inline start, so it reads correctly in RTL.
 */
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { useDateFormatter } from '@hooks';
import { formatNumber } from '@utils';
import { cn } from '@/lib/utils';
import type { LanguageCode } from '@types';
import type { CampaignQuota } from '../messaging.types';

export interface QuotaMeterProps {
  readonly quota: CampaignQuota;
  /** Emails the current draft would use — shown as a pending segment. */
  readonly pending?: number;
  readonly className?: string;
}

export function QuotaMeter({
  quota,
  pending = 0,
  className,
}: QuotaMeterProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { date } = useDateFormatter();
  const language = i18n.language as LanguageCode;
  // `resetsAt` is the first instant of next month (UTC); show that day.
  const resets = date(quota.resetsAt, 'short');

  if (quota.limit === null) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm', className)}
        data-testid="quota-meter"
      >
        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>
          {t('messaging:quota.unlimited', {
            used: formatNumber(quota.used, language),
          })}
        </span>
      </div>
    );
  }

  const limit = quota.limit;
  const usedPct = limit === 0 ? 100 : Math.min(100, (quota.used / limit) * 100);
  const pendingPct =
    limit === 0
      ? 0
      : Math.min(100 - usedPct, (Math.max(0, pending) / limit) * 100);
  const exhausted = quota.remaining === 0;
  const label = t('messaging:quota.usage', {
    used: formatNumber(quota.used, language),
    limit: formatNumber(limit, language),
    date: resets,
  });

  return (
    <div className={cn('space-y-2', className)} data-testid="quota-meter">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            'text-xs',
            exhausted ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {t('messaging:quota.remaining', {
            count: quota.remaining ?? 0,
            formatted: formatNumber(quota.remaining ?? 0, language),
          })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t('messaging:quota.ariaLabel')}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={quota.used}
        aria-valuetext={label}
        className="flex h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={cn('h-full', exhausted ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${usedPct}%` }}
        />
        {pendingPct > 0 ? (
          <div
            className="h-full bg-primary/40"
            style={{ width: `${pendingPct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
