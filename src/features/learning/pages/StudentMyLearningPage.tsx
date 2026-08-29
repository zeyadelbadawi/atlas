/**
 * Student "My Learning" Page.
 *
 * Found missing during a real browser acceptance test: a student who
 * successfully enrolled in a course (`POST /enrollments`, verified live,
 * persisted across refresh) had nowhere in the dashboard that showed
 * "courses I'm enrolled in" — the "My Learning" nav link routed straight
 * to `StudentCourseDiscoveryPage`, a generic cross-academy catalog with no
 * notion of enrollment. The backend "list my enrollments" endpoint
 * (`GET /enrollments`) already existed and was already correctly
 * RLS-scoped to the caller; only the UI consuming it, and the course
 * detail the bare enrollment row lacked, were missing (see
 * `EnrollmentResponse.course` on the backend for the join that fixes the
 * latter). This page is that missing consumer — reusing the discovery
 * page's card layout for visual consistency, but sourced from
 * `useEnrollments()` instead of `useDiscoverCourses()`.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useEnrollments } from '../hooks';
import { formatCoursePricing } from '@features/course';
import type { EnrollmentStatus } from '@types';

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'default' | 'secondary' | 'outline'> = {
  enrolled: 'secondary',
  pending: 'outline',
  completed: 'default',
  available: 'outline',
  unavailable: 'outline',
};

export default function StudentMyLearningPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useEnrollments({
    query: { pagination: { page: pagination.page, pageSize: pagination.pageSize } },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const enrollments = data?.items ?? [];
  const browseCourses = () => navigate(DASHBOARD_ROUTES.learningCourses);

  if (error) {
    return (
      <PageContainer>
        <PageHeader titleKey="learning:myLearning.title" descriptionKey="learning:myLearning.subtitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="learning:myLearning.title"
        descriptionKey="learning:myLearning.subtitle"
        actions={
          <Button variant="outline" onClick={browseCourses}>
            <Compass className="size-4" strokeWidth={2} aria-hidden />
            {t('learning:myLearning.browseCoursesAction')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : enrollments.length === 0 ? (
        <EmptyState
          titleKey="learning:myLearning.empty.title"
          descriptionKey="learning:myLearning.empty.description"
          primaryAction={{ labelKey: 'learning:myLearning.empty.action', onAction: browseCourses }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => {
            const course = enrollment.course;
            const goToDetail = () =>
              navigate(buildPath(DASHBOARD_ROUTES.learningCourseDetail, { courseId: enrollment.courseId }));

            return (
              <Card
                key={enrollment.id}
                role="button"
                tabIndex={0}
                onClick={goToDetail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToDetail();
                  }
                }}
                className="flex cursor-pointer flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {course?.thumbnail ? (
                  <img src={course.thumbnail} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 w-full bg-muted" />
                )}
                <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[enrollment.status]}>
                      {t(`learning:myLearning.status.${enrollment.status}`)}
                    </Badge>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {course?.title ?? enrollment.courseId}
                  </h3>
                  {course?.instructors && course.instructors.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('learning:discovery.card.byInstructor', { name: course.instructors[0].name })}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    {course ? (
                      <span className="text-sm font-medium text-foreground">
                        {formatCoursePricing(course.pricing, t)}
                      </span>
                    ) : (
                      <span />
                    )}
                    <Button size="sm" variant="outline" tabIndex={-1}>
                      {enrollment.status === 'completed'
                        ? t('learning:discovery.card.completedAction')
                        : t('learning:discovery.card.continueAction')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
