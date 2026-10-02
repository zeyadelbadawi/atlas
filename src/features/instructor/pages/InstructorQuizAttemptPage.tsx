/**
 * Instructor Quiz Attempt Page — the reviewer attempt detail (P64 Phase 3,
 * §E.7; design review "Reviewer attempt detail").
 *
 * Header facts → answers with correctness → manual grading form → event
 * timeline → actions. Everything shown is the server's account of the
 * attempt: the duration is the server's, the events carry the server
 * timestamp next to the client's, and the integrity copy says what was
 * *recorded*, never what was prevented.
 *
 * Grading and voiding are gated by `instructor.assignment.grade` for the
 * interface only; the server enforces the review tier regardless.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  HelpCircle,
  Loader2,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useServerValidation } from '@forms';
import { useDateFormatter, useLanguage, usePermissions } from '@hooks';
import {
  apiErrorMessage,
  cn,
  formatNumber,
  isolateNumericExpression,
  MIRROR_IN_RTL,
} from '@utils';
import { getQuizAttemptStatusTone } from '@features/learning';
import {
  useGradeQuizAttempt,
  useInvalidateQuizAttempt,
  useQuizAttemptReview,
} from '../hooks';
import {
  buildManualGradesSchema,
  voidAttemptSchema,
  type ManualGradesFormData,
  type VoidAttemptFormData,
} from '../schemas/instructor.schemas';
import {
  attemptEventLabelKey,
  autoSubmittedReasonLabelKey,
  formatAttemptDuration,
  sortEventsByServerTime,
} from '../utils/attempt-review.utils';
import { TEXT_QUESTION_TYPES } from '@types';
import type {
  IntegritySignal,
  QuizAttemptReview,
  QuizReviewAnswer,
} from '@types';
import { IntegritySignalsCard } from '../components/IntegritySignalsCard';

/* ---------- small presentational pieces ---------- */

interface FactProps {
  readonly label: string;
  readonly children: ReactNode;
}

function Fact({ label, children }: FactProps): JSX.Element {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

type QuestionOutcome =
  'correct' | 'incorrect' | 'awaitingGrading' | 'graded' | 'unanswered';

function questionOutcome(question: QuizReviewAnswer): QuestionOutcome {
  if (!question.answered) return 'unanswered';
  if (question.needsManualGrading) {
    return question.manualPoints === null ? 'awaitingGrading' : 'graded';
  }
  if (question.correct === true) return 'correct';
  if (question.correct === false) return 'incorrect';
  return 'awaitingGrading';
}

const OUTCOME_ICON: Record<QuestionOutcome, typeof Check> = {
  correct: CheckCircle2,
  incorrect: XCircle,
  awaitingGrading: HelpCircle,
  graded: CheckCircle2,
  unanswered: MinusCircle,
};

const OUTCOME_CLASS: Record<QuestionOutcome, string> = {
  correct: 'text-success',
  incorrect: 'text-destructive',
  awaitingGrading: 'text-warning',
  graded: 'text-info',
  unanswered: 'text-muted-foreground',
};

interface QuestionCardProps {
  readonly question: QuizReviewAnswer;
  readonly index: number;
}

function QuestionCard({ question, index }: QuestionCardProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const outcome = questionOutcome(question);
  const OutcomeIcon = OUTCOME_ICON[outcome];
  const isText = TEXT_QUESTION_TYPES.includes(question.type);
  const selected = new Set(question.selectedOptionIds ?? []);

  return (
    <li className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {t('instructor:attemptReview.answers.questionNumber', {
              number: formatNumber(index + 1, language),
            })}
            {' · '}
            {t(`instructor:attemptReview.questionType.${question.type}`)}
            {' · '}
            {t('instructor:attemptReview.answers.pointsWorth', {
              points: formatNumber(question.points, language),
            })}
          </p>
          <p
            dir="auto"
            className="whitespace-pre-wrap text-sm font-medium text-foreground"
          >
            {question.prompt}
          </p>
        </div>
        <p
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-medium',
            OUTCOME_CLASS[outcome]
          )}
        >
          <OutcomeIcon className="size-4" aria-hidden />
          {t(`instructor:attemptReview.answers.result.${outcome}`)}
        </p>
      </div>

      {isText ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('instructor:attemptReview.answers.learnerText')}
          </p>
          {question.text ? (
            <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
              {question.text}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('instructor:attemptReview.answers.noAnswer')}
            </p>
          )}
          {question.type === 'short_answer' &&
          question.acceptedAnswers &&
          question.acceptedAnswers.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('instructor:attemptReview.answers.acceptedAnswers')}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {question.acceptedAnswers.map((answer) => (
                  <li
                    key={answer}
                    className="rounded-md border border-border px-2 py-0.5 text-sm"
                  >
                    {answer}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {question.options.map((option) => {
            const isSelected = selected.has(option.id);
            const marker =
              isSelected && option.isCorrect
                ? {
                    Icon: CheckCircle2,
                    className: 'text-success',
                    key: 'selectedCorrect',
                  }
                : isSelected
                  ? {
                      Icon: XCircle,
                      className: 'text-destructive',
                      key: 'selectedIncorrect',
                    }
                  : option.isCorrect
                    ? {
                        Icon: Check,
                        className: 'text-success',
                        key: 'correctAnswer',
                      }
                    : {
                        Icon: Circle,
                        className: 'text-muted-foreground',
                        key: 'notSelected',
                      };
            return (
              <li
                key={option.id}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm',
                  isSelected ? 'border-foreground/30 bg-muted' : 'border-border'
                )}
              >
                <span className="flex items-start gap-2">
                  <marker.Icon
                    className={cn('mt-0.5 size-4 shrink-0', marker.className)}
                    aria-hidden
                  />
                  <span className="text-foreground">{option.label}</span>
                </span>
                {/* The words carry the meaning and the icon the colour: small
                    coloured text on the tinted row fell below 4.5:1 (axe). */}
                <span className="shrink-0 text-xs font-medium text-foreground">
                  {t(`instructor:attemptReview.answers.${marker.key}`)}
                </span>
              </li>
            );
          })}
          {!question.answered ? (
            <li className="text-sm text-muted-foreground">
              {t('instructor:attemptReview.answers.noAnswer')}
            </li>
          ) : null}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {t('instructor:attemptReview.answers.pointsAwarded', {
          awarded: formatNumber(question.pointsAwarded, language),
          points: formatNumber(question.points, language),
        })}
      </p>
    </li>
  );
}

