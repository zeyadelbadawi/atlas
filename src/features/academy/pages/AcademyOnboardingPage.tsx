/**
 * Academy Onboarding Page.
 *
 * A guided checklist shown right after creating an academy, pointing the
 * owner at Branding and Settings before they land on the full dashboard.
 * There is no backend contract for onboarding, so progress is tracked
 * entirely client-side and this page composes the real Branding/Settings
 * pages rather than re-implementing their forms.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatform } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy, useOnboardingProgress } from '../hooks';
import { OnboardingProgress } from '../components/OnboardingProgress';
import { ACADEMY_ONBOARDING_STEPS } from '../constants/onboarding.constants';

export default function AcademyOnboardingPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { setActiveAcademy } = usePlatform();

  const {
    data: academy,
    isLoading,
    error: loadError,
    refetch,
  } = useAcademy(academyId ?? '');

  const { currentStep, completedSteps, isComplete, completeStep, skipAll } =
    useOnboardingProgress(academyId ?? '');

  // The first step (basic info) is already satisfied by the Create form that
  // brought the user here, so it starts pre-completed.
  useEffect(() => {
    if (!completedSteps.includes(ACADEMY_ONBOARDING_STEPS[0].id)) {
      completeStep(ACADEMY_ONBOARDING_STEPS[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToDashboard = () => {
    if (academyId) setActiveAcademy(academyId);
    navigate(`${DASHBOARD_ROUTES.academy}?academyId=${academyId}`, {
      replace: true,
    });
  };

  const handleSkipAll = () => {
    skipAll();
    goToDashboard();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:onboarding.title"
          descriptionKey="academy:onboarding.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const activeStep =
    ACADEMY_ONBOARDING_STEPS.find((step) => step.id === currentStep) ??
    ACADEMY_ONBOARDING_STEPS[ACADEMY_ONBOARDING_STEPS.length - 1];
  const isFinalStep =
    activeStep.id === ACADEMY_ONBOARDING_STEPS[ACADEMY_ONBOARDING_STEPS.length - 1].id;

  return (
    <PageContainer>
      <PageHeader
        titleKey="academy:onboarding.title"
        descriptionKey="academy:onboarding.subtitle"
        values={{ academyName: academy.name }}
        actions={
          !isComplete ? (
            <Button variant="ghost" onClick={handleSkipAll}>
              {t('academy:onboarding.skipAll')}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <OnboardingProgress
          steps={ACADEMY_ONBOARDING_STEPS}
          completedSteps={completedSteps}
          currentStep={currentStep}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t(activeStep.titleKey)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(activeStep.descriptionKey)}
            </p>

            {isFinalStep ? (
              <Button onClick={goToDashboard}>
                <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
                {t('academy:onboarding.finish')}
              </Button>
            ) : activeStep.path ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    completeStep(activeStep.id);
                    navigate(
                      buildPath(activeStep.path as string, {
                        academyId: academyId ?? '',
                      })
                    );
                  }}
                >
                  {t('academy:onboarding.continueTo', {
                    step: t(activeStep.titleKey),
                  })}
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => completeStep(activeStep.id)}
                >
                  {t('academy:onboarding.skipStep')}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
