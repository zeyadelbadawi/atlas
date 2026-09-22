/**
 * A quiz, an assignment or a live session inside the player shell (§E.2).
 *
 * P64 Phase 3 folded the attempt itself into the shell: a quiz renders
 * `QuizActivityView` (intro → attempt → results, all in place) and an
 * assignment renders `AssignmentActivityView` (draft → submitted →
 * graded). The Phase 2 hand-off to a separately shaped page is gone,
 * and the legacy `/my-learning/courses/:id/quizzes/:quizId` URLs now
 * redirect here.
 *
 * A live session keeps the Phase 2 summary: joining details are a later
 * phase, and a summary that says so is better than a button that leads
 * nowhere.
 *
 * THE LOCK CARD LIVES HERE TOO. A locked activity shows its reason and no
 * action — because there genuinely is nothing to do yet, and an enabled
 * button that answers "not yet" is worse than a disabled one that says
 * why.
 */
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import { useDateFormatter } from '@hooks';
import type { CourseSequenceItem } from '@types';
import { ActivityLockCard } from './ActivityLockCard';
import { AssignmentActivityView } from './AssignmentActivityView';
import { QuizActivityView } from './QuizActivityView';
import {
  sequenceStateLabelKey,
  sequenceTypeLabelKey,
} from '../utils/sequence.utils';

export interface AssessmentActivityViewProps {
  readonly courseId: string;
  readonly item: CourseSequenceItem;
  /** Move to the next activity (the results screen's primary action). */
  readonly onContinue?: () => void;
  readonly continueLabel?: string;
  /** Player href for a lesson, so a reviewed question can link to the lesson it came from. */
  readonly lessonHref?: (lessonId: string) => string;
}

export function AssessmentActivityView({
  courseId,
  item,
  onContinue,
  continueLabel,
  lessonHref,
}: AssessmentActivityViewProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();

  const isLocked = item.state === 'locked';

  if (item.type === 'quiz') {
    return (
      <div className="space-y-4">
        {isLocked ? (
          <ActivityLockCard
            lockReason={item.lockReason}
            availableAt={item.availableAt}
          />
        ) : null}
        <QuizActivityView
          courseId={courseId}
          item={item}
          onContinue={onContinue}
          continueLabel={continueLabel}
          lessonHref={lessonHref}
        />
      </div>
    );
  }

  if (item.type === 'assignment') {
    return (
      <AssignmentActivityView
        courseId={courseId}
        item={item}
        onContinue={onContinue}
      />
    );
  }

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

        {!isLocked ? (
          <p className="mt-5 text-sm text-muted-foreground">
            {t('learning:player.activity.liveSessionNote')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
