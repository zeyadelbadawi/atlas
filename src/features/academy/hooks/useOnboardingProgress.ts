/**
 * useOnboardingProgress hook.
 *
 * Tracks a single academy's onboarding progress in local storage. There is no
 * backend contract for onboarding state, so this never talks to a service —
 * it is purely a client-side checklist over pages that already exist.
 */
import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks';
import { ACADEMY_ONBOARDING_STEPS } from '../constants/onboarding.constants';
import type { AcademyOnboardingState } from '../types/onboarding.types';

export interface UseOnboardingProgressResult {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly isComplete: boolean;
  /** Marks a step complete and advances to the next incomplete step. */
  readonly completeStep: (stepId: number) => void;
  /** Jumps directly to a step without changing completion. */
  readonly goToStep: (stepId: number) => void;
  /** Marks every remaining step complete. */
  readonly skipAll: () => void;
}

const INITIAL_STATE: AcademyOnboardingState = {
  currentStep: ACADEMY_ONBOARDING_STEPS[0].id,
  completedSteps: [],
};

export function useOnboardingProgress(
  academyId: string
): UseOnboardingProgressResult {
  const { value, setValue } = useLocalStorage<AcademyOnboardingState>(
    `atlas:academy-onboarding:${academyId}`,
    INITIAL_STATE
  );

  const completeStep = useCallback(
    (stepId: number) => {
      setValue((previous) => {
        const completedSteps = previous.completedSteps.includes(stepId)
          ? previous.completedSteps
          : [...previous.completedSteps, stepId];

        const nextStep =
          ACADEMY_ONBOARDING_STEPS.find(
            (step) => step.id > stepId && !completedSteps.includes(step.id)
          )?.id ?? stepId;

        return { currentStep: nextStep, completedSteps };
      });
    },
    [setValue]
  );

  const goToStep = useCallback(
    (stepId: number) => {
      setValue((previous) => ({ ...previous, currentStep: stepId }));
    },
    [setValue]
  );

  const skipAll = useCallback(() => {
    setValue({
      currentStep: ACADEMY_ONBOARDING_STEPS[ACADEMY_ONBOARDING_STEPS.length - 1]
        .id,
      completedSteps: ACADEMY_ONBOARDING_STEPS.map((step) => step.id),
    });
  }, [setValue]);

  const isComplete =
    value.completedSteps.length >= ACADEMY_ONBOARDING_STEPS.length;

  return {
    currentStep: value.currentStep,
    completedSteps: value.completedSteps,
    isComplete,
    completeStep,
    goToStep,
    skipAll,
  };
}
