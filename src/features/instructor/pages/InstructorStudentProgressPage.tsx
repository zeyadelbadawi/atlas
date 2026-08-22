/**
 * Instructor Student Progress Page.
 *
 * Read-only view of one enrolled student's progress, quiz attempts and
 * assignment submissions within a course this instructor is authorized to
 * teach. Grading happens on the dedicated submission review page, not here.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getCourseCompletionTone,
  getEnrollmentStatusTone,
  getQuizAttemptStatusTone,
  getSubmissionStatusTone,
} from '@features/learning';
import { useStudentProgress } from '../hooks';

export default function InstructorStudentProgressPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, studentId } = useParams<{
    courseId: string;
    studentId: string;
  }>();

  const { data, isLoading, error, refetch } = useStudentProgress(
    courseId ?? '',
    studentId ?? ''
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:studentProgress.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={data.studentName}
        titleKey="instructor:studentProgress.title"
        actions={
          <StatusBadge
            labelKey={`instructor:students.enrollmentStatus.${data.enrollmentStatus}`}
            tone={getEnrollmentStatusTone(data.enrollmentStatus)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('instructor:studentProgress.courseProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('instructor:studentProgress.lessonsCompleted', {
                  completed: data.progress.completedLessons,
                  total: data.progress.totalLessons,
                })}
              </span>
              <StatusBadge
                labelKey={`instructor:students.completionState.${data.progress.completionState}`}
                tone={getCourseCompletionTone(data.progress.completionState)}
              />
            </div>
            <Progress value={data.progress.percentage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:studentProgress.quizAttempts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.quizAttempts.length === 0 ? (
              <EmptyState
                titleKey="instructor:studentProgress.noQuizAttempts"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {data.quizAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {t('instructor:studentProgress.attemptNumber', {
                        number: attempt.attemptNumber,
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      {typeof attempt.score === 'number' ? (
                        <span className="font-medium text-foreground">
                          {Math.round(attempt.score)}%
                        </span>
                      ) : null}
                      <StatusBadge
                        labelKey={`instructor:studentProgress.quizStatus.${attempt.status}`}
                        tone={getQuizAttemptStatusTone(attempt.status)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('instructor:studentProgress.assignmentSubmissions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.assignmentSubmissions.length === 0 ? (
              <EmptyState
                titleKey="instructor:studentProgress.noSubmissions"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {data.assignmentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        labelKey={`learning:assignment.status.${submission.status}`}
                        tone={getSubmissionStatusTone(submission.status)}
                      />
                      <StatusBadge
                        labelKey={`instructor:grading.status.${submission.gradingStatus}`}
                        tone={
                          submission.gradingStatus === 'graded'
                            ? 'success'
                            : 'warning'
                        }
                      />
                      {submission.grade ? (
                        <span className="font-medium text-foreground">
                          {submission.grade.score !== undefined
                            ? `${submission.grade.score}%`
                            : null}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        courseId &&
                        navigate(
                          buildPath(
                            DASHBOARD_ROUTES.instructorSubmissionReview,
                            {
                              courseId,
                              assignmentId: submission.assignmentId,
                              submissionId: submission.id,
                            }
                          )
                        )
                      }
                    >
                      {t('instructor:studentProgress.viewSubmission')}
                    </Button>
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
