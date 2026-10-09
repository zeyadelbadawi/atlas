/**
 * The attempt in progress (P64 Phase 3 §E.2, §E.3).
 *
 * Owns the local answer map and hands everything else to three hooks:
 * the clock (server offset, announcements, expiry), the autosave queue
 * (monotonic revisions, offline retry, flush on hide) and the integrity
 * layer (listeners per mode, batched events, the server's verdict).
 *
 * WHEN TIME RUNS OUT NOTHING IS DECIDED HERE. `onExpired` flushes the
 * last edit and asks the parent to finalise: the parent submits (the
 * server accepts a submit inside the grace window and otherwise answers
 * `attemptExpired`, which is the same outcome) and then shows the
 * results with the "Time ran out" notice. The runner never grades and
 * never marks an attempt failed.
 *
 * SUBMIT IS THE ONE CONFIRMATION, and it lists how many questions are
 * unanswered because that is the fact the learner needs to decide.
 *
 * FULL SCREEN (P4) is requested by the Start click (a user gesture —
 * browsers refuse it from an effect, which is why the old on-mount
 * request never worked) and owned by the parent's `useQuizFullscreen`.
 * Here: the exit policy (`fullscreenView`) — out of full screen, the
 * questions wait behind a gate until the learner returns; answers, autosave
 * and the timer carry on. Unsupported or refused is recorded for the
 * reviewer and never traps the learner.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@app/providers';
import { useAuth } from '@hooks';
import { deleteQuizJournal, loadQuizJournal } from '@services/offline';
import { MIRROR_IN_RTL, cn, formatNumber } from '@utils';
import type { LanguageCode, QuizAnswer, QuizAttemptSession } from '@types';
import { useAttemptClock } from '../hooks/useAttemptClock';
import { useQuizAutosave } from '../hooks/useQuizAutosave';
import { useQuizIntegrity } from '../hooks/useQuizIntegrity';
import {
  fullscreenView,
  type QuizFullscreenControl,
} from '../hooks/useQuizFullscreen';
import { QuizFullscreenGate } from './QuizFullscreenGate';
import {
  answeredCount,
  answersEqual,
  effectiveLayout,
  integrityWarns,
  toAnswerList,
  toAnswerMap,
  unansweredQuestionNumbers,
  type AnswerMap,
} from '../utils/quiz-attempt.utils';
import { WatermarkOverlay } from './WatermarkOverlay';
import { IntegrityWarningDialog } from './IntegrityWarningDialog';
import { QuizAttemptHeader } from './QuizAttemptHeader';
import { QuizNavigator } from './QuizNavigator';
import { QuizQuestionCard } from './QuizQuestionCard';

export interface QuizAttemptRunnerProps {
  readonly courseId: string;
  readonly quizId: string;
  readonly session: QuizAttemptSession;
  /** Submit the given answers with the given revision; resolves when the server answered (success or not). */
  readonly onSubmit: (
    answers: readonly QuizAnswer[],
    revision: number
  ) => Promise<void>;
  readonly isSubmitting: boolean;
  /** The server says the attempt is over (expired, auto-submitted, invalidated). */
  readonly onFinished: (reason: 'timeout' | 'integrity' | 'terminal') => void;
  readonly submitError?: string;
  /** Full-screen state and request, owned by the parent (the Start click requests it). */
  readonly fullscreen: QuizFullscreenControl;
}

