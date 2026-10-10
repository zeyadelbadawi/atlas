/**
 * Provisioning Status Page.
 *
 * Every step here is driven entirely by `useProvisioningRequest`'s real,
 * backend-authoritative state — no `setTimeout`-simulated progress, no
 * automatically-advancing statuses (see `Reports/ARCHITECTURE.md`,
 * Prompt 8, "No Fake Backend"). Refreshing this page, or opening it in a
 * second tab, restores the same state from the query layer; nothing here
 * is tracked in local component state.
 *
 * `READY` means the provisioning contract reports the Academy is ready.
 * Before Phase 6, that did NOT mean a public website existed, so this
 * page deliberately offered no "Visit Website" action. Phase 6 (Bilingual
 * Academy Websites) changes that: whenever a theme was selected, the
 * `'theme'` provisioning step has already generated a real, structured,
 * bilingual website (`WebsiteGenerationService`) by the time this screen
 * ever shows `ready` — so the ready card now also offers "View your
 * website," the reveal moment the specification's §7.2 recommends in
 * place of a pre-creation preview: real, rendered, honest, reusing the
 * existing in-dashboard `WebsitePreviewPage` pipeline, not a second
 * preview mechanism.
 *
 * W2 — the checklist is now four real stages (`ProvisioningProgress`), each
 * tied to the server's step states; the branding chosen in the form is
 * applied server-side (no "saving your branding" card that died on
 * refresh), a stalled request offers Retry, and a branding failure shows a
 * warning with Retry on an otherwise ready Academy. "View your website" is
 * offered whenever the website was built — which is now always.
 */
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, usePlatform } from '@hooks';
import { useConfirmDialog } from '@app/providers';
import {
  isOnboardingPendingForActiveOrganization,
  toErrorsNamespaceKey,
} from '@utils';
import {
  DASHBOARD_ROUTES,
  ONBOARDING_ROUTES,
  buildPath,
} from '@app/routes/route-paths';
import { useCancelProvisioning, useProvisioningProgress } from '../hooks';
import { ProvisioningProgress } from '../components/ProvisioningProgress';
import { AcademyBuildExperience } from '@components/academy-build';
import {
  academyBuildStore,
  finishAcademyBuild,
  isAcademyBuildActive,
} from '@components/academy-build';
import {
  getProvisioningHeadingKeys,
  getProvisioningStatusTone,
} from '../utils/provisioning-status.utils';

export default function ProvisioningStatusPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { user, organization } = useAuth();
  const { setActiveAcademy } = usePlatform();
  const { confirm } = useConfirmDialog();

  const progress = useProvisioningProgress(requestId ?? '');
  const { request, query } = progress;
  const cancelProvisioning = useCancelProvisioning();
  useSyncExternalStore(
    academyBuildStore.subscribe,
    academyBuildStore.version,
    academyBuildStore.version
  );

  if (query.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!request || !organization?.id) {
    return (
      <PageContainer>
        <PageHeader titleKey="provisioning:status.title" />
        <ErrorState onRetry={() => query.refetch()} />
      </PageContainer>
    );
  }

  const isTerminal =
    request.status === 'ready' ||
    request.status === 'failed' ||
    request.status === 'cancelled';
  const isCancellable = !isTerminal;
  // The same academy build screen as onboarding, for every academy created
  // with the setup form (the second, third… academy): the form starts the
  // build window on submit. Never over a failure or a cancellation; the
  // ready card waits until the screen hands back. A request opened without
  // a window on this device keeps the real four-stage view.
  const showBuild =
    request.status !== 'failed' &&
    request.status !== 'cancelled' &&
    isAcademyBuildActive(request.id);
  const headings = getProvisioningHeadingKeys(request.status);

  const handleRetry = () => progress.retry();

  const handleCancel = async () => {
    const confirmed = await confirm({
      titleKey: 'provisioning:status.cancelConfirmTitle',
      descriptionKey: 'provisioning:status.cancelConfirmDescription',
      confirmLabelKey: 'provisioning:status.cancelConfirmAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    cancelProvisioning.mutate({
      organizationId: organization.id,
      requestId: request.id,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="provisioning:status.title"
        descriptionKey={headings.subtitleKey}
        values={{ academyName: request.requestedAcademyName }}
        actions={
          <StatusBadge
            labelKey={`provisioning:status.lifecycle.${request.status}`}
            tone={getProvisioningStatusTone(request.status)}
          />
        }
      />

      <div className="space-y-6">
        {showBuild ? (
          <AcademyBuildExperience
            requestId={request.id}
            academyName={request.requestedAcademyName}
            serverReady={request.status === 'ready'}
            onComplete={() => finishAcademyBuild(request.id)}
          >
            {request.stalled === true || progress.isReconnecting ? (
              <ProvisioningProgress
                request={request}
                logo={progress.logo}
                onRetry={handleRetry}
                isRetrying={progress.isRetrying}
                retryFailed={!!progress.retryError}
                isReconnecting={progress.isReconnecting}
              />
            ) : null}
          </AcademyBuildExperience>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t(headings.checklistTitleKey)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProvisioningProgress
                request={request}
                logo={progress.logo}
                onRetry={handleRetry}
                isRetrying={progress.isRetrying}
                retryFailed={
                  !!progress.retryError && request.status !== 'failed'
                }
                isReconnecting={progress.isReconnecting}
              />
            </CardContent>
          </Card>
        )}

        {showBuild ? null : request.status === 'failed' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                {t('provisioning:status.failedTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {request.lastError
                  ? t(toErrorsNamespaceKey(request.lastError.messageKey))
                  : t('provisioning:status.failedGenericDescription')}
              </p>
              {progress.retryError ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleRetry}
                    disabled={progress.isRetrying}
                  >
                    {progress.isRetrying ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t('provisioning:status.retryAction')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(DASHBOARD_ROUTES.provisioning)}
                  >
                    {t('provisioning:status.returnToDashboard')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : request.status === 'ready' ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <CheckCircle2
                className="size-10 text-success"
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  {t('provisioning:status.readyTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('provisioning:status.readyDescription')}
                </p>
              </div>
              {request.academyId ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {request.steps.some(
                    (step) =>
                      step.key === 'theme' && step.status === 'completed'
                  ) ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveAcademy(request.academyId!);
                        navigate(
                          buildPath(DASHBOARD_ROUTES.websitePreview, {
                            academyId: request.academyId!,
                          })
                        );
                      }}
                    >
                      {t('provisioning:status.viewWebsite')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => {
                      // New Customer Onboarding — an owner whose setup is
                      // still open continues in the one setup shell (which
                      // resumes at the next open step); everyone else goes
                      // to the new academy's dashboard. The retired
                      // client-side wizard is no longer a destination.
                      // `setActiveAcademy` first, so the header/sidebar's
                      // academy context is already correct either way.
                      setActiveAcademy(request.academyId!);
                      navigate(
                        isOnboardingPendingForActiveOrganization(
                          user,
                          organization
                        )
                          ? ONBOARDING_ROUTES.root
                          : buildPath(DASHBOARD_ROUTES.academyOverview, {
                              academyId: request.academyId!,
                            }),
                        { replace: true }
                      );
                    }}
                  >
                    {t('provisioning:status.goToAcademy')}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : request.status === 'cancelled' ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('provisioning:status.cancelledDescription')}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2
                className="size-5 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                {t('provisioning:status.inProgressDescription')}
              </p>
            </CardContent>
          </Card>
        )}

        {isCancellable ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelProvisioning.isPending}
            >
              {t('provisioning:status.cancelAction')}
            </Button>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
