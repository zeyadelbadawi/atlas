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
import { useDateFormatter } from '@hooks';
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
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const isLearner = audience === 'learner';

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
          {isLearner ? null : (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('profile:fields.role')}
              </p>
              <p className="mt-1 text-sm capitalize">
                {user.roles.length > 0
                  ? user.roles.join(', ')
                  : t('profile:status.noRole')}
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
              {user.organizationMemberships &&
              user.organizationMemberships.length > 0 ? (
                <div className="space-y-2">
                  {user.organizationMemberships.map((membership) => (
                    <div
                      key={membership.organizationId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {membership.organizationName}
                        </p>
                        <p className="text-sm capitalize text-muted-foreground">
                          {membership.role}
                        </p>
                      </div>
                      {membership.isPrimary ? (
                        <Badge variant="outline">
                          {t('profile:status.current')}
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
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
