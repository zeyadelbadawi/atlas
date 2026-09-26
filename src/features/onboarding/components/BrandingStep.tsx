/**
 * Setup — Branding (recommended; Skip allowed).
 *
 * The SAME logo/favicon/name form as `AcademyBrandingPage`
 * (`AcademyBrandingForm`). After a save the shell re-reads the status —
 * the step is complete when the server sees a logo (`academy.logoUrl`),
 * not because a save happened here — and moves on.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { AcademyBrandingForm, useAcademy } from '@features/academy';
import { OnboardingStepFrame } from './OnboardingStepFrame';
import { findStep } from '../utils/onboarding-status.utils';
import { BlockedNotice } from './BlockedNotice';
import type { OnboardingStepProps } from './step.types';

export function BrandingStep({
  status,
  eyebrow,
  onBack,
  onNext,
  goTo,
  refresh,
}: OnboardingStepProps): JSX.Element {
  const { t } = useTranslation();
  const step = findStep(status, 'branding');
  const academyId = status.academy?.id ?? '';
  const academyQuery = useAcademy(academyId, { enabled: !!academyId });
  const isBlocked = step?.status === 'blocked' || !status.academy;

  const renderBody = (): JSX.Element => {
    if (isBlocked) return <BlockedNotice waitingOn="academy" goTo={goTo} />;
    if (academyQuery.isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }
    if (academyQuery.error || !academyQuery.data) {
      return <ErrorState onRetry={() => void academyQuery.refetch()} />;
    }
    return (
      <div className="space-y-6">
        {step?.status === 'complete' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            {t('onboarding:branding.logoAdded')}
          </p>
        ) : null}
        <AcademyBrandingForm
          academy={academyQuery.data}
          submitLabelKey="onboarding:branding.save"
          onSaved={async () => {
            await refresh();
            onNext();
          }}
        />
      </div>
    );
  };

  return (
    <OnboardingStepFrame
      stepKey="branding"
      eyebrow={eyebrow}
      title={t('onboarding:steps.branding.title')}
      description={t('onboarding:steps.branding.description')}
      onBack={onBack}
      onSkip={step?.status === 'complete' ? undefined : onNext}
      onContinue={step?.status === 'complete' ? onNext : undefined}
    >
      {renderBody()}
    </OnboardingStepFrame>
  );
}
