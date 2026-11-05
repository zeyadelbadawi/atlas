/**
 * Profile Account Section.
 *
 * Display account information. Prompt 13 removed the "Account Status"
 * field — it rendered a hardcoded `variant="success"` "Active" badge
 * (an invalid `Badge` variant besides) with no real status data behind
 * it: `CurrentUser` has no account-status field anywhere in Atlas.
 * Reintroduce this once a real status field is specified.
 *
 * Pre-Phase-3 learner baseline: an `audience` prop. The learner profile
 * reuses this card, and a learner has no use for the raw user id, the
 * staff role vocabulary or an organization list they can never be in
 * (AD-4) — names people recognise, not how the system is built.
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDateFormatter, useSession } from '@hooks';
import { humanizeFieldName } from '@utils';
import type { CurrentUser } from '@types';

export interface ProfileAccountSectionProps {
  readonly user: CurrentUser;
  /**
   * `learner` hides what is built from how the system works rather than
   * from anything the person controls or recognises — the raw user id,
   * the staff role vocabulary and the organization list (a learner holds
   * no organization membership by design, AD-4). Staff keep all of it.
   */
  readonly audience?: 'staff' | 'learner';
}

export function ProfileAccountSection({
  user,
  audience = 'staff',
}: ProfileAccountSectionProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const session = useSession();
  const isLearner = audience === 'learner';

  // B1 (V30) — role words are translated ("Owner" read in English on the
  // Arabic page). A role the catalogue does not know is shown readable,
  // never as a raw identifier.
  const roleLabel = (role: string): string =>
    t(`profile:roles.${role}`, { defaultValue: humanizeFieldName(role) });

  // `roles` holds only platform-wide roles (`platform_owner`); an
  // organization role is shown on its organization below. With none, the
  // row is left out rather than saying "No role assigned" to an owner.
  const platformRoles = user.roles.map(roleLabel);

  // Only the organization this session is working in is "Current" — the
  // primary flag can be set on more than one membership. Without an
  // active organization, the first primary one stands in, as at sign-in.
  const memberships = user.organizationMemberships ?? [];
  const currentOrganizationId =
    session.organization?.id ??
    (memberships.find((membership) => membership.isPrimary) ?? memberships[0])
      ?.organizationId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile:sections.account.title')}</CardTitle>
        <CardDescription>
          {t(
            isLearner
              ? 'profile:sections.account.learnerDescription'
              : 'profile:sections.account.description'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {isLearner ? null : (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('profile:fields.userId')}
              </p>
              <p className="mt-1 font-mono text-sm">{user.id}</p>
            </div>
          )}
          {isLearner || platformRoles.length === 0 ? null : (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('profile:fields.role')}
              </p>
              <p className="mt-1 text-sm" data-testid="platform-role">
                {new Intl.ListFormat(i18n.language, {
                  type: 'conjunction',
                }).format(platformRoles)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('profile:fields.memberSince')}
            </p>
            {/* The app language decides the format, not the browser's
                locale — the rest of the page is already in that language. */}
            <p className="mt-1 text-sm">{fmt.date(user.createdAt, 'long')}</p>
          </div>
        </div>

        {isLearner ? null : (
          <>
            <Separator />
            <div>
              <h3 className="mb-3 text-sm font-medium">
                {t('profile:sections.account.organizations')}
              </h3>
              {memberships.length > 0 ? (
                <ul className="space-y-2">
                  {memberships.map((membership) => (
                    <li
                      key={membership.organizationId}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {membership.organizationName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {roleLabel(membership.role)}
                        </p>
                      </div>
                      {membership.organizationId === currentOrganizationId ? (
                        <Badge variant="outline" className="shrink-0">
                          {t('profile:status.current')}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('profile:sections.account.noOrganizations')}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