/* ---------- manual grading ---------- */

interface ManualGradingCardProps {
  readonly courseId: string;
  readonly quizId: string;
  readonly attempt: QuizAttemptReview;
  readonly canGrade: boolean;
}

function ManualGradingCard({
  courseId,
  quizId,
  attempt,
  canGrade,
}: ManualGradingCardProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();

  const manualQuestions = useMemo(
    () =>
      attempt.questions
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => question.needsManualGrading),
    [attempt.questions]
  );

  const schema = useMemo(
    () =>
      buildManualGradesSchema(
        Object.fromEntries(
          manualQuestions.map(({ question }) => [
            question.questionId,
            question.points,
          ])
        )
      ),
    [manualQuestions]
  );

  const defaults = useMemo<ManualGradesFormData>(
    () => ({
      grades: Object.fromEntries(
        manualQuestions
          .filter(({ question }) => question.manualPoints !== null)
          .map(({ question }) => [
            question.questionId,
            question.manualPoints as number,
          ])
      ),
    }),
    [manualQuestions]
  );

  const form = useForm<ManualGradesFormData>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    mutateAsync: gradeAttempt,
    isPending,
    error: mutationError,
  } = useGradeQuizAttempt(courseId, quizId);
  useServerValidation(form, mutationError);

  useEffect(() => {
    form.reset(defaults);
    // Re-seed only when the attempt's grades change on the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  if (manualQuestions.length === 0) return null;

  const isVoided = attempt.status === 'invalidated';
  const allIn = manualQuestions.every(
    ({ question }) => question.manualPoints !== null
  );

  const onSubmit = async (data: ManualGradesFormData) => {
    try {
      const result = await gradeAttempt({
        attemptId: attempt.id,
        payload: {
          grades: manualQuestions.map(({ question }) => ({
            questionId: question.questionId,
            points: data.grades[question.questionId],
          })),
        },
      });
      toast({
        title: t('instructor:attemptReview.grading.saved'),
        description:
          result.gradingStatus === 'graded'
            ? t('instructor:attemptReview.grading.savedFinal')
            : t('instructor:attemptReview.grading.savedPending'),
      });
    } catch (error) {
      toast({
        title: t('instructor:attemptReview.grading.error'),
        description: apiErrorMessage(t, i18n, error),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('instructor:attemptReview.grading.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('instructor:attemptReview.grading.description')}
        </p>
        {allIn && attempt.gradingStatus === 'graded' ? (
          <Alert>
            <CheckCircle2 className="size-4" aria-hidden />
            <AlertDescription>
              {t('instructor:attemptReview.grading.complete')}
            </AlertDescription>
          </Alert>
        ) : null}
        {isVoided ? (
          <p className="text-sm text-muted-foreground">
            {t('instructor:attemptReview.grading.unavailable')}
          </p>
        ) : !canGrade ? (
          <p className="text-sm text-muted-foreground">
            {t('instructor:attemptReview.grading.viewOnly')}
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {manualQuestions.map(({ question, index }) => (
                <FormField
                  key={question.questionId}
                  control={form.control}
                  name={`grades.${question.questionId}` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('instructor:attemptReview.grading.pointsLabel', {
                          number: formatNumber(index + 1, language),
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={question.points}
                          step="any"
                          className="max-w-40"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {isolateNumericExpression(
                          t('instructor:attemptReview.grading.pointsHint', {
                            max: formatNumber(question.points, language),
                          })
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('instructor:attemptReview.grading.save')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- void ---------- */

interface VoidAttemptDialogProps {
  readonly courseId: string;
  readonly quizId: string;
  readonly attempt: QuizAttemptReview;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function VoidAttemptDialog({
  courseId,
  quizId,
  attempt,
  open,
  onOpenChange,
}: VoidAttemptDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const { confirm } = useConfirmDialog();

  const form = useForm<VoidAttemptFormData>({
    resolver: zodResolver(voidAttemptSchema),
    defaultValues: { reason: '' },
  });

  const {
    mutateAsync: voidAttempt,
    isPending,
    error: mutationError,
  } = useInvalidateQuizAttempt(courseId, quizId);
  useServerValidation(form, mutationError);

  const onSubmit = async (data: VoidAttemptFormData) => {
    const confirmed = await confirm({
      titleKey: 'instructor:attemptReview.void.confirm.title',
      descriptionKey: 'instructor:attemptReview.void.confirm.description',
      confirmLabelKey: 'instructor:attemptReview.void.confirm.confirmLabel',
      cancelLabelKey: 'instructor:attemptReview.void.confirm.cancelLabel',
      values: {
        number: formatNumber(attempt.attemptNumber, language),
        student: attempt.studentName,
      },
      intent: 'destructive',
    });
    if (!confirmed) return;
    try {
      await voidAttempt({
        attemptId: attempt.id,
        payload: { reason: data.reason },
      });
      toast({ title: t('instructor:attemptReview.void.success') });
      form.reset({ reason: '' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('instructor:attemptReview.void.error'),
        description: apiErrorMessage(t, i18n, error),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('instructor:attemptReview.void.title')}</DialogTitle>
          <DialogDescription>
            {t('instructor:attemptReview.void.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('instructor:attemptReview.void.reasonLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t(
                        'instructor:attemptReview.void.reasonPlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                {t('instructor:attemptReview.void.cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('instructor:attemptReview.void.continue')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- page ---------- */

export default function InstructorQuizAttemptPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { language } = useLanguage();
  const { hasPermission } = usePermissions();
  const canGrade = hasPermission('instructor.assignment.grade');
  const { courseId, quizId, attemptId } = useParams<{
    courseId: string;
    quizId: string;
    attemptId: string;
  }>();
  const [voidOpen, setVoidOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<IntegritySignal | null>(null);
  const [showHeartbeats, setShowHeartbeats] = useState(false);

  const {
    data: attempt,
    isLoading,
    error,
    refetch,
  } = useQuizAttemptReview(courseId ?? '', quizId ?? '', attemptId ?? '');

  const events = useMemo(
    () => (attempt ? sortEventsByServerTime(attempt.events) : []),
    [attempt]
  );
  const highlightedIds = useMemo(
    () => new Set(highlighted?.eventIds ?? []),
    [highlighted]
  );
  const heartbeatCount = events.filter((e) => e.type === 'heartbeat').length;
  // Heartbeats are connection checks: hidden unless asked for, or evidence.
  const shownEvents = events.filter(
    (e) => showHeartbeats || e.type !== 'heartbeat' || highlightedIds.has(e.id)
  );
  // Bring the first piece of evidence into view.
  useEffect(() => {
    const first = highlighted?.eventIds[0];
    if (first) {
      document
        .getElementById(`attempt-event-${first}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlighted]);

  const resultsPath =
    courseId && quizId
      ? buildPath(DASHBOARD_ROUTES.instructorQuizResults, { courseId, quizId })
      : DASHBOARD_ROUTES.instructorCourses;

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link to={resultsPath}>
        <ArrowLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
        {t('instructor:attemptReview.backToResults')}
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  if (error || !attempt || !courseId || !quizId) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="instructor:attemptReview.title"
          actions={backLink}
        />
        <ErrorState kind={error?.kind} onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const number = (value: number) => formatNumber(value, language);
  const formatPart = (value: number, minimumDigits: number) =>
    formatNumber(value, language, {
      minimumIntegerDigits: minimumDigits,
      useGrouping: false,
    });
  const duration = formatAttemptDuration(
    attempt.startedAt,
    attempt.submittedAt,
    attempt.durationSeconds,
    formatPart
  );
  const autoReasonKey = autoSubmittedReasonLabelKey(
    attempt.autoSubmittedReason
  );
  const isVoided = attempt.status === 'invalidated';
  const notAvailable = t('instructor:attemptReview.notAvailable');

  return (
    <PageContainer>
      <PageHeader
        title={attempt.studentName}
        titleKey="instructor:attemptReview.title"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              labelKey={`instructor:studentProgress.quizStatus.${attempt.status}`}
              tone={getQuizAttemptStatusTone(attempt.status)}
            />
            {backLink}
          </div>
        }
      />

      <div className="space-y-6">
        {isVoided ? (
          <Alert variant="destructive">
            <Ban className="size-4" aria-hidden />
            <AlertDescription>
              {t('instructor:attemptReview.void.alreadyVoided')}
              {attempt.invalidationReason
                ? ` ${attempt.invalidationReason}`
                : ''}
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              {t('instructor:attemptReview.attemptNumber', {
                number: number(attempt.attemptNumber),
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label={t('instructor:attemptReview.facts.student')}>
                <span className="block">{attempt.studentName}</span>
                <span className="block text-xs text-muted-foreground">
                  {attempt.studentEmail}
                </span>
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.status')}>
                <StatusBadge
                  labelKey={`instructor:studentProgress.quizStatus.${attempt.status}`}
                  tone={getQuizAttemptStatusTone(attempt.status)}
                />
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.score')}>
                {typeof attempt.score === 'number'
                  ? formatNumber(Math.round(attempt.score) / 100, language, {
                      style: 'percent',
                    })
                  : notAvailable}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.points')}>
                {attempt.pointsEarned !== null && attempt.pointsTotal !== null
                  ? t('instructor:attemptReview.pointsValue', {
                      earned: number(attempt.pointsEarned),
                      total: number(attempt.pointsTotal),
                    })
                  : notAvailable}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.duration')}>
                {duration ? (
                  <span className="tabular-nums">
                    {isolateNumericExpression(duration)}
                  </span>
                ) : (
                  notAvailable
                )}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.grading')}>
                {t(
                  `instructor:quizResults.gradingStatus.${attempt.gradingStatus}`
                )}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.startedAt')}>
                {attempt.startedAt
                  ? fmt.dateTime(attempt.startedAt)
                  : notAvailable}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.submittedAt')}>
                {attempt.submittedAt
                  ? fmt.dateTime(attempt.submittedAt)
                  : notAvailable}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.late')}>
                {attempt.isLate ? (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <Clock className="size-3.5" aria-hidden />
                    {t('instructor:attemptReview.lateYes')}
                  </span>
                ) : (
                  t('instructor:attemptReview.lateNo')
                )}
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.violations')}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  {attempt.integrityMode === 'off'
                    ? t('instructor:attemptReview.integrityNotMonitored')
                    : t('instructor:attemptReview.violationsRecorded', {
                        count: attempt.violationCount,
                      })}
                  {attempt.integrityFlagged ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Flag className="size-3.5" aria-hidden />
                      {t('instructor:attemptReview.flagged')}
                    </span>
                  ) : null}
                </span>
              </Fact>
              <Fact label={t('instructor:attemptReview.facts.autoSubmitted')}>
                {!attempt.autoSubmitted
                  ? t('instructor:attemptReview.notAutoSubmitted')
                  : autoReasonKey
                    ? t(autoReasonKey)
                    : (attempt.autoSubmittedReason ?? notAvailable)}
              </Fact>
              {attempt.gradedByName ? (
                <Fact label={t('instructor:attemptReview.facts.gradedBy')}>
                  {attempt.gradedByName}
                </Fact>
              ) : null}
              {attempt.invalidatedByName ? (
                <Fact label={t('instructor:attemptReview.facts.invalidatedBy')}>
                  {attempt.invalidatedByName}
                </Fact>
              ) : null}
              {attempt.invalidatedAt ? (
                <Fact label={t('instructor:attemptReview.facts.invalidatedAt')}>
                  {fmt.dateTime(attempt.invalidatedAt)}
                </Fact>
              ) : null}
              {attempt.invalidationReason ? (
                <Fact
                  label={t('instructor:attemptReview.facts.invalidationReason')}
                >
                  {attempt.invalidationReason}
                </Fact>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:attemptReview.answers.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {attempt.questions.map((question, index) => (
                <QuestionCard
                  key={question.questionId}
                  question={question}
                  index={index}
                />
              ))}
            </ol>
          </CardContent>
        </Card>

        <ManualGradingCard
          courseId={courseId}
          quizId={quizId}
          attempt={attempt}
          canGrade={canGrade}
        />

        {attempt.integrityMode !== 'off' ? (
          <IntegritySignalsCard
            signals={attempt.signals}
            policy={{
              mode: attempt.integrityMode,
              maxViolations: attempt.maxViolations,
              requireFullscreen: attempt.requireFullscreen,
            }}
            formatPart={formatPart}
            highlighted={highlighted?.key ?? null}
            onShowEvidence={setHighlighted}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:attemptReview.events.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('instructor:attemptReview.events.description')}
            </p>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {attempt.integrityMode === 'off'
                  ? t('instructor:attemptReview.events.notMonitored')
                  : t('instructor:attemptReview.events.empty')}
              </p>
            ) : (
              <>
                {highlighted ? (
                  <p role="status" className="text-xs text-foreground">
                    {t('instructor:attemptReview.events.highlighted', {
                      signal: t(
                        `instructor:attemptReview.signals.key.${highlighted.key}.title`
                      ),
                    })}
                  </p>
                ) : null}
                {heartbeatCount > 0 ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    aria-pressed={showHeartbeats}
                    onClick={() => setShowHeartbeats((value) => !value)}
                  >
                    {showHeartbeats
                      ? t('instructor:attemptReview.events.hideHeartbeats')
                      : t('instructor:attemptReview.events.showHeartbeats', {
                          count: heartbeatCount,
                        })}
                  </Button>
                ) : null}
                <ol className="divide-y divide-border">
                  {shownEvents.map((event) => (
                    <li
                      key={event.id}
                      id={`attempt-event-${event.id}`}
                      data-highlighted={
                        highlightedIds.has(event.id) || undefined
                      }
                      className={cn(
                        'flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2 text-sm',
                        highlightedIds.has(event.id) &&
                          'rounded-sm bg-accent px-2 ring-1 ring-ring'
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">
                          {t(attemptEventLabelKey(event.type))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('instructor:attemptReview.events.elapsed', {
                            time: isolateNumericExpression(
                              formatAttemptDuration(
                                attempt.startedAt,
                                event.serverAt,
                                null,
                                formatPart
                              ) ?? '0:00'
                            ),
                          })}
                        </p>
                        <p
                          className={cn(
                            'inline-flex items-center gap-1 text-xs',
                            event.counted
                              ? 'text-warning'
                              : 'text-muted-foreground'
                          )}
                        >
                          {event.counted ? (
                            <Flag className="size-3" aria-hidden />
                          ) : (
                            <MinusCircle className="size-3" aria-hidden />
                          )}
                          {event.counted
                            ? t('instructor:attemptReview.events.counted')
                            : t('instructor:attemptReview.events.ignored')}
                        </p>
                      </div>
                      <dl className="grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          <dt className="inline">
                            {t('instructor:attemptReview.events.serverAt')}
                            :{' '}
                          </dt>
                          <dd className="inline">
                            {fmt.dateTime(event.serverAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline">
                            {t('instructor:attemptReview.events.clientAt')}
                            :{' '}
                          </dt>
                          <dd className="inline">
                            {event.clientAt
                              ? fmt.dateTime(event.clientAt)
                              : notAvailable}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:attemptReview.actionsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canGrade ? (
              <p className="text-sm text-muted-foreground">
                {t('instructor:attemptReview.void.viewOnly')}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={!canGrade || isVoided}
                onClick={() => setVoidOpen(true)}
              >
                <Ban className="size-4" aria-hidden />
                {t('instructor:attemptReview.void.action')}
              </Button>
              {backLink}
            </div>
          </CardContent>
        </Card>
      </div>

      <VoidAttemptDialog
        courseId={courseId}
        quizId={quizId}
        attempt={attempt}
        open={voidOpen}
        onOpenChange={setVoidOpen}
      />
    </PageContainer>
  );
}
