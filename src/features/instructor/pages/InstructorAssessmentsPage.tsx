/**
 * Instructor Assessment Management Page.
 *
 * Lists the quizzes and assignments already defined for a course. Reads
 * the same definitions a student sees — through the existing, unmodified
 * `QuizService`/`AssignmentService` — since listing an assessment's
 * definition is not a role-specific contract. Only cross-student results
 * (attempts/submissions) require the instructor-scoped service.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, FileText } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge, type StatusTone } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useQuizzes, useAssignments } from '@features/learning';
import type { AssignmentStatus, QuizStatus } from '@types';

function getAssessmentStatusTone(
  status: QuizStatus | AssignmentStatus
): StatusTone {
  return status === 'published' ? 'success' : 'neutral';
}

export default function InstructorAssessmentsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const {
    data: quizzesData,
    isLoading: quizzesLoading,
    error: quizzesError,
    refetch: refetchQuizzes,
  } = useQuizzes(courseId ?? '', { enabled: !!courseId });

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useAssignments(courseId ?? '', { enabled: !!courseId });

  const quizzes = quizzesData?.items ?? [];
  const assignments = assignmentsData?.items ?? [];

  return (
    <PageContainer>
      <PageHeader
        titleKey="instructor:assessments.title"
        descriptionKey="instructor:assessments.subtitle"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" aria-hidden />
              {t('instructor:assessments.quizzes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quizzesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : quizzesError ? (
              <ErrorState onRetry={() => refetchQuizzes()} />
            ) : quizzes.length === 0 ? (
              <EmptyState
                titleKey="instructor:assessments.noQuizzes"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    type="button"
                    onClick={() =>
                      courseId &&
                      navigate(
                        buildPath(DASHBOARD_ROUTES.instructorQuizResults, {
                          courseId,
                          quizId: quiz.id,
                        })
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-start text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('instructor:assessments.questionCount', {
                          count: quiz.questionCount,
                        })}
                      </p>
                    </div>
                    <StatusBadge
                      labelKey={`instructor:assessments.status.${quiz.status}`}
                      tone={getAssessmentStatusTone(quiz.status)}
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" aria-hidden />
              {t('instructor:assessments.assignments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : assignmentsError ? (
              <ErrorState onRetry={() => refetchAssignments()} />
            ) : assignments.length === 0 ? (
              <EmptyState
                titleKey="instructor:assessments.noAssignments"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() =>
                      courseId &&
                      navigate(
                        buildPath(DASHBOARD_ROUTES.instructorSubmissions, {
                          courseId,
                          assignmentId: assignment.id,
                        })
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-start text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {assignment.title}
                      </p>
                      {assignment.dueAt ? (
                        <p className="text-xs text-muted-foreground">
                          {t('instructor:assessments.dueAt', {
                            date: new Date(
                              assignment.dueAt
                            ).toLocaleDateString(),
                          })}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      labelKey={`instructor:assessments.status.${assignment.status}`}
                      tone={getAssessmentStatusTone(assignment.status)}
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
