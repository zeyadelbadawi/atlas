/**
 * Five-step progress indicator for the custom-domain lifecycle (P63,
 * P63d): Connect → Configure DNS → Verification → HTTPS → Live. Purely
 * presentational; the step comes from `deriveCustomDomainStep` (and
 * `stepWhileEditing` while a replacement hostname is being entered).
 * A step is ticked only when the server has recorded the facts behind
 * it; "Live" is ticked only when the server says `live`.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@utils';
import {
  CUSTOM_DOMAIN_STEPS,
  isFailedStep,
  stepIndex,
  type CustomDomainStep,
} from '../utils/domain-lifecycle.utils';

export interface CustomDomainStepperProps {
  readonly step: CustomDomainStep;
}

/** The label a position shows for the current step (a failed/blocked position names what went wrong there). */
function labelKeyFor(
  item: string,
  index: number,
  step: CustomDomainStep,
  current: number
): string {
  if (index !== current) return `website:domain.custom.steps.${item}`;
  switch (step) {
    case 'blocked':
      return 'website:domain.custom.steps.blocked';
    case 'securing':
      return 'website:domain.custom.steps.securing';
    case 'https_failed':
      return 'website:domain.custom.steps.https_failed';
    default:
      return `website:domain.custom.steps.${item}`;
  }
}

export function CustomDomainStepper({
  step,
}: CustomDomainStepperProps): JSX.Element {
  const { t } = useTranslation();
  const current = stepIndex(step);
  const failed = isFailedStep(step);

  return (
    <ol
      className="grid gap-2 sm:grid-cols-5"
      aria-label={t('website:domain.custom.steps.ariaLabel')}
    >
      {CUSTOM_DOMAIN_STEPS.map((item, index) => {
        const done = index < current || (step === 'live' && index === current);
        const active = index === current && step !== 'live';
        const failedHere = failed && index === current;
        return (
          <li
            key={item}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
              failedHere
                ? 'border-destructive/40 bg-destructive-surface text-destructive'
                : done
                  ? 'border-success/40 bg-success-surface text-success'
                  : active
                    ? 'border-primary/40 bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground'
            )}
            aria-current={active || failedHere ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs',
                failedHere
                  ? 'border-destructive'
                  : done
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-current'
              )}
              aria-hidden
            >
              {failedHere ? (
                <AlertTriangle className="size-3" />
              ) : done ? (
                <Check className="size-3" />
              ) : (
                index + 1
              )}
            </span>
            <span className="truncate">
              {t(labelKeyFor(item, index, step, current))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
