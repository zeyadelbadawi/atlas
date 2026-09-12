/**
 * Marketing section primitives.
 *
 * These three components are the entire structural vocabulary of the public
 * marketing site. Every section on every marketing page composes them, which is
 * what keeps container width, vertical rhythm, section dividers and heading
 * hierarchy identical across pages instead of each page re-deciding them.
 *
 * See `design-system/atlas-marketing/MASTER.md` §3 (layout) and §5 (typography)
 * — these are that document's rules expressed as code.
 */
import type { ElementType, ReactNode } from 'react';
import { cn } from '@utils';

export interface MarketingContainerProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * The marketing measure. Deliberately narrower than the dashboard's
 * `max-w-content` (96rem) — see `--layout-marketing-max-width`'s own comment.
 */
export function MarketingContainer({
  children,
  className,
}: MarketingContainerProps): JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-marketing px-5 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface MarketingSectionProps {
  readonly children: ReactNode;
  /** Renders a hairline rule above the section — the editorial divider. */
  readonly divided?: boolean;
  /** Tightens the vertical rhythm for a subordinate section. */
  readonly compact?: boolean;
  readonly as?: ElementType;
  readonly className?: string;
  readonly id?: string;
  readonly 'aria-labelledby'?: string;
}

/**
 * One marketing section: the shared container, the spacious vertical rhythm
 * (density 3 — `py-16` mobile, `lg:py-28` desktop) and the optional hairline
 * divider that separates sections.
 *
 * Sections are divided by a rule rather than by alternating background blocks.
 * That is an editorial device, and it also keeps the page calm — a page of
 * alternating tinted bands reads as a template.
 */
export function MarketingSection({
  children,
  divided = false,
  compact = false,
  as: Component = 'section',
  className,
  ...rest
}: MarketingSectionProps): JSX.Element {
  return (
    <Component
      className={cn(
        divided && 'border-t border-border',
        compact ? 'py-12 lg:py-20' : 'py-16 lg:py-28',
        className
      )}
      {...rest}
    >
      <MarketingContainer>{children}</MarketingContainer>
    </Component>
  );
}

export interface SectionHeadingProps {
  /** Already-translated eyebrow label. Omit where a section needs no kicker. */
  readonly eyebrow?: string;
  /** Already-translated heading text. */
  readonly title: string;
  /** Already-translated supporting paragraph. */
  readonly lead?: string;
  readonly id?: string;
  /**
   * Centres the block. Defaults to start-aligned: an editorial grid reads from
   * the text edge, and start-alignment is also what keeps EN (LTR) and AR (RTL)
   * visually equivalent without a second rule.
   */
  readonly align?: 'start' | 'center';
  readonly className?: string;
}

/**
 * A section's heading block — eyebrow, `h2`, lead paragraph — with the measures
 * from MASTER.md §5 applied (`22ch` on the heading, `58ch` on the lead) so a
 * heading never runs to an uncomfortable width on a wide viewport.
 *
 * `text-balance` is a progressive enhancement on the heading only: bounded
 * measure first, balanced wrapping if the browser supports it, natural wrap
 * otherwise. No forced line breaks (UI/UX Pro Max `ux` → Heading Line Balance).
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  align = 'start',
  className,
}: SectionHeadingProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      {eyebrow ? (
        <span className="text-xs font-medium uppercase tracking-[0.14em] rtl:tracking-normal text-muted-foreground">
          {eyebrow}
        </span>
      ) : null}

      <h2
        id={id}
        className={cn(
          'max-w-[22ch] text-balance font-display text-3xl font-semibold leading-[1.1] rtl:leading-[1.5] tracking-[-0.02em] rtl:tracking-normal text-foreground sm:text-4xl lg:text-5xl',
          align === 'center' && 'mx-auto'
        )}
      >
        {title}
      </h2>

      {lead ? (
        <p
          className={cn(
            'max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg',
            align === 'center' && 'mx-auto'
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
