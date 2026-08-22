/**
 * Academy Dashboard Page.
 *
 * Provides academy-level overview including metrics, activity, and quick actions.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, UserCheck, BookOpen, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { MetricCard, StatusBadge } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatform } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useAcademies,
  useAcademyStats,
  useAcademyActivity,
  useOnboardingProgress,
} from '../hooks';
import { AcademySwitcher } from '../components/AcademySwitcher';
import {
  getAcademyStatusLabelKey,
  getAcademyStatusTone,
} from '../utils/academy-status.utils';

export default function AcademyDashboardPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeAcademyId = searchParams.get('academyId');
  const { setActiveAcademy } = usePlatform();

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

  const { data: activityData, isLoading: isLoadingActivity } =
    useAcademyActivity(currentAcademy?.id ?? '', {
      enabled: !!currentAcademy?.id,
      query: { pagination: { page: 1, pageSize: 5 } },
    });

  const activities = activityData?.items ?? [];

  const { isComplete: isOnboardingComplete } = useOnboardingProgress(
    currentAcademy?.id ?? ''
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
        <ErrorState onRetry={() => refetchAcademies()} />
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
          primaryAction={{
            labelKey: 'academy:empty.createFirstAcademy',
            onAction: () => navigate(DASHBOARD_ROUTES.academyCreate),
            icon: Plus,
          }}
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
        actions={
          <div className="flex items-center gap-2">
            {academies.length > 1 && (
              <AcademySwitcher
                academies={academies}
                currentAcademy={currentAcademy}
              />
            )}
            <Button onClick={() => navigate(DASHBOARD_ROUTES.academyCreate)}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t('academy:create.title')}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {!isOnboardingComplete && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-foreground">
                {t('academy:onboarding.resumeBanner')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.academyOnboarding, {
                      academyId: currentAcademy.id,
                    })
                  )
                }
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
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {currentAcademy.description ||
                    t('academy:dashboard.overview')}
                </p>
                <StatusBadge
                  labelKey={getAcademyStatusLabelKey(currentAcademy.status)}
                  tone={getAcademyStatusTone(currentAcademy.status)}
                />
              </div>
              <div className="flex gap-2">
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
              <ErrorState onRetry={() => refetchStats()} />
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('academy:dashboard.recentActivity')}</CardTitle>
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
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {t(`academy:activity.${activity.type}`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      {activity.userName && (
                        <p className="text-xs text-muted-foreground">
                          {t('common:by')} {activity.userName}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
