/**
 * B3 — small form building blocks for the Launch & content editors: a
 * labelled field with its hint, its error next to it (wired with
 * `aria-describedby` / `aria-invalid`) and an optional live character
 * counter, and the RTL-safe progress bar the checklist and launch center
 * share.
 */
import { cloneElement, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@hooks';
import { cn, formatNumber } from '@utils';
import { K } from '../utils/launch.utils';

export function CharCounter({
  id,
  count,
  max,
}: {
  readonly id: string;
  readonly count: number;
  readonly max: number;
}): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const over = count > max;
  return (
    <span
      id={id}
      className={cn(
        'shrink-0 text-xs tabular-nums',
        over ? 'font-medium text-destructive' : 'text-muted-foreground'
      )}
      data-atlas-numeric="true"
    >
      {t(`${K}common.counter`, {
        value: formatNumber(count, language),
        max: formatNumber(max, language),
      })}
    </span>
  );
}

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  /** A translated error message, shown under the control. */
  readonly error?: string;
  readonly counter?: { readonly count: number; readonly max: number };
  readonly optional?: boolean;
  readonly className?: string;
  /** One input-like element; it receives id, aria-describedby and aria-invalid. */
  readonly children: ReactElement;
}

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  optional,
  className,
  children,
}: FieldProps): JSX.Element {
  const { t } = useTranslation();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const counterId = counter ? `${id}-count` : undefined;
  const describedBy =
    [hintId, errorId, counterId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {optional ? (
            <span className="ms-1 font-normal text-muted-foreground">
              ({t(`${K}common.optional`)})
            </span>
          ) : null}
        </Label>
        {counter ? (
          <CharCounter
            id={counterId!}
            count={counter.count}
            max={counter.max}
          />
        ) : null}
      </div>
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

export function ProgressBar({
  value,
  max,
  label,
  valueText,
  className,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly valueText: string;
  readonly className?: string;
}): JSX.Element {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn(
        'h-2.5 w-full overflow-hidden rounded-full bg-muted',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[inline-size] duration-300 motion-reduce:transition-none',
          ratio >= 1 ? 'bg-success' : 'bg-primary'
        )}
        style={{ inlineSize: `${ratio * 100}%` }}
      />
    </div>
  );
}
