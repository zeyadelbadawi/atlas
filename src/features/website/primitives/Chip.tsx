/**
 * Chip — a compact label (static) or filter toggle (interactive).
 *
 * UI/UX Pro Max review (Phase 1): a chip label never wraps to a second
 * line (the text is short and stays whole — no truncation that would hide
 * it from touch users); an interactive chip is a real `<button>` with
 * `aria-pressed`, a visible focus ring and a ≥ 32px target (WCAG 2.5.8
 * asks ≥ 24px); callers lay chips out with ≥ 8px gaps. Brand colour comes
 * only from theme variables (a "signal, not wash" slot, §B).
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';

interface ChipBaseProps {
  readonly tone?: 'neutral' | 'brand';
  readonly icon?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export type ChipProps = ChipBaseProps &
  (
    | { readonly pressed?: undefined; readonly onClick?: undefined }
    | { readonly pressed: boolean; readonly onClick: () => void }
  );

const TONE_CLASSES = {
  neutral:
    'border border-[var(--website-border)] bg-[var(--website-background)] text-[var(--website-foreground)]',
  brand:
    'bg-[var(--website-chip-bg,var(--website-primary-surface))] text-[var(--website-link,var(--website-primary-solid))]',
} as const;

const BASE =
  'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium';

export function Chip({
  tone = 'neutral',
  icon,
  className,
  children,
  pressed,
  onClick,
}: ChipProps): JSX.Element {
  const content = (
    <>
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onClick}
        data-pressed={pressed ? '' : undefined}
        className={cn(
          BASE,
          'min-h-8 transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
          pressed
            ? 'bg-[var(--website-primary-solid)] text-white'
            : TONE_CLASSES[tone],
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={cn(BASE, 'min-h-7', TONE_CLASSES[tone], className)}>
      {content}
    </span>
  );
}
