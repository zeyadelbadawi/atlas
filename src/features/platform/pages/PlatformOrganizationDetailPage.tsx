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
import { useDateFormatter } from '@hooks';
import { resolvePlanName } from '@features/tenant';
import type { LanguageCode } from '@types';
import { OrganizationCommissionCard } from '@features/platform-commerce';
import { AcquisitionCard } from '@features/platform-growth';
import { usePlatformOrganization } from '../hooks';
import { SubscriptionAdjustmentsCard } from '../components/SubscriptionAdjustmentsCard';
import { InternalOrganizationCard } from '../components/InternalOrganizationCard';
import { OrganizationOwnerContactDetails } from '../components/OrganizationOwnerContactDetails';
import { getPlatformOrganizationStatusTone } from '../utils/platform-status.utils';

export default function PlatformOrganizationDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  // B8 (UX audit) V13 — a member's role in the page's language; a role
  // this build doesn't know is shown as the API sends it.
  const roleLabel = (role: string): string => {
    const key = `platform:organizations.memberRoles.${role}`;
    return i18n.exists(key) ? t(key) : role;
  };
  const { organizationId } = useParams<{ organizationId: string }>();

  const {
    data: organization,
    isLoading,
    error,
    refetch,
  } = usePlatformOrganization(organizationId ?? '');

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
            <CardTitle className="text-base">
              {t('platform:organizations.overviewTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('platform:organizations.owner')}
              </p>
              <p className="text-sm text-foreground" dir="auto">
                {organization.ownerName ?? '—'}
              </p>
              {organization.ownerEmail ? (
                <p
                  className="break-all text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {organization.ownerEmail}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('platform:organizations.table.createdAt')}
              </p>
              <p className="text-sm text-foreground">
                {fmt.date(organization.createdAt)}
              </p>
            </div>
            {/* B0-IAM-08 / B0-ANL-04 — opted-in owner phone; sign-up source. */}
            <OrganizationOwnerContactDetails
              ownerPhone={organization.ownerPhone}
              signupAttribution={organization.signupAttribution}
            />
          </CardContent>
        </Card>

        {/* G1 — the CAC channel, how it was decided, and "Set channel". */}
        <AcquisitionCard
          organizationId={organization.id}
          acquisition={organization.acquisition}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platform:organizations.subscriptionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organization.subscription ? (
              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('platform:organizations.table.plan')}
                  </p>
                  <p className="font-medium text-foreground" dir="auto">
                    {resolvePlanName(
                      organization.subscription.plan,
                      i18n.language as LanguageCode
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('platform:organizations.subscriptionStatus')}
                  </p>
                  <p className="font-medium text-foreground">
                    {t(
                      `tenant:common.subscriptionStatus.${organization.subscription.status}`
                    )}
                  </p>
                </div>
                {/* B8 (UX audit) V13 — a trial shows when it ends, a grace
                    period when it ends; a paid period its end. */}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      organization.subscription.status === 'trialing'
                        ? 'platform:organizations.trialEnds'
                        : organization.subscription.status === 'grace_period'
                          ? 'platform:organizations.graceEnds'
                          : 'platform:organizations.currentPeriodEnd'
                    )}
                  </p>
                  <p
                    className="font-medium text-foreground"
                    data-testid="platform-org-period-end"
                  >
                    {(() => {
                      const sub = organization.subscription;
                      const end =
                        sub.status === 'trialing'
                          ? (sub.trialEndsAt ?? sub.currentPeriodEnd)
                          : sub.status === 'grace_period'
                            ? (sub.graceEndsAt ?? sub.currentPeriodEnd)
                            : sub.currentPeriodEnd;
                      return end ? fmt.date(end) : '—';
                    })()}
                  </p>
                </div>
                {/* W8 — gifted setup days granted on this organization's
                    first paid subscription. */}
                {organization.subscription.giftedDays &&
                organization.subscription.giftedEndsAt ? (
                  <div
                    className="sm:col-span-3"
                    data-testid="platform-org-gift"
                  >
                    <p className="font-medium text-foreground">
                      {t('tenant:gift.includes', {
                        count: organization.subscription.giftedDays,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('tenant:gift.adminGiftEnds', {
                        date: fmt.date(organization.subscription.giftedEndsAt),
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState titleKey="platform:organizations.noSubscription" />
            )}
          </CardContent>
        </Card>

        {/* B0-BIL-06 — audited Platform Owner remedies. */}
        {organization.subscription ? (
          <SubscriptionAdjustmentsCard
            organizationId={organization.id}
            subscription={organization.subscription}
          />
        ) : null}

        {/* B0-ANL-04 — internal (test/demo/staff) organizations leave MRR. */}
        <InternalOrganizationCard organizationId={organization.id} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platform:organizations.academiesTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organization.academies.length === 0 ? (
              <EmptyState titleKey="platform:organizations.noAcademies" />
            ) : (
              <ul className="divide-y divide-border">
                {organization.academies.map((academy) => (
                  <li
                    key={academy.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span
                      className="min-w-0 break-words text-foreground"
                      dir="auto"
                    >
                      {academy.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(`platform:academies.status.${academy.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platform:organizations.membersTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organization.members.length === 0 ? (
              <EmptyState titleKey="platform:organizations.noMembers" />
            ) : (
              <ul className="divide-y divide-border">
                {organization.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-foreground" dir="auto">
                        {member.name}
                      </p>
                      <p
                        className="break-all text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {member.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {roleLabel(member.role)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <OrganizationCommissionCard organizationId={organization.id} />
      </div>
    </PageContainer>
  );
}
