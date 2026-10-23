/**
 * B2 — the Founding Academies seat meter: seats taken of 20, and academies
 * started this week of the 5-a-week pace. Each bar is a `meter` with its
 * own accessible name and value text; widths use logical sizing, so the
 * bar fills from the start edge in both directions (RTL included).
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@hooks';
import { cn, formatNumber } from '@utils';
import type { FoundingSeatSummary } from '../services/PlatformFoundingService';
import { FOUNDING_K } from '../utils/founding.utils';

function Meter({
  id,
  label,
  value,
  max,
  valueText,
  hint,
  warn,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly valueText: string;
  readonly hint: string;
  readonly warn?: boolean;
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p
            id={`${id}-label`}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </p>
          <p
            className="text-2xl font-semibold tabular-nums text-foreground"
            data-atlas-numeric="true"
          >
            {valueText}
          </p>
        </div>
        <div
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueText}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[inline-size] motion-reduce:transition-none',
              warn ? 'bg-warning' : 'bg-primary'
            )}
            style={{ inlineSize: `${ratio * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function FoundingSeatMeter({
  summary,
  isLoading,
}: {
  readonly summary?: FoundingSeatSummary;
  readonly isLoading?: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
      </div>
    );
  }
  const n = (value: number) => formatNumber(value, language);
  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      data-testid="founding-seat-meter"
    >
      <Meter
        id="founding-seats"
        label={t(`${FOUNDING_K}.meter.seats`)}
        value={summary.seatsTaken}
        max={summary.seatCap}
        valueText={t(`${FOUNDING_K}.meter.ofTotal`, {
          value: n(summary.seatsTaken),
          total: n(summary.seatCap),
        })}
        hint={
          summary.seatsAvailable > 0
            ? t(`${FOUNDING_K}.meter.seatsLeft`, {
                count: summary.seatsAvailable,
                formatted: n(summary.seatsAvailable),
              })
            : t(`${FOUNDING_K}.meter.seatsFull`)
        }
        warn={summary.seatsAvailable === 0}
      />
      <Meter
        id="founding-week"
        label={t(`${FOUNDING_K}.meter.thisWeek`)}
        value={summary.onboardedThisWeek}
        max={summary.weeklyTarget}
        valueText={t(`${FOUNDING_K}.meter.ofTotal`, {
          value: n(summary.onboardedThisWeek),
          total: n(summary.weeklyTarget),
        })}
        hint={
          summary.onboardedThisWeek >= summary.weeklyTarget
            ? t(`${FOUNDING_K}.meter.weekFull`)
            : t(`${FOUNDING_K}.meter.weekHint`)
        }
        warn={summary.onboardedThisWeek >= summary.weeklyTarget}
      />
    </div>
  );
}
