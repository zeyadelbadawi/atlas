/**
 * G1 — small building blocks for the Growth & capacity page: an RTL-safe
 * meter (value against a limit, with an optional threshold tick), a stat
 * line, the channel label, and a labelled form field. A meter's state is
 * always said in words next to it; colour only repeats it.
 */
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';
import type { AcquisitionChannel } from '../types';
import { K } from '../utils/growth.utils';

export type MeterTone = 'ok' | 'warning' | 'critical';

const FILL: Record<MeterTone, string> = {
  ok: 'bg-primary',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

export function Meter({
  value,
  max,
  label,
  valueText,
  tone = 'ok',
  tick,
  className,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly valueText: string;
  readonly tone?: MeterTone;
  /** A threshold marker on the scale (same unit as value/max). */
  readonly tick?: number;
  readonly className?: string;
}): JSX.Element {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const tickRatio =
    tick !== undefined && max > 0 ? Math.min(Math.max(tick / max, 0), 1) : null;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cn(
        'relative h-2.5 w-full overflow-hidden rounded-full bg-muted',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[inline-size] duration-300 motion-reduce:transition-none',
          FILL[tone]
        )}
        style={{ inlineSize: `${ratio * 100}%` }}
      />
      {tickRatio !== null ? (
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{ insetInlineStart: `calc(${tickRatio * 100}% - 1px)` }}
        />
      ) : null}
    </div>
  );
}

/** One labelled number (`dt`/`dd` inside a `dl`). */
export function Stat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: ReactNode;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className="mt-0.5 text-xl font-semibold tabular-nums text-foreground"
        data-atlas-numeric="true"
      >
        {value}
      </dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

export function useChannelLabel(): (channel: AcquisitionChannel) => string {
  const { t } = useTranslation();
  return (channel) => t(`${K}channels.${channel}`);
}

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly optional?: boolean;
  readonly className?: string;
  readonly children: ReactElement;
}

/** A label, the control (id / aria-describedby / aria-invalid wired), its hint and error. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps): JSX.Element {
  const { t } = useTranslation();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="ms-1 font-normal text-muted-foreground">
            ({t(`${K}common.optional`)})
          </span>
        ) : null}
      </Label>
      {cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A native select styled like the inputs (44 px touch target). */
export const SELECT_CLASS =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';
