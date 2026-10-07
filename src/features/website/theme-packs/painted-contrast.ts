/**
 * Painted-contrast helpers for a theme's brand mapping (`mapBrandPalette`).
 *
 * Themes 1–3 each carry a private copy of these four functions in their
 * own `*.brand-mapping.ts`; Riwaq (Theme 4) is the first to import the
 * shared one, and a later theme should too. The existing copies are left
 * as they are on purpose: their output is frozen by their themes' visual
 * baselines, and this module is a byte-for-byte equivalent of them, so
 * switching them over is a no-op that can happen whenever those themes
 * are next touched.
 *
 * Every helper measures a pair the way the browser paints it (each sRGB
 * channel rounded to 8 bits), never the unrounded maths, so a pair the
 * matrix tests prove readable is readable on screen.
 */
import {
  formatHslTriplet,
  parseHslTriplet,
  relativeLuminance,
  solveLightness,
  tripletToOklch,
  type HslTriplet,
} from '../brand-engine';

/** Contrast as the browser paints the pair (each channel rounded to 8 bits). */
export function renderedContrast(a: HslTriplet, b: HslTriplet): number {
  const luminance = (triplet: HslTriplet) => {
    const { r, g, b: blue } = parseHslTriplet(triplet);
    const q = (channel: number) => Math.round(channel * 255) / 255;
    return relativeLuminance({ r: q(r), g: q(g), b: q(blue) });
  };
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `top` over `bottom` at `alpha`, as an opaque triplet. */
export function composite(
  top: HslTriplet,
  bottom: HslTriplet,
  alpha: number
): HslTriplet {
  const a = parseHslTriplet(top);
  const b = parseHslTriplet(bottom);
  return formatHslTriplet({
    r: a.r * alpha + b.r * (1 - alpha),
    g: a.g * alpha + b.g * (1 - alpha),
    b: a.b * alpha + b.b * (1 - alpha),
  });
}

/**
 * The colour, moved in lightness only (hue and chroma kept), until it
 * clears `ratio` against every one of `grounds` as painted. Returns the
 * colour unchanged when it already passes.
 */
export function ensureContrast(
  color: HslTriplet,
  grounds: readonly HslTriplet[],
  ratio: number,
  direction: 'darker' | 'lighter'
): HslTriplet {
  const passes = (candidate: HslTriplet) =>
    grounds.every((ground) => renderedContrast(candidate, ground) >= ratio);
  if (passes(color)) return color;
  return (
    solveLightness(tripletToOklch(color), passes, direction) ??
    (direction === 'darker' ? '0 0% 9%' : '0 0% 100%')
  );
}

/**
 * A fill that must carry `label` at `ratio`: moved in lightness away from
 * the label (darker under a light label, lighter under a dark one) until
 * it does. Hue and chroma are kept, so the fill stays the brand.
 */
export function ensureFillFor(
  fill: HslTriplet,
  label: HslTriplet,
  ratio = 4.5
): HslTriplet {
  const passes = (candidate: HslTriplet) =>
    renderedContrast(candidate, label) >= ratio;
  if (passes(fill)) return fill;
  const labelIsLight = relativeLuminance(parseHslTriplet(label)) > 0.4;
  return (
    solveLightness(
      tripletToOklch(fill),
      passes,
      labelIsLight ? 'darker' : 'lighter'
    ) ?? (labelIsLight ? '0 0% 9%' : '0 0% 100%')
  );
}

/** `hsl(…)` for a triplet, optionally with alpha. */
export const hsl = (triplet: HslTriplet, alpha?: number): string =>
  alpha === undefined ? `hsl(${triplet})` : `hsl(${triplet} / ${alpha})`;
