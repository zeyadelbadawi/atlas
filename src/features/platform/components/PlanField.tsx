/**
 * One plan form field: label, control, help and the field's own message,
 * wired together (`aria-describedby`, `aria-invalid`). Shared by the plan
 * editor and the plan management dialogs.
 */
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';

export interface PlanFieldProps {
  readonly id: string;
  readonly label: string;
  readonly help?: ReactNode;
  readonly error?: string;
  readonly children: (aria: {
    readonly 'aria-invalid': boolean | undefined;
    readonly 'aria-describedby': string | undefined;
  }) => ReactNode;
  readonly className?: string;
}

/** Label, control, help and the field's own message, wired together. */
export function PlanField({
  id,
  label,
  help,
  error,
  children,
  className,
}: PlanFieldProps): JSX.Element {
  const describedBy =
    [help ? `${id}-help` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm font-medium text-destructive"
          data-testid={`${id}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
