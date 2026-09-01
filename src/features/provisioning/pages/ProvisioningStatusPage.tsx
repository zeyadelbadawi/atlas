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
 * `READY` means the provisioning contract reports the Academy is ready —
 * it does NOT mean a public website exists (that is Prompt 9/10's
 * responsibility). The only action offered on success is "Go to Academy
 * Dashboard"; there is deliberately no "Visit Website" action here.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Minus,
  XCircle,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@hooks';
import { useConfirmDialog } from '@app/providers';
import { toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useCancelProvisioning,
  useProvisioningRequest,
  useRetryProvisioning,
} from '../hooks';
import { getProvisioningStatusTone } from '../utils/provisioning-status.utils';
import { PROVISIONING_STEP_KEYS } from '../constants/provisioning.constants';
import type { ProvisioningStep, ProvisioningStepStatus } from '@types';

function StepIcon({ status }: { readonly status: ProvisioningStepStatus }): JSX.Element {
  switch (status) {
    case 'completed':
      return <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden />;
    case 'running':
      return <Loader2 className="size-4 shrink-0 animate-spin text-info" aria-hidden />;
    case 'failed':
      return <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />;
    case 'skipped':
      return <Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
    case 'pending':
    default:
      return <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  }
}

export default function ProvisioningStatusPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { organization } = useAuth();
  const { confirm } = useConfirmDialog();

  const { data: request, isLoading, error, refetch } = useProvisioningRequest(
    requestId ?? ''
  );
  const retryProvisioning = useRetryProvisioning();
  const cancelProvisioning = useCancelProvisioning();

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

  if (error || !request || !organization?.id) {
    return (
      <PageContainer>
        <PageHeader titleKey="provisioning:status.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const stepByKey = new Map<string, ProvisioningStep>(
    request.steps.map((step) => [step.key, step])
  );
  const isTerminal = request.status === 'ready' || request.status === 'failed' || request.status === 'cancelled';
  const isCancellable = !isTerminal;

  const handleRetry = () => {
    retryProvisioning.mutate({ organizationId: organization.id, requestId: request.id });
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      titleKey: 'provisioning:status.cancelConfirmTitle',
      descriptionKey: 'provisioning:status.cancelConfirmDescription',
      confirmLabelKey: 'provisioning:status.cancelConfirmAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    cancelProvisioning.mutate({ organizationId: organization.id, requestId: request.id });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="provisioning:status.title"
        descriptionKey="provisioning:status.subtitle"
        values={{ academyName: request.requestedAcademyName }}
        actions={
          <StatusBadge
            labelKey={`provisioning:status.lifecycle.${request.status}`}
            tone={getProvisioningStatusTone(request.status)}
          />
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('provisioning:status.checklistTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PROVISIONING_STEP_KEYS.map((stepKey) => {
                const step = stepByKey.get(stepKey);
                const status = step?.status ?? 'pending';
                return (
                  <li key={stepKey} className="flex items-start gap-3">
                    <StepIcon status={status} />
                    <div className="flex-1">
                      <p
                        className={
                          status === 'completed' || status === 'skipped'
                            ? 'text-sm text-muted-foreground'
                            : 'text-sm font-medium text-foreground'
                        }
                      >
                        {t(`provisioning:step.${stepKey}`)}
                      </p>
                      {status === 'failed' && step?.error ? (
                        <p className="mt-0.5 text-sm text-destructive">
                          {t(toErrorsNamespaceKey(step.error.messageKey))}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {request.status === 'failed' ? (
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
              {retryProvisioning.error ? (
                <ErrorState onRetry={handleRetry} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleRetry}
                    disabled={retryProvisioning.isPending}
                  >
                    {retryProvisioning.isPending ? (
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
              <CheckCircle2 className="size-10 text-success" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  {t('provisioning:status.readyTitle')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('provisioning:status.readyDescription')}
                </p>
              </div>
              {request.academyId ? (
                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      buildPath(DASHBOARD_ROUTES.academyProfile, {
                        academyId: request.academyId!,
                      })
                    )
                  }
                >
                  {t('provisioning:status.goToAcademy')}
                </Button>
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
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
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
