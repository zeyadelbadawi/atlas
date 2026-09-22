/**
 * The sticky strip above the questions: countdown · answered n of N ·
 * save state. The one signature element of the attempt (design review).
 *
 * The countdown digits can be hidden by the author (`hideTimer`) — the
 * ANNOUNCEMENTS cannot: a visually-hidden `aria-live` node still says
 * "10 minutes left" at the thresholds, because a learner who cannot see
 * the clock is the learner who most needs to hear it. Digits are tabular
 * so the strip never jitters, and the whole thing is `position: sticky`
 * with a small height so it never covers the focused control.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudOff, Loader2, Save, TimerIcon } from 'lucide-react';
import { cn, formatNumber } from '@utils';
import type { LanguageCode } from '@types';
import type { AutosaveState } from '../hooks/useQuizAutosave';
import { formatCountdown, isUrgent } from '../utils/quiz-attempt.utils';

export interface QuizAttemptHeaderProps {
  readonly remainingSeconds: number | null;
  readonly hideTimer: boolean;
  readonly answered: number;
  readonly total: number;
  readonly saveState: AutosaveState;
  readonly lastSavedAt: string | null;
  /** The threshold just crossed, in seconds; announced once. */
  readonly announcement: number | null;
}

function minutesOrSeconds(seconds: number): {
  count: number;
  unit: 'minutes' | 'seconds';
} {
  return seconds >= 60
    ? { count: Math.round(seconds / 60), unit: 'minutes' }
    : { count: seconds, unit: 'seconds' };
}

export function QuizAttemptHeader({
  remainingSeconds,
  hideTimer,
  answered,
  total,
  saveState,
  lastSavedAt,
  announcement,
}: QuizAttemptHeaderProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  // "Saved just now" ages into "Saved 2 min ago" without a re-render storm:
  // a 30 s tick is plenty for a label nobody reads to the second.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setTick((value) => value + 1),
      30_000
    );
    return () => window.clearInterval(timer);
  }, []);

  const urgent = isUrgent(remainingSeconds);

  let saveLabel: string;
  let SaveIcon = Save;
  if (saveState === 'saving') {
    saveLabel = t('learning:quiz.runner.saving');
    SaveIcon = Loader2;
  } else if (saveState === 'offline') {
    saveLabel = t('learning:quiz.runner.offline');
    SaveIcon = CloudOff;
  } else if (saveState === 'dirty') {
    saveLabel = t('learning:quiz.runner.unsaved');
  } else if (lastSavedAt) {
    const ageSeconds = Math.max(
      0,
      Math.round((Date.now() - Date.parse(lastSavedAt)) / 1000)
    );
    saveLabel =
      ageSeconds < 45
        ? t('learning:quiz.runner.savedJustNow')
        : t('learning:quiz.runner.savedAgo', {
            minutes: formatNumber(
              Math.max(1, Math.round(ageSeconds / 60)),
              language
            ),
          });
  } else {
    saveLabel = t('learning:quiz.runner.notSavedYet');
  }

  const announced =
    announcement !== null
      ? (() => {
          const { count, unit } = minutesOrSeconds(announcement);
          return t(`learning:quiz.runner.announce.${unit}`, { count });
        })()
      : '';

  return (
    <div
      className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-border bg-card/95 px-3 py-2 text-sm backdrop-blur supports-[backdrop-filter]:bg-card/80"
      data-testid="quiz-attempt-header"
    >
      <div className="flex items-center gap-2">
        <TimerIcon
          className={cn(
            'size-4',
            urgent ? 'text-destructive' : 'text-muted-foreground'
          )}
          aria-hidden
        />
        {remainingSeconds === null ? (
          <span className="text-muted-foreground">
            {t('learning:quiz.runner.noTimeLimit')}
          </span>
        ) : hideTimer ? (
          <span className="text-muted-foreground">
            {t('learning:quiz.runner.timerHidden')}
          </span>
        ) : (
          <span
            className={cn(
              'font-medium tabular-nums',
              urgent ? 'text-destructive' : 'text-foreground'
            )}
            data-testid="quiz-countdown"
          >
            <span className="sr-only">
              {t('learning:quiz.runner.timeLeftLabel')}{' '}
            </span>
            {formatCountdown(remainingSeconds, language)}
            {urgent ? (
              <span className="ms-1 text-xs font-normal">
                {t('learning:quiz.runner.hurry')}
              </span>
            ) : null}
          </span>
        )}
      </div>

      <div
        className="tabular-nums text-muted-foreground"
        data-testid="quiz-answered"
      >
        {t('learning:quiz.runner.answered', {
          answered: formatNumber(answered, language),
          total: formatNumber(total, language),
        })}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-1.5',
          saveState === 'offline' ? 'text-destructive' : 'text-muted-foreground'
        )}
        data-testid="quiz-save-state"
      >
        <SaveIcon
          className={cn(
            'size-4',
            saveState === 'saving' && 'animate-spin motion-reduce:animate-none'
          )}
          aria-hidden
        />
        <span>{saveLabel}</span>
      </div>

      {/* Announcements live in their own region so a save-state update never talks over "5 minutes left". */}
      <span className="sr-only" role="status" aria-live="assertive">
        {announced}
      </span>
    </div>
  );
}
