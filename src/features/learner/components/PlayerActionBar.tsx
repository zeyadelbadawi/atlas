/**
 * The player's ONE action bar (§E.2).
 *
 * "ONE action bar" is a product decision with a history: the retired
 * lesson screen had Previous/Next at the bottom, "Mark complete" in the
 * middle of the same row, and a separate "Continue" somewhere above,
 * which meant three different controls could each be the obvious next
 * thing depending on where the learner's eye landed. Everything that
 * moves the learner forward lives here, in reading order: back, the
 * completion decision, forward.
 *
 * THE INLINE CONFIRMATION IS HERE, NOT IN A TOAST (§E.3). After a
 * completion the bar itself says the lesson is complete and names what
 * comes next — "Next: 2.4 Working with layers" — because that is where
 * the learner just clicked and where they are about to click again. Undo
 * sits beside it for as long as the confirmation does.
 *
 * AUTO-ADVANCE IS OPT-IN AND REMEMBERED. Off by default: a video ending
 * and the page changing underneath a learner who was taking notes is
 * hostile. When it is on, the bar counts down visibly and the countdown
 * is cancellable — an auto-advance with no visible timer is the same
 * hostility with a delay.
 *
 * NO NESTED INTERACTIVE CONTROLS. Every control here is a sibling; the
 * bar is a plain container. The audit's finding was buttons inside
 * clickable cards, which give a keyboard user two stops for one action
 * and a screen reader an announcement it cannot make sense of.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  ListChecks,
  RotateCcw,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MIRROR_IN_RTL, cn } from '@utils';
import type { CourseSequenceItem, LanguageCode } from '@types';
import {
  formatSequenceOrdinal,
  sequenceLockReasonKey,
} from '../utils/sequence.utils';

/** How long the learner has to cancel an auto-advance. */
const AUTO_ADVANCE_SECONDS = 8;

/**
 * "Finish course" (Task C) — present when this is the activity that
 * finishes the course (every other one is already finished). The PAGE
 * decides that from the sequence and does the finishing (complete the
 * lesson when it can be completed, idempotently, then open the completion
 * page, which shows the server's verdict); this component only renders.
 */
export interface PlayerFinishAction {
  readonly onFinish: () => void;
  readonly isFinishing: boolean;
  /** False while this activity cannot be completed yet (watch more). */
  readonly canFinish: boolean;
  /** Why it cannot, when it cannot. */
  readonly hintKey?: string;
}

export interface PlayerActionBarProps {
  readonly previous: CourseSequenceItem | undefined;
  readonly next: CourseSequenceItem | undefined;
  readonly language: LanguageCode;
  readonly onGoTo: (item: CourseSequenceItem) => void;
  /** Undefined when this activity has no completion the learner can trigger. */
  readonly onComplete?: () => void;
  readonly onUndoComplete?: () => void;
  readonly isCompleted: boolean;
  readonly isCompleting?: boolean;
  readonly isUndoing?: boolean;
  /**
   * False while the server says the watched-ratio rule is not satisfied.
   * The control is disabled rather than hidden so the learner can see
   * that completion exists and is not yet available.
   */
  readonly canComplete: boolean;
  /** Why completion is unavailable, when it is. */
  readonly completionHintKey?: string;
  /** Set when the media has just finished, so auto-advance may arm. */
  readonly hasFinishedPlaying?: boolean;
  /** A failed complete/undo, stated where the button is — never a silent no-op. */
  readonly errorMessage?: string;
  /**
   * Present when this activity finishes the course: the forward control
   * is "Finish course" instead of a Next that would be disabled or lead
   * nowhere new.
   */
  readonly finish?: PlayerFinishAction;
}

