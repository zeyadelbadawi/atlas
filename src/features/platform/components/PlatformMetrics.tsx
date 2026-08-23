/**
 * Platform Metrics Component.
 *
 * Displays the system-health/storage/uptime portion of the Platform
 * Command Center snapshot — passed in from `PlatformDashboardPage`'s own
 * `usePlatformMetrics()` call rather than fetched again here, and rather
 * than a hardcoded array (Prompt 3A legacy scaffold).
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PlatformMetricsOverview } from '@types';

export interface PlatformMetricsProps {
  readonly metrics: PlatformMetricsOverview;
}

export function PlatformMetrics({ metrics }: PlatformMetricsProps): JSX.Element {
  const { t } = useTranslation();

  const rows = [
    { label: t('platform:metrics.systemHealth'), value: metrics.systemHealthPercent },
    { label: t('platform:metrics.storageUsage'), value: metrics.storageUsagePercent },
    { label: t('platform:metrics.apiUptime'), value: metrics.apiUptimePercent },
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
      </CardContent>
    </Card>
  );
}
