/**
 * What the player shows INSTEAD of content, and why (§E.3's "explicit
 * error states").
 *
 * EVERY ONE OF THESE IS A DIFFERENT SENTENCE. "Something went wrong" is
 * what the player used to say for a revoked enrolment, an expired
 * credential, a drip date, a device cap and a dropped connection alike —
 * five situations with five different things the learner should do next,
 * collapsed into one that suggests none of them. The failure vocabulary
 * exists so each one can be named; this component is where each one gets
 * its own action.
 *
 * ONLY RETRYABLE STATES OFFER RETRY. A button that cannot work teaches
 * learners to press buttons that cannot work: `scheduled` offers nothing
 * (the date is the date), `accessEnded` offers nothing (the academy
 * decides), and `deviceLimit` offers the Devices page — the one screen
 * that can actually undo it — rather than a retry that will refuse again.
 *
 * `role="alert"` comes from `ErrorState`, which already announces itself;
 * this file does not add a second live region around it.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@components/feedback';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import {
  playerFailureDescriptionKey,
  playerFailureTitleKey,
  type PlayerFailure,
} from '../utils/player-failure.utils';

/** Failures where asking again is a reasonable next move. */
const RETRYABLE: ReadonlySet<PlayerFailure['kind']> = new Set([
  'network',
  'expired',
  'processing',
  'rateLimited',
  'unavailable',
  'unknown',
]);

export interface PlayerFailureStateProps {
  readonly failure: PlayerFailure;
  readonly onRetry?: () => void;
}

export function PlayerFailureState({
  failure,
  onRetry,
}: PlayerFailureStateProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { buildHref } = useLearnerSurface();

  const canRetry = RETRYABLE.has(failure.kind) && !!onRetry;

  return (
    <div className="space-y-3">
      <ErrorState
        // The kind drives the icon's colour only; the copy is always this
        // failure's own, never the generic per-kind text.
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
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={buildHref(LEARNER_ROUTES.devices)}
            onClick={(event) => {
              event.preventDefault();
              navigate(buildHref(LEARNER_ROUTES.devices));
            }}
          >
            {t('learning:player.failure.deviceLimit.action')}
          </a>
        </p>
      ) : null}
    </div>
  );
}
