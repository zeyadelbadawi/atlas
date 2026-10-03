/**
 * Academy Dashboard Page.
 *
 * Provides academy-level overview including metrics, activity, and quick actions.
 *
 * Prompt 13 health-view audit: `AcademyStats` (`totalMembers`/
 * `activeStaff`/`activeInstructors`/`publishedCourses`) and the real
 * Academy activity log feed (Task 3) below already cover this page's "aggregated
 * health view" and "activity/audit trail" requirements — neither is a
 * scaffold. "Active students" and "completion rate" are NOT added here:
 * no `AcademyStats`, Course, Enrollment, or Progress type anywhere in
 * Atlas exposes either metric, so surfacing them would mean computing an
 * unverified number client-side rather than reflecting a real backend
 * figure — the same boundary already documented for Roles & Permissions
 * and the Plan/Add-on catalog. The one real, previously-missing link this
 * page did own — a Quick Action to the Academy's own Website — is added
 * below; it needs no new fetch, since it is pure navigation.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, UserCheck, BookOpen, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { MetricCard, StatusBadge } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { apiErrorKind } from '@api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, usePermissions, usePlatform } from '@hooks';
import {
  DASHBOARD_ROUTES,
  ONBOARDING_ROUTES,
  buildPath,
} from '@app/routes/route-paths';
import { isOnboardingPendingForActiveOrganization } from '@utils';
import {
  useAcademies,
  useAcademyStats,
  useAcademyWebsiteStatus,
} from '../hooks';
import {
  AuditEntryRow,
  tenantEntryToRow,
  useAcademyActivityLog,
} from '@features/audit-log';
import { AcademySwitcher } from '../components/AcademySwitcher';
import { WEBSITE_STATUS_TONE } from '../utils/academy-status.utils';

export default function AcademyDashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeAcademyId = searchParams.get('academyId');
  const { setActiveAcademy } = usePlatform();
  const { hasPermission } = usePermissions();
  // Phase 5 — `academy.provisioning.create` is Organization-Owner-only
  // (`ORGANIZATION_OWNER_PERMISSIONS`, never granted to a Manager/
  // Instructor/Student — see that constant's own doc comment), matching
  // the identical `requiredPermissions` the `academyCreate` route itself
  // already enforces. Gating the CTA on the same permission means a
  // Manager viewing this page never sees an action that the route guard
  // would immediately reject anyway.
  const canCreateAcademy = hasPermission('academy.provisioning.create');

  const {
    data: academiesData,
    isLoading: isLoadingAcademies,
    error: academiesError,
    refetch: refetchAcademies,
  } = useAcademies();
  const academies = academiesData?.items ?? [];
  const hasAcademies = academies.length > 0;

  const currentAcademy = activeAcademyId
    ? academies.find((a) => a.id === activeAcademyId)
    : academies[0];
  // Only for members who may see the website; a member without
  // `academy.website.view` gets no status line rather than a 403.
  const { status: websiteStatus } = useAcademyWebsiteStatus(
    currentAcademy?.id,
    { enabled: hasPermission('academy.website.view') }
  );

  // Keeps the sidebar's notion of "active academy" (which has no route params
  // of its own to read) in sync with whichever academy this page resolved to.
  useEffect(() => {
    setActiveAcademy(currentAcademy?.id);
  }, [currentAcademy?.id, setActiveAcademy]);

  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useAcademyStats(currentAcademy?.id ?? '', {
    enabled: !!currentAcademy?.id,
  });

  // Task 3 — the latest entries of the Academy activity log. Owner-only on
  // the server (organization owner or owner/administrator academy member),
  // so the widget is shown only to callers holding the owner-only
  // `tenant.dashboard.view` — a manager is never shown a card that 403s.
  const canViewActivityLog = hasPermission('tenant.dashboard.view');
  const { data: activityData, isLoading: isLoadingActivity } =
    useAcademyActivityLog(
      currentAcademy?.id ?? '',
      {},
      { limit: 5, enabled: !!currentAcademy?.id && canViewActivityLog }
    );

  const activities = (activityData?.pages[0]?.items ?? []).map(
    tenantEntryToRow
  );

  /*
    New Customer Onboarding — the "finish setup" nudge follows the SERVER's
    answer for the organization (`onboardingPending` on the owner's
    membership), not a per-browser checklist. It points at the one setup
    shell, which resumes at whatever step is actually open.
  */
  const { user, organization } = useAuth();
  const isOnboardingPending = isOnboardingPendingForActiveOrganization(
    user,
    organization
  );

  if (isLoadingAcademies) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (academiesError) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:dashboard.title"
          descriptionKey="academy:dashboard.subtitle"
        />
        <ErrorState
          kind={apiErrorKind(academiesError)}
          onRetry={() => refetchAcademies()}
        />
      </PageContainer>
    );
  }

  if (!hasAcademies) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:dashboard.title"
          descriptionKey="academy:dashboard.subtitle"
        />
        <EmptyState
          titleKey="academy:empty.noAcademies"
          descriptionKey="academy:empty.noAcademiesDescription"
          icon={Building2}
          // Phase 10.6 — the CTA hands off to Academy Provisioning, which
          // is now the only path that creates an Academy. This page no
          // longer creates one itself: the direct route it used to post to
          // skipped subdomain allocation, which is what left five of six
          // production academy websites unreachable.
          primaryAction={
            canCreateAcademy
              ? {
                  labelKey: 'academy:empty.createFirstAcademy',
                  onAction: () => navigate(DASHBOARD_ROUTES.provisioningNew),
                  icon: Plus,
                }
              : undefined
          }
        />
      </PageContainer>
    );
  }

  if (!currentAcademy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:dashboard.title"
          descriptionKey="academy:dashboard.subtitle"
        />
        <EmptyState
          titleKey="academy:errors.invalidAcademy"
          descriptionKey="academy:errors.loadFailed"
          icon={Building2}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="academy:dashboard.title"
        descriptionKey="academy:dashboard.subtitle"
        // Phase 10.6 — NO creation action here. Once an Academy exists
        // this page is an overview, and the single way to create another
        // is Academy Provisioning. A second entry point is exactly what
        // the two-creation-path defect was, so it is not re-introduced in
        // a different shape.
        actions={
          academies.length > 1 ? (
            <AcademySwitcher
              academies={academies}
              currentAcademy={currentAcademy}
            />
          ) : undefined
        }
      />

      <div className="space-y-6">
        {isOnboardingPending && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-foreground">
                {t('academy:onboarding.resumeBanner')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ONBOARDING_ROUTES.root)}
              >
                {t('academy:onboarding.resumeAction')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Academy Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('academy:dashboard.welcome', {
                academyName: currentAcademy.name,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stacks on phones: side by side, the buttons pushed the page
                wider than a 390px screen. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {currentAcademy.description ||
                    t('academy:dashboard.overview')}
                </p>
                {/* The website's publish state is the status an owner acts
                    on; the Academy's internal lifecycle status is not
                    shown here (Task 1). */}
                {websiteStatus ? (
                  <div
                    className="flex items-center gap-2"
                    data-testid="academy-website-status"
                  >
                    <span className="text-sm text-muted-foreground">
                      {t('academy:dashboard.websiteStatus')}
                    </span>
                    <StatusBadge
                      labelKey={`website:publish.status.${websiteStatus}`}
                      tone={WEBSITE_STATUS_TONE[websiteStatus]}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(
                      DASHBOARD_ROUTES.academyProfile.replace(
                        ':academyId',
                        currentAcademy.id
                      )
                    )
                  }
                >
                  {t('academy:dashboard.viewProfile')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(
                      DASHBOARD_ROUTES.academySettings.replace(
                        ':academyId',
                        currentAcademy.id
                      )
                    )
                  }
                >
                  {t('academy:dashboard.manageSettings')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingStats ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : statsError ? (
            <div className="col-span-full">
              <ErrorState
                kind={apiErrorKind(statsError)}
                onRetry={() => refetchStats()}
              />
            </div>
          ) : (
            <>
              <MetricCard
                labelKey="academy:stats.totalMembers"
                value={stats?.totalMembers.toString() ?? '0'}
                icon={Users}
              />
              <MetricCard
                labelKey="academy:stats.activeStaff"
                value={stats?.activeStaff.toString() ?? '0'}
                icon={UserCheck}
              />
              <MetricCard
                labelKey="academy:stats.activeInstructors"
                value={stats?.activeInstructors.toString() ?? '0'}
                icon={UserCheck}
              />
              <MetricCard
                labelKey="academy:stats.publishedCourses"
                value={stats?.publishedCourses.toString() ?? '0'}
                icon={BookOpen}
              />
            </>
          )}
        </div>

        {/* Recent Activity — Task 3: readable sentences from the activity log */}
        {canViewActivityLog ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>{t('academy:dashboard.recentActivity')}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.academyActivityLog, {
                      academyId: currentAcademy.id,
                    })
                  )
                }
              >
                {t('auditLog:dashboardWidget.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : activities.length === 0 ? (
                <EmptyState
                  titleKey="academy:empty.noActivity"
                  descriptionKey="academy:empty.noActivityDescription"
                  className="py-8"
                />
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {activities.map((row) => (
                    <AuditEntryRow key={row.id} row={row} compact />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('academy:dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  navigate(
                    DASHBOARD_ROUTES.academyProfile.replace(
                      ':academyId',
                      currentAcademy.id
                    )
                  )
                }
              >
                {t('academy:dashboard.viewProfile')}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  navigate(
                    DASHBOARD_ROUTES.academyMembers.replace(
                      ':academyId',
                      currentAcademy.id
                    )
                  )
                }
              >
                {t('academy:dashboard.viewMembers')}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  navigate(
                    DASHBOARD_ROUTES.academyBranding.replace(
                      ':academyId',
                      currentAcademy.id
                    )
                  )
                }
              >
                {t('academy:dashboard.updateBranding')}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.websiteOverview, {
                      academyId: currentAcademy.id,
                    })
                  )
                }
              >
                {t('academy:dashboard.viewWebsite')}
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  navigate(
                    DASHBOARD_ROUTES.academySettings.replace(
                      ':academyId',
                      currentAcademy.id
                    )
                  )
                }
              >
                {t('academy:dashboard.manageSettings')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
