/**
 * Setup — Academy (required).
 *
 * Creates the academy with the SAME form as `ProvisioningStartPage`
 * (`AcademySetupForm`) and then stays here, following the provisioning
 * request with the same hook `ProvisioningStatusPage` uses
 * (`useProvisioningRequest`, which polls until a terminal state). A
 * failure offers the same explicit retry (`useRetryProvisioning`).
 *
 * The step is complete when the SERVER says so (academy exists and its
 * provisioning is `ready`); the shell re-reads the status as provisioning
 * finishes, and only then is Continue offered.
 *
 * W2 — the progress is the shared four-stage `ProvisioningProgress` (real
 * step states only, a live-region announcement, Retry when stalled), and
 * the branding chosen in the form is applied server-side; the finished
 * panel shows a brand follow-up only when something still needs the owner.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@hooks';
import { toErrorsNamespaceKey } from '@utils';
import {
  AcademySetupForm,
  isBrandingFailure,
  ProvisioningProgress,
  useProvisioningProgress,
} from '@features/provisioning';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepPanel } from './StepPanel';
import { findStep } from '../utils/onboarding-status.utils';
import { BlockedNotice } from './BlockedNotice';
import type { OnboardingStepProps } from './step.types';

/** Live progress of one provisioning request, with retry on failure or a stall. */
function ProvisioningRun({
  requestId,
  academyName,
  onSettled,
}: {
  readonly requestId: string;
  readonly academyName: string;
  /** Called when the request reaches a terminal state, so the shell re-reads the status. */
  readonly onSettled: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const progress = useProvisioningProgress(requestId);
  const request = progress.request;
  const requestStatus = request?.status;

  useEffect(() => {
    if (
      requestStatus === 'ready' ||
      requestStatus === 'failed' ||
      requestStatus === 'cancelled'
    ) {
      onSettled();
    }
    // `onSettled` is a fresh closure each render; the status is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestStatus]);

  const stages = request ? (
    <ProvisioningProgress
      request={request}
      logo={progress.logo}
      onRetry={() => progress.retry({ onSuccess: onSettled })}
      isRetrying={progress.isRetrying}
      retryFailed={!!progress.retryError && requestStatus !== 'failed'}
      isReconnecting={progress.isReconnecting}
    />
  ) : null;

  if (requestStatus === 'failed') {
    return (
      <StepPanel
        icon={AlertTriangle}
        tone="destructive"
        title={t('onboarding:academy.failedTitle')}
        testId="academy-provisioning-failed"
        description={
          request?.lastError
            ? t(toErrorsNamespaceKey(request.lastError.messageKey))
            : t('onboarding:academy.failedDescription')
        }
        actions={
          <Button
            type="button"
            onClick={() => progress.retry({ onSuccess: onSettled })}
            disabled={progress.isRetrying}
          >
            {progress.isRetrying ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('onboarding:actions.retry')}
          </Button>
        }
      >
        {stages}
      </StepPanel>
    );
  }

  return (
    <StepPanel
      icon={Loader2}
      spinIcon
      tone="info"
      title={t('onboarding:academy.provisioningTitle', { name: academyName })}
      description={t('onboarding:academy.provisioningDescription')}
      testId="academy-provisioning"
    >
      {stages}
    </StepPanel>
  );
}

/**
 * W2 — on the finished Academy panel: only when something about the brand
 * still needs the owner (branding could not be applied, or the logo is
 * still being attached / was not added), the same stage view with its
 * inline Retry. Nothing otherwise.
 */
function BrandFollowUp({
  requestId,
}: {
  readonly requestId: string;
}): JSX.Element | null {
  const progress = useProvisioningProgress(requestId);
  const request = progress.request;
  if (!request) return null;
  const needsAttention =
    isBrandingFailure(request) ||
    ['waiting', 'uploading', 'failed', 'missing'].includes(progress.logo.state);
  if (!needsAttention) return null;
  return (
    <div className="mt-4">
      <ProvisioningProgress
        request={request}
        logo={progress.logo}
        onRetry={() => progress.retry()}
        isRetrying={progress.isRetrying}
        retryFailed={!!progress.retryError}
      />
    </div>
  );
}

export function AcademyStep({
  status,
  eyebrow,
  onBack,
  onNext,
  goTo,
  refresh,
}: OnboardingStepProps): JSX.Element {
  const { t } = useTranslation();
  const { organization } = useAuth();
  const step = findStep(status, 'academy');
  // The request created on this screen, before the status re-read knows it.
  const [createdRequest, setCreatedRequest] = useState<{
    readonly id: string;
    readonly name: string;
  }>();

  const isComplete = step?.status === 'complete';
  const requestId = status.provisioning?.requestId ?? createdRequest?.id;
  const showProgress =
    !isComplete &&
    !!requestId &&
    (step?.status === 'in_progress' ||
      status.provisioning?.failed === true ||
      !!createdRequest);

  const renderBody = (): JSX.Element => {
    if (step?.status === 'blocked') {
      return <BlockedNotice waitingOn="plan" goTo={goTo} />;
    }
    if (isComplete && status.academy) {
      return (
        <StepPanel
          icon={CheckCircle2}
          tone="success"
          title={t('onboarding:academy.readyTitle', {
            name: status.academy.name,
          })}
          description={t('onboarding:academy.readyDescription')}
          testId="academy-ready"
        >
          {status.academy.host ? (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t('onboarding:academy.address')}{' '}
              </span>
              <span className="font-medium text-foreground" dir="ltr">
                {status.academy.host}
              </span>
            </p>
          ) : null}
          {status.provisioning?.requestId || createdRequest ? (
            <BrandFollowUp
              requestId={
                (status.provisioning?.requestId ?? createdRequest?.id)!
              }
            />
          ) : null}
        </StepPanel>
      );
    }
    if (showProgress && requestId) {
      return (
        <ProvisioningRun
          requestId={requestId}
          academyName={status.academy?.name ?? createdRequest?.name ?? ''}
          onSettled={() => void refresh()}
        />
      );
    }
    if (!organization?.id) return <></>;
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <AcademySetupForm
          organizationId={organization.id}
          submitLabelKey="onboarding:steps.academy.submit"
          onCreated={(request) => {
            setCreatedRequest({
              id: request.id,
              name: request.requestedAcademyName,
            });
            void refresh();
          }}
        />
      </div>
    );
  };

  return (
    <OnboardingStepFrame
      stepKey="academy"
      eyebrow={eyebrow}
      title={t('onboarding:steps.academy.title')}
      description={t('onboarding:steps.academy.description')}
      onBack={onBack}
      onContinue={isComplete ? onNext : undefined}
      continueIsPrimary={isComplete}
    >
      {renderBody()}
    </OnboardingStepFrame>
  );
}
