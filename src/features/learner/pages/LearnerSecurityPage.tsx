/**
 * `/my/security` — password, sign-in activity and two-factor (§E.1).
 *
 * SEPARATE FROM `/my/profile` DELIBERATELY: security is the section a
 * learner is sent to by an email ("we noticed a new sign-in"), and a
 * destination that is a tab inside another page cannot be linked to.
 *
 * DEVICE AND LEARNING-SESSION MANAGEMENT IS NOT DUPLICATED HERE — it
 * lives on `/my/devices`, one list, one place to revoke from. Two lists
 * of sessions that disagree is how a learner ends up believing they have
 * signed a device out when they have not. What this page shows is the
 * ACCOUNT's sign-in sessions (`/auth/sessions`), which are a different
 * thing from the learning devices the content policy counts, and the
 * pointer below says so rather than leaving the learner to work out why
 * there are two.
 *
 * The section itself is the existing `ProfileSecuritySection`, reused
 * rather than rebuilt: it is already wired to the real
 * `currentUserService.changePassword`, the real `/auth/sessions` and the
 * real `/auth/2fa/*`, and a second implementation of password change is a
 * second place for a security bug to live.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MonitorSmartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@hooks';
import { ProfileSecuritySection } from '@features/profile';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export default function LearnerSecurityPage(): JSX.Element {
  const { t } = useTranslation();
  const { buildHref } = useLearnerSurface();
  const user = useCurrentUser();

  return (
    <>
      <LearnerPageHeader
        section="security"
        titleKey="learning:learnerDashboard.security.title"
        descriptionKey="learning:learnerDashboard.security.subtitle"
      />

      {/*
        Gated on a restored session, and not only for tidiness: every
        control inside acts on the signed-in account and its first act is
        to read that account's sessions. Mounting it before the session is
        restored asks the server who is signed in using a token that has
        not been loaded yet.
      */}
      {user ? (
        <ProfileSecuritySection />
      ) : (
        <div role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.profile.loading')}
          </span>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <MonitorSmartphone className="size-4 shrink-0" aria-hidden />
        <span>
          {t('learning:learnerDashboard.security.devicesPointer')}{' '}
          <Link
            to={buildHref(LEARNER_ROUTES.devices)}
            className="font-medium text-primary underline underline-offset-4"
          >
            {t('learning:learnerDashboard.nav.devices')}
          </Link>
        </span>
      </p>
    </>
  );
}
