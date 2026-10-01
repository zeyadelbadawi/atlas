/**
 * Shared website primitives (Theme 1 plan §F.1). Theme renderers compose
 * these instead of re-implementing structure, so five themes can't drift
 * into five different accessibility or motion behaviours. Not used by any
 * renderer yet (Phase 1 changes nothing visible); Theme 1's renderers adopt
 * them from Phase 4.
 *
 * `ThemeImage` arrives with the asset resolver (Phase 3); carousel, rating,
 * price and course-card parts are extracted from the existing sections
 * when the first theme renderer needs them (Phases 5–6), so they're
 * extracted from working code rather than guessed now.
 */
export { SectionShell } from './SectionShell';
export type { SectionShellProps, SectionTone } from './SectionShell';
export { Heading } from './Heading';
export { splitHighlight } from './split-highlight';
export type { HeadingLevel, HeadingProps, HeadingSize } from './Heading';
export { Reveal } from './Reveal';
export type { RevealProps } from './Reveal';
export { useReveal } from './useReveal';
export type { RevealState } from './useReveal';
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { EmptyPanel } from './EmptyPanel';
export type { EmptyPanelProps } from './EmptyPanel';
