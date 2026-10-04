/**
 * W2 — the one honest progress view for an Academy being set up, shared by
 * `ProvisioningStatusPage` and the onboarding shell's Academy step.
 *
 *   - Four real stages (`deriveProvisioningStages`), each tied to the
 *     server's step states. No percentages, no timers, nothing that moves
 *     unless the server said so.
 *   - ONE polite live region (`role="status"`, atomic) announcing the
 *     current situation in a sentence; it changes only when the situation
 *     does, so a screen-reader user hears each real transition once.
 *   - Stalled (the server's `stalled` flag) → a notice with Retry.
 *   - A branding failure never blocks "ready": the Academy is ready and the
 *     brand stage carries "Branding could not be applied — Retry".
 *   - The logo, attached after the Academy exists, is shown inline on the
 *     brand stage — never a separate card.
 *   - A failed refetch while the request is still running shows
 *     "Reconnecting…", never a failure.
 *
 * A failed REQUEST (status `failed`) keeps its surface-specific panel
 * (status page card / onboarding step panel); this component still shows
 * which stage failed and why.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Circle,
  Loader2,
  Minus,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { ProvisioningRequest } from '@types';
import {
  deriveProvisioningStages,
  isBrandingFailure,
  provisioningAnnouncementKey,
  type ProvisioningStageState,
} from '../utils/provisioning-stages';
import type { LogoUploadState } from '../hooks/usePendingLogoUpload';

function StageIcon({
  state,
}: {
  readonly state: ProvisioningStageState;
}): JSX.Element {
  switch (state) {
    case 'done':
      return (
        <Check
          className="size-4 shrink-0 text-success"
          strokeWidth={2.5}
          aria-hidden
        />
      );
    case 'current':
      return (
        <Loader2
          className="size-4 shrink-0 animate-spin text-info motion-reduce:animate-none"
          aria-hidden
        />
      );
    case 'failed':
      return (
        <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
      );
    case 'attention':
      return (
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
      );
    case 'skipped':
      return (
        <Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      );
    case 'pending':
    default:
      return (
        <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      );
  }
}

export interface ProvisioningProgressProps {
  readonly request: ProvisioningRequest;
  readonly logo: {
    readonly state: LogoUploadState;
    readonly retry: () => void;
  };
  /** Retry the request (stalled) or the branding step (ready, branding failed). */
  readonly onRetry: () => void;
  readonly isRetrying: boolean;
  /** The last Retry call itself failed (network/server) — say so next to the button. */
  readonly retryFailed?: boolean;
  /** The last refetch failed while the page still has data. */
  readonly isReconnecting?: boolean;
  readonly className?: string;
}

export function ProvisioningProgress({
  request,
  logo,
  onRetry,
  isRetrying,
  retryFailed = false,
  isReconnecting = false,
  className,
}: ProvisioningProgressProps): JSX.Element {
  const { t } = useTranslation();
  const stages = deriveProvisioningStages(request, logo.state);
  const announcement = t(provisioningAnnouncementKey(request, stages), {
    academyName: request.requestedAcademyName,
  });
  const brandingFailed = isBrandingFailure(request);
  const isRunning =
    request.status !== 'ready' &&
    request.status !== 'failed' &&
    request.status !== 'cancelled';
  const showStalled = isRunning && request.stalled === true;

  const retryButton = (labelKey: string, testId: string) => (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRetry}
        disabled={isRetrying}
        data-testid={testId}
        className="min-h-11 sm:min-h-9"
      >
        {isRetrying ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        {t(labelKey)}
      </Button>
      {retryFailed ? (
        <p className="text-xs text-destructive">
          {t('provisioning:progress.retryFailed')}
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn('space-y-4', className)}
      data-testid="provisioning-progress"
    >
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>

      <ol className="space-y-3" aria-label={t('provisioning:stages.listLabel')}>
        {stages.map((stage) => (
          <li
            key={stage.key}
            className="flex items-start gap-3"
            data-testid={`provisioning-stage-${stage.key}`}
            data-state={stage.state}
            aria-current={stage.state === 'current' ? 'step' : undefined}
          >
            <span className="mt-0.5">
              <StageIcon state={stage.state} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm',
                  stage.state === 'done' || stage.state === 'skipped'
                    ? 'text-muted-foreground'
                    : 'font-medium text-foreground'
                )}
              >
                {t(stage.labelKey)}
                <span className="sr-only">
                  {' — '}
                  {t(`provisioning:stages.state.${stage.state}`)}
                </span>
              </p>
              {stage.noteKey ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t(stage.noteKey)}
                </p>
              ) : null}
              {stage.state === 'failed' && stage.error ? (
                <p className="mt-0.5 text-sm text-destructive">
                  {t(toErrorsNamespaceKey(stage.error.messageKey))}
                </p>
              ) : null}
              {stage.key === 'brand' && logo.state === 'failed' ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={logo.retry}
                    className="min-h-11 sm:min-h-9"
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    {t('provisioning:stages.brand.logoRetry')}
                  </Button>
                </div>
              ) : null}
              {stage.key === 'brand' &&
              logo.state === 'missing' &&
              request.academyId ? (
                <Link
                  to={buildPath(DASHBOARD_ROUTES.academyBranding, {
                    academyId: request.academyId,
                  })}
                  className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline sm:min-h-0"
                >
                  {t('provisioning:stages.brand.logoAddLater')}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {isRunning && !request.startedAt && !showStalled ? (
        <p className="text-sm text-muted-foreground">
          {t('provisioning:progress.queued')}
        </p>
      ) : null}

      {isReconnecting && isRunning ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          {t('provisioning:progress.reconnecting')}
        </p>
      ) : null}

      {showStalled ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-surface p-4 sm:flex-row sm:items-center"
          data-testid="provisioning-stalled"
        >
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="flex-1 text-sm text-foreground">
            {t('provisioning:progress.stalled')}
          </p>
          {retryButton(
            'provisioning:status.retryAction',
            'provisioning-stalled-retry'
          )}
        </div>
      ) : null}

      {brandingFailed ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-surface p-4 sm:flex-row sm:items-center"
          data-testid="provisioning-branding-failed"
        >
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="flex-1 text-sm text-foreground">
            {t('provisioning:progress.brandingFailed')}
          </p>
          {retryButton(
            'provisioning:progress.brandingRetry',
            'provisioning-branding-retry'
          )}
        </div>
      ) : null}
    </div>
  );
}
