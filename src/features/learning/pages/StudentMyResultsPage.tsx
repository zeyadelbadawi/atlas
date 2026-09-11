/**
 * Student "My Results" page (Phase 9, roadmap finding ST6).
 *
 * Deliberately the OUTCOMES half of the student experience: quiz scores
 * and assignment grades, with each course's progress carried alongside
 * only as context. `StudentMyLearningPage` remains the place a student
 * continues a course; this page is where they see how they did. Both read
 * the same materialized `CourseProgress`, so they can never disagree.
 *
 * Honesty rules carried through from the backend contract: a `null`
 * average is rendered as an explicit "no scores yet" state, never as 0; a
 * `null` per-attempt score renders as "awaiting marking", never as 0; and
 * `passed: null` (a quiz with no passing score) shows neither a pass nor
 * a fail badge.
 */
import { Award, ClipboardList, GraduationCap, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { MetricCard, StatusBadge } from '@components/data-display';
import { SectionLoader } from '@components/loading';
import type { StatusTone } from '@components/data-display';
import { useStudentResults } from '../hooks/useStudentResults';
import type { StudentAssignmentResult, StudentQuizResult } from '@types';

function quizTone(result: StudentQuizResult): StatusTone {
  if (result.passed === true) return 'success';
  if (result.passed === false) return 'destructive';
  return 'neutral';
}

function assignmentTone(result: StudentAssignmentResult): StatusTone {
  return result.gradingStatus === 'graded' ? 'success' : 'info';
}

export default function StudentMyResultsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch } = useStudentResults();

  const formatDate = (value: string | null): string =>
    value ? new Date(value).toLocaleDateString(i18n.language) : '';

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="learning:results.title"
          descriptionKey="learning:results.description"
        />
        <SectionLoader />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="learning:results.title"
          descriptionKey="learning:results.description"
        />
        <ErrorState
          titleKey="learning:results.error.title"
          descriptionKey="learning:results.error.description"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const { summary, courses } = data;
  const coursesWithResults = courses.filter(
    (course) =>
      course.quizResults.length > 0 || course.assignmentResults.length > 0
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="learning:results.title"
        descriptionKey="learning:results.description"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          labelKey="learning:results.metrics.coursesEnrolled"
          value={new Intl.NumberFormat(i18n.language).format(
            summary.coursesEnrolled
          )}
          icon={GraduationCap}
        />
        <MetricCard
          labelKey="learning:results.metrics.coursesCompleted"
          value={new Intl.NumberFormat(i18n.language).format(
            summary.coursesCompleted
          )}
          icon={Award}
        />
        <MetricCard
          labelKey="learning:results.metrics.quizzesPassed"
          value={t('learning:results.metrics.passedOf', {
            passed: summary.quizzesPassed,
            attempted: summary.quizzesAttempted,
          })}
          icon={Target}
        />
        {/* A null average is "no scores yet", never 0 — see the file header. */}
        <MetricCard
          labelKey="learning:results.metrics.averageScore"
          value={
            summary.averageQuizScore === null
              ? t('learning:results.metrics.noScoresYet')
              : `${summary.averageQuizScore}%`
          }
          icon={ClipboardList}
        />
      </div>

      {coursesWithResults.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={ClipboardList}
            titleKey="learning:results.empty.title"
            descriptionKey="learning:results.empty.description"
          />
        </SectionCard>
      ) : (
        coursesWithResults.map((course) => (
          <SectionCard
            key={course.courseId}
            /* `SectionCard` titles come from translation keys, but a course
               title is real user data — so it is rendered as the heading of
               the card body instead of being forced through a key. */
            descriptionKey={
              course.progress
                ? 'learning:results.course.progressSummary'
                : undefined
            }
            values={{
              completed: course.progress?.completedLessons ?? 0,
              total: course.progress?.totalLessons ?? 0,
              percentage: Math.round(course.progress?.percentage ?? 0),
            }}
          >
            <div className="flex flex-col gap-6">
              <h2 className="text-base font-semibold text-foreground">
                {course.courseTitle}
              </h2>
              {course.quizResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('learning:results.course.quizzes')}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {course.quizResults.map((result) => (
                      <li
                        key={result.attemptId}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate font-medium text-foreground">
                            {result.quizTitle}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t('learning:results.course.attemptNumber', {
                              number: result.attemptNumber,
                            })}
                            {result.submittedAt
                              ? ` · ${formatDate(result.submittedAt)}`
                              : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums font-medium text-foreground">
                            {result.score === null
                              ? t('learning:results.course.awaitingMarking')
                              : `${result.score}%`}
                          </span>
                          {result.passed === null ? null : (
                            <StatusBadge
                              labelKey={
                                result.passed
                                  ? 'learning:results.course.passed'
                                  : 'learning:results.course.notPassed'
                              }
                              tone={quizTone(result)}
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {course.assignmentResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('learning:results.course.assignments')}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {course.assignmentResults.map((result) => (
                      <li
                        key={result.submissionId}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate font-medium text-foreground">
                            {result.assignmentTitle}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {result.submittedAt
                              ? t('learning:results.course.submittedOn', {
                                  date: formatDate(result.submittedAt),
                                })
                              : ''}
                            {result.hasFeedback
                              ? ` · ${t('learning:results.course.hasFeedback')}`
                              : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums font-medium text-foreground">
                            {result.score === null
                              ? t('learning:results.course.awaitingMarking')
                              : `${result.score}%`}
                          </span>
                          <StatusBadge
                            labelKey={`learning:results.gradingStatus.${result.gradingStatus}`}
                            tone={assignmentTone(result)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </SectionCard>
        ))
      )}
    </PageContainer>
  );
}
