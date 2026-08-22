/**
 * Instructor Course Overview Page.
 *
 * Teaching operations for one authorized course — not a copy of the
 * Academy Owner's Course Edit page. Focuses on enrollment, progress,
 * pending work and activity, with quick links into Students/Assessments/
 * Announcements/Discussions.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck,
  FileClock,
  MessageSquare,
  Megaphone,
  Users,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useInstructorCourseOverview } from '../hooks';
import {
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '@features/course';

export default function InstructorCourseOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const { data: overview, isLoading, error, refetch } =
    useInstructorCourseOverview(courseId ?? '');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !overview) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:overview.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const quickLinks = [
    {
      key: 'students',
      icon: Users,
      path: DASHBOARD_ROUTES.instructorStudents,
    },
    {
      key: 'assessments',
      icon: ClipboardCheck,
      path: DASHBOARD_ROUTES.instructorAssessments,
    },
    {
      key: 'announcements',
      icon: Megaphone,
      path: DASHBOARD_ROUTES.instructorAnnouncements,
    },
    {
      key: 'discussions',
      icon: MessageSquare,
      path: DASHBOARD_ROUTES.instructorDiscussions,
    },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        title={overview.title}
        titleKey="instructor:overview.title"
        actions={
          <StatusBadge
            labelKey={getCourseStatusLabelKey(overview.status)}
            tone={getCourseStatusTone(overview.status)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                labelKey={getCourseVisibilityLabelKey(overview.visibility)}
                tone={getCourseVisibilityTone(overview.visibility)}
              />
            </div>
            {overview.description ? (
              <p className="text-sm text-muted-foreground">
                {overview.description}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t('instructor:overview.curriculumSummary', {
                sections: overview.totalSections,
                lessons: overview.totalLessons,
              })}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            labelKey="instructor:overview.enrolledStudents"
            value={overview.enrolledCount.toString()}
            icon={Users}
          />
          <MetricCard
            labelKey="instructor:overview.averageProgress"
            value={
              typeof overview.averageProgress === 'number'
                ? `${Math.round(overview.averageProgress)}%`
                : '—'
            }
          />
          <MetricCard
            labelKey="instructor:overview.pendingSubmissions"
            value={overview.pendingSubmissionsCount.toString()}
            icon={FileClock}
          />
          <MetricCard
            labelKey="instructor:overview.pendingGrading"
            value={overview.pendingGradingCount.toString()}
            icon={ClipboardCheck}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ key, icon: Icon, path }) => (
            <Button
              key={key}
              variant="outline"
              className="h-auto flex-col items-start gap-1 py-4"
              onClick={() =>
                courseId &&
                navigate(buildPath(path, { courseId }))
              }
            >
              <Icon className="size-4" strokeWidth={2} aria-hidden />
              {t(`instructor:overview.quickLinks.${key}`)}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentActivity.length === 0 ? (
              <EmptyState
                titleKey="instructor:dashboard.noRecentActivity"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {overview.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">
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
