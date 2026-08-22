/**
 * Atlas elevation tokens.
 *
 * Elevation is deliberately restrained: an enterprise console communicates
 * hierarchy through structure and spacing, not through heavy shadows. In Dark
 * Mode depth comes primarily from surface lightness.
 */

export const SHADOW_TOKENS = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  overlay: 'var(--shadow-overlay)',
} as const;

export type ShadowToken = keyof typeof SHADOW_TOKENS;

/** Elevation applied per surface role, expressed as Tailwind utilities. */
export const SURFACE_ELEVATION = {
  flat: 'shadow-none',
  card: 'shadow-xs',
  raised: 'shadow-sm',
  dropdown: 'shadow-md',
  dialog: 'shadow-overlay',
  sticky: 'shadow-sm',
} as const;

export type SurfaceElevationToken = keyof typeof SURFACE_ELEVATION;