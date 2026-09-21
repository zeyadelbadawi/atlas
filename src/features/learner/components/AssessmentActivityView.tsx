/**
 * A quiz, an assignment or a live session inside the player shell (§E.2).
 *
 * WHY THIS IS A SUMMARY AND A HAND-OFF, NOT AN ENGINE. §E.2's requirement
 * is that these activities "render inside one shell and participate in
 * Next/Previous" — which they now do: the same course title, the same
 * progress bar, the same numbered activity header, the same curriculum,
 * the same single action bar, and the learner walks the whole course in
 * one place instead of being ejected to a differently-shaped page
 * whenever an assessment comes up. The ATTEMPT itself — question
 * rendering, timers, autosave, submission, manual grading, the integrity
 * layer — is Phase 3 (§D/§E of that phase), and its existing screens
 * (`QuizPage`, `AssignmentPage`) are real, working and unchanged.
 *
 * So this shows what the learner needs in order to decide — what kind of
 * activity it is, where it sits in the course, when it is due, what state
 * it is in, what they scored — and hands off to the existing attempt
 * screen. Re-implementing the quiz engine inside the shell as part of
 * Phase 2 would mean two quiz engines to keep in step until Phase 3
 * deleted one of them, which is how divergence happens.
 *
 * THE LOCK CARD LIVES HERE TOO. A locked activity shows its reason and no
 * action — because there genuinely is nothing to do yet, and an enabled
 * button that answers "not yet" is worse than a disabled one that says
 * why.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { MIRROR_IN_RTL, cn } from '@utils';
import { Button } from '@/components/ui/button';
import { useDateFormatter } from '@hooks';
import { useLearningPaths } from '@features/learning';
import type { CourseSequenceItem } from '@types';
import { ActivityLockCard } from './ActivityLockCard';
import {
  sequenceStateLabelKey,
  sequenceTypeLabelKey,
} from '../utils/sequence.utils';

export interface AssessmentActivityViewProps {
  readonly courseId: string;
  readonly item: CourseSequenceItem;
}

export function AssessmentActivityView({
  courseId,
  item,
}: AssessmentActivityViewProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const paths = useLearningPaths();

  const isLocked = item.state === 'locked';

  const attemptHref =
    item.type === 'quiz'
      ? paths.quiz(courseId, item.id)
      : item.type === 'assignment'
        ? paths.assignment(courseId, item.id)
        : undefined;

  return (
    <div className="space-y-4">
      {isLocked ? (
        <ActivityLockCard
          lockReason={item.lockReason}
          availableAt={item.availableAt}
        />
      ) : null}

      <div className="rounded-lg border border-border bg-card p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('learning:player.activity.type')}
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {t(sequenceTypeLabelKey(item.type))}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">
              {t('learning:player.activity.state')}
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {t(sequenceStateLabelKey(item.state))}
            </dd>
          </div>

          {item.dueAt ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:player.activity.due')}
              </dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CalendarClock className="size-4" aria-hidden />
                {fmt.dateTime(item.dueAt)}
              </dd>
            </div>
          ) : null}

          {item.availableAt ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:player.activity.opens')}
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {fmt.dateTime(item.availableAt)}
              </dd>
            </div>
          ) : null}
        </dl>

        {!isLocked && attemptHref ? (
          <div className="mt-5">
            {/* An in-app move, so a router Link — not an `<a>` that reloads
                the whole website — and no "external" glyph: the quiz page
                is this academy's own until Phase 3 folds it into here. */}
            <Button asChild>
              <Link to={attemptHref}>
                {item.type === 'quiz'
                  ? t('learning:player.activity.openQuiz')
                  : t('learning:player.activity.openAssignment')}
                <ArrowRight
                  className={cn('size-4', MIRROR_IN_RTL)}
                  aria-hidden
                />
              </Link>
            </Button>
          </div>
        ) : null}

        {!isLocked && item.type === 'live_session' ? (
          <p className="mt-5 text-sm text-muted-foreground">
            {t('learning:player.activity.liveSessionNote')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
