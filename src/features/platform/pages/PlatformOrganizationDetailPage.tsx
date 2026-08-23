/**
 * Platform Organization — Detail Page (Prompt 13).
 *
 * Read-only cross-tenant view — subscription/usage are rendered from the
 * SAME `TenantSubscription`/`TenantUsage` shapes the Tenant's own
 * dashboard (Prompt 6) already renders, never a re-derived projection.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformOrganization } from '../hooks';
import { getPlatformOrganizationStatusTone } from '../utils/platform-status.utils';

export default function PlatformOrganizationDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { organizationId } = useParams<{ organizationId: string }>();

  const { data: organization, isLoading, error, refetch } = usePlatformOrganization(
    organizationId ?? ''
  );

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

  if (error || !organization) {
    return (
      <PageContainer>
        <PageHeader titleKey="platform:organizations.detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:organizations.detailTitle"
        title={organization.name}
        actions={
          <StatusBadge
            labelKey={`platform:organizations.status.${organization.status}`}
            tone={getPlatformOrganizationStatusTone(organization.status)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:organizations.overviewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:organizations.owner')}</p>
              <p className="text-sm text-foreground">{organization.ownerName ?? '—'}</p>
              {organization.ownerEmail ? (
                <p className="text-xs text-muted-foreground">{organization.ownerEmail}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:organizations.table.createdAt')}</p>
              <p className="text-sm text-foreground">
                {new Date(organization.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:organizations.subscriptionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.subscription ? (
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t('platform:organizations.table.plan')}</p>
                  <p className="font-medium text-foreground">{organization.subscription.plan.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('platform:organizations.subscriptionStatus')}</p>
                  <p className="font-medium text-foreground">
                    {t(`tenant:common.subscriptionStatus.${organization.subscription.status}`)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('platform:organizations.currentPeriodEnd')}
                  </p>
                  <p className="font-medium text-foreground">
                    {organization.subscription.currentPeriodEnd
                      ? new Date(organization.subscription.currentPeriodEnd).toLocaleDateString(
                          i18n.language
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState titleKey="platform:organizations.noSubscription" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:organizations.academiesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.academies.length === 0 ? (
              <EmptyState titleKey="platform:organizations.noAcademies" />
            ) : (
              <ul className="divide-y divide-border">
                {organization.academies.map((academy) => (
                  <li key={academy.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{academy.name}</span>
                    <span className="text-xs text-muted-foreground">{academy.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:organizations.membersTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.members.length === 0 ? (
              <EmptyState titleKey="platform:organizations.noMembers" />
            ) : (
              <ul className="divide-y divide-border">
                {organization.members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{member.role}</span>
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
