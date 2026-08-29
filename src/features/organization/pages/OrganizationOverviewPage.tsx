/**
 * Organization Overview Page.
 *
 * The Organization's own identity (name/slug/status) — distinct from
 * `TenantDashboardPage` (`/dashboard/tenant`), which is subscription/
 * usage/add-ons only and never showed the organization itself. Read-only:
 * the backend has no update endpoint for this resource yet (see
 * Reports/PROGRESS.md's Organization Management Completion entry).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useOrganization } from '../hooks';
import type { OrganizationStatus } from '@types';

function statusTone(status: OrganizationStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'suspended') return 'warning';
  return 'neutral';
}

export default function OrganizationOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const organizationQuery = useOrganization();

  // Zero organizations — a real state today. Phase P19 closed the gap
  // this comment used to describe (`Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md`
  // P0-1: no organization-creation flow existed anywhere) — this empty
  // state is now the real entry point into it, not a dead end.
  if (user && user.organizations.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="organization:overview.title"
          descriptionKey="organization:overview.subtitle"
        />
        <EmptyState
          icon={Building2}
          titleKey="organization:overview.empty.title"
          descriptionKey="organization:overview.empty.description"
          primaryAction={{
            labelKey: 'organization:overview.empty.action',
            icon: Plus,
            onAction: () => navigate(DASHBOARD_ROUTES.organizationCreate),
          }}
        />
      </PageContainer>
    );
  }

  if (organizationQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (organizationQuery.error || !organizationQuery.data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="organization:overview.title"
          descriptionKey="organization:overview.subtitle"
        />
        <ErrorState onRetry={() => void organizationQuery.refetch()} />
      </PageContainer>
    );
  }

  const organization = organizationQuery.data;
  const isOwner = user?.id === organization.ownerUserId;

  return (
    <PageContainer>
      <PageHeader
        titleKey="organization:overview.title"
        descriptionKey="organization:overview.subtitle"
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
              <Building2 className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <CardTitle>{organization.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('organization:overview.fields.slug')}: {organization.slug}
              </p>
            </div>
          </div>
          <StatusBadge
            labelKey={`organization:overview.status.${organization.status}`}
            tone={statusTone(organization.status)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('organization:overview.fields.yourRelationship')}
              </p>
              <p className="mt-1 text-sm">
                {isOwner
                  ? t('organization:overview.status.owner')
                  : t('organization:overview.status.member')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('organization:overview.fields.createdAt')}
              </p>
              <p className="mt-1 text-sm">
                {new Date(organization.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
