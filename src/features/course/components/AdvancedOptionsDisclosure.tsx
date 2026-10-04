/**
 * Advanced Options Disclosure (W7).
 *
 * The "show more" control the quiz authoring form uses to keep rarely
 * needed settings out of the way. It is a plain disclosure (WAI-ARIA APG
 * "Disclosure" pattern): a native `<button>` with `aria-expanded` and
 * `aria-controls`, so Enter and Space work, it sits in the normal tab
 * order and a screen reader announces "collapsed"/"expanded".
 *
 * The panel stays MOUNTED while collapsed (`hidden`, never unmounted):
 * the fields inside keep their React Hook Form registration and values,
 * every value is still submitted, and their `FormMessage`s exist for the
 * moment the caller opens the panel because one of them has an error.
 * Open/closed is CONTROLLED by the caller, which knows when to open it
 * (an error on a hidden field, a customised value on an edited quiz).
 */
import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@utils';

export interface AdvancedOptionsDisclosureProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The toggle's visible (and accessible) name. */
  readonly label: string;
  /** Short status after the label, e.g. "3 customised". Read as part of the name. */
  readonly summary?: string;
  /** Hook for tests and journeys. */
  readonly testId?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function AdvancedOptionsDisclosure({
  open,
  onOpenChange,
  label,
  summary,
  testId,
  className,
  children,
}: AdvancedOptionsDisclosureProps): JSX.Element {
  const baseId = useId();
  const buttonId = `${baseId}-toggle`;
  const panelId = `${baseId}-panel`;

  return (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-start text-sm font-medium text-foreground',
          'transition-colors hover:bg-muted/60 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-180'
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span>{label}</span>
        {summary ? (
          <span className="ms-auto rounded-pill bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="space-y-4"
      >
        {children}
      </div>
    </div>
  );
}
