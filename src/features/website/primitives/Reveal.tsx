/**
 * Reveal — wraps content in the one-time rise-and-fade (Theme 1 plan §G:
 * 12px rise + fade, transform/opacity only, Atlas motion tokens). See
 * `useReveal` for when content is hidden at all. `delayMs` staggers a
 * group; callers cap the total (§G: ≤ 400ms per group).
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';
import { useReveal } from './useReveal';

export interface RevealProps {
  readonly delayMs?: number;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Reveal({
  delayMs = 0,
  className,
  children,
}: RevealProps): JSX.Element {
  const { ref, state } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal={state}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-normal ease-entrance motion-reduce:transition-none',
        'data-[reveal=pending]:translate-y-3 data-[reveal=pending]:opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
