/**
 * Instructor Dashboard Page.
 *
 * Aggregated teaching metrics through `InstructorService.getDashboard` —
 * every number here comes from the abstract service contract, never
 * hardcoded.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  FileClock,
  Users,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { MetricCard } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useInstructorDashboard } from '../hooks';

export default function InstructorDashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useInstructorDashboard();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="instructor:dashboard.title"
          descriptionKey="instructor:dashboard.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="instructor:dashboard.title"
        descriptionKey="instructor:dashboard.subtitle"
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            labelKey="instructor:dashboard.assignedCourses"
            value={data.assignedCoursesCount.toString()}
            icon={BookOpen}
          />
          <MetricCard
            labelKey="instructor:dashboard.activeCourses"
            value={data.activeCoursesCount.toString()}
            icon={BookOpen}
          />
          <MetricCard
            labelKey="instructor:dashboard.totalStudents"
            value={data.totalStudents.toString()}
            icon={Users}
          />
          <MetricCard
            labelKey="instructor:dashboard.pendingSubmissions"
            value={data.pendingSubmissionsCount.toString()}
            icon={FileClock}
          />
          <MetricCard
            labelKey="instructor:dashboard.pendingGrading"
            value={data.pendingGradingCount.toString()}
            icon={ClipboardCheck}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:dashboard.requiresAttention')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.coursesRequiringAttention.length === 0 ? (
              <EmptyState
                titleKey="instructor:dashboard.noAttentionNeeded"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {data.coursesRequiringAttention.map((item) => (
                  <button
                    key={`${item.courseId}-${item.reason}`}
                    type="button"
                    onClick={() =>
                      navigate(
                        buildPath(DASHBOARD_ROUTES.instructorCourseOverview, {
                          courseId: item.courseId,
                        })
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning-surface p-3 text-start text-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className="size-4 shrink-0 text-warning"
                        aria-hidden
                      />
                      <span className="font-medium text-foreground">
                        {item.courseTitle}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(`instructor:dashboard.attentionReason.${item.reason}`)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                titleKey="instructor:dashboard.noRecentActivity"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.courseTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      {activity.studentName ? (
                        <p className="text-xs text-muted-foreground">
                          {t('common:by')} {activity.studentName}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
