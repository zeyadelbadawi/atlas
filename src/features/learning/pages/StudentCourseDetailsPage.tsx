/**
 * Student Course Details Page.
 *
 * Course identity, curriculum overview, and state-dependent actions:
 * sign in (unauthenticated) → enroll (authenticated, not enrolled) →
 * continue/view progress (enrolled) → view completed course (completed).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CheckCircle2, LogIn } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@hooks';
import { AUTH_ROUTES, DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { formatCoursePricing } from '@features/course';
import {
  useDiscoverCourse,
  useEnrollment,
  useEnroll,
  useCourseProgress,
  useQuizzes,
  useAssignments,
} from '../hooks';
import { getCourseCompletionTone } from '../utils/learning-status.utils';

export default function StudentCourseDetailsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { isAuthenticated } = useAuth();

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useDiscoverCourse(courseId ?? '');

  const { data: enrollment, isLoading: isLoadingEnrollment } = useEnrollment(
    courseId ?? '',
    { enabled: isAuthenticated && !!courseId }
  );
  const isEnrolled = !!enrollment && enrollment.status !== 'available';

  const { data: progress } = useCourseProgress(courseId ?? '', {
    enabled: isEnrolled,
  });

  const { mutateAsync: enroll, isPending: isEnrolling } = useEnroll();

  const { data: quizzesData } = useQuizzes(courseId ?? '', {
    enabled: isEnrolled,
  });
  const { data: assignmentsData } = useAssignments(courseId ?? '', {
    enabled: isEnrolled,
  });
  const quizzes = quizzesData?.items ?? [];
  const assignments = assignmentsData?.items ?? [];

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      await enroll({ courseId });
      toast({
        title: t('learning:details.enrollSuccess'),
        description: t('learning:details.enrollSuccessNextStepDescription'),
      });
    } catch {
      toast({
        title: t('learning:details.enrollError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const goToLearn = () => {
    if (!courseId) return;
    const lessonId = progress?.currentLessonId;
    navigate(
      lessonId
        ? buildPath(DASHBOARD_ROUTES.learningLesson, { courseId, lessonId })
        : buildPath(DASHBOARD_ROUTES.learningCourseLearn, { courseId })
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !course) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="learning:details.title"
          descriptionKey="learning:discovery.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={course.title} titleKey="learning:details.title" />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt=""
                className="h-40 w-full shrink-0 rounded-lg object-cover sm:w-64"
              />
            ) : (
              <div className="h-40 w-full shrink-0 rounded-lg bg-muted sm:w-64" />
            )}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {course.category ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {course.category.name}
                  </span>
                ) : null}
                {progress ? (
                  <StatusBadge
                    labelKey={`learning:progress.state.${progress.completionState}`}
                    tone={getCourseCompletionTone(progress.completionState)}
                  />
                ) : null}
              </div>

              {course.description ? (
                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  {t('learning:details.sectionCount', {
                    count: course.stats?.totalSections ?? 0,
                  })}
                </span>
                <span>
                  {t('learning:details.lessonCount', {
                    count: course.stats?.totalLessons ?? 0,
                  })}
                </span>
                <span className="font-medium text-foreground">
                  {formatCoursePricing(course.pricing, t)}
                </span>
              </div>

              {course.instructors.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('learning:details.instructors')}
                  </p>
                  <p className="text-sm text-foreground">
                    {course.instructors.map((i) => i.name).join(', ')}
                  </p>
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                {!isAuthenticated ? (
                  <>
                    <p className="w-full text-sm text-muted-foreground">
                      {t('learning:details.signInPrompt')}
                    </p>
                    <Button
                      onClick={() =>
                        navigate(AUTH_ROUTES.signIn, {
                          state: { from: window.location.pathname },
                        })
                      }
                    >
                      <LogIn className="size-4" strokeWidth={2} aria-hidden />
                      {t('learning:details.signInAction')}
                    </Button>
                  </>
                ) : isLoadingEnrollment ? (
                  <Skeleton className="h-10 w-40" />
                ) : progress?.completionState === 'completed' ? (
                  <>
                    <p className="w-full text-sm font-medium text-success">
                      {t('learning:details.courseCompleted')}
                    </p>
                    <Button onClick={goToLearn}>
                      <CheckCircle2
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {t('learning:details.viewCompletedCourse')}
                    </Button>
                  </>
                ) : isEnrolled ? (
                  <Button onClick={goToLearn}>
                    <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                    {t('learning:details.continueLearning')}
                  </Button>
                ) : enrollment?.status === 'unavailable' ? (
                  <p className="text-sm text-muted-foreground">
                    {t('learning:details.notAvailable')}
                  </p>
                ) : (
                  <>
                    <p className="w-full text-sm text-muted-foreground">
                      {t('learning:details.notEnrolledPrompt')}
                    </p>
                    <Button onClick={handleEnroll} disabled={isEnrolling}>
                      <BookOpen className="size-4" strokeWidth={2} aria-hidden />
                      {isEnrolling
                        ? t('learning:details.enrolling')
                        : t('learning:details.enrollAction')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isEnrolled && progress ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('learning:progress.overallTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('learning:progress.completedOf', {
                  completed: progress.completedLessons,
                  total: progress.totalLessons,
                })}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-muted">
                <div
                  className="h-full rounded-pill bg-primary transition-[width]"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isEnrolled && progress?.completionState === 'completed' ? (
          <Card className="border-success/30 bg-success-surface">
            <CardContent className="flex items-center gap-3 py-4">
              <Award className="size-5 shrink-0 text-success" aria-hidden />
              <p className="text-sm text-foreground">
                {progress.certificateStatus === 'eligible'
                  ? t('learning:completion.certificate.eligible')
                  : t('learning:completion.certificate.unavailable')}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {isEnrolled && (quizzes.length > 0 || assignments.length > 0) ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('learning:quiz.listTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() =>
                    courseId &&
                    navigate(
                      buildPath(DASHBOARD_ROUTES.learningQuiz, {
                        courseId,
                        quizId: quiz.id,
                      })
                    )
                  }
                  className="flex w-full items-center justify-between rounded-md border border-border p-3 text-start text-sm hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium text-foreground">
                    {quiz.title}
                  </span>
                  <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </button>
              ))}
              {assignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() =>
                    courseId &&
                    navigate(
                      buildPath(DASHBOARD_ROUTES.learningAssignment, {
                        courseId,
                        assignmentId: assignment.id,
                      })
                    )
                  }
                  className="flex w-full items-center justify-between rounded-md border border-border p-3 text-start text-sm hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium text-foreground">
                    {assignment.title}
                  </span>
                  <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageContainer>
  );
}
