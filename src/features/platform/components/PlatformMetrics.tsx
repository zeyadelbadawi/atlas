/**
 * Platform Metrics Component.
 *
 * Displays the system-health/storage/uptime portion of the Platform
 * Command Center snapshot — passed in from `PlatformDashboardPage`'s own
 * `usePlatformMetrics()` call rather than fetched again here, and rather
 * than a hardcoded array (Prompt 3A legacy scaffold).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { Progress } from '@/components/ui/progress';
import type { PlatformMetricsOverview } from '@types';

export interface PlatformMetricsProps {
  readonly metrics: PlatformMetricsOverview;
}

export function PlatformMetrics({
  metrics,
}: PlatformMetricsProps): JSX.Element {
  const { t } = useTranslation();

  // B8 (UX audit) V33 — "System health" and "API uptime" have no
  // monitoring behind them yet: the API returns a fixed 100 for both
  // (`NO_MONITORING_BASELINE_PERCENT`). Showing "100%" beside a component
  // the Observability page calls "Status unknown" read as a contradiction,
  // so they say "Not measured" and point to the live status instead.
  const unmeasured = [
    t('platform:metrics.systemHealth'),
    t('platform:metrics.apiUptime'),
  ];
  const rows = [
    {
      label: t('platform:metrics.storageUsage'),
      value: metrics.storageUsagePercent,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('platform:sections.metrics')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground" data-atlas-numeric="true">
                {row.value}%
              </span>
            </div>
            <Progress value={row.value} className="h-2" />
          </div>
        ))}
        {unmeasured.map((label) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground">
              {t('platform:metrics.notMeasured')}
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {t('platform:metrics.notMeasuredHint')}{' '}
          <Link
            to={DASHBOARD_ROUTES.platformObservabilityHealth}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('platform:metrics.liveStatusLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
