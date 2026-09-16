/**
 * Analysis › Revenue (P59).
 *
 * ONE PAGE PER AREA, not a tab inside one page. These four were
 * `<TabsContent>` blocks behind `<Tabs defaultValue="overview">` with no URL
 * state, which cost two real things: a refresh or a shared link always
 * landed back on Overview, and EVERY query ran on mount regardless of which
 * tab was showing — five requests to read one chart.
 *
 * Splitting into routes fixes both with NO backend change: the analytics API
 * already exposes `overview`, `time-series/:metric` and
 * `breakdown/:dimension` separately, so each page asks for exactly its own
 * data. The shared header, date-range control and tab strip live in
 * `AnalyticsLayout`; this file is only the panel.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@components/feedback';
import { AnalyticsLineChart } from '../components/AnalyticsLineChart';
import {
  useAnalyticsBreakdown,
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
} from '../hooks';
import { useAnalyticsRange } from './useAnalyticsRange';
import { formatCurrency } from '@utils';
import type { LanguageCode } from '@types';

export default function AnalyticsRevenuePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { query } = useAnalyticsRange();

  // The breakdown endpoint returns amounts but not which currency they are
  // in; `overview` is what carries `revenueCurrency`. Same query key as the
  // Overview page's, so moving between the two tabs reuses the cached
  // response instead of issuing a second request.
  const overviewQuery = useAnalyticsOverview(query);
  const overview = overviewQuery.data;
  const revenueSeriesQuery = useAnalyticsTimeSeries('revenue', query);
  const revenueByPlanQuery = useAnalyticsBreakdown('plan', query);

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics:tabs.revenue')}</CardTitle>
      </CardHeader>
      <CardContent>
        {revenueSeriesQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : revenueSeriesQuery.error ? (
          <ErrorState onRetry={() => revenueSeriesQuery.refetch()} />
        ) : (
          <AnalyticsLineChart
            points={revenueSeriesQuery.data?.points ?? []}
            metricLabelKey="analytics:metrics.revenue"
            language={language}
          />
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{t('analytics:charts.revenueByPlan')}</CardTitle>
      </CardHeader>
      <CardContent>
        {revenueByPlanQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : revenueByPlanQuery.error ? (
          <ErrorState onRetry={() => revenueByPlanQuery.refetch()} />
        ) : !revenueByPlanQuery.data ||
          revenueByPlanQuery.data.items.length === 0 ? (
          <EmptyState titleKey="analytics:charts.empty" />
        ) : (
          <ul className="divide-y divide-border">
            {revenueByPlanQuery.data.items.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-foreground">{item.label}</span>
                <span
                  className="text-muted-foreground"
                  data-atlas-numeric="true"
                >
                  {formatCurrency(
                    item.value,
                    language,
                    overview?.revenueCurrency ?? 'USD'
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
