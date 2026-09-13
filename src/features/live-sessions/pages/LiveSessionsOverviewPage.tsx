/**
 * Live Sessions — the add-on's own home.
 *
 * ITS FIRST JOB IS TO EXPLAIN ITSELF. The four dependencies are checked in
 * the order their fixes make sense, and only the blocking one is shown:
 * telling somebody to connect Zoom when the add-on is not installed would
 * be advice they cannot act on.
 *
 * Sessions are created in the COURSE BUILDER, not here, because a live
 * class belongs to a unit of a course. This page points there rather than
 * offering a second, context-free creation path that would produce
 * sessions attached to nothing.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Radio, Video } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePlatform } from '@hooks';
import { useLiveSessionsStatus } from '../hooks/useLiveSessions';

export default function LiveSessionsOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeAcademyId } = usePlatform();
  const statusQuery = useLiveSessionsStatus(activeAcademyId ?? undefined);

  if (!activeAcademyId) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:overview.title" descriptionKey="liveSessions:overview.subtitle" />
        <EmptyState
          icon={Radio}
          titleKey="liveSessions:overview.noAcademyTitle"
          descriptionKey="liveSessions:overview.noAcademyDescription"
        />
      </PageContainer>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader titleKey="liveSessions:overview.title" descriptionKey="liveSessions:overview.subtitle" />
        <SectionLoader />
      </PageContainer>
    );
  }

  const status = statusQuery.data;
  const addOn = status?.addOn;
  const quota = status?.recordingQuota;

  return (
    <PageContainer>
      <PageHeader
        titleKey="liveSessions:overview.title"
        descriptionKey="liveSessions:overview.subtitle"
      />

      {/* DEPENDENCY 1 — the add-on itself. */}
      {addOn && !addOn.usable ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-warning" aria-hidden />
              <h2 className="font-display text-sm font-semibold text-foreground">
                {t(`liveSessions:blocked.${addOn.reason ?? 'not_installed'}.title`)}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`liveSessions:blocked.${addOn.reason ?? 'not_installed'}.description`)}
            </p>
            <Button size="sm" onClick={() => navigate(DASHBOARD_ROUTES.addOns)}>
              {t('liveSessions:blocked.goToAddOns')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* DEPENDENCY 2 — the provider connection, only once the add-on works. */}
      {addOn?.usable && status?.provider.status !== 'connected' ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-warning" aria-hidden />
              <h2 className="font-display text-sm font-semibold text-foreground">
                {t(`liveSessions:provider.${status?.provider.status ?? 'not_connected'}.title`)}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                `liveSessions:provider.${status?.provider.status ?? 'not_connected'}.description`,
              )}
            </p>
            <Button
              size="sm"
              onClick={() => navigate(DASHBOARD_ROUTES.liveSessionsSettings)}
            >
              {t('liveSessions:provider.manageConnection')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* DEPENDENCY 3 — the recording allowance, shown as used / limit. */}
      {addOn?.usable && quota ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Video className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('liveSessions:quota.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quota.limit === 'unlimited'
                    ? t('liveSessions:quota.unlimited', { used: quota.used })
                    : t('liveSessions:quota.usedOfLimit', {
                        used: quota.used,
                        limit: quota.limit,
                      })}
                </p>
              </div>
            </div>
            {quota.remaining !== null ? (
              <p className="text-sm text-muted-foreground">
                {t('liveSessions:quota.remaining', { count: quota.remaining })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {addOn?.usable ? (
        <EmptyState
          icon={Radio}
          titleKey="liveSessions:overview.createInBuilderTitle"
          descriptionKey="liveSessions:overview.createInBuilderDescription"
          primaryAction={{
            labelKey: 'liveSessions:overview.goToCourses',
            onAction: () =>
              navigate(
                buildPath(DASHBOARD_ROUTES.academyCourses, {
                  academyId: activeAcademyId,
                }),
              ),
          }}
        />
      ) : null}
    </PageContainer>
  );
}
