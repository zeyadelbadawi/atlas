/**
 * The completion screen (P64 Phase 3 §E.5, AD-11), on the course page.
 *
 * Says where the learner stands against the course's own rule: lessons
 * done of those required, each required quiz (passed / not yet / awaiting
 * grading, with its effective score), each required assignment
 * (submitted, graded, score), the minimum overall score when the rule
 * has one, and then the certificate: not offered, eligible (being
 * prepared), issued (with a link), or revoked. Every missing item links
 * to the activity, because "what is missing" is only useful with a way
 * to go and do it. "Rate this course" is a placeholder line for Phase 4.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Star,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import { cn, formatNumber } from '@utils';
import type { CourseCompletion, LanguageCode } from '@types';
import { useCourseCompletion } from '@features/learning';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { readErrorKind } from '../utils/read-error-kind';

export interface CourseCompletionCardProps {
  readonly courseId: string;
}

function RowIcon({
  state,
}: {
  readonly state: 'done' | 'pending' | 'todo' | 'failed';
}): JSX.Element {
  if (state === 'done')
    return <CheckCircle2 className="size-4 text-success" aria-hidden />;
  if (state === 'pending')
    return <Loader2 className="size-4 text-muted-foreground" aria-hidden />;
  if (state === 'failed')
    return <XCircle className="size-4 text-destructive" aria-hidden />;
  return <Circle className="size-4 text-muted-foreground" aria-hidden />;
}

export function CourseCompletionCard({
  courseId,
}: CourseCompletionCardProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const fmt = useDateFormatter();
  const { buildHref } = useLearnerSurface();
  const query = useCourseCompletion(courseId);

  if (query.error) {
    const kind = readErrorKind(query.error);
    // Not enrolled / not found is already handled by the page above this card.
    if (kind === 'notFound' || kind === 'forbidden') return null;
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {t('learning:completion.loadFailed')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void query.refetch()}
        >
          {t('common:actions.retry')}
        </Button>
      </section>
    );
  }
  if (!query.data) {
    return <Skeleton className="h-40 w-full" />;
  }
  const completion: CourseCompletion = query.data;
  const activityHref = (itemId: string) =>
    buildHref(buildPath(LEARNER_ROUTES.playerActivity, { courseId, itemId }));
  const certificatesHref = buildHref(LEARNER_ROUTES.certificates);

  const lessonsRequired =
    completion.rule.lessons === 'all'
      ? completion.lessons.total
      : completion.rule.lessons === 'none'
        ? 0
        : Math.min(completion.rule.lessons, completion.lessons.total);
  const lessonsDone = completion.lessons.completed >= lessonsRequired;

  const certificate = completion.certificate;

  return (
    <section
      aria-labelledby="course-completion-heading"
      className={cn(
        'rounded-lg border p-5',
        completion.completed
          ? 'border-success/30 bg-success-surface'
          : 'border-border bg-card'
      )}
      data-testid="course-completion"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="course-completion-heading"
          className="font-display text-base font-semibold text-foreground"
        >
          {t('learning:completion.title')}
        </h2>
        <StatusBadge
          labelKey={`learning:completion.state.${completion.completionState}`}
          tone={
            completion.completed
              ? 'success'
              : completion.completionState === 'in_progress'
                ? 'info'
                : 'neutral'
          }
        />
      </div>

      {completion.completed ? (
        <p className="mt-2 text-sm text-foreground">
          {t('learning:completion.completedBanner')}
          {completion.completedAt ? (
            <span className="text-muted-foreground">
              {' '}
              · {fmt.dateTime(completion.completedAt)}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('learning:completion.inProgressHint')}
        </p>
      )}

      <ul
        className="mt-4 space-y-2 text-sm"
        aria-label={t('learning:completion.requirementsLabel')}
      >
        {lessonsRequired > 0 ? (
          <li className="flex items-center gap-2">
            <RowIcon state={lessonsDone ? 'done' : 'todo'} />
            <span className="tabular-nums text-foreground">
              {t('learning:completion.lessons', {
                completed: formatNumber(
                  Math.min(completion.lessons.completed, lessonsRequired),
                  language
                ),
                required: formatNumber(lessonsRequired, language),
              })}
            </span>
          </li>
        ) : null}

        {completion.quizzes
          .filter((quiz) => quiz.required)
          .map((quiz) => (
            <li key={quiz.quizId} className="flex flex-wrap items-center gap-2">
              <RowIcon
                state={
                  quiz.passed
                    ? 'done'
                    : quiz.pendingGrading
                      ? 'pending'
                      : 'todo'
                }
              />
              <Link
                to={activityHref(quiz.quizId)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {quiz.title}
              </Link>
              <span className="text-muted-foreground">
                {quiz.passed
                  ? t('learning:completion.quizPassed', {
                      score: formatNumber(
                        Math.round(quiz.effectiveScore ?? 0),
                        language
                      ),
                    })
                  : quiz.pendingGrading
                    ? t('learning:completion.quizPending')
                    : t('learning:completion.quizNotPassed')}
              </span>
            </li>
          ))}

        {completion.assignments
          .filter((assignment) => assignment.required)
          .map((assignment) => (
            <li
              key={assignment.assignmentId}
              className="flex flex-wrap items-center gap-2"
            >
              <RowIcon
                state={
                  assignment.graded
                    ? 'done'
                    : assignment.submitted
                      ? 'pending'
                      : 'todo'
                }
              />
              <Link
                to={activityHref(assignment.assignmentId)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {assignment.title}
              </Link>
              <span className="text-muted-foreground">
                {assignment.graded
                  ? typeof assignment.score === 'number'
                    ? t('learning:completion.assignmentGraded', {
                        score: formatNumber(assignment.score, language),
                      })
                    : t('learning:completion.assignmentGradedNoScore')
                  : assignment.submitted
                    ? t('learning:completion.assignmentSubmitted')
                    : t('learning:completion.assignmentNotSubmitted')}
              </span>
            </li>
          ))}

        {typeof completion.rule.minOverallScore === 'number' ? (
          <li className="flex items-center gap-2">
            <RowIcon
              state={
                typeof completion.overallScore === 'number' &&
                completion.overallScore >= completion.rule.minOverallScore
                  ? 'done'
                  : 'todo'
              }
            />
            <span className="tabular-nums text-foreground">
              {t('learning:completion.minOverallScore', {
                required: formatNumber(
                  completion.rule.minOverallScore,
                  language
                ),
                current:
                  typeof completion.overallScore === 'number'
                    ? formatNumber(
                        Math.round(completion.overallScore),
                        language
                      )
                    : '—',
              })}
            </span>
          </li>
        ) : null}
      </ul>

      <div
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm"
        data-testid="completion-certificate"
      >
        <Award className="size-4 text-muted-foreground" aria-hidden />
        {!certificate.enabled ? (
          <span className="text-muted-foreground">
            {t('learning:completion.certificate.unavailable')}
          </span>
        ) : certificate.status === 'issued' ? (
          <>
            <span className="text-foreground">
              {t('learning:completion.certificate.issued', {
                serial: certificate.serial ?? '',
              })}
              {certificate.renderStatus === 'pending' ? (
                <span className="text-muted-foreground">
                  {' '}
                  · {t('learning:completion.certificate.preparing')}
                </span>
              ) : null}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to={certificatesHref}>
                {t('learning:completion.certificate.open')}
              </Link>
            </Button>
          </>
        ) : certificate.status === 'revoked' ? (
          <span className="text-foreground">
            {t('learning:completion.certificate.revoked')}
          </span>
        ) : certificate.status === 'eligible' ? (
          <span className="flex items-center gap-1.5 text-foreground">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            {t('learning:completion.certificate.eligible')}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {typeof certificate.minScore === 'number'
              ? t('learning:completion.certificate.notYetMinScore', {
                  score: formatNumber(certificate.minScore, language),
                })
              : t('learning:completion.certificate.notYet')}
          </span>
        )}
      </div>

      {completion.completed ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="size-3.5" aria-hidden />
          {t('learning:completion.ratePlaceholder')}
        </p>
      ) : null}
    </section>
  );
}
