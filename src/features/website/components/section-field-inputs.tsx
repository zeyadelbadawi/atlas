/**
 * CMS phase 3d — the section editor's plain-value inputs that need their
 * own input type: a clock time (`time`, a schedule row's start/end) and a
 * web address (`url`, a logo's link). Kept out of `SectionConfigForm`,
 * which only routes a descriptor of these kinds here.
 *
 * - A visible label tied to the input, helper text under it (wired into
 *   `aria-describedby`), and the native input type, so phones offer the
 *   time picker / URL keyboard.
 * - A problem is said only once the author leaves the field (or when the
 *   form reveals every problem after a refused Apply), never while they
 *   are still typing — and it says how to fix it. The control is marked
 *   invalid (`aria-invalid`, `data-field-error`) from the start, so a
 *   refused Apply can still focus it.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlainInputFieldDescriptor } from '../sections/section-field.types';

export interface PlainInputFieldProps {
  readonly descriptor: PlainInputFieldDescriptor;
  readonly id: string;
  readonly value: unknown;
  readonly onChange: (value: string) => void;
  /** The problem with the current value, already translated. */
  readonly error?: string;
  /** Show `error` even before the field was left (after a refused Apply). */
  readonly revealError?: boolean;
}

export function PlainInputField({
  descriptor,
  id,
  value,
  onChange,
  error,
  revealError = false,
}: PlainInputFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [left, setLeft] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-message`;
  const shownError = error && (left || revealError) ? error : undefined;
  const describedBy =
    [descriptor.hintKey ? hintId : undefined, shownError ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  const isTime = descriptor.kind === 'time';

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
      <Input
        id={id}
        type={isTime ? 'time' : 'url'}
        inputMode={isTime ? undefined : 'url'}
        autoComplete={isTime ? 'off' : 'url'}
        dir="ltr"
        // A time input sizes to its content; a fixed width keeps the
        // start/end pair readable on phones without a horizontal scroll.
        className={isTime ? 'w-40 max-w-full' : undefined}
        placeholder={isTime ? undefined : 'https://'}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setLeft(true)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-field-error={error ? true : undefined}
      />
      {descriptor.hintKey ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(descriptor.hintKey)}
        </p>
      ) : null}
      {shownError ? (
        <p id={errorId} className="text-xs text-destructive" role="status">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
