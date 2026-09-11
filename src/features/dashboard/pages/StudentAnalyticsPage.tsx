/**
 * Client Owner student analytics page (Phase 9, roadmap finding CO11).
 *
 * Presents the three things the roadmap asked for — a completion funnel,
 * cohort trends and an at-risk list — using only the real figures the
 * backend computed. Two presentation rules follow directly from the
 * backend contract's definitions and must not be softened:
 *
 *   - Every at-risk row states WHY it was flagged, using the concrete
 *     reasons the backend attached. There is no opaque risk score, and
 *     the page names the inactivity threshold the rule actually used
 *     rather than hardcoding a number of its own.
 *   - The funnel's percentages are derived from the three real counts at
 *     render time; no conversion rate is invented or stored.
 *
 * Deliberately NOT built here: the Phase 11 business components (Revenue
 * Card, Trial Countdown, Academy Health Score, Storage widget). This is
 * the Phase 9 analytics view only, composed from the existing design
 * system.
 */
import { AlertTriangle, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import { SectionLoader } from '@components/loading';
import { useStudentAnalytics } from '../hooks/useStudentAnalytics';
import { useDashboardScope } from '../hooks/useDashboardScope';

/** Share of `value` within `total`, guarding the empty-cohort case so an empty academy reads 0% rather than NaN. */
function share(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

export default function StudentAnalyticsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const scope = useDashboardScope();
  const { data, isLoading, isError, refetch } = useStudentAnalytics();

  const formatNumber = (value: number): string =>
    new Intl.NumberFormat(i18n.language).format(value);

  if (scope.kind === 'none') {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:studentAnalytics.title"
          descriptionKey="dashboard:studentAnalytics.description"
        />
        <SectionCard>
          <EmptyState
            icon={Users}
            titleKey="dashboard:overview.noScope.title"
            descriptionKey="dashboard:overview.noScope.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:studentAnalytics.title"
          descriptionKey="dashboard:studentAnalytics.description"
        />
        <SectionLoader />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="dashboard:studentAnalytics.title"
          descriptionKey="dashboard:studentAnalytics.description"
        />
        <ErrorState
          titleKey="dashboard:studentAnalytics.error.title"
          descriptionKey="dashboard:studentAnalytics.error.description"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const { funnel, cohortTrends, atRiskStudents, atRiskTotal } = data;
  const peakMonth = Math.max(
    1,
    ...cohortTrends.map((point) =>
      Math.max(point.newEnrollments, point.completions)
    )
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="dashboard:studentAnalytics.title"
        descriptionKey="dashboard:studentAnalytics.description"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          labelKey="dashboard:studentAnalytics.funnel.enrolled"
          value={formatNumber(funnel.enrolled)}
          icon={Users}
        />
        <MetricCard
          labelKey="dashboard:studentAnalytics.funnel.started"
          value={formatNumber(funnel.started)}
          icon={TrendingUp}
        />
        <MetricCard
          labelKey="dashboard:studentAnalytics.funnel.completed"
          value={formatNumber(funnel.completed)}
          icon={UserCheck}
        />
        <MetricCard
          labelKey="dashboard:studentAnalytics.atRisk.metric"
          value={formatNumber(atRiskTotal)}
          icon={AlertTriangle}
        />
      </div>

      <SectionCard
        titleKey="dashboard:studentAnalytics.funnel.title"
        descriptionKey="dashboard:studentAnalytics.funnel.description"
      >
        {funnel.enrolled === 0 ? (
          <EmptyState
            icon={Users}
            titleKey="dashboard:studentAnalytics.funnel.empty.title"
            descriptionKey="dashboard:studentAnalytics.funnel.empty.description"
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {(
              [
                ['enrolled', funnel.enrolled],
                ['started', funnel.started],
                ['completed', funnel.completed],
              ] as const
            ).map(([key, value]) => (
              <li key={key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {t(`dashboard:studentAnalytics.funnel.${key}`)}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {/* `count` is reserved by i18next for pluralization, so the
                        interpolation name here is deliberately `total`. */}
                    {t('dashboard:studentAnalytics.funnel.countAndShare', {
                      total: formatNumber(value),
                      share: share(value, funnel.enrolled),
                    })}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${share(value, funnel.enrolled)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        titleKey="dashboard:studentAnalytics.trends.title"
        descriptionKey="dashboard:studentAnalytics.trends.description"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="py-2 text-start font-medium">
                  {t('dashboard:studentAnalytics.trends.month')}
                </th>
                <th scope="col" className="py-2 text-start font-medium">
                  {t('dashboard:studentAnalytics.trends.newEnrollments')}
                </th>
                <th scope="col" className="py-2 text-start font-medium">
                  {t('dashboard:studentAnalytics.trends.completions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cohortTrends.map((point) => (
                <tr key={point.month}>
                  <td className="py-3 text-foreground">{point.month}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 tabular-nums text-foreground">
                        {formatNumber(point.newEnrollments)}
                      </span>
                      <span
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${share(point.newEnrollments, peakMonth)}%`,
                          minWidth: point.newEnrollments > 0 ? '0.5rem' : 0,
                        }}
                        role="presentation"
                      />
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 tabular-nums text-foreground">
                        {formatNumber(point.completions)}
                      </span>
                      <span
                        className="h-2 rounded-full bg-success"
                        style={{
                          width: `${share(point.completions, peakMonth)}%`,
                          minWidth: point.completions > 0 ? '0.5rem' : 0,
                        }}
                        role="presentation"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        titleKey="dashboard:studentAnalytics.atRisk.title"
        descriptionKey="dashboard:studentAnalytics.atRisk.description"
        values={{ days: data.inactivityThresholdDays }}
      >
        {atRiskStudents.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            titleKey="dashboard:studentAnalytics.atRisk.empty.title"
            descriptionKey="dashboard:studentAnalytics.atRisk.empty.description"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {atRiskStudents.map((student) => (
              <li
                key={`${student.studentId}:${student.courseId}`}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium text-foreground">
                    {student.studentName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {student.courseTitle} ·{' '}
                    {t('dashboard:studentAnalytics.atRisk.lessonsDone', {
                      completed: student.completedLessons,
                      total: student.totalLessons,
                    })}
                  </span>
                </div>
                {/* Every flag states its own reason — never an opaque score. */}
                <div className="flex flex-wrap items-center gap-2">
                  {student.reasons.map((reason) => (
                    <StatusBadge
                      key={reason}
                      labelKey={`dashboard:studentAnalytics.atRisk.reasons.${reason}`}
                      tone="warning"
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
