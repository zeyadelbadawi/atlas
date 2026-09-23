/**
 * StarRating — an accessible 5-star rating, in two modes:
 *
 *   - readonly (default): renders a value (supports halves) as a row of
 *     stars with a single text alternative, decorative to AT beyond that
 *     label. Used by the course rating summary and each review card.
 *   - interactive (`onChange` provided): a keyboard-operable radiogroup
 *     (Arrow keys move, Enter/Space select) for the review form. Each star
 *     is a real focusable radio with an accessible name.
 *
 * Presentation only — no business logic, no data fetching. Colour comes
 * from the amber rating convention; the empty track uses the muted token
 * so it reads in light and dark. Never conveys the score by colour alone
 * (the numeric label and `aria-label` carry it).
 */
import { useId } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
} as const;

export interface StarRatingProps {
  /** Current value 0–5 (halves allowed in readonly mode). */
  readonly value: number;
  /** Provide to make the control interactive (whole stars 1–5). */
  readonly onChange?: (value: number) => void;
  readonly size?: keyof typeof SIZE_CLASS;
  /** Accessible label for the whole control (interactive) or the value (readonly). */
  readonly label?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

const MAX = 5;

export function StarRating({
  value,
  onChange,
  size = 'md',
  label,
  disabled = false,
  className,
}: StarRatingProps): JSX.Element {
  const groupName = useId();
  const sizeClass = SIZE_CLASS[size];
  const interactive = typeof onChange === 'function' && !disabled;

  if (!interactive) {
    // Readonly: one labelled group, stars hidden from AT (the label carries meaning).
    const rounded = Math.round(value * 2) / 2;
    return (
      <span
        className={cn('inline-flex items-center gap-0.5', className)}
        role="img"
        aria-label={label ?? `${value} out of ${MAX}`}
      >
        {Array.from({ length: MAX }, (_, i) => {
          const starIndex = i + 1;
          const fillFraction = Math.max(0, Math.min(1, rounded - i));
          return (
            <span
              key={starIndex}
              className={cn('relative', sizeClass)}
              aria-hidden
            >
              <Star
                className={cn(
                  sizeClass,
                  'absolute inset-0 text-muted-foreground/40'
                )}
                strokeWidth={1.5}
              />
              {fillFraction > 0 ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillFraction * 100}%` }}
                >
                  <Star
                    className={cn(sizeClass, 'text-amber-500')}
                    strokeWidth={1.5}
                    fill="currentColor"
                  />
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={label ?? 'Rating'}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {Array.from({ length: MAX }, (_, i) => {
        const starValue = i + 1;
        const selected = starValue === Math.round(value);
        const filled = starValue <= Math.round(value);
        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
            name={groupName}
            // Roving tabindex: only the selected star (or the first, when
            // nothing is chosen yet) is in the tab order.
            tabIndex={selected || (value < 1 && starValue === 1) ? 0 : -1}
            onClick={() => onChange(starValue)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                onChange(Math.min(MAX, Math.round(value) + 1 || 1));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                onChange(Math.max(1, Math.round(value) - 1));
              }
            }}
            className={cn(
              'inline-flex items-center justify-center rounded p-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'cursor-pointer transition-transform active:scale-95'
            )}
          >
            <Star
              className={cn(
                sizeClass,
                filled ? 'text-amber-500' : 'text-muted-foreground/40'
              )}
              strokeWidth={1.5}
              fill={filled ? 'currentColor' : 'none'}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
