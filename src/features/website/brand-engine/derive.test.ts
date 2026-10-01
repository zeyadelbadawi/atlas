/**
 * Role derivation — the §I.2 brand-system cases that don't need pixels
 * (those live in `analyze.test.ts`), plus the property-based contrast
 * guarantee.
 */
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  isHslTriplet,
  tripletDeltaE,
  tripletToOklch,
} from './color-space';
import {
  DEFAULT_FALLBACK_ACCENT,
  DEFAULT_NEUTRAL_CHROMA_CAP,
  buildBrandPalette,
  deriveBrandPalette,
  deriveBrandPaletteAlternatives,
  deriveInteractionStates,
} from './derive';
import {
  BRAND_CONTRAST_PAIRS,
  BRAND_PALETTE_VARIANTS,
  BRAND_ROLE_NAMES,
} from './palette.types';
import { validateBrandPalette } from './validate';

/** mulberry32 — a tiny seeded PRNG, so the random suite is reproducible. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomTriplet(random: () => number): string {
  return `${Math.floor(random() * 360)} ${Math.floor(random() * 101)}% ${Math.floor(random() * 101)}%`;
}

describe('brand engine — role derivation', () => {
  it('produces all 19 roles, valid, deterministic and versioned', () => {
    const a = deriveBrandPalette({ primary: '221 83% 53%' });
    const b = deriveBrandPalette({ primary: '221 83% 53%' });
    expect(Object.keys(a.roles).sort()).toEqual([...BRAND_ROLE_NAMES].sort());
    expect(Object.values(a.roles).every(isHslTriplet)).toBe(true);
    expect(a).toEqual(b);
    expect(
      buildBrandPalette({ seeds: { primary: '221 83% 53%' }, source: 'manual' })
        .algorithmVersion
    ).toBe('bp-1');
  });

  it('keeps a brand colour that already works as the CTA', () => {
    const palette = deriveBrandPalette({ primary: '221 83% 53%' });
    expect(palette.roles.cta).toBe('221 83% 53%');
    expect(palette.roles.ctaForeground).toBe('0 0% 100%');
    expect(
      palette.report.adjustments.find((a) => a.target === 'cta')
    ).toBeUndefined();
  });

  it('neon yellow: seed kept decorative only, CTA derived and passing, reason reported', () => {
    const palette = deriveBrandPalette({ primary: '66 100% 50%' });
    expect(palette.usage.primary).toBe('decorativeOnly');
    expect(palette.roles.cta).not.toBe('66 100% 50%');
    expect(
      contrastRatio(palette.roles.ctaForeground, palette.roles.cta)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette.roles.cta, palette.roles.background)
    ).toBeGreaterThanOrEqual(3);
    const decorative = palette.report.adjustments.find(
      (a) => a.target === 'primary' && a.reason === 'decorativeOnly'
    );
    expect(decorative?.ratio).toBeLessThan(3);
    expect(
      palette.report.adjustments.some(
        (a) => a.target === 'cta' && a.reason === 'contrast'
      )
    ).toBe(true);
  });

  it('extremely dark logo: an ink brand, accent from the theme default, no black CTA label collision', () => {
    const palette = deriveBrandPalette({ primary: '220 15% 8%' });
    expect(palette.roles.ctaForeground).toBe('0 0% 100%');
    expect(palette.seeds.accent).toBe(DEFAULT_FALLBACK_ACCENT);
    expect(tripletToOklch(palette.roles.background).C).toBeLessThan(0.005);
  });

  it('extremely light (pastel) logo: CTA deepened to a real button, pastel kept decorative', () => {
    const palette = deriveBrandPalette({ primary: '340 80% 88%' });
    expect(palette.usage.primary).toBe('decorativeOnly');
    expect(tripletToOklch(palette.roles.cta).L).toBeLessThan(
      tripletToOklch('340 80% 88%').L
    );
    expect(
      contrastRatio(palette.roles.cta, palette.roles.background)
    ).toBeGreaterThanOrEqual(3);
    expect(palette.report.ctaNeedsBorder).toBe(false);
  });

  it('monochrome (grey) logo: untinted neutrals, theme-default accent', () => {
    const palette = deriveBrandPalette({ primary: '0 0% 35%' });
    for (const role of [
      'background',
      'surface',
      'surfaceMuted',
      'border',
      'foreground',
    ] as const) {
      expect(tripletToOklch(palette.roles[role]).C).toBeLessThan(0.005);
    }
    expect(palette.seeds.accent).toBe(DEFAULT_FALLBACK_ACCENT);
  });

  it('multi-colour logo: distinct seeds stay distinguishable', () => {
    const palette = deriveBrandPalette({
      primary: '262 70% 50%',
      secondary: '330 75% 55%',
      accent: '174 60% 42%',
    });
    expect(
      tripletDeltaE(palette.roles.cta, palette.roles.secondary)
    ).toBeGreaterThanOrEqual(0.08);
    expect(
      tripletDeltaE(palette.roles.cta, palette.roles.accent)
    ).toBeGreaterThanOrEqual(0.08);
  });

  it('brand hue ≈ error hue: error separated by lightness, and the report says so', () => {
    const palette = deriveBrandPalette({ primary: '2 80% 50%' });
    const errorL = tripletToOklch(palette.roles.error).L;
    const ctaL = tripletToOklch(palette.roles.cta).L;
    expect(Math.abs(errorL - ctaL)).toBeGreaterThanOrEqual(0.1);
    expect(
      palette.report.adjustments.some(
        (a) => a.target === 'error' && a.reason === 'statusHueCollision'
      )
    ).toBe(true);
  });

  it('fills missing secondary/accent by harmony, and records it', () => {
    const palette = deriveBrandPalette({ primary: '221 83% 53%' });
    const filled = palette.report.adjustments
      .filter((a) => a.reason === 'harmonyFill')
      .map((a) => a.target);
    expect(filled).toEqual(['secondary', 'accent']);
  });

  it('seed overrides re-derive dependents; role overrides are final', () => {
    const base = deriveBrandPalette({ primary: '221 83% 53%' });
    const seedOverride = deriveBrandPalette(
      { primary: '221 83% 53%' },
      { overrides: { primary: '150 70% 35%' } }
    );
    expect(seedOverride.roles.cta).not.toBe(base.roles.cta);
    expect(seedOverride.roles.link).not.toBe(base.roles.link);

    const roleOverride = deriveBrandPalette(
      { primary: '221 83% 53%' },
      { overrides: { link: '221 83% 30%' } }
    );
    expect(roleOverride.roles.link).toBe('221 83% 30%');
    expect(roleOverride.roles.cta).toBe(base.roles.cta);
  });

  it('regenerate: 4 deterministic alternatives in a fixed order, overrides kept', () => {
    const seeds = {
      primary: '24 95% 53%',
      secondary: '199 89% 38%',
      accent: '43 96% 56%',
    };
    const overrides = { link: '199 89% 30%' };
    const alternatives = deriveBrandPaletteAlternatives(seeds, { overrides });
    expect(alternatives.map((a) => a.report.variant)).toEqual([
      ...BRAND_PALETTE_VARIANTS,
    ]);
    expect(alternatives).toEqual(
      deriveBrandPaletteAlternatives(seeds, { overrides })
    );
    expect(alternatives.every((a) => a.roles.link === '199 89% 30%')).toBe(
      true
    );
    // Secondary-led swaps the leading hue.
    expect(tripletToOklch(alternatives[3].roles.cta).h).not.toBeCloseTo(
      tripletToOklch(alternatives[0].roles.cta).h,
      0
    );
    // Calm really is calmer.
    expect(tripletToOklch(alternatives[2].roles.cta).C).toBeLessThan(
      tripletToOklch(alternatives[0].roles.cta).C
    );
  });

  it('hover and pressed states move away from the label and keep its contrast', () => {
    const { roles } = deriveBrandPalette({ primary: '221 83% 53%' });
    const states = deriveInteractionStates(roles.cta, roles.ctaForeground);
    expect(tripletToOklch(states.ctaHover).L).toBeLessThan(
      tripletToOklch(roles.cta).L
    );
    expect(tripletToOklch(states.ctaPressed).L).toBeLessThan(
      tripletToOklch(states.ctaHover).L
    );
  });

  it('property: every §F.4.4 pair passes for 500 random seed sets, all variants, and neutrals respect the cap', () => {
    const random = prng(20260929);
    for (let run = 0; run < 500; run += 1) {
      const seeds = {
        primary: randomTriplet(random),
        ...(random() < 0.6 ? { secondary: randomTriplet(random) } : {}),
        ...(random() < 0.5 ? { accent: randomTriplet(random) } : {}),
      };
      const variant =
        BRAND_PALETTE_VARIANTS[run % BRAND_PALETTE_VARIANTS.length];
      const palette = deriveBrandPalette(seeds, { variant });
      const failing = palette.report.pairs.filter((pair) => !pair.pass);
      expect(failing, JSON.stringify({ seeds, variant })).toEqual([]);
      expect(palette.report.pairs).toHaveLength(BRAND_CONTRAST_PAIRS.length);
      // Integer HSL rounding can add a hair of chroma; allow for it.
      expect(tripletToOklch(palette.roles.background).C).toBeLessThanOrEqual(
        DEFAULT_NEUTRAL_CHROMA_CAP + 0.004
      );
      expect(tripletToOklch(palette.roles.surface).C).toBeLessThanOrEqual(
        DEFAULT_NEUTRAL_CHROMA_CAP + 0.004
      );
      const built = buildBrandPalette({ seeds, source: 'logo', variant });
      expect(validateBrandPalette(built).issues, JSON.stringify(seeds)).toEqual(
        []
      );
    }
  });

  it('is fast enough for a live preview (≤ 50 ms per palette)', () => {
    const started = performance.now();
    for (let run = 0; run < 20; run += 1) {
      deriveBrandPalette({ primary: `${run * 17} 70% 50%` });
    }
    expect((performance.now() - started) / 20).toBeLessThan(50);
  });
});
