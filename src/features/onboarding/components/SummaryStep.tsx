/**
 * Setup — Summary.
 *
 * Every required and recommended item with its status, a way into each
 * open one, and the two ways out:
 *
 *   - "Finish" — enabled ONLY when the server says `requiredComplete`
 *     (the backend refuses it otherwise with 409 regardless);
 *   - "Finish for now" — always available (`defer`).
 *
 * THE HEADING NEVER OVERSTATES. "Your academy is ready" appears only when
 * the server sends `readyLabelAllowed`; otherwise it says how many
 * required steps are left.
 */
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingStep } from '@types';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { StepStatusIcon, StepStatusText } from './StepStatusIndicator';
import {
  openRequiredSteps,
  visibleSteps,
} from '../utils/onboarding-status.utils';
import type { OnboardingStepProps } from './step.types';

export interface SummaryStepProps extends OnboardingStepProps {
  readonly onFinish: () => void;
  readonly onFinishForNow: () => void;
  readonly isFinishing: boolean;
  /** A message key to show when finishing failed. */
  readonly finishErrorKey?: string;
}

export function SummaryStep({
  status,
  eyebrow,
  onBack,
  goTo,
  onFinish,
  onFinishForNow,
  isFinishing,
  finishErrorKey,
}: SummaryStepProps): JSX.Element {
  const { t } = useTranslation();
  const steps = visibleSteps(status);
  const required = steps.filter((step) => step.requirement !== 'recommended');
  const recommended = steps.filter(
    (step) => step.requirement === 'recommended'
  );
  const requiredLeft = openRequiredSteps(status).length;

  const renderList = (items: readonly OnboardingStep[]) => (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((step) => (
        <li
          key={step.key}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
          data-testid={`summary-item-${step.key}`}
        >
          <span className="flex items-center gap-3">
            <StepStatusIcon status={step.status} />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {t(`onboarding:steps.${step.key}.label`)}
              </span>
              <StepStatusText status={step.status} />
            </span>
          </span>
          {step.status !== 'complete' && step.status !== 'blocked' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goTo(step.key)}
            >
              {t('onboarding:actions.goToStep')}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <OnboardingStepFrame
      stepKey="summary"
      eyebrow={eyebrow}
      title={
        status.readyLabelAllowed
          ? t('onboarding:summary.readyTitle')
          : t('onboarding:summary.incompleteTitle', { count: requiredLeft })
      }
      description={t(
        status.readyLabelAllowed
          ? 'onboarding:summary.readyDescription'
          : 'onboarding:summary.incompleteDescription'
      )}
      onBack={onBack}
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('onboarding:summary.requiredHeading')}
          </h2>
          {renderList(required)}
        </div>

        {recommended.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('onboarding:summary.recommendedHeading')}
            </h2>
            {renderList(recommended)}
          </div>
        ) : null}

        <div className="space-y-3">
          {finishErrorKey ? (
            <p role="alert" className="text-sm text-destructive">
              {t(finishErrorKey)}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onFinish}
              disabled={!status.requiredComplete || isFinishing}
              aria-busy={isFinishing}
              aria-describedby={
                status.requiredComplete ? undefined : 'finish-disabled-hint'
              }
            >
              {isFinishing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('onboarding:summary.finish')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onFinishForNow}
              disabled={isFinishing}
            >
              {t('onboarding:shell.finishForNow')}
            </Button>
          </div>
          {status.requiredComplete ? null : (
            <p
              id="finish-disabled-hint"
              className="text-xs text-muted-foreground"
            >
              {t('onboarding:summary.finishDisabledHint')}
            </p>
          )}
        </div>
      </div>
    </OnboardingStepFrame>
  );
}
