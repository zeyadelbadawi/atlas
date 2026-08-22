/**
 * Color conversion + WCAG contrast utilities.
 *
 * `WebsiteBrandConfig` colors are stored as HSL triplets (matching Atlas's
 * own `hsl(var(--x))` token format); the editor's color input is a native
 * `<input type="color">`, which only speaks hex — these are the two
 * conversions that boundary needs, plus the contrast check the Section
 * 43 "Color Validation" requirement calls for. Pure functions, no new
 * dependency.
 */
import type { HslColorTriplet } from '@types';

/** Parses `"H S% L%"` into numeric degrees/percentages. Returns black if malformed, never throws. */
function parseHslTriplet(hsl: HslColorTriplet): { h: number; s: number; l: number } {
  const match = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/.exec(hsl.trim());
  if (!match) return { h: 0, s: 0, l: 0 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
  else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
  else h = (rNorm - gNorm) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** `"H S% L%"` → `"#rrggbb"`, for the native color input's value. */
export function hslTripletToHex(hsl: HslColorTriplet): string {
  const { h, s, l } = parseHslTriplet(hsl);
  const { r, g, b } = hslToRgb(h, s, l);
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** `"#rrggbb"` → `"H S% L%"`, for storing what the native color input returns. */
export function hexToHslTriplet(hex: string): HslColorTriplet {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) || 0;
  const g = parseInt(normalized.slice(2, 4), 16) || 0;
  const b = parseInt(normalized.slice(4, 6), 16) || 0;
  const { h, s, l } = rgbToHsl(r, g, b);
  return `${h} ${s}% ${l}%`;
}

/** Relative luminance per WCAG 2.x, from an HSL triplet. */
function relativeLuminance(hsl: HslColorTriplet): number {
  const { h, s, l } = parseHslTriplet(hsl);
  const { r, g, b } = hslToRgb(h, s, l);
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio (1–21) between two HSL-triplet colors. */
export function contrastRatio(a: HslColorTriplet, b: HslColorTriplet): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA requires 4.5:1 for normal text, 3:1 for large text/UI components — this checks the stricter bound. */
export function hasAccessibleContrast(a: HslColorTriplet, b: HslColorTriplet): boolean {
  return contrastRatio(a, b) >= 4.5;
}
