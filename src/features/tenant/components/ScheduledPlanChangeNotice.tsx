/**
 * B0-BIL-04 — tells the owner that a smaller plan they bought takes over at
 * the end of the period they have already paid for, and that nothing
 * changes before then. Renders nothing when no change is scheduled.
 */
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import { useDateFormatter } from '@hooks';
import type { TenantSubscription } from '@types';

interface ScheduledPlanChangeNoticeProps {
  readonly subscription: TenantSubscription;
}

export function ScheduledPlanChangeNotice({
  subscription,
}: ScheduledPlanChangeNoticeProps): JSX.Element | null {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const change = subscription.scheduledChange;
  if (!change) return null;

  return (
    <p
      className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm"
      data-testid="subscription-scheduled-change"
    >
      <CalendarClock
        className="mt-0.5 size-4 shrink-0 text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <span>
        {t('tenant:subscription.scheduledChange', {
          plan: change.planName,
          date: fmt.date(change.effectiveAt),
        })}
      </span>
    </p>
  );
}
