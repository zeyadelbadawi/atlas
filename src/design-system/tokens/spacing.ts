/**
 * Atlas spacing tokens.
 *
 * Atlas uses a 4pt base grid. Spacing is chosen by role rather than by feel so
 * rhythm stays identical across every module of the platform.
 */

export const SPACING_SCALE = {
  none: '0',
  hair: '0.25rem',
  tight: '0.5rem',
  snug: '0.75rem',
  base: '1rem',
  relaxed: '1.5rem',
  loose: '2rem',
  section: '3rem',
  band: '4rem',
} as const;

export type SpacingToken = keyof typeof SPACING_SCALE;

/**
 * Spacing applied by structural role. Layouts and shared components consume
 * these instead of choosing arbitrary Tailwind values.
 */
export const LAYOUT_SPACING = {
  /** Gap between an icon and its adjacent label. */
  iconLabelGap: 'gap-1.5',
  /** Gap between closely related controls. */
  controlGap: 'gap-2',
  /** Gap between fields inside one form group. */
  fieldGap: 'gap-4',
  /** Inner padding of a card or panel. */
  panelPadding: 'p-4 sm:p-6',
  /** Vertical rhythm between stacked page sections. */
  sectionGap: 'space-y-6 lg:space-y-8',
  /** Horizontal page gutters. */
  pageGutter: 'px-4 sm:px-6 lg:px-8',
  /** Vertical page padding. */
  pageBlock: 'py-6 lg:py-8',
} as const;

export type LayoutSpacingToken = keyof typeof LAYOUT_SPACING;

/** Layout shell metrics, mirrored from the CSS custom properties. */
export const LAYOUT_METRICS = {
  headerHeight: 'var(--layout-header-height)',
  sidebarWidth: 'var(--layout-sidebar-width)',
  sidebarCollapsedWidth: 'var(--layout-sidebar-collapsed-width)',
  contentMaxWidth: 'var(--layout-content-max-width)',
} as const;