/**
 * A step's status as icon AND words.
 *
 * Status is never carried by colour alone: every state has its own icon
 * shape and its own label, so it reads the same to someone who cannot
 * tell the tones apart, and to a screen reader.
 */
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@utils';
import type { OnboardingStepStatus } from '@types';

const STATUS_ICON: Readonly<Record<OnboardingStepStatus, LucideIcon>> = {
  complete: CheckCircle2,
  in_progress: Loader2,
  incomplete: Circle,
  blocked: Lock,
  awaiting_confirmation: Clock,
};

const STATUS_TONE: Readonly<Record<OnboardingStepStatus, string>> = {
  complete: 'text-success',
  in_progress: 'text-info',
  incomplete: 'text-muted-foreground',
  blocked: 'text-muted-foreground',
  awaiting_confirmation: 'text-warning',
};

export interface StepStatusIconProps {
  readonly status: OnboardingStepStatus;
  readonly className?: string;
}

export function StepStatusIcon({
  status,
  className,
}: StepStatusIconProps): JSX.Element {
  const Icon = STATUS_ICON[status];
  return (
    <Icon
      className={cn(
        'size-4 shrink-0',
        STATUS_TONE[status],
        status === 'in_progress' && 'animate-spin',
        className
      )}
      strokeWidth={2}
      aria-hidden
    />
  );
}

/** The status in words — the label that makes the icon unambiguous. */
export function StepStatusText({
  status,
  className,
}: StepStatusIconProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {t(`onboarding:status.${status}`)}
    </span>
  );
}
