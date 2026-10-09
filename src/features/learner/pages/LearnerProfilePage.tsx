/**
 * `/my/profile` — the learner's own account details (§E.1).
 *
 * NO ORGANIZATIONS TAB, by decision (D2 / §E.1). Organizations are a
 * MANAGEMENT concept: a learner holds memberships in academies, not seats
 * in organizations, and showing them an organization tab was one of the
 * ways the old shared profile page leaked the management model into the
 * learner surface. Personal details, account and preferences are theirs;
 * organizations are not.
 *
 * THE SECTIONS ARE THE EXISTING ONES, reused rather than rebuilt. They
 * are already wired to the real `currentUserService` endpoints, already
 * handle their own validation and their own unsaved-changes prompts, and
 * a second copy of "change your name" would be a second place for those
 * to be fixed. What this page decides is WHICH of them a learner sees and
 * in what order — which is the whole of D2's change.
 *
 * SECURITY IS NOT A TAB HERE. It has its own route (`/my/security`) so
 * that password, sessions and two-factor are linkable from a security
 * email; a destination that is a tab inside another page cannot be linked
 * to.
 */
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@hooks';
import {
  ProfileAccountSection,
  ProfilePersonalSection,
  ProfilePhoneCard,
  ProfilePreferencesSection,
} from '@features/profile';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';

export default function LearnerProfilePage(): JSX.Element {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const header = (
    <LearnerPageHeader
      section="profile"
      titleKey="learning:learnerDashboard.profile.title"
      descriptionKey="learning:learnerDashboard.profile.subtitle"
    />
  );

  /*
   * `/my/*` is mounted behind a real authenticated-only guard, so a
   * missing user here means the session is still being restored rather
   * than that someone is signed out. A skeleton says "wait"; an empty
   * state would say "there is nothing here", which is a different and
   * wrong thing to tell someone about their own profile.
   */
  if (!user) {
    return (
      <>
        {header}
        <div role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.profile.loading')}
          </span>
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="personal">
            {t('profile:tabs.personal')}
          </TabsTrigger>
          <TabsTrigger value="account">{t('profile:tabs.account')}</TabsTrigger>
          <TabsTrigger value="preferences">
            {t('profile:tabs.preferences')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <ProfilePersonalSection user={user} />
          <ProfilePhoneCard />
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          {/* Deliberately without `DeleteAccountCard`: deleting the
              account is not a learner-surface action in Phase 2, and an
              irreversible control on the page a learner opens to change
              their phone number is a trap. */}
          <ProfileAccountSection user={user} audience="learner" />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <ProfilePreferencesSection />
        </TabsContent>
      </Tabs>

      {/* Kept so the section still reads as complete on a build where the
          reused sections render nothing — never as the page's only
          content. */}
      {!user.email ? (
        <LearnerSectionPlaceholder
          icon={User}
          titleKey="learning:learnerDashboard.profile.empty.title"
          descriptionKey="learning:learnerDashboard.profile.empty.description"
        />
      ) : null}
    </>
  );
}
