/**
 * The calm, bordered panels the setup screens are composed of — a status
 * message with an icon, a title, a line of explanation and an optional
 * row of actions. One component, so every screen speaks the same visual
 * language as the rest of Atlas (surface, border, display type).
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@utils';

export type StepPanelTone = 'neutral' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_ICON_CLASS: Readonly<Record<StepPanelTone, string>> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  destructive: 'bg-destructive-surface text-destructive',
  info: 'bg-info-surface text-info',
};

export interface StepPanelProps {
  readonly icon: LucideIcon;
  readonly tone?: StepPanelTone;
  readonly title: string;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
  readonly spinIcon?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

export function StepPanel({
  icon: Icon,
  tone = 'neutral',
  title,
  description,
  children,
  actions,
  spinIcon = false,
  className,
  testId,
}: StepPanelProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-start',
        className
      )}
      data-testid={testId}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-pill',
          TONE_ICON_CLASS[tone]
        )}
      >
        <Icon
          className={cn('size-5', spinIcon && 'animate-spin')}
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {children}
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
