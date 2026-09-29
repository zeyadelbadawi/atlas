/**
 * A stored `brand.palette` is only used when it carries every role in the
 * stored format; anything else (partial, hand-edited, older shape) is
 * ignored and the theme falls back to deriving from the legacy colours.
 */
import {
  BRAND_ROLE_NAMES,
  isHslTriplet,
  type BrandPalette,
} from '../brand-engine';

export function isUsablePalette(value: unknown): value is BrandPalette {
  const roles = (value as { roles?: Record<string, unknown> } | null)?.roles;
  return !!roles && BRAND_ROLE_NAMES.every((name) => isHslTriplet(roles[name]));
}
