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
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Minus,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@hooks';
import { toErrorsNamespaceKey } from '@utils';
import {
  AcademySetupForm,
  PROVISIONING_STEP_KEYS,
  useProvisioningRequest,
  useRetryProvisioning,
} from '@features/provisioning';
import type { ProvisioningStepStatus } from '@types';
import { FinishBrandingCard, pendingBrandingStore } from '@features/website';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepPanel } from './StepPanel';
import { findStep } from '../utils/onboarding-status.utils';
import { BlockedNotice } from './BlockedNotice';
import type { OnboardingStepProps } from './step.types';

function ProvisioningStepIcon({
  status,
}: {
  readonly status: ProvisioningStepStatus;
}): JSX.Element {
  switch (status) {
    case 'completed':
      return (
        <Check
          className="size-4 shrink-0 text-success"
          strokeWidth={2.5}
          aria-hidden
        />
      );
    case 'running':
      return (
        <Loader2
          className="size-4 shrink-0 animate-spin text-info"
          aria-hidden
        />
      );
    case 'failed':
      return (
        <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
      );
    case 'skipped':
      return (
        <Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      );
    default:
      return (
        <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      );
  }
}

/** Live progress of one provisioning request, with retry on failure. */
function ProvisioningProgress({
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
  const { organization } = useAuth();
  const requestQuery = useProvisioningRequest(requestId);
  const retry = useRetryProvisioning();
  const request = requestQuery.data;
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

  const stepByKey = new Map(
    (request?.steps ?? []).map((step) => [step.key, step] as const)
  );
  const isFailed = requestStatus === 'failed';

  const checklist = (
    <ul className="space-y-2.5" aria-live="polite">
      {PROVISIONING_STEP_KEYS.map((stepKey) => {
        const stepStatus = stepByKey.get(stepKey)?.status ?? 'pending';
        return (
          <li key={stepKey} className="flex items-center gap-3 text-sm">
            <ProvisioningStepIcon status={stepStatus} />
            <span
              className={
                stepStatus === 'completed' || stepStatus === 'skipped'
                  ? 'text-muted-foreground'
                  : 'text-foreground'
              }
            >
              {t(`provisioning:step.${stepKey}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );

  if (isFailed) {
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
            onClick={() => {
              if (!organization?.id) return;
              retry.mutate(
                { organizationId: organization.id, requestId },
                { onSuccess: () => onSettled() }
              );
            }}
            disabled={retry.isPending}
          >
            {retry.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('onboarding:actions.retry')}
          </Button>
        }
      >
        {checklist}
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
      {checklist}
      {request ? (
        <div className="mt-4">
          <FinishBrandingCard request={request} />
        </div>
      ) : null}
    </StepPanel>
  );
}

/**
 * Theme 1 plan §F.4.3 — keeps saving the setup form's logo & colours after
 * the progress view has handed over to the finished Academy panel.
 */
function FinishBrandingForRequest({
  requestId,
}: {
  readonly requestId: string;
}): JSX.Element | null {
  const { data: request } = useProvisioningRequest(requestId);
  return request ? <FinishBrandingCard request={request} /> : null;
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
          {createdRequest && pendingBrandingStore.get(createdRequest.id) ? (
            <div className="mt-4">
              <FinishBrandingForRequest requestId={createdRequest.id} />
            </div>
          ) : null}
        </StepPanel>
      );
    }
    if (showProgress && requestId) {
      return (
        <ProvisioningProgress
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
