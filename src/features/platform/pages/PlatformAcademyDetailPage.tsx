/**
 * Platform Academy — Detail Page (Prompt 13).
 *
 * Read-only cross-tenant view. Provisioning/Website/Domain statuses reuse
 * the EXACT tone functions and translation keys their own domains already
 * established (Prompt 8/9/11) — never a re-derived label set.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformAcademy } from '../hooks';
import {
  getPlatformAcademyStatusTone,
  getPlatformProvisioningStatusTone,
  getPlatformWebsitePublishStatusTone,
} from '../utils/platform-status.utils';
import { getDomainStatusTone } from '@features/domain';

export default function PlatformAcademyDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();

  const { data: academy, isLoading, error, refetch } = usePlatformAcademy(academyId ?? '');

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

  if (error || !academy) {
    return (
      <PageContainer>
        <PageHeader titleKey="platform:academies.detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:academies.detailTitle"
        title={academy.name}
        actions={
          <StatusBadge
            labelKey={`platform:academies.status.${academy.status}`}
            tone={getPlatformAcademyStatusTone(academy.status)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:academies.overviewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.table.organization')}</p>
              <p className="text-sm text-foreground">{academy.organizationName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.owner')}</p>
              <p className="text-sm text-foreground">{academy.ownerName ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.table.createdAt')}</p>
              <p className="text-sm text-foreground">
                {new Date(academy.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
            {academy.description ? (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground">{t('platform:academies.description')}</p>
                <p className="text-sm text-foreground">{academy.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:academies.stateTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.provisioningStatus')}</p>
              {academy.provisioningStatus ? (
                <StatusBadge
                  labelKey={`provisioning:status.lifecycle.${academy.provisioningStatus}`}
                  tone={getPlatformProvisioningStatusTone(academy.provisioningStatus)}
                />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.websiteStatus')}</p>
              {academy.websiteStatus ? (
                <StatusBadge
                  labelKey={`website:publish.status.${academy.websiteStatus}`}
                  tone={getPlatformWebsitePublishStatusTone(academy.websiteStatus)}
                />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('platform:academies.domainStatus')}</p>
              {academy.domainStatus ? (
                <StatusBadge
                  labelKey={`website:domain.custom.status.${academy.domainStatus}`}
                  tone={getDomainStatusTone(academy.domainStatus)}
                />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:academies.coursesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {academy.courses.length === 0 ? (
              <EmptyState titleKey="platform:academies.noCourses" />
            ) : (
              <ul className="divide-y divide-border">
                {academy.courses.map((course) => (
                  <li key={course.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{course.title}</span>
                    <span className="text-xs text-muted-foreground">{course.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:academies.membersTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {academy.members.length === 0 ? (
              <EmptyState titleKey="platform:academies.noMembers" />
            ) : (
              <ul className="divide-y divide-border">
                {academy.members.map((member) => (
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
