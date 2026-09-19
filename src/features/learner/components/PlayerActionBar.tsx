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
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MIRROR_IN_RTL, cn } from '@utils';
import type { CourseSequenceItem, LanguageCode } from '@types';
import { formatSequenceOrdinal } from '../utils/sequence.utils';

/** How long the learner has to cancel an auto-advance. */
const AUTO_ADVANCE_SECONDS = 8;

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
}: PlayerActionBarProps): JSX.Element {
  const { t } = useTranslation();
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

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
      {isCompleted ? (
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
          {onComplete && !isCompleted ? (
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
                  <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
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
                <RotateCcw className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
              )}
              {t('learning:player.completion.undo')}
            </Button>
          ) : null}
        </div>

        <Button
          variant="outline"
          disabled={!next || next.state === 'locked'}
          onClick={() => next && onGoTo(next)}
        >
          {t('learning:player.next')}
          <ChevronRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
        </Button>
      </div>

      {next ? (
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
