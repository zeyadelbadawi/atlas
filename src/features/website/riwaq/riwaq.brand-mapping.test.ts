/**
 * Theme 4 (Riwaq) brand mapping across the identity matrix: every text,
 * fill and graphic pair it emits is readable as painted on the ground it
 * is painted on, the reading grounds never take the brand's colour, the
 * deep ground and the photograph tint keep the brand's hue with their
 * chroma capped, and the stored palette is used when present.
 */
import { describe, expect, it } from 'vitest';
import { buildBrandPalette, tripletToOklch, type HslTriplet } from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import {
  RIWAQ_DEEP_CHROMA_CAP,
  RIWAQ_GROUND_CHROMA_CAP,
  RIWAQ_TINT_CHROMA_CAP,
  mapRiwaqBrandPalette,
  renderedContrast,
  resolveRiwaqTokens,
} from './riwaq.brand-mapping';

const theme = getWebsiteTheme('riwaq');

type Seeds = { primary: HslTriplet; secondary: HslTriplet; accent: HslTriplet };
const same = (c: HslTriplet): Seeds => ({ primary: c, secondary: c, accent: c });

const IDENTITY_MATRIX: Record<string, Seeds> = {
  blue: same('221 83% 53%'),
  orange: { primary: '24 95% 53%', secondary: '199 89% 38%', accent: '43 96% 56%' },
  purple: { primary: '262 70% 50%', secondary: '330 75% 55%', accent: '45 95% 55%' },
  neonYellow: same('66 100% 50%'),
  pastelPink: same('340 80% 85%'),
  nearBlack: same('220 15% 10%'),
  monochrome: { primary: '0 0% 20%', secondary: '0 0% 60%', accent: '0 0% 40%' },
  redLikeError: same('0 80% 50%'),
  teal: same('175 70% 35%'),
  brown: { primary: '25 50% 30%', secondary: '35 60% 50%', accent: '25 50% 30%' },
  multiColour: { primary: '200 90% 45%', secondary: '330 80% 55%', accent: '45 95% 55%' },
  white: same('0 0% 100%'),
  invalid: {
    primary: 'not-a-colour',
    secondary: '',
    accent: '#ff0000',
  } as unknown as Seeds,
  noLogo: {
    primary: theme.tokens.defaultPrimary,
    secondary: theme.tokens.defaultSecondary,
    accent: theme.tokens.defaultAccent,
  },
};

const hueDelta = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe.each(Object.entries(IDENTITY_MATRIX))('Riwaq mapping — %s', (_name, seeds) => {
  const t = resolveRiwaqTokens({ theme, seeds });
  const grounds = [t.porcelain, t.stone];
  const deeps = [t.deep, t.deepRaised];
  const on = (color: HslTriplet, onto: HslTriplet[], ratio: number) => {
    for (const ground of onto) {
      expect(renderedContrast(color, ground)).toBeGreaterThanOrEqual(ratio);
    }
  };

  it('prints body text at 12:1, muted text at 5:1 and the brand ink at 7:1 on both reading grounds', () => {
    on(t.ink, grounds, 12);
    on(t.inkMuted, grounds, 5);
    on(t.brandInk, grounds, 7);
  });

  it('keeps the feedback colours, chips and the marker fill readable', () => {
    on(t.success, grounds, 4.5);
    on(t.warning, grounds, 4.5);
    on(t.error, grounds, 4.5);
    on(t.chipText, [t.chip], 4.5);
    on(t.markerFillText, [t.markerFill], 4.5);
  });

  it('keeps the marker, focus and control edges at 3:1 as graphics', () => {
    on(t.marker, grounds, 3);
    on(t.focus, grounds, 3);
    on(t.ruleStrong, grounds, 3);
    on(t.deepMarker, deeps, 3);
  });

  it('letters every action at 4.5:1 in every state', () => {
    on(t.actionText, [t.action, t.actionHover, t.actionPressed], 4.5);
    on(t.deepActionText, [t.deepAction, t.deepActionHover], 4.5);
  });

  it('keeps every deep-ground pair readable', () => {
    on(t.deepText, deeps, 7);
    on(t.deepMuted, deeps, 4.5);
    on(t.deepMarkerText, deeps, 4.5);
  });

  it('never tints the reading grounds with the brand', () => {
    for (const surface of grounds) {
      expect(tripletToOklch(surface).C).toBeLessThanOrEqual(RIWAQ_GROUND_CHROMA_CAP + 0.004);
    }
  });

  it('keeps the deep ground and the photograph tint in the brand hue, chroma capped', () => {
    const brand = tripletToOklch(t.roles.primary);
    const deep = tripletToOklch(t.deep);
    const tint = tripletToOklch(t.tint);
    expect(deep.C).toBeLessThanOrEqual(RIWAQ_DEEP_CHROMA_CAP + 0.01);
    expect(tint.C).toBeLessThanOrEqual(RIWAQ_TINT_CHROMA_CAP + 0.01);
    // An achromatic brand has no hue to keep.
    if (brand.C > 0.03 && deep.C > 0.03) {
      expect(hueDelta(brand.h, deep.h)).toBeLessThanOrEqual(6);
    }
    if (brand.C > 0.03 && tint.C > 0.03) {
      expect(hueDelta(brand.h, tint.h)).toBeLessThanOrEqual(6);
    }
  });

  it('emits only valid CSS colour values', () => {
    const vars = mapRiwaqBrandPalette({ theme, seeds });
    for (const [name, value] of Object.entries(vars)) {
      expect(name.startsWith('--')).toBe(true);
      expect(value).not.toMatch(/undefined|NaN/);
    }
    expect(vars['--website-cta']).toBe(`hsl(${t.action})`);
    expect(vars['--rw-brand-ink']).toBe(`hsl(${t.brandInk})`);
  });
});

describe('Riwaq mapping — stored palette', () => {
  it('uses the confirmed semantic palette when one is stored', () => {
    const palette = buildBrandPalette({
      seeds: { primary: '150 60% 35%' },
      source: 'manual',
    });
    const fromPalette = resolveRiwaqTokens({
      theme,
      seeds: { primary: '0 0% 0%', secondary: '0 0% 0%', accent: '0 0% 0%' },
      palette,
    });
    expect(fromPalette.roles).toEqual(palette.roles);
  });
});
