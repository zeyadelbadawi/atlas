/**
 * Analytics Page.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — every metric and
 * chart comes from `AnalyticsService` (overview/time-series/breakdown),
 * filtered by a shared date-range preset. Carries the exact same four
 * KPIs the scaffold already named (`totalUsers`, `activeUsers`,
 * `engagementRate`, `revenue`) — no additional KPI is invented.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { MetricCard } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatPercentage } from '@utils';
import { useAnalyticsOverview, useAnalyticsTimeSeries, useAnalyticsBreakdown } from '../hooks';
import { AnalyticsDateRangeSelect } from '../components/AnalyticsDateRangeSelect';
import { AnalyticsLineChart } from '../components/AnalyticsLineChart';
import { computeDateRange, type AnalyticsDateRangePreset } from '../utils/analytics-date-range.utils';
import type { LanguageCode } from '@types';
import type { TrendDirection } from '@components/data-display';

function trendFor(changePercent: number | undefined): { direction: TrendDirection; magnitude: number } | undefined {
  if (changePercent === undefined) return undefined;
  return {
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
    magnitude: changePercent,
  };
}

export default function AnalyticsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const [preset, setPreset] = useState<AnalyticsDateRangePreset>('30d');
  const dateRange = useMemo(() => computeDateRange(preset), [preset]);
  const query = useMemo(() => ({ dateRange }), [dateRange]);

  const overviewQuery = useAnalyticsOverview(query);
  const usersSeriesQuery = useAnalyticsTimeSeries('users', query);
  const engagementSeriesQuery = useAnalyticsTimeSeries('engagement', query);
  const revenueSeriesQuery = useAnalyticsTimeSeries('revenue', query);
  const revenueByPlanQuery = useAnalyticsBreakdown('plan', query);

  const overview = overviewQuery.data;
  const usersTrend = overview ? trendFor(overview.totalUsers.changePercent) : undefined;
  const activeUsersTrend = overview ? trendFor(overview.activeUsers.changePercent) : undefined;
  const engagementTrend = overview ? trendFor(overview.engagementRateChangePercent) : undefined;
  const revenueTrend = overview ? trendFor(overview.revenue.changePercent) : undefined;

  return (
    <PageContainer>
      <PageHeader titleKey="analytics:title" descriptionKey="analytics:subtitle" />

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="overview">{t('analytics:tabs.overview')}</TabsTrigger>
            <TabsTrigger value="users">{t('analytics:tabs.users')}</TabsTrigger>
            <TabsTrigger value="engagement">{t('analytics:tabs.engagement')}</TabsTrigger>
            <TabsTrigger value="revenue">{t('analytics:tabs.revenue')}</TabsTrigger>
          </TabsList>
          <AnalyticsDateRangeSelect value={preset} onChange={setPreset} />
        </div>

        <TabsContent value="overview" className="space-y-4">
          {overviewQuery.error ? (
            <ErrorState onRetry={() => overviewQuery.refetch()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                labelKey="analytics:metrics.totalUsers"
                icon={Users}
                isLoading={overviewQuery.isLoading}
                value={overview ? formatNumber(overview.totalUsers.value, language) : ''}
                trend={
                  usersTrend
                    ? {
                        direction: usersTrend.direction,
                        value: formatPercentage(usersTrend.magnitude / 100, language, 0),
                        periodKey: 'analytics:dateRange.selected',
                      }
                    : undefined
                }
              />
              <MetricCard
                labelKey="analytics:metrics.activeUsers"
                icon={Activity}
                isLoading={overviewQuery.isLoading}
                value={overview ? formatNumber(overview.activeUsers.value, language) : ''}
                trend={
                  activeUsersTrend
                    ? {
                        direction: activeUsersTrend.direction,
                        value: formatPercentage(activeUsersTrend.magnitude / 100, language, 0),
                        periodKey: 'analytics:dateRange.selected',
                      }
                    : undefined
                }
              />
              <MetricCard
                labelKey="analytics:metrics.engagement"
                icon={TrendingUp}
                isLoading={overviewQuery.isLoading}
                value={overview ? formatPercentage(overview.engagementRatePercent / 100, language, 0) : ''}
                trend={
                  engagementTrend
                    ? {
                        direction: engagementTrend.direction,
                        value: formatPercentage(engagementTrend.magnitude / 100, language, 0),
                        periodKey: 'analytics:dateRange.selected',
                      }
                    : undefined
                }
              />
              <MetricCard
                labelKey="analytics:metrics.revenue"
                icon={BarChart3}
                isLoading={overviewQuery.isLoading}
                value={overview ? formatCurrency(overview.revenue.value, language, overview.revenueCurrency) : ''}
                trend={
                  revenueTrend
                    ? {
                        direction: revenueTrend.direction,
                        value: formatPercentage(revenueTrend.magnitude / 100, language, 0),
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
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics:tabs.users')}</CardTitle>
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
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics:tabs.engagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              {engagementSeriesQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : engagementSeriesQuery.error ? (
                <ErrorState onRetry={() => engagementSeriesQuery.refetch()} />
              ) : (
                <AnalyticsLineChart
                  points={engagementSeriesQuery.data?.points ?? []}
                  metricLabelKey="analytics:metrics.engagement"
                  language={language}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
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
              ) : !revenueByPlanQuery.data || revenueByPlanQuery.data.items.length === 0 ? (
                <EmptyState titleKey="analytics:charts.empty" />
              ) : (
                <ul className="divide-y divide-border">
                  {revenueByPlanQuery.data.items.map((item) => (
                    <li key={item.label} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-foreground">{item.label}</span>
                      <span className="text-muted-foreground" data-atlas-numeric="true">
                        {formatCurrency(item.value, language, overview?.revenueCurrency ?? 'USD')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
