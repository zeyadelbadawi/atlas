/**
 * Metric card.
 *
 * Presents a single number with the context needed to interpret it. A metric
 * without a comparison is just a number, so the card supports an explicit trend
 * whose direction is stated in text as well as colour.
 */
import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@utils";

/** Direction of a metric's change. */
export type TrendDirection = "up" | "down" | "flat";

const TREND_PRESENTATION: Record<
  TrendDirection,
  { readonly icon: LucideIcon; readonly className: string }
> = {
  up: { icon: TrendingUp, className: "text-success" },
  down: { icon: TrendingDown, className: "text-destructive" },
  flat: { icon: Minus, className: "text-muted-foreground" },
};

export interface MetricCardProps {
  /** Translation key for the metric name. */
  readonly labelKey: string;
  /** Pre-formatted value. Formatting is the caller's responsibility. */
  readonly value: string;
  readonly icon?: LucideIcon;
  /** Change relative to the comparison period. */
  readonly trend?: {
    readonly direction: TrendDirection;
    /** Pre-formatted magnitude, e.g. "12%". */
    readonly value: string;
    /** Translation key naming the comparison period. */
    readonly periodKey?: string;
  };
  readonly isLoading?: boolean;
  readonly className?: string;
}

export function MetricCard({
  labelKey,
  value,
  icon: Icon,
  trend,
  isLoading = false,
  className,
}: MetricCardProps): JSX.Element {
  const { t } = useTranslation();
  const TrendIcon = trend ? TREND_PRESENTATION[trend.direction].icon : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t(labelKey)}
        </p>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5">
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p
            className="font-display text-3xl font-semibold leading-none text-foreground"
            data-atlas-numeric="true"
          >
            {value}
          </p>
        )}

        {trend && !isLoading ? (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              TREND_PRESENTATION[trend.direction].className,
            )}
          >
            {TrendIcon ? (
              <TrendIcon className="size-3.5" strokeWidth={2} aria-hidden />
            ) : null}
            <span data-atlas-numeric="true">{trend.value}</span>
            {trend.periodKey ? (
              <span className="font-normal text-muted-foreground">
                {t(trend.periodKey)}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
