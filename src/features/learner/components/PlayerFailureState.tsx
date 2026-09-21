/**
 * What the player shows when the grant was refused or could not be fetched
 * (§E.3). One sentence per `PlayerFailureKind`, a retry only where a retry
 * can change the answer, and a way out where the answer is final.
 *
 * "NO CONTENT" IS FINAL, NOT PENDING. A lesson nobody has authored is not
 * going to start playing on the next attempt, so it gets no "Try again";
 * it gets the truth and the two things that help — the course outline,
 * and (from the action bar) the next activity. "Processing" is the
 * opposite: the asset exists and will arrive, so it keeps its retry.
 */
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import {
  playerFailureDescriptionKey,
  playerFailureTitleKey,
  type PlayerFailure,
} from '../utils/player-failure.utils';

const RETRYABLE: ReadonlySet<PlayerFailure['kind']> = new Set([
  'network',
  'expired',
  'processing',
  'rateLimited',
  'unavailable',
  'unknown',
]);

/** Kinds where the useful next step is the course outline, not this screen. */
const OUTLINE_LINKED: ReadonlySet<PlayerFailure['kind']> = new Set([
  'scheduled',
  'unavailable',
]);

export interface PlayerFailureStateProps {
  readonly failure: PlayerFailure;
  readonly onRetry?: () => void;
  /** The course this lesson belongs to, for the outline link. */
  readonly courseId?: string;
}

export function PlayerFailureState({
  failure,
  onRetry,
  courseId,
}: PlayerFailureStateProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { buildHref } = useLearnerSurface();
  const canRetry = RETRYABLE.has(failure.kind) && !!onRetry;
  const courseOutlineHref = courseId
    ? buildHref(buildPath(LEARNER_ROUTES.courseProgress, { courseId }))
    : null;
  const outlineHref = OUTLINE_LINKED.has(failure.kind)
    ? courseOutlineHref
    : null;

  // Not an error, so not the red triangle: nothing failed and nothing is
  // the learner's to fix. The neutral empty state says what is true and
  // offers the one useful move.
  if (failure.kind === 'noContent') {
    return (
      <EmptyState
        icon={FileQuestion}
        titleKey={playerFailureTitleKey(failure.kind)}
        descriptionKey={playerFailureDescriptionKey(failure.kind)}
        primaryAction={
          courseOutlineHref
            ? {
                labelKey: 'learning:player.failure.seeOutline',
                onAction: () => navigate(courseOutlineHref),
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <ErrorState
        kind={failure.kind === 'network' ? 'network' : 'unknown'}
        titleKey={playerFailureTitleKey(failure.kind)}
        descriptionKey={playerFailureDescriptionKey(failure.kind)}
        onRetry={canRetry ? onRetry : undefined}
      />
      {failure.kind === 'deviceLimit' ? (
        <p className="text-center text-sm">
          {/* A real link, not a button that navigates: it is a
              destination, and a learner should be able to open it in a new
              tab from the screen that refused them. */}
          <Link
            className="font-medium text-primary underline underline-offset-4"
            to={buildHref(LEARNER_ROUTES.devices)}
          >
            {t('learning:player.failure.deviceLimit.action')}
          </Link>
        </p>
      ) : null}
      {outlineHref ? (
        <p className="text-center text-sm">
          <Link
            className="font-medium text-primary underline underline-offset-4"
            to={outlineHref}
          >
            {t('learning:player.failure.seeOutline')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
