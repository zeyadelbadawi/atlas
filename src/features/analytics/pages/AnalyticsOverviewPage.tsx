/**
 * Analysis › Overview (P59).
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
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { MetricCard } from '@components/data-display';
import { formatCurrency, formatNumber, formatPercentage } from '@utils';
import { AnalyticsLineChart } from '../components/AnalyticsLineChart';
import { useAnalyticsOverview, useAnalyticsTimeSeries } from '../hooks';
import { useAnalyticsRange } from './useAnalyticsRange';
import { trendFor } from './analytics-trend.utils';
import type { LanguageCode } from '@types';

export default function AnalyticsOverviewPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { query } = useAnalyticsRange();

  const overviewQuery = useAnalyticsOverview(query);
  const usersSeriesQuery = useAnalyticsTimeSeries('users', query);

  const overview = overviewQuery.data;
  const usersTrend = overview ? trendFor(overview.totalUsers.changePercent) : undefined;
  const activeUsersTrend = overview
    ? trendFor(overview.activeUsers.changePercent)
    : undefined;
  const engagementTrend = overview
    ? trendFor(overview.engagementRateChangePercent)
    : undefined;
  const revenueTrend = overview ? trendFor(overview.revenue.changePercent) : undefined;

  return (
    <div className="space-y-4">
    {overviewQuery.error ? (
      <ErrorState onRetry={() => overviewQuery.refetch()} />
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          labelKey="analytics:metrics.totalUsers"
          icon={Users}
          isLoading={overviewQuery.isLoading}
          value={
            overview
              ? formatNumber(overview.totalUsers.value, language)
              : ''
          }
          trend={
            usersTrend
              ? {
                  direction: usersTrend.direction,
                  value: formatPercentage(
                    usersTrend.magnitude / 100,
                    language,
                    0
                  ),
                  periodKey: 'analytics:dateRange.selected',
                }
              : undefined
          }
        />
        <MetricCard
          labelKey="analytics:metrics.activeUsers"
          icon={Activity}
          isLoading={overviewQuery.isLoading}
          value={
            overview
              ? formatNumber(overview.activeUsers.value, language)
              : ''
          }
          trend={
            activeUsersTrend
              ? {
                  direction: activeUsersTrend.direction,
                  value: formatPercentage(
                    activeUsersTrend.magnitude / 100,
                    language,
                    0
                  ),
                  periodKey: 'analytics:dateRange.selected',
                }
              : undefined
          }
        />
        <MetricCard
          labelKey="analytics:metrics.engagement"
          icon={TrendingUp}
          isLoading={overviewQuery.isLoading}
          value={
            overview
              ? formatPercentage(
                  overview.engagementRatePercent / 100,
                  language,
                  0
                )
              : ''
          }
          trend={
            engagementTrend
              ? {
                  direction: engagementTrend.direction,
                  value: formatPercentage(
                    engagementTrend.magnitude / 100,
                    language,
                    0
                  ),
                  periodKey: 'analytics:dateRange.selected',
                }
              : undefined
          }
        />
        <MetricCard
          labelKey="analytics:metrics.revenue"
          icon={BarChart3}
          isLoading={overviewQuery.isLoading}
          value={
            overview
              ? formatCurrency(
                  overview.revenue.value,
                  language,
                  overview.revenueCurrency
                )
              : ''
          }
          trend={
            revenueTrend
              ? {
                  direction: revenueTrend.direction,
                  value: formatPercentage(
                    revenueTrend.magnitude / 100,
                    language,
                    0
                  ),
                  periodKey: 'analytics:dateRange.selected',
                }
              : undefined
          }
        />
      </div>
    )}

    <Card>
      <CardHeader>
        <CardTitle>{t('analytics:charts.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {usersSeriesQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : usersSeriesQuery.error ? (
          <ErrorState onRetry={() => usersSeriesQuery.refetch()} />
        ) : (
          <AnalyticsLineChart
            points={usersSeriesQuery.data?.points ?? []}
            metricLabelKey="analytics:metrics.totalUsers"
            language={language}
          />
        )}
      </CardContent>
    </Card>
    </div>
  );
}
