/**
 * Academy onboarding step definitions.
 */
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { AcademyOnboardingStep } from '../types/onboarding.types';

/** The guided steps shown after creating a new academy. */
export const ACADEMY_ONBOARDING_STEPS: readonly AcademyOnboardingStep[] = [
  {
    id: 1,
    titleKey: 'academy:onboarding.steps.basics.title',
    descriptionKey: 'academy:onboarding.steps.basics.description',
  },
  {
    id: 2,
    titleKey: 'academy:onboarding.steps.branding.title',
    descriptionKey: 'academy:onboarding.steps.branding.description',
    path: DASHBOARD_ROUTES.academyBranding,
  },
  {
    id: 3,
    titleKey: 'academy:onboarding.steps.settings.title',
    descriptionKey: 'academy:onboarding.steps.settings.description',
    path: DASHBOARD_ROUTES.academySettings,
  },
  {
    id: 4,
    titleKey: 'academy:onboarding.steps.complete.title',
    descriptionKey: 'academy:onboarding.steps.complete.description',
  },
] as const;
