/**
 * Why this activity is locked, said out loud (§E.2, §E.3).
 *
 * A LOCK WITH NO REASON IS THE SINGLE MOST COMMON LEARNER SUPPORT TICKET.
 * That is the whole reason the sequence carries `lockReason` at all, and
 * why the vocabulary is closed on the server: four reasons, four real
 * sentences, instead of one generic "locked" that leaves the learner with
 * nothing to do but email someone.
 *
 * NO ACTION, DELIBERATELY. There is genuinely nothing to press: a drip
 * date is a date, a prerequisite is the activity above, and an ended
 * enrolment is the academy's decision. An enabled control that answers
 * "not yet" teaches learners to press controls that cannot work.
 *
 * Shared by the player and the course outline so the two cannot describe
 * the same lock differently — the same reason this feature has one
 * curriculum component rather than two.
 */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDateFormatter } from '@hooks';
import type { SequenceLockReason } from '@types';

export interface ActivityLockCardProps {
  /** Null when the server locked the item without naming a reason. */
  readonly lockReason: SequenceLockReason | null;
  /** When the item opens, for a drip-scheduled lock. */
  readonly availableAt?: string | null;
}

export function ActivityLockCard({
  lockReason,
  availableAt,
}: ActivityLockCardProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  // "Opens on a later date" is true but unhelpful when the date is known.
  const description =
    lockReason === 'scheduled' && availableAt
      ? t('learning:player.lockReason.scheduledOn', {
          date: fmt.dateTime(availableAt),
        })
      : lockReason
        ? t(`learning:player.lockReason.${lockReason}`)
        : t('learning:player.lock.genericReason');

  return (
    <Alert>
      <Lock className="size-4" aria-hidden />
      <AlertTitle>{t('learning:player.lock.title')}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
