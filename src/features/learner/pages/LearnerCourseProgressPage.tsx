/**
 * `/my/courses/:courseId` — one course's outline and the learner's
 * progress through it (§E.1).
 *
 * THE OUTLINE IS THE SEQUENCE, unchanged. Same array, same order, same
 * ordinals and same states the player's sidebar renders — because they
 * are the same list, and a course page that ordered or numbered things
 * differently from the player would be the "three pages that disagree"
 * problem with a fourth page added to it.
 *
 * EVERY LOCK CARRIES ITS REASON. A lock with no reason is the single most
 * common learner support ticket there is, which is why the vocabulary is
 * closed on the server (`previousIncomplete`, `scheduled`, `notStarted`,
 * `accessEnded`) and each member has a real sentence here rather than one
 * generic "locked".
 *
 * THE BREADCRUMB NAMES THE COURSE once the title has loaded — that is the
 * entire reason this page has a breadcrumb — and falls back to a generic
 * crumb rather than an empty one while it is in flight.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ListChecks, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import type { CourseSequenceItem, LanguageCode } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerProgressBar } from '../components/LearnerProgressBar';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useCourseSequence } from '../hooks';
import { CurriculumSidebar } from '../components/CurriculumSidebar';
import { sequenceCompletionPercentage } from '../utils/sequence.utils';

export default function LearnerCourseProgressPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { buildHref } = useLearnerSurface();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const language = i18n.language as LanguageCode;

  const { data, isLoading, error, refetch } = useCourseSequence(courseId);

  const hrefFor = (item: CourseSequenceItem): string =>
    item.type === 'lesson'
      ? buildHref(
          buildPath(LEARNER_ROUTES.playerLesson, {
            courseId,
            lessonId: item.id,
          })
        )
      : buildHref(
          buildPath(LEARNER_ROUTES.playerActivity, {
            courseId,
            itemId: item.id,
          })
        );

  const continueItem = data?.continueItemId
    ? data.items.find((item) => item.id === data.continueItemId)
    : undefined;

  const header = (
    <LearnerPageHeader
      section="courses"
      title={data?.courseTitle}
      titleKey="learning:learnerDashboard.courseProgress.title"
      descriptionKey="learning:learnerDashboard.courseProgress.subtitle"
      trailing={{
        // `labelKey` is the required fallback and `label` wins when it is
        // set, so the crumb reads "This course" only until the real title
        // arrives — never an empty crumb, never a flash of the course id.
        labelKey: 'learning:learnerDashboard.courseProgress.breadcrumb',
        ...(data?.courseTitle ? { label: data.courseTitle } : {}),
      }}
      actions={
        continueItem ? (
          <Button onClick={() => navigate(hrefFor(continueItem))}>
            <PlayCircle className="size-4" aria-hidden />
            {t('learning:discovery.card.continueAction')}
          </Button>
        ) : undefined
      }
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState onRetry={() => void refetch()} />
      </>
    );
  }

  const percentage = data
    ? sequenceCompletionPercentage(data.completedCount, data.totalCount)
    : undefined;

  return (
    <>
      {header}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {t('learning:learnerDashboard.progress.label')}
          </p>
          {data ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('learning:player.progress.summary', {
                completed: data.completedCount,
                total: data.totalCount,
              })}
            </p>
          ) : null}
        </div>
        {/* No `value` while it is loading: a bar claiming 0% would
            announce "not started" to the one reader who cannot see that
            the page is still waiting. */}
        <LearnerProgressBar value={percentage} />
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.courseProgress.loading')}
          </span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <LearnerSectionPlaceholder
          icon={ListChecks}
          titleKey="learning:learnerDashboard.courseProgress.empty.title"
          descriptionKey="learning:learnerDashboard.courseProgress.empty.description"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          {/* The same component the player's sidebar uses — one list, one
              rendering, no second opinion about order or state. */}
          <CurriculumSidebar
            items={data.items}
            currentItemId={data.continueItemId ?? undefined}
            hrefFor={hrefFor}
            language={language}
          />
        </div>
      )}
    </>
  );
}
