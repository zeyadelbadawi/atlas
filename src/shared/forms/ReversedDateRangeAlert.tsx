/**
 * B4 (UX audit) — the message a date-range filter shows when "From" is
 * after "To": the list would otherwise just read "No results" with no
 * reason. First used on the website Messages filters (B2 V22).
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';

/** True when both dates are set and `from` is after `to` (ISO dates). */
export function isDateRangeReversed(
  from: string | undefined | null,
  to: string | undefined | null
): boolean {
  return Boolean(from && to && from > to);
}

export interface ReversedDateRangeAlertProps {
  /** Point the date inputs' `aria-describedby` at it. */
  readonly id: string;
  /** Swaps the two dates (called with the new from, the new to). */
  readonly onSwap: () => void;
  readonly className?: string;
}

export function ReversedDateRangeAlert({
  id,
  onSwap,
  className,
}: ReversedDateRangeAlertProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      id={id}
      className={cn(
        'flex flex-wrap items-center gap-2 text-sm text-destructive',
        className
      )}
    >
      <span>{t('validation:dateRangeReversed')}</span>
      <Button type="button" variant="outline" size="sm" onClick={onSwap}>
        {t('common:actions.swapDates')}
      </Button>
    </div>
  );
}
