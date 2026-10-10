/**
 * Onboarding progress rail.
 *
 * The list of setup steps in UI order, with the summary last. The current
 * screen carries `aria-current="step"`; every step says its status in
 * words and with an icon. A locked step is listed but not linked — it
 * says why it is locked when opened from the summary instead.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { ONBOARDING_ROUTES, buildPath } from '@app/routes/route-paths';
import { cn } from '@utils';
import type { OnboardingScreenKey, OnboardingStatusResponse } from '@types';
import { visibleSteps } from '../utils/onboarding-status.utils';
import {
  academyBuildStore,
  isAcademyBuildActive,
} from '@components/academy-build';
import { StepStatusIcon, StepStatusText } from './StepStatusIndicator';

export interface OnboardingProgressRailProps {
  readonly status: OnboardingStatusResponse;
  readonly current: OnboardingScreenKey;
}

export function OnboardingProgressRail({
  status,
  current,
}: OnboardingProgressRailProps): JSX.Element {
  const { t } = useTranslation();
  useSyncExternalStore(
    academyBuildStore.subscribe,
    academyBuildStore.version,
    academyBuildStore.version
  );
  // While the build screen is up, the academy reads "in progress" here too.
  const building = isAcademyBuildActive(
    status.provisioning?.requestId ?? undefined
  );
  const steps = visibleSteps(status).map((step) =>
    building && step.key === 'academy' && step.status === 'complete'
      ? { ...step, status: 'in_progress' as const }
      : step
  );
  const listRef = useRef<HTMLOListElement>(null);

  // On narrow screens the rail scrolls sideways: keep the current step in
  // view. Skipped when nothing overflows (the desktop column), so the page
  // itself never scrolls.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    list
      .querySelector<HTMLElement>('[aria-current="step"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [current]);

  const itemClass = (isCurrent: boolean) =>
    cn(
      'flex min-w-max items-start gap-3 rounded-lg px-3 py-2.5 transition-colors lg:min-w-0',
      isCurrent ? 'bg-accent/60' : 'hover:bg-muted/60'
    );

  return (
    <nav aria-label={t('onboarding:shell.railLabel')}>
      <ol
        ref={listRef}
        className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {steps.map((step) => {
          const isCurrent = step.key === current;
          const content = (
            <>
              <StepStatusIcon status={step.status} className="mt-0.5" />
              <span className="flex flex-col">
                <span
                  className={cn(
                    'text-sm',
                    isCurrent
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-foreground/80'
                  )}
                >
                  {t(`onboarding:steps.${step.key}.label`)}
                </span>
                <span className="flex flex-wrap gap-x-1.5">
                  <StepStatusText status={step.status} />
                  {step.requirement !== 'prerequisite' ? (
                    <span className="text-xs text-muted-foreground">
                      · {t(`onboarding:requirement.${step.requirement}`)}
                    </span>
                  ) : null}
                </span>
              </span>
            </>
          );

          return (
            <li key={step.key} data-testid={`rail-step-${step.key}`}>
              {step.status === 'blocked' ? (
                <span
                  className={cn(itemClass(isCurrent), 'opacity-70')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </span>
              ) : (
                <Link
                  to={buildPath(ONBOARDING_ROUTES.step, { step: step.key })}
                  className={itemClass(isCurrent)}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}

        <li data-testid="rail-step-summary">
          <Link
            to={buildPath(ONBOARDING_ROUTES.step, { step: 'summary' })}
            className={itemClass(current === 'summary')}
            aria-current={current === 'summary' ? 'step' : undefined}
          >
            <ListChecks
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <span
              className={cn(
                'text-sm',
                current === 'summary'
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-foreground/80'
              )}
            >
              {t('onboarding:steps.summary.label')}
            </span>
          </Link>
        </li>
      </ol>
    </nav>
  );
}
