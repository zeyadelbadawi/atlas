/**
 * Platform User — Detail Page (Prompt 13).
 *
 * Read-only. Deliberately narrow, per `platform-user.types.ts`'s doc
 * comment — no credentials, tokens, or raw session data are ever
 * requested or rendered here.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformUser } from '../hooks';
import { getPlatformUserStatusTone } from '../utils/platform-status.utils';

export default function PlatformUserDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { userId } = useParams<{ userId: string }>();

  const { data: user, isLoading, error, refetch } = usePlatformUser(userId ?? '');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !user) {
    return (
      <PageContainer>
        <PageHeader titleKey="platform:users.detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:users.detailTitle"
        title={user.name}
        actions={
          <StatusBadge
            labelKey={`platform:users.status.${user.status}`}
            tone={getPlatformUserStatusTone(user.status)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:users.overviewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:users.table.email')}</p>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:users.table.lastSignIn')}</p>
              <p className="text-sm text-foreground">
                {user.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleDateString(i18n.language)
                  : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:users.table.createdAt')}</p>
              <p className="text-sm text-foreground">
                {new Date(user.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:users.rolesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {user.roles.length === 0 ? (
              <EmptyState titleKey="platform:users.noRoles" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:users.membershipsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {user.organizationMemberships.length === 0 ? (
              <EmptyState titleKey="platform:users.noMemberships" />
            ) : (
              <ul className="divide-y divide-border">
                {user.organizationMemberships.map((membership) => (
                  <li
                    key={membership.organizationId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground">{membership.organizationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(membership.joinedAt).toLocaleDateString(i18n.language)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{membership.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
