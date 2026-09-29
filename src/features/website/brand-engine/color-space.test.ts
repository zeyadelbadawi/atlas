import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  formatHslTriplet,
  gamutMapOklch,
  hueDistance,
  isHslTriplet,
  parseHslTriplet,
  rgbToHex,
  rgbToOklab,
  tripletToOklch,
} from './color-space';

describe('brand engine — colour space', () => {
  it('matches the reference OKLab values for sRGB red', () => {
    const lab = rgbToOklab({ r: 1, g: 0, b: 0 });
    expect(lab.L).toBeCloseTo(0.62796, 4);
    expect(lab.a).toBeCloseTo(0.22486, 4);
    expect(lab.b).toBeCloseTo(0.12585, 4);
  });

  it('round-trips stored triplets', () => {
    for (const triplet of [
      '221 83% 53%',
      '24 95% 53%',
      '0 0% 100%',
      '0 0% 0%',
      '174 60% 42%',
    ]) {
      expect(formatHslTriplet(parseHslTriplet(triplet))).toBe(triplet);
    }
  });

  it('stores greys, black and white canonically (no meaningless hue)', () => {
    expect(formatHslTriplet({ r: 1, g: 1, b: 1 })).toBe('0 0% 100%');
    expect(formatHslTriplet({ r: 0, g: 0, b: 0 })).toBe('0 0% 0%');
    expect(formatHslTriplet({ r: 0.4, g: 0.4, b: 0.4 })).toBe('0 0% 40%');
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio('0 0% 0%', '0 0% 100%')).toBeCloseTo(21, 5);
    expect(contrastRatio('0 0% 100%', '0 0% 100%')).toBeCloseTo(1, 5);
    // #767676 on white: the classic 4.54:1.
    expect(rgbToHex(parseHslTriplet('0 0% 46%'))).toBe('#757575');
    expect(contrastRatio('0 0% 46%', '0 0% 100%')).toBeGreaterThan(4.5);
  });

  it('gamut-maps out-of-gamut OKLCH by reducing chroma, keeping lightness', () => {
    const mapped = gamutMapOklch({ L: 0.7, C: 0.4, h: 150 });
    for (const channel of [mapped.r, mapped.g, mapped.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
    const back = tripletToOklch(formatHslTriplet(mapped));
    expect(back.L).toBeCloseTo(0.7, 1);
    expect(back.C).toBeLessThan(0.4);
  });

  it('validates the stored format exactly like HSL_TRIPLET_REGEX (plus ranges)', () => {
    expect(isHslTriplet('221 83% 53%')).toBe(true);
    expect(isHslTriplet('221 83% 53')).toBe(false);
    expect(isHslTriplet('221.5 83% 53%')).toBe(false);
    expect(isHslTriplet('400 83% 53%')).toBe(false);
    expect(isHslTriplet(42)).toBe(false);
  });

  it('measures hue distance around the circle', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
  });
});
