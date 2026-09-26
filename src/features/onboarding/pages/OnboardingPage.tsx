/**
 * Onboarding Page — the New Customer Onboarding shell.
 *
 * `/onboarding` and `/onboarding/:step`. One step per screen, in the order
 * plan → academy → branding → website → first course → summary (the plan
 * step only while it is not complete). Everything it shows comes from
 * `GET /organizations/:id/onboarding`; nothing about progress is stored
 * in the browser, so the shell resumes correctly on any device.
 *
 * ENTRY RULES
 *   - `/onboarding` with no step opens the server's `nextStep`.
 *   - Only the OWNER of the active organization belongs here. Anyone else
 *     — or a 403 from the status read — is sent to `/dashboard`.
 *
 * LEAVING
 *   "Finish" (summary, only when `requiredComplete`) and "Finish for now"
 *   (always) complete onboarding on the server, then re-read the session
 *   so `onboardingPending` turns false BEFORE `/dashboard` is opened —
 *   otherwise `DashboardIndexRoute` would send the owner straight back.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useAuth, useToast } from '@hooks';
import {
  DASHBOARD_ROUTES,
  ONBOARDING_ROUTES,
  buildPath,
} from '@app/routes/route-paths';
import { isActiveOrganizationOwner } from '@utils';
import type { OnboardingScreenKey } from '@types';
import { useCompleteOnboarding, useOnboardingStatus } from '../hooks';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { OnboardingProgressRail } from '../components/OnboardingProgressRail';
import { PlanStep } from '../components/PlanStep';
import { AcademyStep } from '../components/AcademyStep';
import { BrandingStep } from '../components/BrandingStep';
import { WebsiteStep } from '../components/WebsiteStep';
import { CourseStep } from '../components/CourseStep';
import { SummaryStep } from '../components/SummaryStep';
import type { OnboardingStepProps } from '../components/step.types';
import {
  findStep,
  isOnboardingScreenKey,
  isStepComplete,
  nextScreen,
  previousScreen,
  visibleScreens,
} from '../utils/onboarding-status.utils';

function stepPath(screen: OnboardingScreenKey): string {
  return buildPath(ONBOARDING_ROUTES.step, { step: screen });
}

export default function OnboardingPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { step: stepParam } = useParams<{ step?: string }>();
  const { user, organization } = useAuth();
  const isOwner = isActiveOrganizationOwner(user, organization);

  const statusQuery = useOnboardingStatus();
  const complete = useCompleteOnboarding();
  const [pendingMode, setPendingMode] = useState<'finish' | 'defer'>();
  const [finishErrorKey, setFinishErrorKey] = useState<string>();

  const leave = async (mode: 'finish' | 'defer'): Promise<void> => {
    setPendingMode(mode);
    setFinishErrorKey(undefined);
    try {
      // Resolves only after the session has been re-read (see the hook).
      await complete.mutateAsync(mode);
      navigate(DASHBOARD_ROUTES.root, { replace: true });
    } catch {
      const key =
        mode === 'finish'
          ? 'onboarding:summary.finishFailed'
          : 'onboarding:shell.finishForNowFailed';
      setFinishErrorKey(key);
      toast({ variant: 'destructive', title: t(key) });
      // The completion may have been recorded even if the session re-read
      // failed; re-read the status so the screen tells the truth.
      void statusQuery.refetch();
    } finally {
      setPendingMode(undefined);
    }
  };

  // Not the owner of the active organization: setup is not theirs to do.
  if (!organization || !isOwner) {
    return <Navigate to={DASHBOARD_ROUTES.root} replace />;
  }
  if (statusQuery.error?.kind === 'forbidden') {
    return <Navigate to={DASHBOARD_ROUTES.root} replace />;
  }

  if (statusQuery.isLoading || (!statusQuery.data && !statusQuery.error)) {
    return (
      <OnboardingLayout>
        <div className="space-y-6" aria-busy="true">
          <span className="sr-only">{t('onboarding:shell.loading')}</span>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </OnboardingLayout>
    );
  }

  if (statusQuery.error || !statusQuery.data) {
    return (
      <OnboardingLayout>
        <ErrorState
          kind={statusQuery.error?.kind}
          descriptionKey="onboarding:shell.loadError"
          onRetry={() => void statusQuery.refetch()}
        />
      </OnboardingLayout>
    );
  }

  const status = statusQuery.data;

  // `/onboarding` (or an unknown step) resumes where the server says.
  if (!isOnboardingScreenKey(stepParam)) {
    return <Navigate to={stepPath(status.nextStep)} replace />;
  }
  const current: OnboardingScreenKey = stepParam;

  // A complete plan step is not shown; move on to the academy.
  if (current === 'plan' && isStepComplete(status, 'plan')) {
    return <Navigate to={stepPath('academy')} replace />;
  }
  // A step the server did not report cannot be shown honestly.
  if (current !== 'summary' && !findStep(status, current)) {
    return <Navigate to={stepPath(status.nextStep)} replace />;
  }

  const screens = visibleScreens(status);
  const position = screens.indexOf(current) + 1;
  const currentStep = current === 'summary' ? undefined : findStep(status, current);
  const eyebrow = [
    t('onboarding:shell.stepOf', { current: position, total: screens.length }),
    currentStep ? t(`onboarding:requirement.${currentStep.requirement}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const goTo = (screen: OnboardingScreenKey): void => navigate(stepPath(screen));
  const previous = previousScreen(status, current);

  const stepProps: OnboardingStepProps = {
    status,
    eyebrow,
    onBack: previous ? () => goTo(previous) : undefined,
    onNext: () => {
      // Read the freshest status: a step that just completed may have
      // changed which screens are visible (the plan step disappears).
      goTo(nextScreen(statusQuery.data ?? status, current));
    },
    goTo,
    refresh: async () => (await statusQuery.refetch()).data,
  };

  const renderStep = (): JSX.Element => {
    switch (current) {
      case 'plan':
        return <PlanStep {...stepProps} onNext={() => goTo('academy')} />;
      case 'academy':
        return <AcademyStep {...stepProps} />;
      case 'branding':
        return <BrandingStep {...stepProps} />;
      case 'website':
        return <WebsiteStep {...stepProps} />;
      case 'course':
        return <CourseStep {...stepProps} />;
      case 'summary':
      default:
        return (
          <SummaryStep
            {...stepProps}
            onFinish={() => void leave('finish')}
            onFinishForNow={() => void leave('defer')}
            isFinishing={complete.isPending}
            finishErrorKey={finishErrorKey}
          />
        );
    }
  };

  return (
    <OnboardingLayout
      rail={<OnboardingProgressRail status={status} current={current} />}
      // The summary offers "Finish for now" beside "Finish" itself.
      onFinishForNow={current === 'summary' ? undefined : () => void leave('defer')}
      isFinishingForNow={pendingMode === 'defer'}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
