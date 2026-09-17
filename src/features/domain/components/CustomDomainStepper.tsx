/**
 * Four-step progress indicator for the custom-domain lifecycle (P63).
 * Purely presentational; the step comes from `deriveCustomDomainStep`.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@utils';
import {
  CUSTOM_DOMAIN_STEPS,
  stepIndex,
  type CustomDomainStep,
} from '../utils/domain-lifecycle.utils';

export interface CustomDomainStepperProps {
  readonly step: CustomDomainStep;
}

export function CustomDomainStepper({
  step,
}: CustomDomainStepperProps): JSX.Element {
  const { t } = useTranslation();
  const current = stepIndex(step);
  const attention = step === 'attention' || step === 'blocked';

  return (
    <ol
      className="grid gap-2 sm:grid-cols-4"
      aria-label={t('website:domain.custom.steps.ariaLabel')}
    >
      {CUSTOM_DOMAIN_STEPS.map((item, index) => {
        const done = index < current || (step === 'live' && index === current);
        const active = index === current && step !== 'live';
        const failedHere = attention && index === current;
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
              {failedHere && step === 'blocked'
                ? t('website:domain.custom.steps.blocked')
                : t(`website:domain.custom.steps.${item}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
