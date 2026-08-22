/**
 * Platform Provisioning — Detail Page.
 *
 * Retry/Cancel are gated INLINE by `platform.provisioning.manage` — a
 * viewer with only route-level (`platform_owner`) access sees a read-only
 * view, the same "route-level view vs. page-level action permission"
 * separation Prompt 7 established for payment review. Unlike the
 * customer-facing `ProvisioningStatusPage`, this authorized console may
 * show a failed step's raw `error.detail` (diagnostic text), never shown
 * to the customer (see `Reports/ARCHITECTURE.md`, Prompt 8, "Provisioning
 * Failure UX").
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Check, Circle, Loader2, Minus, XCircle } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@app/providers';
import { usePermissions } from '@hooks';
import {
  usePlatformCancelProvisioning,
  usePlatformProvisioningRequest,
  usePlatformRetryProvisioning,
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

export default function PlatformProvisioningDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { requestId } = useParams<{ requestId: string }>();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();

  const { data: request, isLoading, error, refetch } = usePlatformProvisioningRequest(
    requestId ?? ''
  );
  const retryProvisioning = usePlatformRetryProvisioning();
  const cancelProvisioning = usePlatformCancelProvisioning();

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

  if (error || !request) {
    return (
      <PageContainer>
        <PageHeader titleKey="provisioning:platformConsole.detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const canManage = hasPermission('platform.provisioning.manage');
  const isTerminal =
    request.status === 'ready' || request.status === 'failed' || request.status === 'cancelled';
  const stepByKey = new Map<string, ProvisioningStep>(
    request.steps.map((step) => [step.key, step])
  );

  const handleRetry = async () => {
    const confirmed = await confirm({
      titleKey: 'provisioning:platformConsole.retryConfirmTitle',
      descriptionKey: 'provisioning:platformConsole.retryConfirmDescription',
      confirmLabelKey: 'provisioning:platformConsole.retryAction',
    });
    if (!confirmed) return;
    retryProvisioning.mutate(request.id);
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      titleKey: 'provisioning:platformConsole.cancelConfirmTitle',
      descriptionKey: 'provisioning:platformConsole.cancelConfirmDescription',
      confirmLabelKey: 'provisioning:platformConsole.cancelAction',
      intent: 'destructive',
    });
    if (!confirmed) return;
    cancelProvisioning.mutate(request.id);
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="provisioning:platformConsole.detailTitle"
        descriptionKey="provisioning:platformConsole.detailSubtitle"
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
            <CardTitle className="text-base">{request.requestedAcademyName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('provisioning:platformConsole.organization')}
              </span>
              <span className="font-mono text-xs">{request.organizationId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('provisioning:platformConsole.table.attempts')}
              </span>
              <span data-atlas-numeric="true">{request.attemptCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('provisioning:platformConsole.table.startedAt')}
              </span>
              <span>{new Date(request.createdAt).toLocaleString(i18n.language)}</span>
            </div>
          </CardContent>
        </Card>

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
                      <p className="text-sm font-medium text-foreground">
                        {t(`provisioning:step.${stepKey}`)}
                      </p>
                      {status === 'failed' && step?.error ? (
                        <div className="mt-0.5 space-y-0.5">
                          <p className="text-sm text-destructive">
                            {t(step.error.messageKey)}
                          </p>
                          {step.error.detail ? (
                            <p className="font-mono text-xs text-muted-foreground">
                              {step.error.detail}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {!canManage ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('provisioning:platformConsole.readOnlyNotice')}
            </CardContent>
          </Card>
        ) : !isTerminal ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleRetry}
              disabled={retryProvisioning.isPending}
            >
              {retryProvisioning.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('provisioning:platformConsole.retryAction')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelProvisioning.isPending}
            >
              {t('provisioning:platformConsole.cancelAction')}
            </Button>
          </div>
        ) : request.status === 'failed' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleRetry}
              disabled={retryProvisioning.isPending}
            >
              {retryProvisioning.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('provisioning:platformConsole.retryAction')}
            </Button>
          </div>
        ) : null}

        {retryProvisioning.error ? <ErrorState onRetry={handleRetry} /> : null}
        {cancelProvisioning.error ? <ErrorState onRetry={handleCancel} /> : null}
      </div>
    </PageContainer>
  );
}
