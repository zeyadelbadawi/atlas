/**
 * `/my/courses` — every course this learner is enrolled in (§E.1).
 *
 * THE COUNTS ARE THE SERVER'S. `GET /learning/overview` returns
 * `courseCounts` computed across the learner's whole enrolment set at
 * this academy; the retired `/my-learning` page counted the page of
 * results it happened to have loaded and called that the total, so "In
 * progress (3)" meant three on this page. The tabs therefore show a
 * number that can legitimately exceed the rows visible beneath them, and
 * that is correct rather than a bug: one is "how many you have", the
 * other is "how many are on screen".
 *
 * THE FILTER AND THE SEARCH ARE CLIENT-SIDE, AND SAY SO. `GET
 * /enrollments` has neither a status filter nor a search parameter; a
 * learner's own enrolment list is small, so filtering the loaded page is
 * a real filter rather than a fake one. What it is NOT is a substitute
 * for the server counts — which is exactly why both exist here.
 *
 * THE LIST IS ACADEMY-SCOPED by the `academyId` filter the endpoint does
 * support. `/my/*` is served from one academy's own host, and another
 * academy's course appearing in this list is a tenancy leak the customer
 * would see immediately.
 *
 * CARDS ARE NOT CLICKABLE CONTAINERS. Each card has its own link and its
 * own Continue button as siblings — the accessibility audit's
 * nested-interactive finding was card-as-button with a button inside,
 * which gives a keyboard user two stops for one action and a screen
 * reader an announcement it cannot make sense of.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@components/feedback';
import { Pagination } from '@components/data-display';
import { readErrorKind } from '../utils/read-error-kind';
import { useAuth, usePagination } from '@hooks';
import { useEnrollments, useLearningPaths } from '@features/learning';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import type { Enrollment } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerProgressBar } from '../components/LearnerProgressBar';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useLearnerOverview } from '../hooks';
import { learningStateOf, progressCounts } from '@utils';

type CourseFilter = 'all' | 'inProgress' | 'completed';

/**
 * Whether one enrolment belongs in a tab.
 *
 * Deliberately the same rule the server counts with (`learningState`,
 * Task E): "in progress" is started but not finished, "completed" is
 * completed. Inventing a third definition here is how a tab labelled "3"
 * ends up listing two rows.
 */
function stateOf(enrollment: Enrollment) {
  return learningStateOf(enrollment.progress, {
    completed: enrollment.status === 'completed',
  });
}

function matchesFilter(enrollment: Enrollment, filter: CourseFilter): boolean {
  switch (filter) {
    case 'inProgress':
      return stateOf(enrollment) === 'in_progress';
    case 'completed':
      return stateOf(enrollment) === 'completed';
    case 'all':
    default:
      return true;
  }
}