export function QuizAttemptRunner({
  courseId,
  quizId,
  session,
  onSubmit,
  isSubmitting,
  onFinished,
  submitError,
  fullscreen,
}: QuizAttemptRunnerProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const questions = session.questions;
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    toAnswerMap(session.answers)
  );
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(() => new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [announcement, setAnnouncement] = useState<number | null>(null);
  const [serverNow, setServerNow] = useState(session.serverNow);
  const [deadlineAt, setDeadlineAt] = useState(session.deadlineAt);
  const [warning, setWarning] = useState<{
    violations: number;
    max: number;
  } | null>(null);
  const [bannerShown, setBannerShown] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  /*
   * Academy offline — an UNTIMED attempt's answers are journalled on this
   * device as the learner works (`useQuizAutosave`), so a reload or a closed
   * tab while offline loses nothing. A timed or strict-integrity attempt is
   * never journalled: its clock and completion are the server's alone.
   */
  const journalled =
    session.deadlineAt === null && session.settings.integrityMode !== 'strict';
  const journal = useMemo(
    () => (user ? { userId: user.id, timed: !journalled } : undefined),
    [user, journalled]
  );

  const finish = useCallback(
    (reason: 'timeout' | 'integrity' | 'terminal') => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (user) void deleteQuizJournal(user.id, session.attemptId);
      onFinishedRef.current(reason);
    },
    [user, session.attemptId]
  );

  /* ---------- layout ---------- */

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1024 : window.innerWidth
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const layout = effectiveLayout(session.settings.layout, viewportWidth);
  const paged = layout === 'one_per_page';

  /* ---------- autosave ---------- */

  const autosave = useQuizAutosave({
    courseId,
    quizId,
    attemptId: session.attemptId,
    initialRevision: session.revision,
    enabled: true,
    onSaved: (response) => {
      setServerNow(response.serverNow);
      if (response.deadlineAt !== deadlineAt)
        setDeadlineAt(response.deadlineAt);
    },
    onTerminal: () => finish('terminal'),
    confirmedAnswers: session.answers,
    // A stale save was rebased onto the server's newer copy: show exactly
    // what is now being saved.
    onRebased: (merged) => setAnswers(toAnswerMap(merged)),
    journal,
  });
  const { schedule } = autosave;

  // Restore a journal written on this device on top of the revision the
  // server still holds (edits made offline, then a reload). A journal older
  // than the server's copy is discarded: the server moved on since.
  useEffect(() => {
    if (!user || !journalled) return;
    let cancelled = false;
    void loadQuizJournal(user.id, session.attemptId).then((saved) => {
      if (cancelled || !saved) return;
      if (saved.baseRevision < session.revision) {
        void deleteQuizJournal(user.id, session.attemptId);
        return;
      }
      const restored = toAnswerMap(saved.answers);
      setAnswers(restored);
      schedule(toAnswerList(questions, restored));
    });
    return () => {
      cancelled = true;
    };
    // Once per attempt: later edits flow through `handleAnswer`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.attemptId]);

  const handleAnswer = useCallback(
    (answer: QuizAnswer) => {
      setAnswers((previous) => {
        if (answersEqual(previous[answer.questionId], answer)) return previous;
        const next = { ...previous, [answer.questionId]: answer };
        schedule(toAnswerList(questions, next));
        return next;
      });
    },
    [questions, schedule]
  );

  /* ---------- clock ---------- */

  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const finalize = useCallback(async () => {
    // Flush the last edit, then submit with the latest revision. The
    // server accepts a submit inside the grace window; after it, it
    // answers `attemptExpired` and the parent shows results either way.
    await autosave.flush();
    try {
      await submitRef.current(
        toAnswerList(questions, answersRef.current),
        autosave.currentRevision()
      );
    } finally {
      finish('timeout');
    }
  }, [autosave, questions, finish]);

  const clock = useAttemptClock({
    serverNow,
    deadlineAt,
    enabled: true,
    onExpired: () => void finalize(),
    onAnnounce: (seconds) => setAnnouncement(seconds),
  });

  /* ---------- integrity ---------- */

  const warns = integrityWarns(session.settings);
  const integrity = useQuizIntegrity({
    courseId,
    quizId,
    attemptId: session.attemptId,
    settings: session.settings,
    enabled: true,
    containerRef,
    onWarn: (violations, max) => {
      if (!warns) return;
      setWarning({ violations, max });
      // First warning: an inline banner. From the second on: the acknowledged dialog.
      if (!bannerShown) setBannerShown(true);
      else setDialogOpen(true);
    },
    onAutoSubmitted: () => finish('integrity'),
  });

  /* ---------- full screen ---------- */

  const fullscreenRequired =
    session.settings.requireFullscreen &&
    session.settings.integrityMode !== 'off';
  const [continuedWithout, setContinuedWithout] = useState(false);
  const view = fullscreenView({
    required: fullscreenRequired,
    supported: fullscreen.supported,
    active: fullscreen.active,
    lastResult: fullscreen.lastResult,
    continuedWithout,
  });
  // Unsupported, or the Start click's request refused: tell the reviewer once.
  const reportedUnavailableRef = useRef(false);
  const { recordFullscreenUnavailable } = integrity;
  useEffect(() => {
    if (!fullscreenRequired || reportedUnavailableRef.current) return;
    const reason = !fullscreen.supported
      ? 'unsupported'
      : fullscreen.lastResult === 'refused'
        ? 'refused'
        : null;
    if (!reason) return;
    reportedUnavailableRef.current = true;
    recordFullscreenUnavailable(reason);
  }, [
    fullscreenRequired,
    fullscreen.supported,
    fullscreen.lastResult,
    recordFullscreenUnavailable,
  ]);
  const enterFullscreen = () => {
    void fullscreen.request().then((result) => {
      if (result === 'refused') recordFullscreenUnavailable('refused');
    });
  };
  const gated = view === 'gate' || view === 'gate-refused';

  /* ---------- submit ---------- */

  const answered = answeredCount(questions, answers);
  const unanswered = useMemo(
    () => unansweredQuestionNumbers(questions, answers),
    [questions, answers]
  );

  const handleSubmit = async () => {
    const confirmed = await confirm({
      titleKey: 'learning:quiz.submitConfirm.title',
      descriptionKey:
        unanswered.length > 0
          ? 'learning:quiz.submitConfirm.descriptionUnanswered'
          : 'learning:quiz.submitConfirm.description',
      confirmLabelKey: 'learning:quiz.submitConfirm.confirmLabel',
      cancelLabelKey: 'learning:quiz.submitConfirm.cancelLabel',
      values: {
        count: unanswered.length,
        numbers: unanswered.map((n) => formatNumber(n, language)).join(', '),
      },
      intent: 'default',
    });
    if (!confirmed) return;
    await autosave.flush();
    await onSubmit(
      toAnswerList(questions, answers),
      autosave.currentRevision()
    );
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(questions.length - 1, index));
    setCurrentIndex(clamped);
    if (!paged) {
      document
        .getElementById(`quiz-question-${questions[clamped]?.id}-heading`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      containerRef.current?.scrollIntoView({ block: 'start' });
    }
  };

  const toggleFlag = (questionId: string) =>
    setFlagged((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

  const isLast = currentIndex >= questions.length - 1;
  const visible = paged ? [questions[currentIndex]].filter(Boolean) : questions;
  const watermarkText = user ? `${user.name} · ${user.email}` : '';

  return (
    <div
      ref={containerRef}
      className="relative space-y-4"
      data-testid="quiz-runner"
    >
      {session.settings.integrityMode !== 'off' && watermarkText ? (
        <WatermarkOverlay text={watermarkText} className="z-0" />
      ) : null}

      <QuizAttemptHeader
        remainingSeconds={clock.remaining}
        hideTimer={session.settings.hideTimer}
        answered={answered}
        total={questions.length}
        saveState={autosave.state}
        lastSavedAt={autosave.lastSavedAt ?? session.lastSavedAt}
        announcement={announcement}
      />

      {warning && bannerShown ? (
        <Alert
          className="border-warning/50 [&>svg]:text-warning"
          data-testid="integrity-banner"
        >
          <ShieldAlert className="size-4" aria-hidden />
          <AlertTitle>{t('learning:quiz.integrity.bannerTitle')}</AlertTitle>
          <AlertDescription>
            {session.settings.integrityMode === 'strict'
              ? t('learning:quiz.integrity.bannerStrict', {
                  count: warning.violations,
                  max: formatNumber(warning.max, language),
                })
              : t('learning:quiz.integrity.bannerWarn', {
                  count: warning.violations,
                })}
          </AlertDescription>
        </Alert>
      ) : null}

      {view !== 'none' ? (
        <QuizFullscreenGate
          view={view}
          onEnter={enterFullscreen}
          onContinueWithout={() => setContinuedWithout(true)}
        />
      ) : null}

      {gated ? null : (
        <>
          <QuizNavigator
            questions={questions}
            answers={answers}
            flagged={flagged}
            currentIndex={currentIndex}
            onSelect={goTo}
          />

          <div className="relative z-[1] space-y-4">
            {visible.map((question) => {
              const index = questions.indexOf(question);
              return (
                <QuizQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  total={questions.length}
                  answer={answers[question.id]}
                  flagged={flagged.has(question.id)}
                  disabled={isSubmitting}
                  onChange={handleAnswer}
                  onToggleFlag={() => toggleFlag(question.id)}
                />
              );
            })}
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {paged ? (
              <Button
                type="button"
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => goTo(currentIndex - 1)}
              >
                <ChevronLeft
                  className={cn('size-4', MIRROR_IN_RTL)}
                  aria-hidden
                />
                {t('learning:quiz.previousQuestion')}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center gap-2">
              {paged && !isLast ? (
                <Button type="button" onClick={() => goTo(currentIndex + 1)}>
                  {t('learning:quiz.nextQuestion')}
                  <ChevronRight
                    className={cn('size-4', MIRROR_IN_RTL)}
                    aria-hidden
                  />
                </Button>
              ) : null}
              <Button
                type="button"
                variant={paged && !isLast ? 'outline' : 'default'}
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                data-testid="quiz-submit"
              >
                {isSubmitting ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                {t('learning:quiz.submitAction')}
              </Button>
            </div>
          </div>
        </>
      )}

      <IntegrityWarningDialog
        open={dialogOpen}
        violations={warning?.violations ?? 0}
        max={warning?.max ?? integrity.maxViolations}
        mode={session.settings.integrityMode}
        onAcknowledge={() => {
          setDialogOpen(false);
          integrity.acknowledgeWarning();
        }}
      />
    </div>
  );
}
