/**
 * Atlas radius tokens.
 *
 * A single radius language keeps every surface recognisably Atlas. Components
 * select a radius by the role of the surface, never by an arbitrary value.
 */

export const RADIUS_TOKENS = {
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  pill: 'var(--radius-pill)',
} as const;

export type RadiusToken = keyof typeof RADIUS_TOKENS;

/** Radius applied per surface role, expressed as Tailwind utilities. */
export const SURFACE_RADIUS = {
  control: 'rounded-md',
  field: 'rounded-md',
  card: 'rounded-lg',
  panel: 'rounded-xl',
  dialog: 'rounded-xl',
  sheet: 'rounded-2xl',
  badge: 'rounded-pill',
  avatar: 'rounded-pill',
} as const;

export type SurfaceRadiusToken = keyof typeof SURFACE_RADIUS;