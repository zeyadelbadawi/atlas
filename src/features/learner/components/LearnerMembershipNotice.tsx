/**
 * What the signed-in learner's membership of THIS academy means for them,
 * above every learner dashboard section (fix round, 20 Oct 2026).
 *
 * A learner can sign in to an academy before it admits them — the session
 * is real, the courses are not open — and nothing on `/my/*` said why:
 *   - `pending` (Approval required): the existing "awaiting approval" copy;
 *   - rejected (`inactive`, not blocked): they were not admitted, and can
 *     apply again. "Apply again" signs them out and opens the sign-up page's
 *     existing-account join step (`/sign-up?join=1`, i.e. the
 *     `POST /auth/academy-join` flow), so the academy's CURRENT registration
 *     policy decides, exactly as for any new learner. Signing in alone never
 *     re-admits anyone; that is the backend's rule, not this component's.
 * A blocked learner never reaches here (sign-in is refused) and an active
 * one sees nothing.
 */
import { Clock3, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth, useSignOut } from '@hooks';
import { useLearnerSurface } from '../context/LearnerSurface.context';

/** The sign-up page opens its "join with my Atlas account" step from this. */
export const APPLY_AGAIN_PATH = '/sign-up?join=1';

export function LearnerMembershipNotice(): JSX.Element | null {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { academyId, buildHref } = useLearnerSurface();
  const { signOut, isLoading } = useSignOut();

  const membership = user?.academies?.find(
    (academy) => academy.academyId === academyId
  );
  if (!membership || membership.blocked) return null;

  if (membership.membershipStatus === 'pending') {
    return (
      <Alert data-testid="learner-membership-pending">
        <Clock3 className="size-4" aria-hidden />
        <AlertTitle>
          {t('learning:myLearning.pendingApproval.title')}
        </AlertTitle>
        <AlertDescription>
          {t('learning:myLearning.pendingApproval.description')}
        </AlertDescription>
      </Alert>
    );
  }

  if (membership.membershipStatus !== 'inactive') return null;

  const applyAgain = async () => {
    // The sign-up page is for visitors: a session is redirected away from
    // it, so this one ends first. The join step then asks for the account's
    // own password, like any existing account joining.
    await signOut();
    window.location.assign(buildHref(APPLY_AGAIN_PATH));
  };

  return (
    <Alert data-testid="learner-membership-rejected">
      <UserX className="size-4" aria-hidden />
      <AlertTitle>
        {t('learning:learnerDashboard.membership.rejected.title')}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t('learning:learnerDashboard.membership.rejected.description')}</p>
        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={() => void applyAgain()}
        >
          {t('learning:learnerDashboard.membership.rejected.action')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
