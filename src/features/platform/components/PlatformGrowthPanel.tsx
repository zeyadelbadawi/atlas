/**
 * Platform Growth panel (B0-ANL-04 part 3) — the dashboard's read-only
 * activation funnel.
 *
 * One row per SIGNUP WEEK (Africa/Cairo, Monday first): how many
 * organizations signed up that week and how many of them have since
 * created an academy, published a course, had a first enrolment and made a
 * first approved subscription payment. Computed on the server from real
 * records; internal (test/demo/staff) organizations are excluded. Below, the
 * signups of the same window by recorded source (empty until attribution
 * capture is switched on).
 *
 * Fetches its own data, like `PlatformVideoMetrics`. No editing, no export.
 */
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import type { PlatformGrowthFunnelCounts } from '@types';
import { usePlatformGrowthMetrics } from '../hooks';

/** The window the dashboard shows — twelve signup weeks. */
export const GROWTH_PANEL_WEEKS = 12;

const STEPS = [
  'signups',
  'academyCreated',
  'coursePublished',
  'firstEnrolment',
  'firstPayment',
] as const satisfies readonly (keyof PlatformGrowthFunnelCounts)[];

export function PlatformGrowthPanel(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { data, isLoading, error, refetch } = usePlatformGrowthMetrics(GROWTH_PANEL_WEEKS);

  const title = (
    <CardTitle as="h2" className="flex items-center gap-2">
      <TrendingUp className="size-4" aria-hidden />
      {t('platform:growth.title')}
    </CardTitle>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    );
  }

  const num = (value: number) => formatNumber(value, language);
  // Newest week first: that is the one an owner checks on Monday.
  const rows = [...data.cohorts].reverse();

  return (
    <Card data-testid="platform-growth-panel">
      <CardHeader className="space-y-1">
        {title}
        <p className="text-sm text-muted-foreground">
          {t('platform:growth.description', { weeks: data.weeks })}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STEPS.map((step) => (
            <div key={step}>
              <dt className="text-xs text-muted-foreground">
                {t(`platform:growth.steps.${step}`)}
              </dt>
              <dd
                className="text-lg font-semibold tabular-nums text-foreground"
                data-atlas-numeric="true"
                data-testid={`growth-total-${step}`}
              >
                {num(data.totals[step])}
              </dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">{t('platform:growth.tableCaption')}</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="py-2 text-start font-medium">
                  {t('platform:growth.week')}
                </th>
                {STEPS.map((step) => (
                  <th key={step} scope="col" className="py-2 text-end font-medium">
                    {t(`platform:growth.steps.${step}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.weekStart} className="border-b border-border/60">
                  <th scope="row" className="py-2 text-start font-normal text-foreground">
                    {fmt.date(`${row.weekStart}T12:00:00Z`)}
                  </th>
                  {STEPS.map((step) => (
                    <td
                      key={step}
                      className="py-2 text-end tabular-nums text-foreground"
                      data-atlas-numeric="true"
                    >
                      {num(row[step])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {t('platform:growth.sources.title')}
          </h3>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('platform:growth.sources.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.sources.map((source) => (
                <li
                  key={source.source ?? '__untagged'}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-foreground" dir="auto">
                    {source.source ?? t('platform:growth.sources.untagged')}
                  </span>
                  <span className="tabular-nums text-muted-foreground" data-atlas-numeric="true">
                    {num(source.signups)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('platform:growth.footnote', { timeZone: data.timeZone })}
        </p>
      </CardContent>
    </Card>
  );
}
