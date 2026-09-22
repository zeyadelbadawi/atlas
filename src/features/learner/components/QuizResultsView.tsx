/**
 * Results per disclosure policy (P64 Phase 3 §E.2).
 *
 * The server already removed what the policy hides; this view renders
 * what arrived and says, in words, what is being withheld and until
 * when ("Your score will be shown after the due date"). An
 * auto-submitted attempt leads with the reason, in the exact copy the
 * plan mandates for a timeout, and every branch ends with a way forward:
 * Continue to the next activity, and Retake only when allowed and useful.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import { MIRROR_IN_RTL, cn, formatNumber } from '@utils';
import type {
  LanguageCode,
  Quiz,
  QuizAttempt,
  QuizAttemptResults,
  QuizResultQuestion,
} from '@types';
import { getQuizAttemptStatusTone } from '@features/learning';

export interface QuizResultsViewProps {
  readonly quiz: Quiz;
  readonly results: QuizAttemptResults;
  readonly attempts: readonly QuizAttempt[];
  readonly onRetake?: () => void;
  readonly isStartingRetake?: boolean;
  readonly onContinue?: () => void;
  readonly continueLabel?: string;
  readonly lessonHref?: (lessonId: string) => string;
}

function disclosureKey(policy: Quiz['settings']['showScore']): string {
  return `learning:quiz.results.withheld.${policy}`;
}

function AnswerLine({
  question,
  language,
}: {
  readonly question: QuizResultQuestion;
  readonly language: LanguageCode;
}): JSX.Element {
  const { t } = useTranslation();
  const isText = question.type === 'short_answer' || question.type === 'essay';
  const yours = question.yourAnswer;

  return (
    <div className="mt-2 space-y-1 text-sm">
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">
          {t('learning:quiz.results.yourAnswer')}:
        </span>{' '}
        {!question.answered ? (
          t('learning:quiz.results.notAnswered')
        ) : isText ? (
          <span className="whitespace-pre-line">{yours?.text}</span>
        ) : (yours?.selectedOptionIds ?? []).length > 0 ? (
          t('learning:quiz.results.optionsSelected', {
            count: yours?.selectedOptionIds?.length ?? 0,
          })
        ) : (
          t('learning:quiz.results.notAnswered')
        )}
      </p>
      {question.acceptedAnswers && question.acceptedAnswers.length > 0 ? (
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            {t('learning:quiz.results.acceptedAnswers')}:
          </span>{' '}
          {question.acceptedAnswers.join(' · ')}
        </p>
      ) : null}
      {question.correctOptionIds && !isText ? (
        <p className="text-muted-foreground">
          {t('learning:quiz.results.correctOptionsCount', {
            count: question.correctOptionIds.length,
          })}
        </p>
      ) : null}
      {typeof question.pointsAwarded === 'number' ? (
        <p className="tabular-nums text-muted-foreground">
          {t('learning:quiz.results.pointsAwarded', {
            awarded: formatNumber(question.pointsAwarded, language),
            total: formatNumber(question.points, language),
          })}
        </p>
      ) : null}
      {question.explanation ? (
        <p className="rounded-md bg-muted/50 p-2 text-foreground">
          <span className="font-medium">
            {t('learning:quiz.results.explanation')}:
          </span>{' '}
          <span className="whitespace-pre-line">{question.explanation}</span>
        </p>
      ) : null}
    </div>
  );
}

export function QuizResultsView({
  quiz,
  results,
  attempts,
  onRetake,
  isStartingRetake,
  onContinue,
  continueLabel,
  lessonHref,
}: QuizResultsViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const language = i18n.language as LanguageCode;

  const scoreShown =
    results.disclosure.score && typeof results.score === 'number';
  const pending = results.gradingStatus === 'pending';
  const passed = results.passed === true;
  const invalidated = results.status === 'invalidated';

  return (
    <div className="space-y-4" data-testid="quiz-results">
      {results.autoSubmitted ? (
        <Alert data-testid="auto-submit-notice">
          {results.autoSubmittedReason === 'integrity' ? (
            <ShieldAlert className="size-4" aria-hidden />
          ) : (
            <Clock className="size-4" aria-hidden />
          )}
          <AlertTitle>
            {results.autoSubmittedReason === 'integrity'
              ? t('learning:quiz.results.autoSubmittedIntegrityTitle')
              : t('learning:quiz.results.timeRanOutTitle')}
          </AlertTitle>
          <AlertDescription>
            {results.autoSubmittedReason === 'integrity'
              ? t('learning:quiz.results.autoSubmittedIntegrity')
              : t('learning:quiz.results.timeRanOut')}
          </AlertDescription>
        </Alert>
      ) : null}

      {invalidated ? (
        <Alert>
          <XCircle className="size-4" aria-hidden />
          <AlertTitle>{t('learning:quiz.results.invalidatedTitle')}</AlertTitle>
          <AlertDescription>
            {t('learning:quiz.results.invalidated')}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t('learning:quiz.resultTitle')}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {pending ? (
            <>
              <Loader2 className="size-6 text-muted-foreground" aria-hidden />
              <StatusBadge
                labelKey="learning:quiz.results.awaitingGrading"
                tone="warning"
              />
            </>
          ) : scoreShown ? (
            <>
              {passed ? (
                <CheckCircle2 className="size-8 text-success" aria-hidden />
              ) : (
                <XCircle className="size-8 text-destructive" aria-hidden />
              )}
              <StatusBadge
                labelKey={
                  passed ? 'learning:quiz.passed' : 'learning:quiz.failed'
                }
                tone={getQuizAttemptStatusTone(passed ? 'passed' : 'failed')}
              />
            </>
          ) : (
            <>
              <HelpCircle
                className="size-6 text-muted-foreground"
                aria-hidden
              />
              <StatusBadge
                labelKey="learning:quiz.results.submittedBadge"
                tone="info"
              />
            </>
          )}
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {scoreShown ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:quiz.results.score')}
              </dt>
              <dd
                className="text-sm font-medium tabular-nums text-foreground"
                data-testid="quiz-score"
              >
                {t('learning:quiz.intro.percent', {
                  value: formatNumber(Math.round(results.score ?? 0), language),
                })}
                {typeof results.pointsEarned === 'number' &&
                typeof results.pointsTotal === 'number'
                  ? ` (${t('learning:quiz.results.pointsAwarded', {
                      awarded: formatNumber(results.pointsEarned, language),
                      total: formatNumber(results.pointsTotal, language),
                    })})`
                  : null}
              </dd>
            </div>
          ) : !pending ? (
            <div className="sm:col-span-2">
              <dt className="sr-only">{t('learning:quiz.results.score')}</dt>
              <dd className="text-sm text-muted-foreground">
                {t(disclosureKey(quiz.settings.showScore))}
              </dd>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <dd className="text-sm text-muted-foreground">
                {t('learning:quiz.results.awaitingGradingDescription')}
              </dd>
            </div>
          )}
          {typeof results.passingScore === 'number' ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:quiz.intro.passingScore')}
              </dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {t('learning:quiz.intro.percent', {
                  value: formatNumber(results.passingScore, language),
                })}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('learning:quiz.results.attempt')}
            </dt>
            <dd className="text-sm font-medium tabular-nums text-foreground">
              {t('learning:quiz.attemptNumber', {
                number: formatNumber(results.attemptNumber, language),
              })}
              {results.submittedAt
                ? ` · ${fmt.dateTime(results.submittedAt)}`
                : null}
            </dd>
          </div>
          {typeof results.effectiveScore === 'number' &&
          results.attemptsUsed > 1 ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:quiz.results.effectiveScore', {
                  policy: t(
                    `learning:quiz.intro.gradingPolicies.${quiz.settings.gradingPolicy}`
                  ),
                })}
              </dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {t('learning:quiz.intro.percent', {
                  value: formatNumber(
                    Math.round(results.effectiveScore),
                    language
                  ),
                })}
              </dd>
            </div>
          ) : null}
          {results.isLate ? (
            <div className="sm:col-span-2">
              <dd className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden />
                {t('learning:quiz.results.late')}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {results.disclosure.answers || results.disclosure.score ? (
        <section aria-labelledby="quiz-review-heading" className="space-y-3">
          <h3
            id="quiz-review-heading"
            className="font-display text-sm font-semibold text-foreground"
          >
            {t('learning:quiz.results.reviewTitle')}
          </h3>
          {!results.disclosure.answers ? (
            <p className="text-sm text-muted-foreground">
              {t(
                `learning:quiz.results.answersWithheld.${quiz.settings.showAnswers}`
              )}
            </p>
          ) : null}
          <ol className="space-y-3">
            {results.questions.map((question, index) => {
              const Icon = question.needsManualGrading
                ? Loader2
                : question.correct === true
                  ? CheckCircle2
                  : question.correct === false
                    ? XCircle
                    : Circle;
              const iconTone = question.needsManualGrading
                ? 'text-muted-foreground'
                : question.correct === true
                  ? 'text-success'
                  : question.correct === false
                    ? 'text-destructive'
                    : 'text-muted-foreground';
              const verdictKey = question.needsManualGrading
                ? 'learning:quiz.results.verdict.pending'
                : question.correct === true
                  ? 'learning:quiz.results.verdict.correct'
                  : question.correct === false
                    ? 'learning:quiz.results.verdict.incorrect'
                    : 'learning:quiz.results.verdict.unknown';
              return (
                <li
                  key={question.questionId}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={cn('mt-0.5 size-5 shrink-0', iconTone)}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {t('learning:quiz.questionOf', {
                          current: formatNumber(index + 1, language),
                          total: formatNumber(
                            results.questions.length,
                            language
                          ),
                        })}
                        {' · '}
                        {t(verdictKey)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm font-medium text-foreground">
                        {question.prompt}
                      </p>
                      <AnswerLine question={question} language={language} />
                      {question.relatedLessonId && lessonHref ? (
                        <Link
                          to={lessonHref(question.relatedLessonId)}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t('learning:quiz.results.reviewLesson')}
                          <ArrowRight
                            className={cn('size-4', MIRROR_IN_RTL)}
                            aria-hidden
                          />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {attempts.length > 1 ? (
        <section aria-labelledby="quiz-history-heading">
          <h3
            id="quiz-history-heading"
            className="font-display text-sm font-semibold text-foreground"
          >
            {t('learning:quiz.results.historyTitle')}
          </h3>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span className="text-foreground">
                  {t('learning:quiz.attemptNumber', {
                    number: formatNumber(attempt.attemptNumber, language),
                  })}
                  {attempt.submittedAt ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {fmt.dateTime(attempt.submittedAt)}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {typeof attempt.score === 'number' ? (
                    <span className="text-foreground">
                      {t('learning:quiz.intro.percent', {
                        value: formatNumber(
                          Math.round(attempt.score),
                          language
                        ),
                      })}
                    </span>
                  ) : null}
                  <StatusBadge
                    labelKey={`learning:quiz.attemptStatus.${attempt.status}`}
                    tone={getQuizAttemptStatusTone(attempt.status)}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {onContinue ? (
          <Button onClick={onContinue} data-testid="quiz-continue">
            {continueLabel ?? t('learning:quiz.results.continue')}
            <ArrowRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          </Button>
        ) : null}
        {results.canRetry && onRetake ? (
          <Button
            variant="outline"
            onClick={onRetake}
            disabled={isStartingRetake}
            data-testid="quiz-retake"
          >
            {isStartingRetake ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <RotateCcw className="size-4" aria-hidden />
            )}
            {t('learning:quiz.retryAvailable')}
          </Button>
        ) : !results.canRetry && !pending ? (
          <span className="text-sm text-muted-foreground">
            {results.attemptsAllowed !== null &&
            results.attemptsUsed >= results.attemptsAllowed
              ? t('learning:quiz.retryUnavailable')
              : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
