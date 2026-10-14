/**
 * UsageSummary (Phase 8) — plan usage against real effective
 * entitlements.
 *
 * Reuses the existing `TenantUsage` contract verbatim (the backend
 * computes each metric's `limit` from the organization's real effective
 * entitlements at read time — `EntitlementService.computeEffectiveEntitlements`,
 * the one place that calculation lives). Nothing here recomputes a limit
 * or infers one from a plan name.
 *
 * `'unlimited'` is a real `LimitValue`, not a missing number — it renders
 * as its own label with no progress bar, because a share-of-limit is
 * meaningless without a limit.
 *
 * B0-BIL-13 — limits are hard on create, so a limit at 80 % or more is
 * called out above the list with a link to compare plans (the owner also
 * gets a notification for it).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { TenantUsage, UsageMetric } from '@types';

export interface UsageSummaryProps {
  readonly usage: TenantUsage;
}

/** The metrics this widget shows, in display order — a deliberate subset of the full contract, not everything it happens to carry. */
const METRICS: readonly (keyof Pick<
  TenantUsage,
  'academies' | 'courses' | 'students' | 'instructors'
>)[] = ['academies', 'courses', 'students', 'instructors'];

/** B0-BIL-13 — the limits worth a warning (the backend notifies on the same set). */
const WARNED_METRICS: readonly (keyof Pick<
  TenantUsage,
  'students' | 'courses' | 'academies' | 'generalStorage'
>)[] = ['students', 'courses', 'academies', 'generalStorage'];

export const LIMIT_WARNING_PERCENT = 80;

function percentUsed(metric: UsageMetric): number | null {
  if (metric.limit === 'unlimited' || metric.limit <= 0) return null;
  return Math.min(100, Math.round((metric.used / metric.limit) * 100));
}

export function UsageSummary({ usage }: UsageSummaryProps): JSX.Element {
  const { t } = useTranslation();
  const nearLimit = WARNED_METRICS.flatMap((key) => {
    const metric = usage[key];
    const percent = metric ? percentUsed(metric) : null;
    return percent !== null && percent >= LIMIT_WARNING_PERCENT
      ? [{ key, percent }]
      : [];
  });

  return (
    <div className="flex flex-col gap-4">
      {nearLimit.length > 0 ? (
        <Alert data-testid="usage-limit-warning">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {t('dashboard:usage.limitWarning', {
                limits: nearLimit
                  .map(({ key, percent }) =>
                    t('dashboard:usage.limitWarningItem', {
                      name: t(`dashboard:usage.metrics.${key}`),
                      percent,
                    })
                  )
                  .join(t('dashboard:usage.limitWarningSeparator')),
              })}
            </span>
            <Button asChild size="sm" variant="outline" className="self-start">
              <Link to={DASHBOARD_ROUTES.plans}>
                {t('dashboard:usage.comparePlans')}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-4">
        {METRICS.map((key) => {
          const metric = usage[key];
          const percent = percentUsed(metric);

          return (
            <li key={key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">
                  {t(`dashboard:usage.metrics.${key}`)}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {metric.limit === 'unlimited'
                    ? t('dashboard:usage.unlimitedValue', { used: metric.used })
                    : t('dashboard:usage.value', {
                        used: metric.used,
                        limit: metric.limit,
                      })}
                </span>
              </div>
              {percent === null ? null : (
                <Progress
                  value={percent}
                  aria-label={t(`dashboard:usage.metrics.${key}`)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