export function PlayerActionBar({
  previous,
  next,
  language,
  onGoTo,
  onComplete,
  onUndoComplete,
  isCompleted,
  isCompleting,
  isUndoing,
  canComplete,
  completionHintKey,
  hasFinishedPlaying,
  errorMessage,
  finish,
}: PlayerActionBarProps): JSX.Element {
  const { t } = useTranslation();
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  /*
    THE END OF THE COURSE, not merely the end of a lesson.

    This used to render as a Next button that was simply disabled: the
    learner finished the final lesson and the only forward control went
    grey, with nowhere to go — and a quiz, assignment or live session left
    until last had no ending at all. Now the activity that finishes the
    course carries "Finish course", whatever its type.
  */
  const isFinal = !!finish;

  /*
   * Armed only when the learner has both turned it on AND finished the
   * activity, and only when there is somewhere to go. Disarmed the
   * instant any of those stops being true, which is what makes toggling
   * the switch off mid-countdown actually cancel it.
   */
  useEffect(() => {
    if (!autoAdvance || !hasFinishedPlaying || !next) {
      setCountdown(null);
      return;
    }
    setCountdown(AUTO_ADVANCE_SECONDS);
  }, [autoAdvance, hasFinishedPlaying, next]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (next) onGoTo(next);
      return;
    }
    const timer = window.setTimeout(
      () => setCountdown((value) => (value === null ? null : value - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [countdown, next, onGoTo]);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {isCompleted && !isFinal ? (
        /*
         * The inline confirmation. `role="status"` so it is announced
         * once when it appears — completion is information, never an
         * interruption, so never `alert`.
         */
        <p
          role="status"
          className="flex flex-wrap items-center gap-2 text-sm text-foreground"
        >
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          <span>{t('learning:player.completion.confirmed')}</span>
          {next ? (
            <span className="text-muted-foreground">
              {t('learning:player.completion.nextIs', {
                // Deliberately not named `ordinal`: i18next reserves that
                // option for ordinal plural selection, so an interpolation
                // variable of that name is read as a flag and dropped.
                position: formatSequenceOrdinal(next, language),
                title: next.title,
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('learning:player.completion.lastActivity')}
            </span>
          )}
        </p>
      ) : null}

      {countdown !== null ? (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {t('learning:player.autoAdvance.countdown', { seconds: countdown })}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={!previous}
          onClick={() => previous && onGoTo(previous)}
        >
          <ChevronLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          {t('learning:player.previous')}
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {/* On the final activity "Finish course" completes it too, so a
              separate "Mark complete" would be two buttons for one step. */}
          {onComplete && !isCompleted && !isFinal ? (
            <>
              <Button
                onClick={onComplete}
                disabled={!canComplete || isCompleting}
              >
                {isCompleting ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <CheckCircle2
                    className="size-4"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
                {t('learning:player.completion.markComplete')}
              </Button>
              {!canComplete && completionHintKey ? (
                <span className="text-xs text-muted-foreground">
                  {t(completionHintKey)}
                </span>
              ) : null}
            </>
          ) : null}

          {onUndoComplete && isCompleted ? (
            <Button
              variant="ghost"
              onClick={onUndoComplete}
              disabled={isUndoing}
            >
              {isUndoing ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <RotateCcw
                  className={cn('size-4', MIRROR_IN_RTL)}
                  aria-hidden
                />
              )}
              {t('learning:player.completion.undo')}
            </Button>
          ) : null}
        </div>

        {finish ? (
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={finish.onFinish}
              disabled={!finish.canFinish || finish.isFinishing}
              data-testid="player-finish-course"
            >
              {finish.isFinishing ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <GraduationCap className="size-4" aria-hidden />
              )}
              {finish.isFinishing
                ? t('learning:player.finishing')
                : t('learning:player.finishCourse')}
            </Button>
            {!finish.canFinish && finish.hintKey ? (
              <span className="text-xs text-muted-foreground">
                {t(finish.hintKey)}
              </span>
            ) : null}
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={!next || next.state === 'locked'}
            onClick={() => next && onGoTo(next)}
          >
            {t('learning:player.next')}
            <ChevronRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          </Button>
        )}
      </div>

      {/* A disabled Next with no reason is a dead end; the reason is
          already known from the sequence, so say it. */}
      {!isFinal && next?.state === 'locked' ? (
        <p className="text-xs text-muted-foreground">
          {t('learning:player.nextLocked', {
            title: next.title,
            reason: next.lockReason
              ? t(sequenceLockReasonKey(next.lockReason))
              : t('learning:player.lock.genericReason'),
          })}
        </p>
      ) : null}
      {next && !isFinal ? (
        <div className="flex items-center gap-2">
          <Switch
            id="player-auto-advance"
            checked={autoAdvance}
            onCheckedChange={setAutoAdvance}
          />
          <Label
            htmlFor="player-auto-advance"
            className="text-xs font-normal text-muted-foreground"
          >
            {t('learning:player.autoAdvance.label')}
          </Label>
        </div>
      ) : null}
    </div>
  );
}
