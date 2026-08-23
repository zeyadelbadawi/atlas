/**
 * Platform Owner Dashboard Page.
 *
 * Prompt 13 replacement for the Prompt 3A scaffold — every number here
 * comes from `usePlatformMetrics()` (`PlatformMetricsService`, a real
 * singleton contract). Carries the exact same seven KPIs the scaffold
 * already named (`totalAcademies`, `totalUsers`, `activeCourses`,
 * `revenue`, `systemHealth`, `storageUsage`, `apiUptime`) — no additional
 * KPI is invented.
 */
import { useTranslation } from 'react-i18next';
import { Building2, Users, GraduationCap, TrendingUp } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { MetricCard } from '@components/data-display';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformMetrics } from '../hooks';
import { PlatformMetrics } from '../components/PlatformMetrics';
import { PlatformActivity } from '../components/PlatformActivity';
import { formatCurrency, formatNumber, formatPercentage } from '@utils';
import type { LanguageCode } from '@types';
import type { TrendDirection } from '@components/data-display';

function trendFor(changePercent: number | undefined): { direction: TrendDirection; magnitude: number } | undefined {
  if (changePercent === undefined) return undefined;
  return {
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
    magnitude: changePercent,
  };
}

export default function PlatformDashboardPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { data: metrics, isLoading, error, refetch } = usePlatformMetrics();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !metrics) {
    return (
      <PageContainer>
        <PageHeader titleKey="platform:dashboard.title" descriptionKey="platform:dashboard.description" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const academiesTrend = trendFor(metrics.totalAcademies.changePercent);
  const usersTrend = trendFor(metrics.totalUsers.changePercent);
  const coursesTrend = trendFor(metrics.activeCourses.changePercent);
  const revenueTrend = trendFor(metrics.revenue.changePercent);

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:dashboard.title"
        descriptionKey="platform:dashboard.description"
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            labelKey="platform:metrics.totalAcademies"
            icon={Building2}
            value={formatNumber(metrics.totalAcademies.value, language)}
            trend={
              academiesTrend
                ? {
                    direction: academiesTrend.direction,
                    value: formatPercentage(academiesTrend.magnitude / 100, language, 0),
                    periodKey: 'platform:metrics.vsLastMonth',
                  }
                : undefined
            }
          />
          <MetricCard
            labelKey="platform:metrics.totalUsers"
            icon={Users}
            value={formatNumber(metrics.totalUsers.value, language)}
            trend={
              usersTrend
                ? {
                    direction: usersTrend.direction,
                    value: formatPercentage(usersTrend.magnitude / 100, language, 0),
                    periodKey: 'platform:metrics.vsLastMonth',
                  }
                : undefined
            }
          />
          <MetricCard
            labelKey="platform:metrics.activeCourses"
            icon={GraduationCap}
            value={formatNumber(metrics.activeCourses.value, language)}
            trend={
              coursesTrend
                ? {
                    direction: coursesTrend.direction,
                    value: formatPercentage(coursesTrend.magnitude / 100, language, 0),
                    periodKey: 'platform:metrics.vsLastMonth',
                  }
                : undefined
            }
          />
          <MetricCard
            labelKey="platform:metrics.revenue"
            icon={TrendingUp}
            value={formatCurrency(metrics.revenue.amount, language, metrics.revenue.currency)}
            trend={
              revenueTrend
                ? {
                    direction: revenueTrend.direction,
                    value: formatPercentage(revenueTrend.magnitude / 100, language, 0),
                    periodKey: 'platform:metrics.vsLastMonth',
                  }
                : undefined
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PlatformMetrics metrics={metrics} />
          <PlatformActivity />
        </div>

        <p className="text-xs text-muted-foreground">
          {t('platform:metrics.lastUpdated', {
            time: new Date(metrics.generatedAt).toLocaleString(language),
          })}
        </p>
      </div>
    </PageContainer>
  );
}
