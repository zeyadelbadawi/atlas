/**
 * A quiz inside the player shell (P64 Phase 3 §E.2) — the state machine.
 *
 *   intro ──start──▶ running ──submit / expiry / integrity──▶ results
 *     ▲                                                          │
 *     └──────────────────── retake (when allowed) ───────────────┘
 *
 * WHICH STATE is decided from the server's attempt list, not from local
 * memory: an open attempt means "running" (a reload resumes it with the
 * session's saved answers and remaining time); a finished latest attempt
 * means "results" until the learner asks for a retake; anything else is
 * the intro. The one piece of local state is `wantsIntro`, set when the
 * learner presses Retake so the intro can show attempts left before a
 * new attempt is created.
 *
 * SUBMIT FAILURES ARE READ, NOT GUESSED. A submit refused with
 * `attemptExpired` / `attemptAlreadySubmitted` means the server already
 * finalised the attempt; the view moves to results and the results
 * request says why (auto-submitted, reason timeout). Anything else is
 * shown as the specific sentence for its message key.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useInvalidate, useAuth } from '@hooks';
import { quizKeys } from '@services/query';
import { apiErrorMessage, hasMessageKey } from '@utils';
import type { CourseSequenceItem, QuizAnswer, QuizAttempt } from '@types';
import {
  useQuiz,
  useQuizAttemptResults,
  useQuizAttemptSession,
  useQuizAttempts,
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from '@features/learning';
import { readErrorKind } from '../utils/read-error-kind';
import { QuizAttemptRunner } from './QuizAttemptRunner';
import { QuizIntroCard } from './QuizIntroCard';
import { QuizResultsView } from './QuizResultsView';

export interface QuizActivityViewProps {
  readonly courseId: string;
  readonly item: CourseSequenceItem;
  readonly onContinue?: () => void;
  readonly continueLabel?: string;
  readonly lessonHref?: (lessonId: string) => string;
}

const TERMINAL_SUBMIT_KEYS = [
  'errors.quiz.attemptExpired',
  'errors.quiz.attemptAlreadySubmitted',
  'errors.quiz.attemptInvalidated',
];

function latestAttempt(
  attempts: readonly QuizAttempt[]
): QuizAttempt | undefined {
  return [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
}

export function QuizActivityView({
  courseId,
  item,
  onContinue,
  continueLabel,
  lessonHref,
}: QuizActivityViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { invalidate } = useInvalidate();
  const quizId = item.id;

  const quizQuery = useQuiz(courseId, quizId);
  const attemptsQuery = useQuizAttempts(courseId, quizId);
  const attempts = useMemo(
    () => attemptsQuery.data?.items ?? [],
    [attemptsQuery.data]
  );
  const latest = latestAttempt(attempts);
  const openAttempt =
    latest &&
    (latest.status === 'in_progress' || latest.status === 'not_started')
      ? latest
      : undefined;

  const [wantsIntro, setWantsIntro] = useState(false);
  const [finishedAttemptId, setFinishedAttemptId] = useState<string | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  // A new quiz on screen starts from the server's truth again.
  useEffect(() => {
    setWantsIntro(false);
    setFinishedAttemptId(null);
    setSubmitError(undefined);
  }, [quizId]);

  const startAttempt = useStartQuizAttempt(courseId, quizId);
  const submitAttempt = useSubmitQuizAttempt(courseId, quizId);

  const resultsAttemptId =
    finishedAttemptId ??
    (latest && !openAttempt && !wantsIntro ? latest.id : undefined);

  const sessionQuery = useQuizAttemptSession(
    courseId,
    quizId,
    openAttempt?.id,
    {
      enabled: !!openAttempt && !finishedAttemptId,
    }
  );
  const resultsQuery = useQuizAttemptResults(
    courseId,
    quizId,
    resultsAttemptId
  );

  const refreshAttempts = useCallback(async () => {
    await invalidate(quizKeys.attempts(user?.id, courseId, quizId));
  }, [invalidate, user?.id, courseId, quizId]);

  const handleStart = async () => {
    setSubmitError(undefined);
    setFinishedAttemptId(null);
    try {
      await startAttempt.mutateAsync();
      setWantsIntro(false);
    } catch {
      // The error is rendered from the mutation state below.
    }
  };

  const handleSubmit = async (
    answers: readonly QuizAnswer[],
    revision: number
  ) => {
    if (!openAttempt) return;
    setSubmitError(undefined);
    try {
      const submitted = await submitAttempt.mutateAsync({
        attemptId: openAttempt.id,
        payload: { answers, revision },
      });
      setFinishedAttemptId(submitted.id);
    } catch (error) {
      if (TERMINAL_SUBMIT_KEYS.some((key) => hasMessageKey(error, key))) {
        // Already finalised server-side: the results say why.
        setFinishedAttemptId(openAttempt.id);
        await refreshAttempts();
        return;
      }
      setSubmitError(
        apiErrorMessage(t, i18n, error, {
          fallbackKey: 'learning:quiz.submitError',
        })
      );
      throw error;
    }
  };

  const handleFinished = async () => {
    if (openAttempt) setFinishedAttemptId(openAttempt.id);
    await refreshAttempts();
  };

  /* ---------- render ---------- */

  if (quizQuery.error) {
    return (
      <ErrorState
        kind={readErrorKind(quizQuery.error)}
        onRetry={() => void quizQuery.refetch()}
      />
    );
  }
  if (attemptsQuery.error) {
    return (
      <ErrorState
        kind={readErrorKind(attemptsQuery.error)}
        onRetry={() => void attemptsQuery.refetch()}
      />
    );
  }
  if (!quizQuery.data || attemptsQuery.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  const quiz = quizQuery.data;

  // Results.
  if (resultsAttemptId) {
    if (resultsQuery.error) {
      return (
        <ErrorState
          kind={readErrorKind(resultsQuery.error)}
          onRetry={() => void resultsQuery.refetch()}
        />
      );
    }
    if (!resultsQuery.data) {
      return (
        <div className="space-y-4" role="status" aria-busy="true">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </div>
      );
    }
    return (
      <QuizResultsView
        quiz={quiz}
        results={resultsQuery.data}
        attempts={attempts}
        onRetake={
          resultsQuery.data.canRetry
            ? () => {
                setFinishedAttemptId(null);
                setWantsIntro(true);
              }
            : undefined
        }
        onContinue={onContinue}
        continueLabel={continueLabel}
        lessonHref={lessonHref}
      />
    );
  }

  // Running.
  if (openAttempt) {
    if (sessionQuery.error) {
      // A session refused because the attempt is over on the server
      // (finalised by the deadline job while this tab was away) is not
      // an error: it is the results screen.
      if (
        TERMINAL_SUBMIT_KEYS.some((key) =>
          hasMessageKey(sessionQuery.error, key)
        )
      ) {
        setFinishedAttemptId(openAttempt.id);
        return <Skeleton className="h-48 w-full" />;
      }
      return (
        <ErrorState
          kind={readErrorKind(sessionQuery.error)}
          onRetry={() => void sessionQuery.refetch()}
        />
      );
    }
    if (!sessionQuery.data) {
      return (
        <div className="space-y-4" role="status" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (sessionQuery.data.status !== 'in_progress') {
      // The session answered but the attempt is already over.
      setFinishedAttemptId(openAttempt.id);
      return <Skeleton className="h-48 w-full" />;
    }
    return (
      <QuizAttemptRunner
        key={sessionQuery.data.attemptId}
        courseId={courseId}
        quizId={quizId}
        session={sessionQuery.data}
        onSubmit={handleSubmit}
        isSubmitting={submitAttempt.isPending}
        onFinished={() => void handleFinished()}
        submitError={submitError}
      />
    );
  }

  // Intro.
  const startError = startAttempt.error
    ? apiErrorMessage(t, i18n, startAttempt.error, {
        fallbackKey: 'learning:quiz.startError',
      })
    : undefined;
  const isLocked = item.state === 'locked';

  return (
    <QuizIntroCard
      quiz={quiz}
      attempts={attempts}
      resuming={false}
      canStart={!isLocked}
      onStart={() => void handleStart()}
      isStarting={startAttempt.isPending}
      errorMessage={startError}
    />
  );
}