export default function LearnerCoursesPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paths = useLearningPaths();
  const { academyId, buildHref } = useLearnerSurface();
  const { user } = useAuth();

  const [filter, setFilter] = useState<CourseFilter>('all');
  const [search, setSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const overview = useLearnerOverview();
  const enrollmentsQuery = useEnrollments({
    enabled: !!user?.id,
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      filters: { academyId },
    },
  });

  useEffect(() => {
    if (enrollmentsQuery.data) {
      setTotalItems(enrollmentsQuery.data.pagination.totalItems);
    }
  }, [enrollmentsQuery.data]);

  const enrollments = useMemo(
    () => enrollmentsQuery.data?.items ?? [],
    [enrollmentsQuery.data]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      if (!matchesFilter(enrollment, filter)) return false;
      if (!term) return true;
      return (enrollment.course?.title ?? '').toLowerCase().includes(term);
    });
  }, [enrollments, filter, search]);

  /*
   * The server's numbers when they have arrived, and the page's own only
   * as a stand-in while the aggregate is still in flight — never silently
   * instead of them. A tab with no number at all would move as the count
   * landed; a tab with the wrong number is the bug this page exists to
   * fix.
   */
  const counts = overview.data?.courseCounts;

  const header = (
    <LearnerPageHeader
      section="courses"
      titleKey="learning:learnerDashboard.courses.title"
      descriptionKey="learning:learnerDashboard.courses.subtitle"
    />
  );

  if (enrollmentsQuery.error) {
    return (
      <>
        {header}
        <ErrorState
          kind={readErrorKind(enrollmentsQuery.error)}
          onRetry={() => void enrollmentsQuery.refetch()}
        />
      </>
    );
  }

  return (
    <>
      {header}

      {/* The tabs filter one list: it is the selected tab's panel, so the
          tab's `aria-controls` names a real element. */}
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as CourseFilter)}
        className="space-y-6 lg:space-y-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {(['all', 'inProgress', 'completed'] as const).map((value) => (
              <TabsTrigger key={value} value={value}>
                {t(`learning:learnerDashboard.courses.filters.${value}`)}
                {counts ? (
                  <span className="ms-1.5 tabular-nums">({counts[value]})</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'learning:learnerDashboard.courses.searchPlaceholder'
              )}
              aria-label={t('learning:learnerDashboard.courses.searchLabel')}
              className="ps-9"
            />
          </div>
        </div>

        <TabsContent value={filter} className="mt-0">
          {enrollmentsQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : enrollments.length === 0 ? (
            <LearnerSectionPlaceholder
              icon={GraduationCap}
              titleKey="learning:learnerDashboard.courses.empty.title"
              descriptionKey="learning:learnerDashboard.courses.empty.description"
            />
          ) : visible.length === 0 ? (
            <LearnerSectionPlaceholder
              icon={Search}
              titleKey="learning:learnerDashboard.courses.filterEmpty.title"
              descriptionKey="learning:learnerDashboard.courses.filterEmpty.description"
            />
          ) : (
            <>
              {/* A screen reader hears how many courses the search or tab
              left, not the whole grid re-read on every keystroke. */}
              <p role="status" aria-live="polite" className="sr-only">
                {t('learning:learnerDashboard.courses.resultsCount', {
                  count: visible.length,
                })}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((enrollment) => {
                  const course = enrollment.course;
                  const progress = enrollment.progress;
                  const learningState = stateOf(enrollment);
                  const isCompleted = learningState === 'completed';
                  // The backend's own access answer, never re-derived here.
                  const accessEnded = enrollment.isActive === false;
                  const courseHref = buildHref(
                    buildPath(LEARNER_ROUTES.courseProgress, {
                      courseId: enrollment.courseId,
                    })
                  );

                  return (
                    <Card
                      key={enrollment.id}
                      className="flex flex-col overflow-hidden"
                    >
                      {course?.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt=""
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="h-36 w-full bg-muted" />
                      )}

                      <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={isCompleted ? 'default' : 'secondary'}
                          >
                            {t(
                              `learning:myLearning.status.${enrollment.status}`
                            )}
                          </Badge>
                        </div>

                        <h3 className="font-display text-base font-semibold text-foreground">
                          {/* The whole card is not a control; the title is. */}
                          <Link
                            to={courseHref}
                            className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {course?.title ?? enrollment.courseId}
                          </Link>
                        </h3>

                        {progress && progressCounts(progress).total > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            <LearnerProgressBar
                              value={progress.percentage}
                              label={t('learning:player.progress.label', {
                                course: course?.title ?? '',
                              })}
                            />
                            <p className="text-xs text-muted-foreground">
                              {t(
                                progressCounts(progress).unit === 'items'
                                  ? 'learning:progress.completedOfItems'
                                  : 'learning:progress.completedOf',
                                progressCounts(progress)
                              )}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-auto flex items-center justify-end pt-2">
                          <Button
                            size="sm"
                            variant={isCompleted ? 'outline' : 'default'}
                            disabled={accessEnded}
                            onClick={() => {
                              if (accessEnded) return;
                              if (progress?.currentLessonId) {
                                navigate(
                                  buildHref(
                                    buildPath(LEARNER_ROUTES.playerLesson, {
                                      courseId: enrollment.courseId,
                                      lessonId: progress.currentLessonId,
                                    })
                                  )
                                );
                                return;
                              }
                              navigate(courseHref);
                            }}
                          >
                            {accessEnded
                              ? t(
                                  'learning:learnerDashboard.actions.accessEnded'
                                )
                              : isCompleted
                                ? t('learning:learnerDashboard.actions.review')
                                : learningState === 'in_progress'
                                  ? t(
                                      'learning:learnerDashboard.actions.continue'
                                    )
                                  : t(
                                      'learning:learnerDashboard.actions.start'
                                    )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* The list is server-paged at DEFAULT_PAGE_SIZE; without this a
          learner with more courses than one page could never reach them. */}
      {pagination.totalPages > 1 ? (
        <Pagination pagination={pagination} hidePageSize />
      ) : null}

      {enrollments.length === 0 && !enrollmentsQuery.isLoading ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate(paths.courses())}>
            {t('learning:learnerDashboard.actions.browseCourses')}
          </Button>
        </div>
      ) : null}
    </>
  );
}
