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
 * latter).
 *
 * LMS UX pass: redesigned from a single undifferentiated grid into a real
 * learning hub — real filter tabs (All / In Progress / Completed /
 * Certificates, each backed by `enrollment.status`/`progress.*`, never
 * fabricated), a client-side search over the current page's own titles
 * (no backend search param exists on `GET /enrollments`; a student's own
 * enrollment count is small enough that this is a real, honest filter,
 * not a fake one), and — the actual point of a "My Learning" hub — a real
 * progress bar, "`completed`/`total` lessons," and a "Continue Learning"
 * CTA that deep-links straight to `progress.currentLessonId` when the
 * backend has one (see `EnrollmentResponse.progress`'s own doc comment
 * for the batched join that made this possible without N+1 requests).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Award, Compass, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagination } from '@hooks';
import { useEnrollments } from '../hooks';
import { useLearningPaths } from '../context/LearningPaths.context';
import { formatCoursePricing } from '@features/course';
import type { Enrollment, EnrollmentStatus } from '@types';

export interface StudentMyLearningPageProps {
  /**
   * Scopes the list to one Academy's enrollments — passed when this page
   * is mounted inside that Academy's own public website (see
   * `WebsiteLearningPathsProvider`'s doc comment for why cross-Academy
   * data must never leak into a single Academy's branded "My Learning"
   * page). `undefined` (the dashboard's own `/dashboard/learning/my-courses`
   * route) keeps today's behaviour — every enrollment, across every
   * Academy.
   */
  readonly academyId?: string;
}

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'default' | 'secondary' | 'outline'> = {
  enrolled: 'secondary',
  pending: 'outline',
  completed: 'default',
  available: 'outline',
  unavailable: 'outline',
};

type LearningFilter = 'all' | 'inProgress' | 'completed' | 'certificates';

function matchesFilter(enrollment: Enrollment, filter: LearningFilter): boolean {
  switch (filter) {
    case 'inProgress':
      return (
        enrollment.status !== 'completed' &&
        (enrollment.progress?.completedLessons ?? 0) > 0
      );
    case 'completed':
      return enrollment.status === 'completed';
    case 'certificates':
      return enrollment.progress?.certificateStatus === 'eligible';
    case 'all':
    default:
      return true;
  }
}

export default function StudentMyLearningPage({
  academyId,
}: StudentMyLearningPageProps = {}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paths = useLearningPaths();
  const [filter, setFilter] = useState<LearningFilter>('all');
  const [search, setSearch] = useState('');

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useEnrollments({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      ...(academyId ? { filters: { academyId } } : {}),
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const enrollments = useMemo(() => data?.items ?? [], [data]);

  const filteredEnrollments = useMemo(() => {
    const bySearch = search.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      if (!matchesFilter(enrollment, filter)) return false;
      if (!bySearch) return true;
      return (enrollment.course?.title ?? '').toLowerCase().includes(bySearch);
    });
  }, [enrollments, filter, search]);

  const browseCourses = () => navigate(paths.courses());

  const filterCounts = useMemo(
    () => ({
      all: enrollments.length,
      inProgress: enrollments.filter((e) => matchesFilter(e, 'inProgress')).length,
      completed: enrollments.filter((e) => matchesFilter(e, 'completed')).length,
      certificates: enrollments.filter((e) => matchesFilter(e, 'certificates')).length,
    }),
    [enrollments]
  );

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
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as LearningFilter)}>
              <TabsList>
                <TabsTrigger value="all">
                  {t('learning:myLearning.filters.all')} ({filterCounts.all})
                </TabsTrigger>
                <TabsTrigger value="inProgress">
                  {t('learning:myLearning.filters.inProgress')} ({filterCounts.inProgress})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  {t('learning:myLearning.filters.completed')} ({filterCounts.completed})
                </TabsTrigger>
                <TabsTrigger value="certificates">
                  {t('learning:myLearning.filters.certificates')} ({filterCounts.certificates})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('learning:myLearning.searchPlaceholder')}
                className="ps-9"
              />
            </div>
          </div>

          {filteredEnrollments.length === 0 ? (
            <EmptyState
              titleKey="learning:myLearning.filters.emptyTitle"
              descriptionKey="learning:myLearning.filters.emptyDescription"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEnrollments.map((enrollment) => {
                const course = enrollment.course;
                const progress = enrollment.progress;
                const hasStarted = (progress?.completedLessons ?? 0) > 0;
                const isCompleted = enrollment.status === 'completed';

                const goToDetail = () => navigate(paths.courseDetail(enrollment.courseId));
                const goToContinue = () => {
                  if (progress?.currentLessonId) {
                    navigate(paths.lesson(enrollment.courseId, progress.currentLessonId));
                  } else {
                    navigate(paths.courseLearn(enrollment.courseId));
                  }
                };

                return (
                  <Card
                    key={enrollment.id}
                    className="flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    role="button"
                    tabIndex={0}
                    onClick={goToDetail}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToDetail();
                      }
                    }}
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
                        {progress?.certificateStatus === 'eligible' ? (
                          <Award
                            className="size-4 text-[hsl(var(--brand-500))]"
                            aria-label={t('learning:myLearning.certificateEligible')}
                          />
                        ) : null}
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {course?.title ?? enrollment.courseId}
                      </h3>
                      {course?.instructors && course.instructors.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('learning:discovery.card.byInstructor', { name: course.instructors[0].name })}
                        </p>
                      ) : null}

                      {progress && progress.totalLessons > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="h-1.5 overflow-hidden rounded-pill bg-muted">
                            <div
                              className="h-full rounded-pill bg-primary transition-[width]"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('learning:progress.completedOf', {
                              completed: progress.completedLessons,
                              total: progress.totalLessons,
                            })}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {course ? (
                          <span className="text-sm font-medium text-foreground">
                            {formatCoursePricing(course.pricing, t)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <Button
                          size="sm"
                          variant={hasStarted || isCompleted ? 'default' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCompleted) goToDetail();
                            else goToContinue();
                          }}
                        >
                          {isCompleted
                            ? t('learning:discovery.card.completedAction')
                            : hasStarted
                              ? t('learning:discovery.card.continueAction')
                              : t('learning:myLearning.startAction')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
