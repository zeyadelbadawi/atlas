/**
 * EmptyPanel — the designed state for "nothing here yet" on a public page
 * (Theme 1 plan §A.2, Phase 0 audit M.5 #7).
 *
 * Visitor language, not dashboard language: a heading that says what's
 * coming, an optional sentence, and — whenever there is one — a next step
 * (UI/UX Pro Max: "show a helpful message and an action; never a blank
 * screen"). Callers pass already-localised text.
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';

export interface EmptyPanelProps {
  readonly title: string;
  readonly description?: string;
  /** Decorative; hidden from assistive tech. */
  readonly icon?: ReactNode;
  /** A link or button to the next useful place. */
  readonly action?: ReactNode;
  readonly headingLevel?: 2 | 3 | 4;
  /** A theme image or illustration shown above the text. */
  readonly media?: ReactNode;
  readonly className?: string;
}

export function EmptyPanel({
  title,
  description,
  icon,
  action,
  headingLevel = 3,
  media,
  className,
}: EmptyPanelProps): JSX.Element {
  const HeadingTag = `h${headingLevel}` as const;
  return (
    <div
      data-empty-panel
      className={cn(
        'flex flex-col items-center gap-3 rounded-[var(--website-radius)] bg-[var(--website-surface)] px-6 py-10 text-center',
        className
      )}
    >
      {media}
      {icon ? (
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--website-background)] text-[var(--website-primary-solid)]"
        >
          {icon}
        </span>
      ) : null}
      <HeadingTag className="font-display text-lg font-semibold text-[var(--website-foreground)]">
        {title}
      </HeadingTag>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
