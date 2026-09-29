/**
 * SectionShell — the outer frame every themed section shares (Theme 1 plan
 * §F.1): a labelled `<section>` landmark, the theme's vertical rhythm, a
 * tone band, and the theme's content container.
 *
 * Tones map to theme variables only, so a pack changes their look without
 * touching the markup: `default` (page background), `soft` (the neutral
 * alternating band), `ink` (the deep closing band; a theme sets
 * `--website-ink`/`--website-ink-foreground`, otherwise it falls back to
 * the foreground on the background).
 */
import type { ReactNode } from 'react';
import { cn } from '@utils';
import {
  useWebsiteContainerClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';

export type SectionTone = 'default' | 'soft' | 'ink';

export interface SectionShellProps {
  /** The id of the section's visible heading — names the landmark for screen readers. */
  readonly labelledBy?: string;
  readonly id?: string;
  readonly tone?: SectionTone;
  /** Narrow for reading-width content (≈ 65ch), wide for full-bleed grids. */
  readonly width?: 'narrow' | 'standard' | 'wide';
  readonly className?: string;
  readonly children: ReactNode;
}

const TONE_CLASSES: Record<SectionTone, string> = {
  default: 'bg-[var(--website-background)] text-[var(--website-foreground)]',
  soft: 'bg-[var(--website-surface)] text-[var(--website-foreground)]',
  ink: 'bg-[var(--website-ink,var(--website-foreground))] text-[var(--website-ink-foreground,var(--website-background))]',
};

const WIDTH_CLASSES = {
  narrow: 'max-w-3xl',
  standard: '',
  wide: 'max-w-[min(100%,90rem)]',
} as const;

export function SectionShell({
  labelledBy,
  id,
  tone = 'default',
  width = 'standard',
  className,
  children,
}: SectionShellProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const rhythm = useWebsiteSectionClass();
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-tone={tone}
      className={cn(rhythm, TONE_CLASSES[tone], className)}
    >
      <div className={cn(container, WIDTH_CLASSES[width])}>{children}</div>
    </section>
  );
}
