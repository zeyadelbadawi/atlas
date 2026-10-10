/**
 * "Set up your academy" — the dashboard card.
 *
 * Owners only (the status read is owner-only and disabled for everyone
 * else, so a manager's dashboard never asks). Shown while ANY required or
 * recommended step is open — regardless of `completedAt`, because
 * "Finish for now" only closes the setup screens, not the work — and each
 * open item links straight to its step.
 *
 * WORDING FOLLOWS THE SERVER. "Your academy is ready" only when
 * `readyLabelAllowed`; otherwise "Setup incomplete — N required steps
 * left".
 *
 * Once everything required is done, the owner may hide the card while only
 * recommended items remain. That preference is per device and purely
 * cosmetic (`localStorage`, guarded): it is never read as completion, and
 * a newly-open REQUIRED step always brings the card back.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DASHBOARD_ROUTES,
  ONBOARDING_ROUTES,
  buildPath,
} from '@app/routes/route-paths';
import { cn, MIRROR_IN_RTL } from '@utils';
import { useOnboardingStatus } from '../hooks';
import { ONBOARDING_CARD_DISMISSED_STORAGE_PREFIX } from '../constants/onboarding.constants';
import {
  openRecommendedSteps,
  openRequiredSteps,
} from '../utils/onboarding-status.utils';
import { StepStatusIcon, StepStatusText } from './StepStatusIndicator';

function readHidden(organizationId: string): boolean {
  try {
    return (
      window.localStorage.getItem(
        `${ONBOARDING_CARD_DISMISSED_STORAGE_PREFIX}${organizationId}`
      ) === '1'
    );
  } catch {
    return false;
  }
}

function writeHidden(organizationId: string): void {
  try {
    window.localStorage.setItem(
      `${ONBOARDING_CARD_DISMISSED_STORAGE_PREFIX}${organizationId}`,
      '1'
    );
  } catch {
    // Storage unavailable: the card simply stays for this visit.
  }
}

export function SetupChecklistCard(): JSX.Element | null {
  const { t } = useTranslation();
  const { data: status } = useOnboardingStatus();
  const [hiddenNow, setHiddenNow] = useState(false);

  if (!status) return null;

  const requiredOpen = openRequiredSteps(status);
  const recommendedOpen = openRecommendedSteps(status);
  if (requiredOpen.length === 0 && recommendedOpen.length === 0) return null;

  const onlyRecommendedLeft =
    status.requiredComplete && requiredOpen.length === 0;
  if (onlyRecommendedLeft && (hiddenNow || readHidden(status.organizationId))) {
    return null;
  }

  const openItems = [...requiredOpen, ...recommendedOpen];

  return (
    <section
      className="rounded-xl border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="setup-checklist-title"
      data-testid="setup-checklist-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="setup-checklist-title"
            className="font-display text-base font-semibold text-foreground"
          >
            {status.readyLabelAllowed
              ? t('onboarding:card.readyTitle')
              : t('onboarding:card.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {onlyRecommendedLeft
              ? t('onboarding:card.recommendedOnly')
              : t('onboarding:card.incomplete', { count: requiredOpen.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onlyRecommendedLeft ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                writeHidden(status.organizationId);
                setHiddenNow(true);
              }}
            >
              {t('onboarding:card.hide')}
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link to={ONBOARDING_ROUTES.root}>
              {t('onboarding:card.continue')}
              <ArrowRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {openItems.map((step) => (
          <li
            key={step.key}
            className="flex items-center justify-between gap-3 py-2.5"
            data-testid={`setup-item-${step.key}`}
          >
            <span className="flex items-center gap-3">
              <StepStatusIcon status={step.status} />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {t(`onboarding:steps.${step.key}.label`)}
                </span>
                <span className="flex gap-1.5">
                  <StepStatusText status={step.status} />
                  <span className="text-xs text-muted-foreground">
                    · {t(`onboarding:requirement.${step.requirement}`)}
                  </span>
                </span>
              </span>
            </span>
            {step.status === 'blocked' ? null : (
              <Button asChild variant="ghost" size="sm">
                <Link
                  to={
                    // Branding has no setup screen of its own: the logo is
                    // set in the Academy step or the academy's Brand settings.
                    step.key === 'branding' && status.academy?.id
                      ? buildPath(DASHBOARD_ROUTES.academyBranding, {
                          academyId: status.academy.id,
                        })
                      : buildPath(ONBOARDING_ROUTES.step, { step: step.key })
                  }
                >
                  {t('onboarding:card.open')}
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
