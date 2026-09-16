/**
 * Analysis › Engagement (P59).
 *
 * ONE PAGE PER AREA, not a tab inside one page. The four areas used to be
 * `<TabsContent>` blocks behind `<Tabs defaultValue="overview">` with no URL
 * state, which cost two real things: a refresh or a shared link always
 * landed back on Overview, and EVERY query ran on mount regardless of which
 * tab was showing — overview, three time series and a breakdown, five
 * requests to read one chart.
 *
 * Splitting into routes fixes both with no backend change: the analytics API
 * already exposes `overview`, `time-series/:metric` and
 * `breakdown/:dimension` separately, so each page asks for exactly its own
 * data. The shared header, date-range control and tab strip live in
 * `AnalyticsLayout`; this file is only the panel.
 *
 * The date range comes from the URL (`?range=`) via `useAnalyticsRange`, so
 * it survives navigation between these pages and is shareable.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { AnalyticsLineChart } from '../components/AnalyticsLineChart';
import { useAnalyticsTimeSeries } from '../hooks';
import { useAnalyticsRange } from './useAnalyticsRange';
import type { LanguageCode } from '@types';

export default function AnalyticsEngagementPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { query } = useAnalyticsRange();
  const engagementSeriesQuery = useAnalyticsTimeSeries('engagement', query);

  return (
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
  );
}
