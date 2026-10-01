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
 * What the learner can do once there is nothing after this activity.
 *
 * Every destination is resolved by the PAGE from the real route table and
 * real server state — a certificate href exists only when a certificate
 * has actually been issued for this course. This component never decides
 * eligibility and never builds a URL; it renders the ones it is handed.
 */
export interface PlayerCourseCompletion {
  /** Server truth: every activity in the sequence is finished, not just this one. */
  readonly isCourseComplete: boolean;
  /** The course outline — always available, and the way back to anything unfinished. */
  readonly courseHref: string;
  /** Set only when an issued certificate for THIS course really exists. */
  readonly certificateHref?: string;
  /** Set only where the review experience is actually reachable. */
  readonly reviewHref?: string;
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
   * Present on the learner surface. When this is the last activity and it
   * is finished, the bar stops being navigation and becomes an ending.
   */
  readonly courseCompletion?: PlayerCourseCompletion;
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
  courseCompletion,
}: PlayerActionBarProps): JSX.Element {
  const { t } = useTranslation();
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  /*
    THE END OF THE COURSE, not merely the end of a lesson.

    Previously this state rendered as a Next button that was simply
    disabled: the learner pressed "Mark as complete" on the final lesson
    and the only forward control on the screen went grey, with no
    statement that anything had been achieved and nowhere to go. A
    disabled control is a dead end wherever it appears, and this is the
    one place in the course where the learner has most earned a next step.
  */
  const isTerminal = isCompleted && !next && !!courseCompletion;

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
      {isCompleted && !isTerminal ? (
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

      {isTerminal && courseCompletion ? (
        /*
          `role="status"`, like the inline confirmation it replaces:
          finishing a course is information the learner just caused, never
          an interruption. The heading is an `h2` so a screen-reader user
          can reach it by heading, and the actions are ordinary links —
          this is navigation, so they must open in a new tab, be
          bookmarkable, and say where they go.
        */
        <div
          role="status"
          className="rounded-lg border border-border bg-muted/40 p-4"
        >
          <div className="flex items-start gap-3">
            {courseCompletion.isCourseComplete ? (
              <GraduationCap
                className="mt-0.5 size-5 shrink-0 text-success"
                aria-hidden
              />
            ) : (
              <ListChecks
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                {courseCompletion.isCourseComplete
                  ? t('learning:player.courseComplete.title')
                  : t('learning:player.courseEnd.title')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {courseCompletion.isCourseComplete
                  ? t('learning:player.courseComplete.description')
                  : t('learning:player.courseEnd.description')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {courseCompletion.isCourseComplete &&
            courseCompletion.certificateHref ? (
              <Button asChild>
                <Link to={courseCompletion.certificateHref}>
                  <Award className="size-4" aria-hidden />
                  {t('learning:player.courseComplete.viewCertificate')}
                </Link>
              </Button>
            ) : null}
            {courseCompletion.isCourseComplete &&
            courseCompletion.reviewHref ? (
              <Button variant="outline" asChild>
                <Link to={courseCompletion.reviewHref}>
                  <Star className="size-4" aria-hidden />
                  {t('learning:player.courseComplete.rateCourse')}
                </Link>
              </Button>
            ) : null}
            <Button
              variant={courseCompletion.isCourseComplete ? 'ghost' : 'default'}
              asChild
            >
              <Link to={courseCompletion.courseHref}>
                {courseCompletion.isCourseComplete
                  ? t('learning:player.courseComplete.backToCourse')
                  : t('learning:player.courseEnd.backToCourse')}
              </Link>
            </Button>
          </div>
        </div>
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

        {/* Nothing follows this activity and it is finished, so there is
            no Next to grey out — the completion panel above carries the
            forward actions instead. */}
        {isTerminal ? null : (
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
      {next?.state === 'locked' ? (
        <p className="text-xs text-muted-foreground">
          {t('learning:player.nextLocked', {
            title: next.title,
            reason: next.lockReason
              ? t(sequenceLockReasonKey(next.lockReason))
              : t('learning:player.lock.genericReason'),
          })}
        </p>
      ) : null}
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
