/**
 * Hex ↔ stored HSL triplet, for the Brand Studio's colour pickers (the
 * native `<input type="color">` speaks hex; palettes are stored as
 * integer HSL triplets).
 */
import {
  formatHslTriplet,
  parseHslTriplet,
  rgbToHex,
  type HslTriplet,
} from '../brand-engine';

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function tripletToHex(triplet: HslTriplet): string {
  return rgbToHex(parseHslTriplet(triplet));
}

/** `null` for anything that isn't a 3- or 6-digit hex colour. */
export function hexToTriplet(value: string): HslTriplet | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : match[1];
  const channel = (index: number) =>
    parseInt(digits.slice(index, index + 2), 16) / 255;
  return formatHslTriplet({ r: channel(0), g: channel(2), b: channel(4) });
}
