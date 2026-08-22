/**
 * Onboarding Progress.
 *
 * Presentational stepper showing which onboarding steps are complete, current,
 * or upcoming.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@utils';
import type { AcademyOnboardingStep } from '../types/onboarding.types';

export interface OnboardingProgressProps {
  readonly steps: readonly AcademyOnboardingStep[];
  readonly completedSteps: readonly number[];
  readonly currentStep: number;
}

export function OnboardingProgress({
  steps,
  completedSteps,
  currentStep,
}: OnboardingProgressProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-4">
      {steps.map((step) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep && !isCompleted;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'flex flex-1 items-start gap-2 rounded-lg border p-3 text-sm',
              isCompleted && 'border-success bg-success-surface text-success',
              isCurrent && 'border-primary bg-primary/5',
              !isCompleted && !isCurrent && 'border-border text-muted-foreground'
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">{t(step.titleKey)}</p>
              <p className="text-xs text-muted-foreground">
                {t(step.descriptionKey)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
