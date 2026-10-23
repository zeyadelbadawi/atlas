/**
 * A named choice as a row of radio cards (the custom section's layout,
 * column widths, heading level, spacer size, image frame): a fieldset with
 * a visible legend, real radio inputs (arrow keys move between them), each
 * card at least 44px tall with a visible focus ring, an optional picture of
 * the choice beside its label, and a hint under the group.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

export interface CustomChoice<TValue extends string> {
  readonly value: TValue;
  readonly labelKey: string;
  /** A small picture of the choice (decorative). */
  readonly picture?: ReactNode;
}

export function CustomChoiceGroup<TValue extends string>({
  legendKey,
  hintKey,
  value,
  choices,
  onChange,
  columns = 3,
  testId,
}: {
  readonly legendKey: string;
  readonly hintKey?: string;
  readonly value: TValue;
  readonly choices: readonly CustomChoice<TValue>[];
  readonly onChange: (next: TValue) => void;
  /** Cards per row (the editor panel is narrow at every screen size). */
  readonly columns?: 2 | 3;
  readonly testId?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset
      className="space-y-2"
      aria-describedby={hintKey ? hintId : undefined}
      data-testid={testId}
    >
      <legend className="text-sm font-medium text-foreground">
        {t(legendKey)}
      </legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
        )}
      >
        {choices.map((choice) => {
          const checked = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                // The picture above its label, so three fit a narrow panel.
                'relative flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-center text-[0.8125rem] leading-tight transition-colors motion-reduce:transition-none',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1',
                checked
                  ? 'border-primary bg-primary/5 font-medium text-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice.value}
                checked={checked}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              {choice.picture ? (
                <span
                  aria-hidden
                  className={cn(
                    'flex shrink-0 items-center',
                    checked ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {choice.picture}
                </span>
              ) : null}
              <span className="min-w-0 break-words">{t(choice.labelKey)}</span>
            </label>
          );
        })}
      </div>
      {hintKey ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(hintKey)}
        </p>
      ) : null}
    </fieldset>
  );
}

/** A small diagram of columns side by side, `parts` their relative widths. */
export function ColumnsPicture({
  parts,
}: {
  readonly parts: readonly number[];
}): JSX.Element {
  return (
    <span className="flex h-5 w-9 gap-0.5">
      {parts.map((part, index) => (
        <span
          key={index}
          className="h-full rounded-[2px] bg-current opacity-70"
          style={{ flexGrow: part, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
